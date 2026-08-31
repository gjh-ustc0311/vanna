"""
FastAPI route implementations for Vanna Agents.
"""

import json
import traceback
import uuid
from logging import Logger
from typing import Any, AsyncGenerator, Dict, Optional
from urllib.parse import parse_qs, unquote

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import (
    HTMLResponse,
    JSONResponse,
    RedirectResponse,
    StreamingResponse,
)

from ..base import (
    ChatError,
    ChatHandler,
    ChatRequest,
    ChatStreamError,
    ChatStreamProgress,
)
from ..base.templates import get_index_html
from ...core.user.request_context import RequestContext
from .xpd_logging import log_xpd_chat_sse_event


_LOCAL_DEMO_EMAILS = {"admin@example.com", "user@example.com"}


def register_chat_routes(
    app: FastAPI,
    chat_handler: ChatHandler,
    config: Optional[Dict[str, Any]] = None,
    *,
    chat_sse_logger: Optional[Logger] = None,
) -> None:
    """Register chat routes on FastAPI app.

    Args:
        app: FastAPI application
        chat_handler: Chat handler instance
        config: Server configuration
        chat_sse_logger: Optional logger enabled only for the XPD SSE endpoint
    """
    config = config or {}

    @app.get("/", response_class=HTMLResponse)
    async def index(http_request: Request) -> str:
        """Serve the main chat interface."""
        dev_mode = config.get("dev_mode", False)
        cdn_url = None if dev_mode else config.get("cdn_url")
        api_base_url = config.get("api_base_url", "")
        selected_email = unquote(http_request.cookies.get("vanna_email", ""))
        if selected_email not in _LOCAL_DEMO_EMAILS:
            selected_email = ""

        return get_index_html(
            dev_mode=dev_mode,
            cdn_url=cdn_url,
            api_base_url=api_base_url,
            logged_in_email=selected_email or None,
        )

    @app.post("/login")
    async def login(http_request: Request) -> RedirectResponse:
        body = (await http_request.body()).decode("utf-8", errors="replace")
        selected_email = parse_qs(body).get("email", [""])[0]
        if selected_email not in _LOCAL_DEMO_EMAILS:
            raise HTTPException(status_code=400, detail="Invalid local demo identity")
        response = RedirectResponse(url="/", status_code=303)
        response.set_cookie(
            "vanna_email",
            selected_email,
            max_age=365 * 24 * 60 * 60,
            path="/",
            samesite="lax",
        )
        return response

    @app.post("/logout")
    async def logout() -> RedirectResponse:
        response = RedirectResponse(url="/", status_code=303)
        response.delete_cookie("vanna_email", path="/")
        return response

    @app.post("/api/vanna/v3/chat_sse")
    async def chat_sse(
        chat_request: ChatRequest, http_request: Request
    ) -> StreamingResponse:
        """Server-Sent Events endpoint for streaming chat."""
        chat_request.conversation_id = (
            chat_request.conversation_id or f"conv_{uuid.uuid4().hex[:8]}"
        )
        chat_request.request_id = chat_request.request_id or str(uuid.uuid4())

        request_payload = None
        if chat_sse_logger is not None:
            request_payload = chat_request.model_dump(
                mode="json",
                exclude_unset=True,
            )

        # Extract request context for user resolution
        chat_request.attach_request_context(
            RequestContext(
                cookies=dict(http_request.cookies),
                headers=dict(http_request.headers),
                remote_addr=(http_request.client.host if http_request.client else None),
                query_params=dict(http_request.query_params),
                metadata=chat_request.metadata,
            )
        )

        path = http_request.url.path
        if chat_sse_logger is not None:
            log_xpd_chat_sse_event(
                chat_sse_logger,
                event="xpd.chat.request",
                path=path,
                conversation_id=chat_request.conversation_id or "",
                request_id=chat_request.request_id or "",
                message_type="request",
                payload=request_payload,
            )

        async def generate() -> AsyncGenerator[str, None]:
            """Generate SSE stream."""
            try:
                handle_events = getattr(chat_handler, "handle_events", None)
                if handle_events is None:
                    handle_events = chat_handler.handle_stream
                async for stream_item in handle_events(chat_request):
                    item_json = stream_item.model_dump_json()
                    if chat_sse_logger is not None:
                        log_xpd_chat_sse_event(
                            chat_sse_logger,
                            event="xpd.chat.response",
                            path=path,
                            conversation_id=stream_item.conversation_id,
                            request_id=stream_item.request_id,
                            message_type=(
                                "progress"
                                if isinstance(stream_item, ChatStreamProgress)
                                else "chunk"
                            ),
                            payload=json.loads(item_json),
                        )
                    yield f"data: {item_json}\n\n"
                if chat_sse_logger is not None:
                    log_xpd_chat_sse_event(
                        chat_sse_logger,
                        event="xpd.chat.response",
                        path=path,
                        conversation_id=chat_request.conversation_id or "",
                        request_id=chat_request.request_id or "",
                        message_type="done",
                        payload="[DONE]",
                    )
                yield "data: [DONE]\n\n"
            except Exception:
                traceback.print_exc()
                error_frame = ChatStreamError(
                    error=ChatError(
                        code="internal_error",
                        message="The request could not be completed. Please try again.",
                    ),
                    conversation_id=chat_request.conversation_id or "",
                    request_id=chat_request.request_id or "",
                )
                error_json = error_frame.model_dump_json()
                if chat_sse_logger is not None:
                    log_xpd_chat_sse_event(
                        chat_sse_logger,
                        event="xpd.chat.response",
                        path=path,
                        conversation_id=chat_request.conversation_id or "",
                        request_id=chat_request.request_id or "",
                        message_type="error",
                        payload=json.loads(error_json),
                    )
                yield f"data: {error_json}\n\n"
                yield "data: [DONE]\n\n"

        return StreamingResponse(
            generate(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",  # Disable nginx buffering
            },
        )

    @app.post("/api/vanna/v3/chat_poll")
    async def chat_poll(chat_request: ChatRequest, http_request: Request):
        """Polling endpoint for chat."""
        chat_request.conversation_id = (
            chat_request.conversation_id or f"conv_{uuid.uuid4().hex[:8]}"
        )
        chat_request.request_id = chat_request.request_id or str(uuid.uuid4())
        # Extract request context for user resolution
        chat_request.attach_request_context(
            RequestContext(
                cookies=dict(http_request.cookies),
                headers=dict(http_request.headers),
                remote_addr=(http_request.client.host if http_request.client else None),
                query_params=dict(http_request.query_params),
                metadata=chat_request.metadata,
            )
        )

        try:
            result = await chat_handler.handle_poll(chat_request)
            return result
        except Exception:
            traceback.print_exc()
            error_frame = ChatStreamError(
                error=ChatError(
                    code="internal_error",
                    message="The request could not be completed. Please try again.",
                ),
                conversation_id=chat_request.conversation_id,
                request_id=chat_request.request_id,
            )
            return JSONResponse(
                status_code=500,
                content=error_frame.model_dump(mode="json"),
            )
