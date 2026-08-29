import json
import logging
from pathlib import Path

from fastapi.testclient import TestClient

from vanna.components import (
    DataFrameComponent,
    RichTextComponent,
    SimpleTextComponent,
    UiComponent,
)
from vanna.integrations.xpd.web import create_xpd_app


_LOGGER_NAME = "uvicorn.error.xpd"


def _chat_log_records(caplog):
    records = []
    for record in caplog.records:
        try:
            payload = json.loads(record.getMessage())
        except json.JSONDecodeError:
            continue
        if payload.get("event") in {"xpd.chat.request", "xpd.chat.response"}:
            records.append(payload)
    return records


class FakeAgent:
    def __init__(self):
        self.calls = []

    async def send_message(
        self, context, message, *, conversation_id=None, request_id=None
    ):
        self.calls.append((context, message, conversation_id, request_id))
        yield UiComponent(
            rich_component=RichTextComponent(content="answer"),
            simple_component=SimpleTextComponent(text="answer"),
        )


class FailingAgent:
    async def send_message(
        self, context, message, *, conversation_id=None, request_id=None
    ):
        if False:
            yield None
        raise RuntimeError("secret upstream details")


class MarkdownAgent:
    async def send_message(
        self, context, message, *, conversation_id=None, request_id=None
    ):
        content = "# 查询结论\n\n- **支付金额**：12.50"
        yield UiComponent(
            rich_component=RichTextComponent(content=content, markdown=True),
            simple_component=SimpleTextComponent(text=content),
        )


class TableAgent:
    async def send_message(
        self, context, message, *, conversation_id=None, request_id=None
    ):
        rows = [
            {"item_id": "商品-1", "pay_amt": "12.50"},
            {"item_id": "商品-2", "pay_amt": "8.00"},
        ]
        yield UiComponent(
            rich_component=DataFrameComponent(
                rows=rows,
                columns=["item_id", "pay_amt"],
                title="完整结果",
            ),
            simple_component=SimpleTextComponent(text="返回 2 行"),
        )


def test_html_and_assets_are_local_and_have_no_auth_or_export_surface():
    client = TestClient(create_xpd_app(FakeAgent()))

    page = client.get("/")
    script = client.get("/static/xpd-chat.js")
    markdown_script = client.get("/static/xpd-markdown.mjs")

    assert page.status_code == 200
    assert script.status_code == 200
    assert markdown_script.status_code == 200
    assert markdown_script.headers["content-type"].startswith("text/javascript")
    assert 'src="/static/xpd-chat.js"' in page.text
    assert 'href="/static/xpd-chat.css"' in page.text
    assert "http://" not in page.text
    assert "https://" not in page.text
    assert "login" not in page.text.lower()
    assert "logout" not in page.text.lower()
    assert "cookie" not in page.text.lower()
    assert "export" not in page.text.lower()
    assert "innerHTML" not in script.text + markdown_script.text
    assert "insertAdjacentHTML" not in script.text + markdown_script.text
    assert 'from "./xpd-markdown.mjs"' in script.text
    assert "download" not in script.text.lower()


def test_only_xpd_routes_are_present_and_security_headers_are_applied():
    app = create_xpd_app(FakeAgent())
    client = TestClient(app)
    paths = {route.path for route in app.routes}

    response = client.get("/health")

    assert paths == {
        "/",
        "/health",
        "/static",
        "/api/vanna/v2/chat_sse",
        "/api/vanna/v2/chat_poll",
    }
    assert response.json() == {
        "status": "ok",
        "service": "vanna-xpd",
        "contract_version": "xpd-core-v1",
    }
    assert response.headers["content-security-policy"].startswith("default-src 'self'")
    assert response.headers["x-content-type-options"] == "nosniff"
    assert response.headers["referrer-policy"] == "no-referrer"
    assert "set-cookie" not in response.headers
    assert "access-control-allow-origin" not in response.headers
    assert client.get("/login").status_code == 404
    assert client.get("/docs").status_code == 404
    assert client.get("/openapi.json").status_code == 404


def test_poll_returns_component_chunks_and_preserves_request_ids(caplog):
    caplog.set_level(logging.INFO, logger=_LOGGER_NAME)
    agent = TableAgent()
    client = TestClient(create_xpd_app(agent))

    response = client.post(
        "/api/vanna/v2/chat_poll",
        json={
            "message": "查询完整支付结果",
            "conversation_id": "conv_1",
            "request_id": "req_1",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["total_chunks"] == 1
    assert payload["conversation_id"] == "conv_1"
    assert payload["request_id"] == "req_1"
    assert payload["chunks"][0]["rich"]["type"] == "dataframe"

    logs = _chat_log_records(caplog)
    assert [item["event"] for item in logs] == [
        "xpd.chat.request",
        "xpd.chat.response",
    ]
    assert logs[0]["transport"] == "poll"
    assert logs[0]["message_type"] == "request"
    assert logs[0]["payload"] == {
        "message": "查询完整支付结果",
        "conversation_id": "conv_1",
        "request_id": "req_1",
    }
    assert logs[1]["message_type"] == "response"
    assert logs[1]["payload"] == payload
    assert logs[1]["payload"]["chunks"][0]["rich"]["data"]["data"] == [
        {"item_id": "商品-1", "pay_amt": "12.50"},
        {"item_id": "商品-2", "pay_amt": "8.00"},
    ]


def test_sse_is_framed_logged_per_message_and_not_replayed_through_poll(caplog):
    caplog.set_level(logging.INFO, logger=_LOGGER_NAME)
    agent = FakeAgent()
    client = TestClient(create_xpd_app(agent))

    response = client.post(
        "/api/vanna/v2/chat_sse",
        json={"message": "question", "conversation_id": "conv_1"},
    )

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/event-stream")
    assert response.text.count("data: {") == 1
    assert response.text.endswith("data: [DONE]\n\n")
    assert len(agent.calls) == 1

    wire_chunk = json.loads(response.text.splitlines()[0].removeprefix("data: "))
    logs = _chat_log_records(caplog)
    assert [item["message_type"] for item in logs] == [
        "request",
        "chunk",
        "done",
    ]
    assert logs[0]["transport"] == "sse"
    assert logs[0]["conversation_id"] == "conv_1"
    assert logs[0]["request_id"] == wire_chunk["request_id"]
    assert logs[1]["payload"] == wire_chunk
    assert logs[2]["payload"] == "[DONE]"


def test_markdown_marker_is_preserved_by_poll_and_sse():
    client = TestClient(create_xpd_app(MarkdownAgent()))

    poll = client.post(
        "/api/vanna/v2/chat_poll",
        json={"message": "question", "conversation_id": "conv_poll"},
    )
    sse = client.post(
        "/api/vanna/v2/chat_sse",
        json={"message": "question", "conversation_id": "conv_sse"},
    )

    assert poll.status_code == 200
    poll_chunk = poll.json()["chunks"][0]
    sse_chunk = json.loads(sse.text.splitlines()[0].removeprefix("data: "))
    for chunk in (poll_chunk, sse_chunk):
        assert chunk["rich"]["type"] == "text"
        assert chunk["rich"]["data"] == {
            "content": "# 查询结论\n\n- **支付金额**：12.50",
            "markdown": True,
        }
        assert chunk["simple"] == {
            "type": "text",
            "text": "# 查询结论\n\n- **支付金额**：12.50",
        }


def test_invalid_requests_and_failures_return_stable_sanitized_errors(caplog):
    caplog.set_level(logging.INFO, logger=_LOGGER_NAME)
    valid_client = TestClient(create_xpd_app(FakeAgent()))
    failing_client = TestClient(create_xpd_app(FailingAgent()))

    invalid = valid_client.post(
        "/api/vanna/v2/chat_poll",
        json={"message": "q", "unexpected": True},
    )
    failed = failing_client.post(
        "/api/vanna/v2/chat_poll",
        json={"message": "q", "request_id": "req_1"},
    )

    assert invalid.status_code == 400
    assert invalid.json()["data"] == {
        "code": "xpd_request_invalid",
        "message": "The request is invalid.",
    }
    assert "unexpected" not in invalid.text
    assert failed.status_code == 500
    assert failed.json()["data"] == {
        "code": "xpd_internal_error",
        "message": "The XPD request could not be completed.",
    }
    assert "secret upstream details" not in failed.text
    assert "Traceback" not in failed.text

    logs = _chat_log_records(caplog)
    assert [item["message_type"] for item in logs] == [
        "request",
        "error",
        "request",
        "error",
    ]
    assert logs[0]["payload"] == {"message": "q", "unexpected": True}
    assert logs[1]["payload"] == invalid.json()
    assert logs[3]["payload"] == failed.json()
    assert "secret upstream details" not in caplog.text


def test_sse_error_frame_is_logged_without_underlying_exception(caplog):
    caplog.set_level(logging.INFO, logger=_LOGGER_NAME)
    client = TestClient(create_xpd_app(FailingAgent()))

    response = client.post(
        "/api/vanna/v2/chat_sse",
        json={"message": "q", "conversation_id": "conv_1", "request_id": "req_1"},
    )

    assert response.status_code == 200
    error_payload = json.loads(response.text.splitlines()[0].removeprefix("data: "))
    assert error_payload["data"]["code"] == "xpd_internal_error"
    assert "[DONE]" not in response.text

    logs = _chat_log_records(caplog)
    assert [item["message_type"] for item in logs] == ["request", "error"]
    assert logs[1]["payload"] == error_payload
    assert "secret upstream details" not in caplog.text


def test_non_chat_routes_do_not_emit_xpd_business_logs(caplog):
    caplog.set_level(logging.INFO, logger=_LOGGER_NAME)
    client = TestClient(create_xpd_app(FakeAgent()))

    assert client.get("/").status_code == 200
    assert client.get("/health").status_code == 200
    assert client.get("/static/xpd-chat.css").status_code == 200

    assert _chat_log_records(caplog) == []


def test_frontend_selects_transport_before_dispatch_and_has_no_remote_assets():
    static_dir = Path(__file__).parents[3] / "src/vanna/integrations/xpd/static"
    javascript = (static_dir / "xpd-chat.js").read_text(encoding="utf-8")
    markdown = (static_dir / "xpd-markdown.mjs").read_text(encoding="utf-8")
    css = (static_dir / "xpd-chat.css").read_text(encoding="utf-8")

    assert "if (supportsStreaming) await sendSse(payload);" in javascript
    assert "else await sendPoll(payload);" in javascript
    assert (
        "sendPoll(payload)"
        not in javascript.split("async function sendSse", 1)[1].split(
            "async function sendPoll", 1
        )[0]
    )
    assert "data.markdown === true" in javascript
    assert "innerHTML" not in javascript + markdown
    assert "http://" not in javascript + markdown + css
    assert "https://" not in javascript + markdown + css
