from __future__ import annotations

from typing import AsyncGenerator

import pytest

from vanna.components import TextComponent
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
@pytest.mark.parametrize(
    "message",
    [
        "你好呀",
        "你是谁？",
        "李白和杜甫谁知名度更高？",
        "50 + 20 等于多少？",
        "把这句话翻译成英文：今天天气很好。",
        "写一段活动开场白。",
        "写一个计算斐波那契数列的 Python 函数。",
    ],
)
async def test_identity_and_general_requests_still_call_model(xpd_agent, message):
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
    assert all(message.role != "tool" for message in llm.requests[0].messages)


@pytest.mark.asyncio
async def test_general_question_after_greeting_stays_in_the_model_text_path(xpd_agent):
    agent, llm = xpd_agent
    conversation_id = "greeting-then-general"

    for message in ("你好呀", "李白和杜甫谁知名度更高？"):
        components = [
            component
            async for component in agent.send_message(
                RequestContext(), message, conversation_id=conversation_id
            )
        ]
        assert len(components) == 1
        assert isinstance(components[0], TextComponent)
        assert components[0].text == "model-response"

    assert len(llm.requests) == 2
    assert [message.role for message in llm.requests[1].messages] == [
        "user",
        "assistant",
        "user",
    ]
    assert llm.requests[1].messages[-1].content == "李白和杜甫谁知名度更高？"
    assert all(message.role != "tool" for message in llm.requests[1].messages)


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
    assert "包括常识、数学、翻译、写作和编程" in XPD_SYSTEM_PROMPT
    assert "不得仅因问题与 XPD 无关而拒绝回答" in XPD_SYSTEM_PROMPT
    assert "通用回答后不要固定追加 XPD 宣传或引导语" in XPD_SYSTEM_PROMPT
    assert "通用问题都不调用 search_xpd_schema 或 run_xpd_sql" in XPD_SYSTEM_PROMPT
    assert "不要将自己介绍为可提供通用写作" not in XPD_SYSTEM_PROMPT
