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
from fastapi.responses import HTMLResponse, RedirectResponse, StreamingResponse

from ..base import ChatHandler, ChatRequest, ChatResponse
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
        cdn_url = config.get("cdn_url", "https://img.vanna.ai/vanna-components.js")
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

    @app.post("/api/vanna/v2/chat_sse")
    async def chat_sse(
        chat_request: ChatRequest, http_request: Request
    ) -> StreamingResponse:
        """Server-Sent Events endpoint for streaming chat."""
        request_payload = None
        if chat_sse_logger is not None:
            request_payload = chat_request.model_dump(
                mode="json",
                exclude={"request_context"},
                exclude_unset=True,
            )
            # Resolve IDs before logging so the request event and every outbound
            # frame share the same correlation values. ChatHandler will reuse them.
            chat_request.conversation_id = (
                chat_request.conversation_id or f"conv_{uuid.uuid4().hex[:8]}"
            )
            chat_request.request_id = chat_request.request_id or str(uuid.uuid4())

        # Extract request context for user resolution
        chat_request.request_context = RequestContext(
            cookies=dict(http_request.cookies),
            headers=dict(http_request.headers),
            remote_addr=http_request.client.host if http_request.client else None,
            query_params=dict(http_request.query_params),
            metadata=chat_request.metadata,
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
                async for chunk in chat_handler.handle_stream(chat_request):
                    chunk_json = chunk.model_dump_json()
                    if chat_sse_logger is not None:
                        log_xpd_chat_sse_event(
                            chat_sse_logger,
                            event="xpd.chat.response",
                            path=path,
                            conversation_id=chunk.conversation_id,
                            request_id=chunk.request_id,
                            message_type="chunk",
                            payload=json.loads(chunk_json),
                        )
                    yield f"data: {chunk_json}\n\n"
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
            except Exception as e:
                traceback.print_stack()
                traceback.print_exc()
                error_data = {
                    "type": "error",
                    "data": {"message": str(e)},
                    "conversation_id": chat_request.conversation_id or "",
                    "request_id": chat_request.request_id or "",
                }
                if chat_sse_logger is not None:
                    log_xpd_chat_sse_event(
                        chat_sse_logger,
                        event="xpd.chat.response",
                        path=path,
                        conversation_id=chat_request.conversation_id or "",
                        request_id=chat_request.request_id or "",
                        message_type="error",
                        payload=error_data,
                    )
                yield f"data: {json.dumps(error_data)}\n\n"

        return StreamingResponse(
            generate(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",  # Disable nginx buffering
            },
        )

    @app.post("/api/vanna/v2/chat_poll")
    async def chat_poll(
        chat_request: ChatRequest, http_request: Request
    ) -> ChatResponse:
        """Polling endpoint for chat."""
        # Extract request context for user resolution
        chat_request.request_context = RequestContext(
            cookies=dict(http_request.cookies),
            headers=dict(http_request.headers),
            remote_addr=http_request.client.host if http_request.client else None,
            query_params=dict(http_request.query_params),
            metadata=chat_request.metadata,
        )

        try:
            result = await chat_handler.handle_poll(chat_request)
            return result
        except Exception as e:
            traceback.print_stack()
            traceback.print_exc()
            raise HTTPException(status_code=500, detail=f"Chat failed: {str(e)}")
