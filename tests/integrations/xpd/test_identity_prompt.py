from __future__ import annotations

from typing import AsyncGenerator

import pytest

from vanna.core.llm import LlmMessage, LlmRequest, LlmResponse, LlmStreamChunk
from vanna.core.user import User
from vanna.core.user.request_context import RequestContext
from vanna.core.workflow import DefaultWorkflowHandler
from vanna.integrations.xpd import factory
from vanna.integrations.xpd.factory import XPD_SYSTEM_PROMPT
from vanna.integrations.xpd.llm import XpdOpenAILlmService


class RecordingLlm:
    def __init__(self) -> None:
        self.requests: list[LlmRequest] = []

    async def send_request(self, request: LlmRequest) -> LlmResponse:
        self.requests.append(request)
        return LlmResponse(content="model-response")

    async def stream_request(
        self, request: LlmRequest
    ) -> AsyncGenerator[LlmStreamChunk, None]:
        self.requests.append(request)
        yield LlmStreamChunk(content="model-response")
        yield LlmStreamChunk(finish_reason="stop")

    async def validate_tools(self, tools):
        return []


class DummyCatalog:
    evidence_value = None

    def __init__(self, database) -> None:
        self.evidence = self.evidence_value

    def load(self):
        return self.evidence


@pytest.fixture
def xpd_agent(monkeypatch, tmp_path, profile_settings, schema_evidence):
    monkeypatch.chdir(tmp_path)
    DummyCatalog.evidence_value = schema_evidence
    llm = RecordingLlm()
    monkeypatch.setattr(factory, "XpdSchemaCatalog", DummyCatalog)
    monkeypatch.setattr(factory, "XpdOpenAILlmService", lambda **kwargs: llm)

    return factory.create_xpd_agent(profile_settings), llm


@pytest.mark.asyncio
@pytest.mark.parametrize("message", ["你好呀", "你是谁？"])
async def test_greeting_and_identity_requests_still_call_model(xpd_agent, message):
    agent, llm = xpd_agent

    components = [
        component
        async for component in agent.send_message(
            RequestContext(), message, conversation_id=f"model-{abs(hash(message))}"
        )
    ]

    assert type(agent.workflow_handler) is DefaultWorkflowHandler
    assert "model-response" in "\n".join(
        component.model_dump_json() for component in components
    )
    assert len(llm.requests) == 1
    assert llm.requests[0].messages[-1].content == message
    assert llm.requests[0].system_prompt == XPD_SYSTEM_PROMPT


def test_xpd_identity_prompt_is_first_system_message_in_model_payload():
    service = object.__new__(XpdOpenAILlmService)
    service.model = "test-model"
    request = LlmRequest(
        messages=[LlmMessage(role="user", content="你是谁？")],
        user=User(id="u"),
        system_prompt=XPD_SYSTEM_PROMPT,
    )

    payload = service._build_payload(request)

    assert payload["messages"][0] == {
        "role": "system",
        "content": XPD_SYSTEM_PROMPT,
    }
    assert "最高优先级的身份与回答规则" in XPD_SYSTEM_PROMPT
    assert "我是 XPD 数据查询分析助手" in XPD_SYSTEM_PROMPT
    assert "不要自称 Qwen、千问" in XPD_SYSTEM_PROMPT
