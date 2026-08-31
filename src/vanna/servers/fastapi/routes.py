"""FastAPI route implementations for Vanna Agents."""

from __future__ import annotations

import asyncio
import json
import traceback
import uuid
from contextlib import suppress
from logging import Logger
from typing import (
    Annotated,
    Any,
    AsyncGenerator,
    AsyncIterator,
    Dict,
    Optional,
    TypeVar,
)

from fastapi import Depends, FastAPI, Request
from fastapi.exception_handlers import request_validation_exception_handler
from fastapi.exceptions import RequestValidationError
from fastapi.responses import HTMLResponse, JSONResponse, StreamingResponse

from ...core.user.request_context import RequestContext
from ..base import (
    ChatError,
    ChatHandler,
    ChatRequest,
    ChatRequestBody,
    ChatStreamError,
    ChatStreamProgress,
)
from ..base.templates import get_index_html
from .request_headers import (
    ChatProtocolError,
    ChatRequestHeaders,
    REQUEST_ID_HEADER,
    TRACE_ID_HEADER,
    USER_ID_HEADER,
    diagnostic_correlation,
    require_chat_request_headers,
)
from .xpd_logging import log_xpd_chat_sse_event


_CHAT_PATHS = frozenset({"/api/vanna/v3/chat_sse", "/api/vanna/v3/chat_poll"})
_CHAT_SSE_HEARTBEAT_SECONDS = 15.0
_CHAT_SSE_HEARTBEAT_FRAME = ": heartbeat\n\n"
_HeaderDependency = Annotated[ChatRequestHeaders, Depends(require_chat_request_headers)]
_StreamItem = TypeVar("_StreamItem")


async def _iterate_with_heartbeat(
    source: AsyncIterator[_StreamItem],
    *,
    interval_seconds: float,
) -> AsyncGenerator[Optional[_StreamItem], None]:
    """Yield ``None`` while an async iterator is idle without cancelling it."""

    if interval_seconds <= 0:
        raise ValueError("heartbeat interval must be positive")

    iterator = source.__aiter__()
    pending = asyncio.ensure_future(iterator.__anext__())
    try:
        while True:
            done, _ = await asyncio.wait((pending,), timeout=interval_seconds)
            if not done:
                yield None
                continue

            try:
                item = pending.result()
            except StopAsyncIteration:
                return

            yield item
            pending = asyncio.ensure_future(iterator.__anext__())
    finally:
        if not pending.done():
            pending.cancel()
            with suppress(asyncio.CancelledError):
                await pending

        close = getattr(iterator, "aclose", None)
        if close is not None:
            await close()


def _chat_error_response(
    *,
    status_code: int,
    code: str,
    message: str,
    conversation_id: str,
    request_id: str,
    trace_id: str,
) -> JSONResponse:
    frame = ChatStreamError(
        error=ChatError(code=code, message=message),
        conversation_id=conversation_id,
        request_id=request_id,
    )
    return JSONResponse(
        status_code=status_code,
        content=frame.model_dump(mode="json"),
        headers={REQUEST_ID_HEADER: request_id, TRACE_ID_HEADER: trace_id},
    )


def _validation_error_code(exc: RequestValidationError) -> tuple[str, str]:
    for error in exc.errors():
        location = tuple(str(part).lower() for part in error.get("loc", ()))
        if location[-2:] == ("header", REQUEST_ID_HEADER.lower()):
            return (
                "REQUEST_ID_INVALID",
                f"{REQUEST_ID_HEADER} must be one safe identifier of 1 to 128 characters.",
            )
        if location[-2:] == ("header", TRACE_ID_HEADER.lower()):
            return (
                "TRACE_ID_INVALID",
                f"{TRACE_ID_HEADER} must be at most one safe identifier of 1 to 128 characters.",
            )
        if location[-2:] == ("header", USER_ID_HEADER.lower()):
            return (
                "USER_ID_INVALID",
                f"{USER_ID_HEADER} must be one canonical uint64 decimal value.",
            )
    return "VALIDATION_ERROR", "The chat request body is invalid."


def _conversation_id_from_validation_error(exc: RequestValidationError) -> str:
    body = exc.body
    if isinstance(body, dict) and isinstance(body.get("conversation_id"), str):
        return body["conversation_id"]
    return ""


def _build_chat_request(
    body: ChatRequestBody,
    headers: ChatRequestHeaders,
    http_request: Request,
) -> ChatRequest:
    chat_request = body.to_internal(request_id=headers.request_id)
    chat_request.conversation_id = (
        chat_request.conversation_id or f"conv_{uuid.uuid4().hex[:8]}"
    )
    chat_request.attach_request_context(
        RequestContext(
            cookies=dict(http_request.cookies),
            headers=dict(http_request.headers),
            remote_addr=(http_request.client.host if http_request.client else None),
            query_params=dict(http_request.query_params),
            metadata=chat_request.metadata,
            request_id=headers.request_id,
            trace_id=headers.trace_id,
            user_id=headers.user_id,
        )
    )
    return chat_request


def register_chat_routes(
    app: FastAPI,
    chat_handler: ChatHandler,
    config: Optional[Dict[str, Any]] = None,
    *,
    chat_sse_logger: Optional[Logger] = None,
) -> None:
    """Register strict V3 chat routes on a FastAPI application."""

    config = config or {}

    def log_preflight_error(request: Request, response: JSONResponse) -> None:
        if chat_sse_logger is None or request.url.path not in _CHAT_PATHS:
            return
        payload = json.loads(bytes(response.body))
        log_xpd_chat_sse_event(
            chat_sse_logger,
            event="xpd.chat.response",
            path=request.url.path,
            conversation_id=payload.get("conversation_id", ""),
            request_id=response.headers[REQUEST_ID_HEADER],
            trace_id=response.headers[TRACE_ID_HEADER],
            transport=("sse" if request.url.path.endswith("/chat_sse") else "poll"),
            message_type="error",
            payload=payload,
        )

    @app.exception_handler(ChatProtocolError)
    async def chat_protocol_error_handler(
        request: Request, exc: ChatProtocolError
    ) -> JSONResponse:
        response = _chat_error_response(
            status_code=exc.status_code,
            code=exc.code,
            message=exc.message,
            conversation_id="",
            request_id=exc.request_id,
            trace_id=exc.trace_id,
        )
        log_preflight_error(request, response)
        return response

    @app.exception_handler(RequestValidationError)
    async def chat_validation_error_handler(
        request: Request, exc: RequestValidationError
    ):
        if request.url.path not in _CHAT_PATHS:
            return await request_validation_exception_handler(request, exc)
        request_id, trace_id = diagnostic_correlation(request)
        code, message = _validation_error_code(exc)
        response = _chat_error_response(
            status_code=422,
            code=code,
            message=message,
            conversation_id=_conversation_id_from_validation_error(exc),
            request_id=request_id,
            trace_id=trace_id,
        )
        log_preflight_error(request, response)
        return response

    @app.get("/", response_class=HTMLResponse)
    async def index() -> str:
        """Serve the local chat interface."""

        dev_mode = config.get("dev_mode", False)
        cdn_url = None if dev_mode else config.get("cdn_url")
        return get_index_html(
            dev_mode=dev_mode,
            cdn_url=cdn_url,
            api_base_url=config.get("api_base_url", ""),
        )

    @app.post("/api/vanna/v3/chat_sse")
    async def chat_sse(
        chat_body: ChatRequestBody,
        http_request: Request,
        request_headers: _HeaderDependency,
    ) -> StreamingResponse:
        """Stream chat progress and components as Server-Sent Events."""

        chat_request = _build_chat_request(chat_body, request_headers, http_request)
        request_payload = (
            chat_body.model_dump(mode="json", exclude_unset=True)
            if chat_sse_logger is not None
            else None
        )
        path = http_request.url.path
        if chat_sse_logger is not None:
            log_xpd_chat_sse_event(
                chat_sse_logger,
                event="xpd.chat.request",
                path=path,
                conversation_id=chat_request.conversation_id or "",
                request_id=request_headers.request_id,
                trace_id=request_headers.trace_id,
                transport="sse",
                message_type="request",
                payload=request_payload,
            )

        async def generate() -> AsyncGenerator[str, None]:
            try:
                handle_events = getattr(chat_handler, "handle_events", None)
                if handle_events is None:
                    handle_events = chat_handler.handle_stream
                event_source = handle_events(chat_request)
                async for stream_item in _iterate_with_heartbeat(
                    event_source,
                    interval_seconds=_CHAT_SSE_HEARTBEAT_SECONDS,
                ):
                    if stream_item is None:
                        yield _CHAT_SSE_HEARTBEAT_FRAME
                        continue

                    item_json = stream_item.model_dump_json()
                    if chat_sse_logger is not None:
                        log_xpd_chat_sse_event(
                            chat_sse_logger,
                            event="xpd.chat.response",
                            path=path,
                            conversation_id=stream_item.conversation_id,
                            request_id=stream_item.request_id,
                            trace_id=request_headers.trace_id,
                            transport="sse",
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
                        request_id=request_headers.request_id,
                        trace_id=request_headers.trace_id,
                        transport="sse",
                        message_type="done",
                        payload="[DONE]",
                    )
                yield "data: [DONE]\n\n"
            except Exception:
                traceback.print_exc()
                error_frame = ChatStreamError(
                    error=ChatError(
                        code="internal_error",
                        message=(
                            "The request could not be completed. Please try again."
                        ),
                    ),
                    conversation_id=chat_request.conversation_id or "",
                    request_id=request_headers.request_id,
                )
                error_json = error_frame.model_dump_json()
                if chat_sse_logger is not None:
                    log_xpd_chat_sse_event(
                        chat_sse_logger,
                        event="xpd.chat.response",
                        path=path,
                        conversation_id=chat_request.conversation_id or "",
                        request_id=request_headers.request_id,
                        trace_id=request_headers.trace_id,
                        transport="sse",
                        message_type="error",
                        payload=json.loads(error_json),
                    )
                yield f"data: {error_json}\n\n"
                yield "data: [DONE]\n\n"

        return StreamingResponse(
            generate(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache, no-transform",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
                **request_headers.response_headers(),
            },
        )

    @app.post("/api/vanna/v3/chat_poll")
    async def chat_poll(
        chat_body: ChatRequestBody,
        http_request: Request,
        request_headers: _HeaderDependency,
    ) -> JSONResponse:
        """Return all persistent chat components after completion."""

        chat_request = _build_chat_request(chat_body, request_headers, http_request)
        path = http_request.url.path
        if chat_sse_logger is not None:
            log_xpd_chat_sse_event(
                chat_sse_logger,
                event="xpd.chat.request",
                path=path,
                conversation_id=chat_request.conversation_id or "",
                request_id=request_headers.request_id,
                trace_id=request_headers.trace_id,
                transport="poll",
                message_type="request",
                payload=chat_body.model_dump(mode="json", exclude_unset=True),
            )

        try:
            result = await chat_handler.handle_poll(chat_request)
            payload = result.model_dump(mode="json")
            if chat_sse_logger is not None:
                log_xpd_chat_sse_event(
                    chat_sse_logger,
                    event="xpd.chat.response",
                    path=path,
                    conversation_id=result.conversation_id,
                    request_id=result.request_id,
                    trace_id=request_headers.trace_id,
                    transport="poll",
                    message_type="response",
                    payload=payload,
                )
            return JSONResponse(
                content=payload,
                headers=request_headers.response_headers(),
            )
        except Exception:
            traceback.print_exc()
            error_response = _chat_error_response(
                status_code=500,
                code="internal_error",
                message="The request could not be completed. Please try again.",
                conversation_id=chat_request.conversation_id or "",
                request_id=request_headers.request_id,
                trace_id=request_headers.trace_id,
            )
            if chat_sse_logger is not None:
                log_xpd_chat_sse_event(
                    chat_sse_logger,
                    event="xpd.chat.response",
                    path=path,
                    conversation_id=chat_request.conversation_id or "",
                    request_id=request_headers.request_id,
                    trace_id=request_headers.trace_id,
                    transport="poll",
                    message_type="error",
                    payload=json.loads(bytes(error_response.body)),
                )
            return error_response
