from pathlib import Path

import pytest

from vanna.core.llm import LlmStreamChunk
from vanna.core.user.request_context import RequestContext
from vanna.integrations.local import FileSystemConversationStore
from vanna.integrations.xpd import factory
from vanna.integrations.xpd.errors import XpdSchemaError


class DummyCatalog:
    evidence_value = None

    def __init__(self, database):
        self.evidence = self.evidence_value

    def load(self):
        return self.evidence


class FailingCatalog:
    def __init__(self, database):
        pass

    def load(self):
        raise XpdSchemaError("synthetic failure")


class RecordingLlm:
    def __init__(self, response):
        self.response = response
        self.requests = []

    async def send_request(self, request):
        raise AssertionError("XPD should use streaming requests")

    async def stream_request(self, request):
        self.requests.append(request)
        yield LlmStreamChunk(content=self.response)

    async def validate_tools(self, tools):
        return []


async def _consume(agent, message, conversation_id):
    return [
        component
        async for component in agent.send_message(
            RequestContext(), message, conversation_id=conversation_id
        )
    ]


@pytest.mark.asyncio
async def test_xpd_history_survives_agent_recreation(
    monkeypatch, tmp_path, profile_settings, schema_evidence
):
    monkeypatch.chdir(tmp_path)
    DummyCatalog.evidence_value = schema_evidence
    monkeypatch.setattr(factory, "XpdSchemaCatalog", DummyCatalog)

    first_llm = RecordingLlm("first answer")
    monkeypatch.setattr(factory, "XpdOpenAILlmService", lambda **kwargs: first_llm)
    first_agent = factory.create_xpd_agent(profile_settings)

    assert isinstance(first_agent.conversation_store, FileSystemConversationStore)
    assert first_agent.conversation_store.base_dir == Path("datas/history_storage")
    assert (tmp_path / "datas" / "history_storage").is_dir()
    await _consume(first_agent, "first question", "conv_restart")

    second_llm = RecordingLlm("second answer")
    monkeypatch.setattr(factory, "XpdOpenAILlmService", lambda **kwargs: second_llm)
    second_agent = factory.create_xpd_agent(profile_settings)
    await _consume(second_agent, "second question", "conv_restart")

    assert len(second_llm.requests) == 1
    history = [
        (message.role, message.content) for message in second_llm.requests[0].messages
    ]
    assert history == [
        ("user", "first question"),
        ("assistant", "first answer"),
        ("user", "second question"),
    ]


def test_xpd_schema_preflight_failure_does_not_create_history_directory(
    monkeypatch, tmp_path, profile_settings
):
    monkeypatch.chdir(tmp_path)
    monkeypatch.setattr(factory, "XpdSchemaCatalog", FailingCatalog)

    with pytest.raises(XpdSchemaError, match="synthetic failure"):
        factory.create_xpd_agent(profile_settings)

    assert not (tmp_path / "datas" / "history_storage").exists()
