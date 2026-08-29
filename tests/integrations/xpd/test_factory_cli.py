from pathlib import Path

from click.testing import CliRunner

from vanna.core.llm import LlmMessage, LlmRequest, LlmResponse
from vanna.core.tool import ToolSchema
from vanna.core.user import User
from vanna.core.user.request_context import RequestContext
from vanna.integrations.xpd import factory
from vanna.integrations.xpd.factory import FixedLocalXpdUserResolver
from vanna.integrations.xpd.llm import XpdOpenAILlmService
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
    monkeypatch, profile_settings, schema_evidence
):
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
    assert "document.cookie" not in html
    assert "admin@example.com</span>" in logged_in
    assert 'id="loginContainer" class="max-w-md' in logged_in
    assert "border-vanna-teal/30 hidden" in logged_in


def test_fastapi_local_login_sets_cookie_and_renders_authenticated_page():
    from fastapi import FastAPI
    from fastapi.testclient import TestClient

    from vanna.servers.fastapi.routes import register_chat_routes

    app = FastAPI()
    register_chat_routes(app, None)  # type: ignore[arg-type]
    client = TestClient(app)

    response = client.post(
        "/login", data={"email": "admin@example.com"}, follow_redirects=False
    )
    authenticated = client.get("/")
    invalid = client.post(
        "/login", data={"email": "unknown@example.com"}, follow_redirects=False
    )

    assert response.status_code == 303
    assert "admin@example.com" in response.headers["set-cookie"]
    assert "admin@example.com</span>" in authenticated.text
    assert invalid.status_code == 400


def test_flask_local_login_sets_cookie_and_renders_authenticated_page():
    from flask import Flask

    from vanna.servers.flask.routes import register_chat_routes

    app = Flask(__name__)
    register_chat_routes(app, None)  # type: ignore[arg-type]
    client = app.test_client()

    response = client.post(
        "/login", data={"email": "user@example.com"}, follow_redirects=False
    )
    authenticated = client.get("/")

    assert response.status_code == 303
    assert "user@example.com" in response.headers["set-cookie"]
    assert "user@example.com</span>" in authenticated.get_data(as_text=True)


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
    public = runner.invoke(
        main, ["--xpd-config", str(profile), "--host", "0.0.0.0"]
    )

    assert mixed.exit_code == 2
    assert "mutually exclusive" in mixed.output
    assert public.exit_code == 2
    assert "local-only" in public.output


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

        def run(self, host, port):
            captured.update(host=host, port=port)

    monkeypatch.setattr(xpd, "load_xpd_profile", lambda path: object())
    monkeypatch.setattr(xpd, "create_xpd_agent", lambda settings: object())
    monkeypatch.setattr(fastapi_app, "VannaFastAPIServer", FakeServer)

    result = CliRunner().invoke(main, ["--xpd-config", str(profile)])

    assert result.exit_code == 0, result.output
    assert captured["host"] == "127.0.0.1"
    assert captured["port"] == 8000
