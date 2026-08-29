from pathlib import Path

from fastapi.testclient import TestClient

from vanna.components import RichTextComponent, SimpleTextComponent, UiComponent
from vanna.integrations.xpd.web import create_xpd_app


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


def test_html_and_assets_are_local_and_have_no_auth_or_export_surface():
    client = TestClient(create_xpd_app(FakeAgent()))

    page = client.get("/")
    script = client.get("/static/xpd-chat.js")

    assert page.status_code == 200
    assert 'src="/static/xpd-chat.js"' in page.text
    assert 'href="/static/xpd-chat.css"' in page.text
    assert "http://" not in page.text
    assert "https://" not in page.text
    assert "login" not in page.text.lower()
    assert "logout" not in page.text.lower()
    assert "cookie" not in page.text.lower()
    assert "export" not in page.text.lower()
    assert "innerHTML" not in script.text
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


def test_poll_returns_component_chunks_and_preserves_request_ids():
    agent = FakeAgent()
    client = TestClient(create_xpd_app(agent))

    response = client.post(
        "/api/vanna/v2/chat_poll",
        json={
            "message": "question",
            "conversation_id": "conv_1",
            "request_id": "req_1",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["total_chunks"] == 1
    assert payload["conversation_id"] == "conv_1"
    assert payload["request_id"] == "req_1"
    assert payload["chunks"][0]["rich"]["type"] == "text"
    assert payload["chunks"][0]["rich"]["data"]["content"] == "answer"
    assert agent.calls[0][2:] == ("conv_1", "req_1")


def test_sse_is_framed_and_is_not_replayed_through_poll():
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


def test_invalid_requests_and_failures_return_stable_sanitized_errors():
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


def test_frontend_selects_transport_before_dispatch_and_has_no_remote_assets():
    static_dir = Path(__file__).parents[3] / "src/vanna/integrations/xpd/static"
    javascript = (static_dir / "xpd-chat.js").read_text(encoding="utf-8")
    css = (static_dir / "xpd-chat.css").read_text(encoding="utf-8")

    assert "if (supportsStreaming) await sendSse(payload);" in javascript
    assert "else await sendPoll(payload);" in javascript
    assert (
        "sendPoll(payload)"
        not in javascript.split("async function sendSse", 1)[1].split(
            "async function sendPoll", 1
        )[0]
    )
    assert "http://" not in javascript + css
    assert "https://" not in javascript + css
