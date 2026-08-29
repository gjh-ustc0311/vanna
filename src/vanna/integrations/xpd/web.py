"""FastAPI surface for the loopback-only XPD application."""

from __future__ import annotations

import json
import logging
import time
import uuid
from pathlib import Path
from typing import Any, AsyncGenerator, Dict, List, Optional

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import HTMLResponse, JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, ConfigDict, Field

from vanna.core import Agent, RequestContext

from .errors import XpdError

logger = logging.getLogger("uvicorn.error.xpd")

_STATIC_DIR = Path(__file__).with_name("static")
_ID_PATTERN = r"^[A-Za-z0-9_-]{1,128}$"
_CHAT_TRANSPORTS = {
    "/api/vanna/v2/chat_sse": "sse",
    "/api/vanna/v2/chat_poll": "poll",
}

INDEX_HTML = """<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>XPD 三表数据助手</title>
  <link rel="stylesheet" href="/static/xpd-chat.css">
  <script type="module" src="/static/xpd-chat.js"></script>
</head>
<body>
  <main class="shell">
    <header>
      <p class="eyebrow">XPD · LOCAL READ-ONLY</p>
      <h1>XPD 三表数据助手</h1>
      <p>仅访问获批的商品日统计、商品直播场次统计和直播结束时间表。</p>
    </header>
    <section id="messages" class="messages" aria-live="polite"></section>
    <div id="status" class="status">准备就绪</div>
    <form id="chat-form" class="composer">
      <textarea id="message" rows="2" maxlength="20000" placeholder="请输入数据问题…" required></textarea>
      <button id="send" type="submit">发送</button>
    </form>
  </main>
</body>
</html>
"""


class XpdChatRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    message: str = Field(max_length=20_000)
    conversation_id: Optional[str] = Field(default=None, pattern=_ID_PATTERN)
    request_id: Optional[str] = Field(default=None, pattern=_ID_PATTERN)


class XpdChatChunk(BaseModel):
    rich: Dict[str, Any]
    simple: Optional[Dict[str, Any]] = None
    conversation_id: str
    request_id: str
    timestamp: float = Field(default_factory=time.time)


class XpdChatResponse(BaseModel):
    chunks: List[XpdChatChunk]
    conversation_id: str
    request_id: str
    total_chunks: int


def _ids(chat_request: XpdChatRequest) -> tuple[str, str]:
    conversation_id = chat_request.conversation_id or f"conv_{uuid.uuid4().hex[:12]}"
    request_id = chat_request.request_id or uuid.uuid4().hex
    return conversation_id, request_id


def _chunk(component: Any, conversation_id: str, request_id: str) -> XpdChatChunk:
    simple = None
    if component.simple_component is not None:
        simple = component.simple_component.serialize_for_frontend()
    return XpdChatChunk(
        rich=component.rich_component.serialize_for_frontend(),
        simple=simple,
        conversation_id=conversation_id,
        request_id=request_id,
    )


def _error_payload(
    code: str, message: str, conversation_id: str, request_id: str
) -> Dict[str, Any]:
    return {
        "type": "error",
        "data": {"code": code, "message": message},
        "conversation_id": conversation_id,
        "request_id": request_id,
    }


def _log_chat_event(
    *,
    event: str,
    transport: str,
    path: str,
    conversation_id: str,
    request_id: str,
    message_type: str,
    payload: Any,
) -> None:
    """Write one complete client-boundary event as single-line JSON."""

    logger.info(
        json.dumps(
            {
                "event": event,
                "timestamp": time.time(),
                "transport": transport,
                "path": path,
                "conversation_id": conversation_id,
                "request_id": request_id,
                "message_type": message_type,
                "payload": payload,
            },
            ensure_ascii=False,
            separators=(",", ":"),
            default=str,
        )
    )


def _log_chat_request(
    chat_request: XpdChatRequest,
    *,
    transport: str,
    path: str,
    conversation_id: str,
    request_id: str,
) -> None:
    _log_chat_event(
        event="xpd.chat.request",
        transport=transport,
        path=path,
        conversation_id=conversation_id,
        request_id=request_id,
        message_type="request",
        payload=chat_request.model_dump(mode="json", exclude_unset=True),
    )


def _log_chat_response(
    payload: Any,
    *,
    transport: str,
    path: str,
    conversation_id: str,
    request_id: str,
    message_type: str,
) -> None:
    _log_chat_event(
        event="xpd.chat.response",
        transport=transport,
        path=path,
        conversation_id=conversation_id,
        request_id=request_id,
        message_type=message_type,
        payload=payload,
    )


def create_xpd_app(agent: Agent) -> FastAPI:
    app = FastAPI(
        title="XPD Data Assistant",
        docs_url=None,
        redoc_url=None,
        openapi_url=None,
    )
    app.mount("/static", StaticFiles(directory=_STATIC_DIR), name="static")

    @app.middleware("http")
    async def security_headers(request: Request, call_next: Any) -> Any:
        response = await call_next(request)
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; script-src 'self'; style-src 'self'; "
            "connect-src 'self'; img-src 'self' data:; object-src 'none'; "
            "base-uri 'none'; frame-ancestors 'none'"
        )
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "no-referrer"
        return response

    @app.exception_handler(RequestValidationError)
    async def invalid_request(
        request: Request, error: RequestValidationError
    ) -> JSONResponse:
        payload = _error_payload(
            "xpd_request_invalid", "The request is invalid.", "", ""
        )
        transport = _CHAT_TRANSPORTS.get(request.url.path)
        if transport is not None:
            _log_chat_event(
                event="xpd.chat.request",
                transport=transport,
                path=request.url.path,
                conversation_id="",
                request_id="",
                message_type="request",
                payload=error.body,
            )
            _log_chat_response(
                payload,
                transport=transport,
                path=request.url.path,
                conversation_id="",
                request_id="",
                message_type="error",
            )
        return JSONResponse(
            status_code=400,
            content=payload,
        )

    @app.get("/", response_class=HTMLResponse)
    async def index() -> str:
        return INDEX_HTML

    @app.get("/health")
    async def health() -> Dict[str, str]:
        return {
            "status": "ok",
            "service": "vanna-xpd",
            "contract_version": "xpd-core-v1",
        }

    async def run_chat(
        chat_request: XpdChatRequest,
        conversation_id: str,
        request_id: str,
    ) -> AsyncGenerator[XpdChatChunk, None]:
        context = RequestContext(
            metadata={"starter_ui_request": not chat_request.message}
        )
        async for component in agent.send_message(
            context,
            chat_request.message,
            conversation_id=conversation_id,
            request_id=request_id,
        ):
            yield _chunk(component, conversation_id, request_id)

    @app.post("/api/vanna/v2/chat_sse")
    async def chat_sse(chat_request: XpdChatRequest) -> StreamingResponse:
        conversation_id, request_id = _ids(chat_request)
        path = "/api/vanna/v2/chat_sse"
        _log_chat_request(
            chat_request,
            transport="sse",
            path=path,
            conversation_id=conversation_id,
            request_id=request_id,
        )

        async def generate() -> AsyncGenerator[str, None]:
            try:
                async for item in run_chat(chat_request, conversation_id, request_id):
                    _log_chat_response(
                        item.model_dump(mode="json"),
                        transport="sse",
                        path=path,
                        conversation_id=conversation_id,
                        request_id=request_id,
                        message_type="chunk",
                    )
                    yield f"data: {item.model_dump_json()}\n\n"
                _log_chat_response(
                    "[DONE]",
                    transport="sse",
                    path=path,
                    conversation_id=conversation_id,
                    request_id=request_id,
                    message_type="done",
                )
                yield "data: [DONE]\n\n"
            except XpdError as exc:
                payload = _error_payload(
                    exc.code, str(exc), conversation_id, request_id
                )
                _log_chat_response(
                    payload,
                    transport="sse",
                    path=path,
                    conversation_id=conversation_id,
                    request_id=request_id,
                    message_type="error",
                )
                yield "data: " + json.dumps(payload, ensure_ascii=False) + "\n\n"
            except Exception:
                logger.error("Unexpected XPD chat failure")
                payload = _error_payload(
                    "xpd_internal_error",
                    "The XPD request could not be completed.",
                    conversation_id,
                    request_id,
                )
                _log_chat_response(
                    payload,
                    transport="sse",
                    path=path,
                    conversation_id=conversation_id,
                    request_id=request_id,
                    message_type="error",
                )
                yield "data: " + json.dumps(payload) + "\n\n"

        return StreamingResponse(
            generate(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-store",
                "X-Accel-Buffering": "no",
            },
        )

    @app.post("/api/vanna/v2/chat_poll")
    async def chat_poll(chat_request: XpdChatRequest) -> Any:
        conversation_id, request_id = _ids(chat_request)
        path = "/api/vanna/v2/chat_poll"
        _log_chat_request(
            chat_request,
            transport="poll",
            path=path,
            conversation_id=conversation_id,
            request_id=request_id,
        )
        try:
            chunks = [
                item
                async for item in run_chat(chat_request, conversation_id, request_id)
            ]
            response = XpdChatResponse(
                chunks=chunks,
                conversation_id=conversation_id,
                request_id=request_id,
                total_chunks=len(chunks),
            )
            _log_chat_response(
                response.model_dump(mode="json"),
                transport="poll",
                path=path,
                conversation_id=conversation_id,
                request_id=request_id,
                message_type="response",
            )
            return response
        except XpdError as exc:
            payload = _error_payload(exc.code, str(exc), conversation_id, request_id)
            _log_chat_response(
                payload,
                transport="poll",
                path=path,
                conversation_id=conversation_id,
                request_id=request_id,
                message_type="error",
            )
            return JSONResponse(status_code=503, content=payload)
        except Exception:
            logger.error("Unexpected XPD chat failure")
            payload = _error_payload(
                "xpd_internal_error",
                "The XPD request could not be completed.",
                conversation_id,
                request_id,
            )
            _log_chat_response(
                payload,
                transport="poll",
                path=path,
                conversation_id=conversation_id,
                request_id=request_id,
                message_type="error",
            )
            return JSONResponse(status_code=500, content=payload)

    return app
