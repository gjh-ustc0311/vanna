import asyncio

import pytest
from click.testing import CliRunner

import vanna
from vanna.core.llm import LlmMessage, LlmRequest, LlmResponse
from vanna.core.tool import ToolSchema
from vanna.core.user import User
from vanna.integrations.xpd import cli, factory
from vanna.integrations.xpd.errors import XpdModelUnavailable
from vanna.integrations.xpd.llm import XpdOpenAILlmService


class DummyLlm:
    async def send_request(self, request):
        return LlmResponse(content="ok")

    async def stream_request(self, request):
        yield None

    async def validate_tools(self, tools):
        return []


class DummyCatalog:
    evidence_value = None

    def __init__(self, database):
        self.evidence = self.evidence_value
        self.load_calls = 0

    def load(self):
        self.load_calls += 1
        return self.evidence


def _run(awaitable):
    return asyncio.run(awaitable)


def test_root_exposes_only_two_supported_python_entry_points():
    assert vanna.__version__ == "3.0.0"
    assert vanna.__all__ == ["create_xpd_agent", "load_xpd_profile"]


def test_factory_preflights_and_registers_exactly_two_tools(
    monkeypatch, profile_settings, schema_evidence
):
    DummyCatalog.evidence_value = schema_evidence
    monkeypatch.setattr(factory, "XpdSchemaCatalog", DummyCatalog)
    monkeypatch.setattr(factory, "XpdOpenAILlmService", lambda **kwargs: DummyLlm())

    agent = factory.create_xpd_agent(profile_settings)

    assert _run(agent.tool_registry.list_tools()) == [
        "search_xpd_schema",
        "run_xpd_sql",
    ]
    assert agent.config.temperature == 0
    assert agent.user.model_dump() == {
        "id": "xpd-local",
        "metadata": {"deployment": "local-loopback"},
    }
    assert agent.xpd_schema_catalog.load_calls == 1


def test_xpd_model_payload_is_deterministic_and_serializes_tool_roundtrip():
    service = object.__new__(XpdOpenAILlmService)
    service.model = "test-model"
    request = LlmRequest(
        system_prompt="system",
        messages=[
            LlmMessage(role="user", content="question"),
            LlmMessage(
                role="assistant",
                content="",
                tool_calls=[
                    {
                        "id": "call-1",
                        "name": "search_xpd_schema",
                        "arguments": {},
                    }
                ],
            ),
            LlmMessage(role="tool", content="{}", tool_call_id="call-1"),
        ],
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
    assert payload["messages"][0] == {"role": "system", "content": "system"}
    assert payload["messages"][2]["tool_calls"][0]["function"]["arguments"] == "{}"
    assert payload["messages"][3]["tool_call_id"] == "call-1"


@pytest.mark.asyncio
async def test_model_client_failure_is_sanitized():
    class Completions:
        async def create(self, **kwargs):
            raise RuntimeError("secret provider response")

    class Client:
        class Chat:
            completions = Completions()

        chat = Chat()

    service = object.__new__(XpdOpenAILlmService)
    service.model = "test-model"
    service._client = Client()
    request = LlmRequest(messages=[], user=User(id="u"))

    with pytest.raises(XpdModelUnavailable) as caught:
        await service.send_request(request)

    assert "secret provider response" not in str(caught.value)


def test_cli_surface_is_xpd_only_and_rejects_non_loopback(tmp_path):
    profile = tmp_path / "profile.yaml"
    profile.write_text("placeholder", encoding="utf-8")
    runner = CliRunner()

    help_result = runner.invoke(cli.main, ["--help"])
    missing = runner.invoke(cli.main, [])
    public = runner.invoke(
        cli.main, ["--xpd-config", str(profile), "--host", "0.0.0.0"]
    )

    assert help_result.exit_code == 0
    assert "--xpd-config" in help_result.output
    assert "--host" in help_result.output
    assert "--port" in help_result.output
    assert "--example" not in help_result.output
    assert missing.exit_code == 2
    assert public.exit_code == 2


def test_cli_preflights_before_starting_loopback_server(monkeypatch, tmp_path):
    profile = tmp_path / "profile.yaml"
    profile.write_text("placeholder", encoding="utf-8")
    settings = object()
    agent = object()
    app = object()
    captured = {}

    monkeypatch.setattr(cli, "load_xpd_profile", lambda path: settings)
    monkeypatch.setattr(cli, "create_xpd_agent", lambda value: agent)
    monkeypatch.setattr(cli, "create_xpd_app", lambda value: app)
    monkeypatch.setattr(
        cli.uvicorn,
        "run",
        lambda value, **kwargs: captured.update(app=value, **kwargs),
    )

    result = CliRunner().invoke(cli.main, ["--xpd-config", str(profile)])

    assert result.exit_code == 0, result.output
    assert captured == {
        "app": app,
        "host": "127.0.0.1",
        "port": 8000,
        "log_level": "info",
    }
