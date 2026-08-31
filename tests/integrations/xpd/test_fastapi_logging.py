import io
import json
import logging
from logging.handlers import RotatingFileHandler

from fastapi import FastAPI
from fastapi.testclient import TestClient

from vanna.components import TextComponent
from vanna.core.agent import ProgressUpdate
from vanna.servers.base import ChatResponse, ChatStreamChunk, ChatStreamProgress
from vanna.servers.fastapi import VannaFastAPIServer
from vanna.servers.fastapi.routes import register_chat_routes
from vanna.servers.fastapi.xpd_logging import (
    XPD_CHAT_SSE_BACKUP_COUNT,
    XPD_CHAT_SSE_LOGGER_NAME,
    XPD_CHAT_SSE_MAX_BYTES,
    configure_xpd_chat_sse_logger,
    log_xpd_chat_sse_event,
)


class CapturingHandler(logging.Handler):
    def __init__(self):
        super().__init__()
        self.messages = []

    def emit(self, record):
        self.messages.append(record.getMessage())


class StubChatHandler:
    @staticmethod
    def _chunk(request, content):
        return ChatStreamChunk(
            component={"type": "text", "text": content},
            conversation_id=request.conversation_id or "conv_fallback",
            request_id=request.request_id or "req_fallback",
        )

    async def handle_stream(self, request):
        yield self._chunk(request, "第一条")
        yield self._chunk(request, "第二条")

    async def handle_poll(self, request):
        return ChatResponse.from_chunks([self._chunk(request, "poll")])


class FailingChatHandler:
    async def handle_stream(self, request):
        if False:
            yield None
        raise RuntimeError("stream failed")

    async def handle_poll(self, request):
        raise RuntimeError("poll failed")


class ProgressChatHandler(StubChatHandler):
    async def handle_events(self, request):
        yield ChatStreamProgress(
            progress=ProgressUpdate(stage="analyzing", message="正在分析问题…"),
            conversation_id=request.conversation_id or "conv_fallback",
            request_id=request.request_id or "req_fallback",
            timestamp=1,
        )
        yield self._chunk(request, "answer")


class ProgressThenFailChatHandler(FailingChatHandler):
    async def handle_events(self, request):
        yield ChatStreamProgress(
            progress=ProgressUpdate(stage="analyzing", message="正在分析问题…"),
            conversation_id=request.conversation_id or "conv_fallback",
            request_id=request.request_id or "req_fallback",
            timestamp=1,
        )
        raise RuntimeError("private failure")


class StubAgent:
    async def send_message(self, request_context, message, conversation_id=None):
        yield TextComponent(text="answer")


def _capturing_logger():
    logger = logging.getLogger(f"test.xpd.chat_sse.{id(object())}")
    logger.handlers.clear()
    logger.setLevel(logging.INFO)
    logger.propagate = False
    handler = CapturingHandler()
    logger.addHandler(handler)
    return logger, handler


def _events(handler):
    return [json.loads(message) for message in handler.messages]


def _close_dedicated_logger():
    logger = logging.getLogger(XPD_CHAT_SSE_LOGGER_NAME)
    for handler in list(logger.handlers):
        logger.removeHandler(handler)
        handler.close()


def test_xpd_sse_logs_request_every_wire_message_and_no_http_credentials():
    logger, handler = _capturing_logger()
    app = FastAPI()
    register_chat_routes(
        app,
        StubChatHandler(),  # type: ignore[arg-type]
        chat_sse_logger=logger,
    )
    client = TestClient(app)
    client.cookies.set("session", "secret-cookie")

    response = client.post(
        "/api/vanna/v3/chat_sse",
        json={"message": "中文问题", "metadata": {"来源": "测试"}},
        headers={"Authorization": "Bearer secret-token"},
    )

    assert response.status_code == 200
    wire_frames = [
        line.removeprefix("data: ")
        for line in response.text.splitlines()
        if line.startswith("data: ")
    ]
    wire_chunks = [json.loads(frame) for frame in wire_frames[:-1]]
    logs = _events(handler)

    assert [item["message_type"] for item in logs] == [
        "request",
        "chunk",
        "chunk",
        "done",
    ]
    assert logs[0]["event"] == "xpd.chat.request"
    assert logs[0]["transport"] == "sse"
    assert logs[0]["path"] == "/api/vanna/v3/chat_sse"
    assert logs[0]["payload"]["message"] == "中文问题"
    assert logs[0]["payload"]["metadata"] == {"来源": "测试"}
    assert logs[0]["payload"]["conversation_id"] == logs[0]["conversation_id"]
    assert logs[0]["payload"]["request_id"] == logs[0]["request_id"]
    assert logs[0]["conversation_id"] == wire_chunks[0]["conversation_id"]
    assert logs[0]["request_id"] == wire_chunks[0]["request_id"]
    assert logs[1]["payload"] == wire_chunks[0]
    assert logs[2]["payload"] == wire_chunks[1]
    assert logs[3]["payload"] == "[DONE]"
    assert wire_frames[-1] == "[DONE]"

    serialized_logs = "\n".join(handler.messages)
    assert "secret-cookie" not in serialized_logs
    assert "secret-token" not in serialized_logs
    assert "request_context" not in serialized_logs
    assert all("\n" not in message for message in handler.messages)


def test_xpd_sse_logs_safe_error_frame_and_terminates_stream():
    logger, handler = _capturing_logger()
    app = FastAPI()
    register_chat_routes(
        app,
        FailingChatHandler(),  # type: ignore[arg-type]
        chat_sse_logger=logger,
    )
    client = TestClient(app)

    response = client.post(
        "/api/vanna/v3/chat_sse",
        json={
            "message": "question",
            "conversation_id": "conv_1",
            "request_id": "req_1",
        },
    )

    error_payload = json.loads(response.text.splitlines()[0].removeprefix("data: "))
    logs = _events(handler)
    assert [item["message_type"] for item in logs] == ["request", "error"]
    assert logs[1]["payload"] == error_payload
    assert response.text.endswith("data: [DONE]\n\n")


def test_xpd_sse_logs_progress_as_a_distinct_wire_message():
    logger, handler = _capturing_logger()
    app = FastAPI()
    register_chat_routes(
        app,
        ProgressChatHandler(),  # type: ignore[arg-type]
        chat_sse_logger=logger,
    )

    response = TestClient(app).post(
        "/api/vanna/v3/chat_sse",
        json={
            "message": "question",
            "conversation_id": "conv_1",
            "request_id": "req_1",
        },
    )

    frames = [
        line.removeprefix("data: ")
        for line in response.text.splitlines()
        if line.startswith("data: ")
    ]
    logs = _events(handler)
    assert [item["message_type"] for item in logs] == [
        "request",
        "progress",
        "chunk",
        "done",
    ]
    assert json.loads(frames[0])["progress"] == {
        "stage": "analyzing",
        "message": "正在分析问题…",
    }
    assert json.loads(frames[1])["component"]["text"] == "answer"
    assert frames[-1] == "[DONE]"


def test_xpd_sse_progress_then_failure_uses_safe_error_and_done():
    logger, handler = _capturing_logger()
    app = FastAPI()
    register_chat_routes(
        app,
        ProgressThenFailChatHandler(),  # type: ignore[arg-type]
        chat_sse_logger=logger,
    )

    response = TestClient(app).post(
        "/api/vanna/v3/chat_sse",
        json={
            "message": "question",
            "conversation_id": "conv_1",
            "request_id": "req_1",
        },
    )

    frames = [
        line.removeprefix("data: ")
        for line in response.text.splitlines()
        if line.startswith("data: ")
    ]
    logs = _events(handler)
    assert [item["message_type"] for item in logs] == [
        "request",
        "progress",
        "error",
    ]
    assert "progress" in json.loads(frames[0])
    assert json.loads(frames[1])["error"]["code"] == "internal_error"
    assert "private failure" not in response.text
    assert frames[-1] == "[DONE]"


def test_poll_failure_uses_safe_typed_error_envelope():
    app = FastAPI()
    register_chat_routes(app, FailingChatHandler())  # type: ignore[arg-type]

    response = TestClient(app).post(
        "/api/vanna/v3/chat_poll",
        json={"message": "question", "conversation_id": "conv_1"},
    )

    assert response.status_code == 500
    assert response.json()["error"] == {
        "code": "internal_error",
        "message": "The request could not be completed. Please try again.",
    }
    assert response.json()["conversation_id"] == "conv_1"
    assert "poll failed" not in response.text


def test_xpd_logger_is_not_used_by_poll_or_unconfigured_sse():
    logger, handler = _capturing_logger()
    logged_app = FastAPI()
    register_chat_routes(
        logged_app,
        StubChatHandler(),  # type: ignore[arg-type]
        chat_sse_logger=logger,
    )
    logged_client = TestClient(logged_app)

    poll = logged_client.post("/api/vanna/v3/chat_poll", json={"message": "poll"})
    index = logged_client.get("/")

    plain_app = FastAPI()
    register_chat_routes(plain_app, StubChatHandler())  # type: ignore[arg-type]
    plain_sse = TestClient(plain_app).post(
        "/api/vanna/v3/chat_sse", json={"message": "plain"}
    )

    assert poll.status_code == 200
    assert index.status_code == 200
    assert plain_sse.status_code == 200
    assert handler.messages == []


def test_logger_writes_utf8_to_console_and_rotating_file_idempotently(tmp_path):
    log_path = tmp_path / "nested" / "xpd-chat.log"
    console = io.StringIO()

    try:
        logger = configure_xpd_chat_sse_logger(log_path, console_stream=console)
        rotating_handlers = [
            handler
            for handler in logger.handlers
            if isinstance(handler, RotatingFileHandler)
        ]
        assert len(rotating_handlers) == 1
        assert rotating_handlers[0].maxBytes == XPD_CHAT_SSE_MAX_BYTES
        assert rotating_handlers[0].backupCount == XPD_CHAT_SSE_BACKUP_COUNT

        log_xpd_chat_sse_event(
            logger,
            event="xpd.chat.request",
            path="/api/vanna/v3/chat_sse",
            conversation_id="conv_1",
            request_id="req_1",
            message_type="request",
            payload={"message": "你好"},
        )
        first_line = log_path.read_text(encoding="utf-8").splitlines()[0]
        assert json.loads(first_line)["payload"] == {"message": "你好"}
        assert first_line in console.getvalue()

        logger = configure_xpd_chat_sse_logger(log_path, console_stream=console)
        logger.info('{"event":"second"}')
        lines = log_path.read_text(encoding="utf-8").splitlines()
        assert lines.count('{"event":"second"}') == 1
        assert len(logger.handlers) == 2
    finally:
        _close_dedicated_logger()


def test_logger_rotates_and_limits_backup_count(tmp_path):
    log_path = tmp_path / "rotate" / "xpd-chat.log"

    try:
        logger = configure_xpd_chat_sse_logger(
            log_path,
            max_bytes=180,
            backup_count=2,
            console_stream=io.StringIO(),
        )
        for index in range(20):
            logger.info(json.dumps({"index": index, "payload": "x" * 80}))
        for handler in logger.handlers:
            handler.flush()

        backups = sorted(log_path.parent.glob("xpd-chat.log.*"))
        assert log_path.exists()
        assert backups
        assert len(backups) <= 2
    finally:
        _close_dedicated_logger()


def test_server_creates_logs_only_when_xpd_logging_is_enabled(tmp_path, monkeypatch):
    plain_dir = tmp_path / "plain"
    plain_dir.mkdir()
    monkeypatch.chdir(plain_dir)
    plain_client = TestClient(VannaFastAPIServer(StubAgent()).create_app())
    assert (
        plain_client.post(
            "/api/vanna/v3/chat_sse", json={"message": "plain"}
        ).status_code
        == 200
    )
    assert not (plain_dir / "logs").exists()

    xpd_dir = tmp_path / "xpd"
    xpd_dir.mkdir()
    monkeypatch.chdir(xpd_dir)
    try:
        xpd_app = VannaFastAPIServer(
            StubAgent(), config={"_xpd_chat_sse_logging": True}
        ).create_app()
        xpd_response = TestClient(xpd_app).post(
            "/api/vanna/v3/chat_sse", json={"message": "xpd"}
        )
        events = [
            json.loads(line)
            for line in (xpd_dir / "logs" / "xpd-chat.log")
            .read_text(encoding="utf-8")
            .splitlines()
        ]

        assert xpd_response.status_code == 200
        assert [event["message_type"] for event in events] == [
            "request",
            "chunk",
            "done",
        ]
    finally:
        _close_dedicated_logger()
