from pathlib import Path

from click.testing import CliRunner

from vanna.core.llm import LlmMessage, LlmRequest, LlmResponse
from vanna.core.tool import ToolSchema
from vanna.core.user import User
from vanna.core.user.request_context import RequestContext
from vanna.integrations.xpd import factory
from vanna.integrations.xpd.factory import FixedLocalXpdUserResolver
from vanna.integrations.xpd.llm import XpdOpenAILlmService
from vanna.integrations.local import FileSystemConversationStore
from vanna.servers.cli.server_runner import main


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

    assert isinstance(agent.user_resolver, FixedLocalXpdUserResolver)
    assert set(_run(agent.tool_registry.list_tools())) == {
        "search_xpd_schema",
        "run_xpd_sql",
    }
    schemas = _run(agent.tool_registry.get_schemas())
    assert all(schema.access_groups == ["xpd"] for schema in schemas)
    assert agent.config.temperature == 0
    assert isinstance(agent.conversation_store, FileSystemConversationStore)
    assert agent.conversation_store.base_dir == Path("datas/history_storage")


def test_local_xpd_resolver_maps_admin_cookie_to_xpd_admin():
    resolver = FixedLocalXpdUserResolver()

    admin = _run(
        resolver.resolve_user(
            RequestContext(cookies={"vanna_email": "admin%40example.com"})
        )
    )
    user = _run(
        resolver.resolve_user(
            RequestContext(cookies={"vanna_email": "user@example.com"})
        )
    )

    assert admin.email == "admin@example.com"
    assert admin.group_memberships == ["xpd", "admin"]
    assert user.email == "user@example.com"
    assert user.group_memberships == ["xpd"]


def test_login_template_uses_server_backed_forms():
    from vanna.servers.base.templates import get_index_html

    html = get_index_html()
    logged_in = get_index_html(logged_in_email="admin@example.com")

    assert '<form id="loginForm" method="post" action="/login">' in html
    assert 'name="email"' in html
    assert 'type="submit" id="loginButton"' in html
    assert '<form method="post" action="/logout"' in html
    assert 'sse-endpoint="/api/vanna/v2/chat_sse"' in html
    assert 'poll-endpoint="/api/vanna/v2/chat_poll"' in html
    assert "ws-endpoint" not in html
    assert "WebSocket" not in html
    assert "document.cookie" not in html
    assert "admin@example.com</span>" in logged_in
    assert 'id="loginContainer" class="max-w-md' in logged_in
    assert "border-vanna-teal/30 hidden" in logged_in


def test_fastapi_local_login_sets_cookie_and_renders_authenticated_page():
    from fastapi.testclient import TestClient
    from starlette.routing import WebSocketRoute

    from vanna.servers.fastapi import VannaFastAPIServer

    app = VannaFastAPIServer(None).create_app()  # type: ignore[arg-type]
    client = TestClient(app)

    response = client.post(
        "/login", data={"email": "admin@example.com"}, follow_redirects=False
    )
    authenticated = client.get("/")
    invalid = client.post(
        "/login", data={"email": "unknown@example.com"}, follow_redirects=False
    )
    health = client.get("/health")
    route_paths = {route.path for route in app.routes}

    assert response.status_code == 303
    assert "admin@example.com" in response.headers["set-cookie"]
    assert "admin@example.com</span>" in authenticated.text
    assert invalid.status_code == 400
    assert health.json() == {"status": "healthy", "service": "vanna"}
    assert {
        "/",
        "/login",
        "/logout",
        "/api/vanna/v2/chat_sse",
        "/api/vanna/v2/chat_poll",
        "/health",
    } <= route_paths
    assert "/api/vanna/v2/chat_websocket" not in route_paths
    assert not any(isinstance(route, WebSocketRoute) for route in app.routes)


def test_fastapi_sse_and_polling_contracts():
    from fastapi import FastAPI
    from fastapi.testclient import TestClient

    from vanna.servers.base import ChatResponse, ChatStreamChunk
    from vanna.servers.fastapi.routes import register_chat_routes

    class StubChatHandler:
        @staticmethod
        def _chunk(request):
            return ChatStreamChunk(
                rich={"type": "rich_text", "content": "ok"},
                simple=None,
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
        "/api/vanna/v2/chat_sse",
        json={"message": "hello", "conversation_id": "conv_1"},
    )
    poll = client.post(
        "/api/vanna/v2/chat_poll",
        json={"message": "hello", "conversation_id": "conv_1"},
    )

    assert sse.status_code == 200
    assert sse.headers["content-type"].startswith("text/event-stream")
    assert '"conversation_id":"conv_1"' in sse.text
    assert sse.text.endswith("data: [DONE]\n\n")
    assert poll.status_code == 200
    assert poll.json()["conversation_id"] == "conv_1"
    assert poll.json()["total_chunks"] == 1


def _run(awaitable):
    import asyncio

    return asyncio.run(awaitable)


def test_cli_rejects_mixed_modes_and_non_loopback_xpd_host(tmp_path):
    profile = tmp_path / "profile.yaml"
    profile.write_text("placeholder", encoding="utf-8")
    runner = CliRunner()

    mixed = runner.invoke(
        main, ["--example", "mock_quickstart", "--xpd-config", str(profile)]
    )
    public = runner.invoke(main, ["--xpd-config", str(profile), "--host", "0.0.0.0"])

    assert mixed.exit_code == 2
    assert "mutually exclusive" in mixed.output
    assert public.exit_code == 2
    assert "local-only" in public.output


def test_cli_is_fastapi_only():
    runner = CliRunner()

    help_result = runner.invoke(main, ["--help"])
    removed_option = runner.invoke(main, ["--framework", "fastapi"])

    assert help_result.exit_code == 0
    assert "--framework" not in help_result.output
    assert "--debug" not in help_result.output
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


def test_cli_does_not_enable_xpd_logging_for_example_mode(monkeypatch):
    from vanna.servers.cli import server_runner
    from vanna.servers.fastapi import app as fastapi_app

    captured = {}

    class FakeServer:
        def __init__(self, agent, config):
            captured["config"] = config

        def run(self, host, port):
            captured.update(host=host, port=port)

    monkeypatch.setattr(
        server_runner.ExampleAgentLoader,
        "load_example_agent",
        lambda example_name: object(),
    )
    monkeypatch.setattr(fastapi_app, "VannaFastAPIServer", FakeServer)

    result = CliRunner().invoke(main, ["--example", "mock_quickstart"])

    assert result.exit_code == 0, result.output
    assert captured["config"]["_xpd_chat_sse_logging"] is False
