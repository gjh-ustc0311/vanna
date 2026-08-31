from pathlib import Path

from click.testing import CliRunner

from vanna.core.llm import LlmMessage, LlmRequest, LlmResponse
from vanna.core.tool import ToolSchema
from vanna.core.user import User
from vanna.core.user.request_context import RequestContext
from vanna.integrations.xpd import factory
from vanna.integrations.xpd.factory import XpdHeaderUserResolver
from vanna.integrations.xpd.llm import XpdOpenAILlmService
from vanna.integrations.local import FileSystemConversationStore
from vanna.servers.cli.server_runner import main


CHAT_HEADERS = {
    "X-Request-Id": "turn_test",
    "X-Trace-Id": "trace_test",
    "X-User-Id": "123",
}


class DummyLlm:
    async def send_request(self, request):
        return LlmResponse(content="ok")

    async def validate_tools(self, tools):
        return []


class DummyCatalog:
    evidence_value = None

    def __init__(self, database):
        self.evidence = self.evidence_value

    def load(self):
        return self.evidence


def test_factory_registers_only_two_group_restricted_tools(
    monkeypatch, tmp_path, profile_settings, schema_evidence
):
    monkeypatch.chdir(tmp_path)
    DummyCatalog.evidence_value = schema_evidence
    monkeypatch.setattr(factory, "XpdSchemaCatalog", DummyCatalog)
    monkeypatch.setattr(factory, "XpdOpenAILlmService", lambda **kwargs: DummyLlm())

    agent = factory.create_xpd_agent(profile_settings)

    assert isinstance(agent.user_resolver, XpdHeaderUserResolver)
    assert set(_run(agent.tool_registry.list_tools())) == {
        "search_xpd_schema",
        "run_xpd_sql",
    }
    schemas = _run(agent.tool_registry.get_schemas())
    assert all(schema.access_groups == ["xpd"] for schema in schemas)
    assert agent.config.temperature == 0
    assert isinstance(agent.conversation_store, FileSystemConversationStore)
    assert agent.conversation_store.base_dir == Path("datas/history_storage")
    assert agent.conversation_store.owner_scoped is True
    assert agent.xpd_oss_publisher is None
    assert agent.xpd_file_store.root == Path("datas/files")
    assert agent.xpd_local_file_download_enabled is True


def test_xpd_resolver_uses_validated_numeric_header_identity():
    resolver = XpdHeaderUserResolver()
    for user_id in ("0", "9223372036854775808", "18446744073709551615"):
        user = _run(resolver.resolve_user(RequestContext(user_id=user_id)))

        assert user.id == user_id
        assert user.username == f"xpd-user-{user_id}"
        assert user.group_memberships == ["xpd"]


def test_local_template_uses_header_identity_without_cookie_login():
    from vanna.servers.base.templates import get_index_html

    html = get_index_html()
    cdn_html = get_index_html(cdn_url="https://cdn.example.com/vanna.js")

    assert 'action="/login"' not in html
    assert 'action="/logout"' not in html
    assert "numeric XPD user ID in local storage" in html
    assert 'sse-endpoint="/api/vanna/v3/chat_sse"' in html
    assert 'poll-endpoint="/api/vanna/v3/chat_poll"' in html
    assert "ws-endpoint" not in html
    assert "WebSocket" not in html
    assert "document.cookie" not in html
    assert '<script type="module" src="/static/vanna-components.js"></script>' in html
    assert "https://img.vanna.ai" not in html
    assert 'src="https://cdn.example.com/vanna.js"' in cdn_html


def test_fastapi_serves_header_identity_page_without_login_routes():
    from fastapi.testclient import TestClient
    from starlette.routing import WebSocketRoute

    from vanna.servers.fastapi import VannaFastAPIServer

    app = VannaFastAPIServer(None).create_app()  # type: ignore[arg-type]
    client = TestClient(app)

    index = client.get("/")
    health = client.get("/health")
    route_paths = {route.path for route in app.routes}

    assert index.status_code == 200
    assert "numeric XPD user ID in local storage" in index.text
    assert health.json() == {"status": "healthy", "service": "vanna"}
    assert app.version == "3.0.0"
    assert {
        "/",
        "/api/vanna/v3/chat_sse",
        "/api/vanna/v3/chat_poll",
        "/health",
    } <= route_paths
    assert "/login" not in route_paths
    assert "/logout" not in route_paths
    assert "/api/vanna/v2/chat_sse" not in route_paths
    assert "/api/vanna/v2/chat_poll" not in route_paths
    assert not any(isinstance(route, WebSocketRoute) for route in app.routes)


def test_fastapi_serves_the_version_matched_webcomponent_bundle():
    from fastapi.testclient import TestClient

    from vanna.servers.fastapi import VannaFastAPIServer
    from vanna.web_components import get_component_files

    bundle = get_component_files()["js"]
    assert bundle.is_file()

    client = TestClient(VannaFastAPIServer(None).create_app())  # type: ignore[arg-type]
    response = client.get("/static/vanna-components.js")

    assert response.status_code == 200
    assert "/api/vanna/v3/chat_sse" in response.text
    assert "Thinking…" in response.text
    assert "Sending message..." not in response.text


def test_fastapi_cors_allows_and_exposes_xpd_protocol_headers():
    from fastapi.testclient import TestClient

    from vanna.servers.fastapi import VannaFastAPIServer

    origin = "https://xpd.example"
    app = VannaFastAPIServer(  # type: ignore[arg-type]
        None,
        config={
            "cors": {
                "allow_origins": [origin],
                "allow_methods": ["POST"],
                "allow_headers": ["Content-Type"],
                "expose_headers": ["X-Existing"],
            }
        },
    ).create_app()
    client = TestClient(app)

    preflight = client.options(
        "/api/vanna/v3/chat_sse",
        headers={
            "Origin": origin,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": (
                "Content-Type,X-Request-Id,X-Trace-Id,X-User-Id"
            ),
        },
    )
    page = client.get("/", headers={"Origin": origin})

    allowed = {
        value.strip().lower()
        for value in preflight.headers["access-control-allow-headers"].split(",")
    }
    exposed = {
        value.strip().lower()
        for value in page.headers["access-control-expose-headers"].split(",")
    }
    assert preflight.status_code == 200
    assert {"x-request-id", "x-trace-id", "x-user-id"} <= allowed
    assert {"x-request-id", "x-trace-id"} <= exposed


def test_fastapi_sse_and_polling_contracts():
    from fastapi import FastAPI
    from fastapi.testclient import TestClient

    from vanna.servers.base import ChatResponse, ChatStreamChunk
    from vanna.servers.fastapi.routes import register_chat_routes

    class StubChatHandler:
        @staticmethod
        def _chunk(request):
            return ChatStreamChunk(
                component={"type": "text", "text": "ok"},
                conversation_id=request.conversation_id or "conv_test",
                request_id=request.request_id or "req_test",
            )

        async def handle_stream(self, request):
            yield self._chunk(request)

        async def handle_poll(self, request):
            return ChatResponse.from_chunks([self._chunk(request)])

    app = FastAPI()
    register_chat_routes(app, StubChatHandler())  # type: ignore[arg-type]
    client = TestClient(app)

    sse = client.post(
        "/api/vanna/v3/chat_sse",
        json={"message": "hello", "conversation_id": "conv_1"},
        headers=CHAT_HEADERS,
    )
    poll = client.post(
        "/api/vanna/v3/chat_poll",
        json={"message": "hello", "conversation_id": "conv_1"},
        headers=CHAT_HEADERS,
    )

    assert sse.status_code == 200
    assert sse.headers["x-request-id"] == "turn_test"
    assert sse.headers["x-trace-id"] == "trace_test"
    assert sse.headers["content-type"].startswith("text/event-stream")
    assert '"conversation_id":"conv_1"' in sse.text
    assert sse.text.endswith("data: [DONE]\n\n")
    assert poll.status_code == 200
    assert poll.headers["x-request-id"] == "turn_test"
    assert poll.json()["conversation_id"] == "conv_1"
    assert poll.json()["total_chunks"] == 1


def _run(awaitable):
    import asyncio

    return asyncio.run(awaitable)


def test_cli_requires_xpd_config_and_rejects_non_loopback_host(tmp_path):
    profile = tmp_path / "profile.yaml"
    profile.write_text("placeholder", encoding="utf-8")
    runner = CliRunner()

    missing = runner.invoke(main, [])
    public = runner.invoke(main, ["--xpd-config", str(profile), "--host", "0.0.0.0"])

    assert missing.exit_code == 2
    assert "Missing option '--xpd-config'" in missing.output
    assert public.exit_code == 2
    assert "local-only" in public.output


def test_cli_is_fastapi_only():
    runner = CliRunner()

    help_result = runner.invoke(main, ["--help"])
    removed_option = runner.invoke(main, ["--framework", "fastapi"])

    assert help_result.exit_code == 0
    assert "--framework" not in help_result.output
    assert "--debug" not in help_result.output
    assert "--example" not in help_result.output
    assert "--list-examples" not in help_result.output
    assert removed_option.exit_code == 2
    assert "No such option" in removed_option.output
    assert "--framework" in removed_option.output


def test_xpd_model_payload_is_deterministic_and_serializes_tool_calls():
    service = object.__new__(XpdOpenAILlmService)
    service.model = "test-model"
    request = LlmRequest(
        messages=[LlmMessage(role="user", content="question")],
        tools=[
            ToolSchema(
                name="search_xpd_schema",
                description="schema",
                parameters={"type": "object", "properties": {}},
            )
        ],
        user=User(id="u"),
        temperature=1.5,
    )

    payload = service._build_payload(request)

    assert payload["temperature"] == 0
    assert payload["parallel_tool_calls"] is False
    assert payload["tool_choice"] == "auto"


def test_cli_uses_loopback_default_for_xpd_mode(monkeypatch, tmp_path):
    import vanna.integrations.xpd as xpd
    from vanna.servers.fastapi import app as fastapi_app

    profile = tmp_path / "profile.yaml"
    profile.write_text("placeholder", encoding="utf-8")
    captured = {}

    class FakeServer:
        def __init__(self, agent, config):
            captured["agent"] = agent
            captured["config"] = config

        def run(self, host, port):
            captured.update(host=host, port=port)

    monkeypatch.setattr(xpd, "load_xpd_profile", lambda path: object())
    monkeypatch.setattr(xpd, "create_xpd_agent", lambda settings: object())
    monkeypatch.setattr(fastapi_app, "VannaFastAPIServer", FakeServer)

    result = CliRunner().invoke(main, ["--xpd-config", str(profile)])

    assert result.exit_code == 0, result.output
    assert captured["host"] == "127.0.0.1"
    assert captured["port"] == 8000
    assert captured["config"]["_xpd_chat_sse_logging"] is True
    assert captured["config"]["cdn_url"] is None
    assert captured["config"]["static_folder"] is None


def test_cli_accepts_all_loopback_host_forms(monkeypatch, tmp_path):
    import vanna.integrations.xpd as xpd
    from vanna.servers.fastapi import app as fastapi_app

    profile = tmp_path / "profile.yaml"
    profile.write_text("placeholder", encoding="utf-8")
    captured_hosts = []

    class FakeServer:
        def __init__(self, agent, config):
            pass

        def run(self, host, port):
            captured_hosts.append(host)

    monkeypatch.setattr(xpd, "load_xpd_profile", lambda path: object())
    monkeypatch.setattr(xpd, "create_xpd_agent", lambda settings: object())
    monkeypatch.setattr(fastapi_app, "VannaFastAPIServer", FakeServer)

    runner = CliRunner()
    for host in ("localhost", "::1"):
        result = runner.invoke(main, ["--xpd-config", str(profile), "--host", host])
        assert result.exit_code == 0, result.output

    assert captured_hosts == ["localhost", "::1"]
