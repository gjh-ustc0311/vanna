import asyncio
import json
import logging

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from vanna.servers.base import ChatResponse, ChatStreamChunk
from vanna.servers.fastapi import routes


CHAT_HEADERS = {
    "X-Request-Id": "heartbeat_request",
    "X-Trace-Id": "heartbeat_trace",
    "X-User-Id": "123",
}


@pytest.mark.asyncio
async def test_idle_heartbeat_keeps_one_pending_upstream_read_alive():
    release = asyncio.Event()
    closed = asyncio.Event()

    async def source():
        try:
            await release.wait()
            yield "payload"
        finally:
            closed.set()

    stream = routes._iterate_with_heartbeat(source(), interval_seconds=0.01)

    assert await asyncio.wait_for(stream.__anext__(), timeout=0.1) is None
    assert await asyncio.wait_for(stream.__anext__(), timeout=0.1) is None

    release.set()
    assert await asyncio.wait_for(stream.__anext__(), timeout=0.1) == "payload"
    with pytest.raises(StopAsyncIteration):
        await asyncio.wait_for(stream.__anext__(), timeout=0.1)
    assert closed.is_set()


@pytest.mark.asyncio
async def test_business_items_finish_without_redundant_heartbeat():
    async def source():
        yield "first"
        yield "second"

    items = [
        item
        async for item in routes._iterate_with_heartbeat(source(), interval_seconds=1)
    ]

    assert items == ["first", "second"]


@pytest.mark.asyncio
async def test_closing_heartbeat_stream_cancels_and_closes_upstream():
    closed = asyncio.Event()
    never = asyncio.Event()

    async def source():
        try:
            await never.wait()
            yield "unreachable"
        finally:
            closed.set()

    stream = routes._iterate_with_heartbeat(source(), interval_seconds=0.01)
    assert await asyncio.wait_for(stream.__anext__(), timeout=0.1) is None

    await stream.aclose()

    assert closed.is_set()


class DelayedChatHandler:
    async def handle_stream(self, request):
        await asyncio.sleep(0.03)
        yield ChatStreamChunk(
            component={"type": "text", "text": "answer"},
            conversation_id=request.conversation_id or "conv_heartbeat",
            request_id=request.request_id or "request_fallback",
        )

    async def handle_poll(self, request):
        return ChatResponse.from_chunks(
            [],
            conversation_id=request.conversation_id or "",
            request_id=request.request_id or "",
        )


class DelayedFailingChatHandler(DelayedChatHandler):
    async def handle_stream(self, request):
        await asyncio.sleep(0.03)
        if False:
            yield None
        raise RuntimeError("private failure")


class CapturingHandler(logging.Handler):
    def __init__(self):
        super().__init__()
        self.events = []

    def emit(self, record):
        self.events.append(json.loads(record.getMessage()))


def test_sse_route_writes_comment_heartbeat_before_delayed_data(monkeypatch):
    monkeypatch.setattr(routes, "_CHAT_SSE_HEARTBEAT_SECONDS", 0.005)
    app = FastAPI()
    logger = logging.getLogger(f"test.sse.heartbeat.{id(app)}")
    logger.setLevel(logging.INFO)
    logger.propagate = False
    capture = CapturingHandler()
    logger.addHandler(capture)
    routes.register_chat_routes(
        app,
        DelayedChatHandler(),  # type: ignore[arg-type]
        chat_sse_logger=logger,
    )

    response = TestClient(app).post(
        "/api/vanna/v3/chat_sse",
        json={"message": "hello", "conversation_id": "conv_heartbeat"},
        headers=CHAT_HEADERS,
    )

    data_frames = [
        line.removeprefix("data: ")
        for line in response.text.splitlines()
        if line.startswith("data: ")
    ]
    assert response.status_code == 200
    assert response.headers["cache-control"] == "no-cache, no-transform"
    assert response.headers["x-accel-buffering"] == "no"
    assert response.text.startswith(routes._CHAT_SSE_HEARTBEAT_FRAME)
    assert json.loads(data_frames[0])["component"]["text"] == "answer"
    assert data_frames[-1] == "[DONE]"
    assert [event["message_type"] for event in capture.events] == [
        "request",
        "chunk",
        "done",
    ]


def test_sse_route_heartbeat_then_safe_error_and_done(monkeypatch):
    monkeypatch.setattr(routes, "_CHAT_SSE_HEARTBEAT_SECONDS", 0.005)
    app = FastAPI()
    routes.register_chat_routes(
        app,
        DelayedFailingChatHandler(),  # type: ignore[arg-type]
    )

    response = TestClient(app).post(
        "/api/vanna/v3/chat_sse",
        json={"message": "hello", "conversation_id": "conv_heartbeat"},
        headers=CHAT_HEADERS,
    )

    data_frames = [
        line.removeprefix("data: ")
        for line in response.text.splitlines()
        if line.startswith("data: ")
    ]
    assert response.text.startswith(routes._CHAT_SSE_HEARTBEAT_FRAME)
    assert json.loads(data_frames[0])["error"]["code"] == "internal_error"
    assert "private failure" not in response.text
    assert data_frames[-1] == "[DONE]"
    assert response.text.endswith("data: [DONE]\n\n")
