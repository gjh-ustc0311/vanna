import json

import pytest

from vanna.core import Agent, AgentConfig, DefaultSystemPromptBuilder, ToolRegistry
from vanna.core.llm import LlmResponse
from vanna.core.storage import MemoryConversationStore
from vanna.core.tool import ToolCall
from vanna.core.user import RequestContext, User
from vanna.integrations.xpd.runner import XpdQueryResult
from vanna.integrations.xpd.sql_guard import XpdSqlGuard
from vanna.integrations.xpd.tools import RunXpdSqlTool, SearchXpdSchemaTool
from vanna.integrations.xpd.workflow import XpdWorkflowHandler


class Catalog:
    def __init__(self, evidence):
        self.evidence = evidence


class Runner:
    def __init__(self, evidence):
        self.guard = XpdSqlGuard(evidence)
        self.calls = []

    async def run(self, sql):
        self.calls.append(sql)
        return XpdQueryResult(
            columns=["item_id", "pay_amt"],
            rows=[{"item_id": "item-1", "pay_amt": "12.50"}],
            truncated=False,
        )


class ScriptedLlm:
    def __init__(self, responses):
        self.responses = list(responses)
        self.requests = []

    async def send_request(self, request):
        self.requests.append(request)
        return self.responses.pop(0)

    async def stream_request(self, request):
        yield None

    async def validate_tools(self, tools):
        return []


def _tool_response(call_id, name, arguments):
    return LlmResponse(
        tool_calls=[ToolCall(id=call_id, name=name, arguments=arguments)]
    )


@pytest.mark.asyncio
async def test_agent_runs_schema_then_sql_sequentially_and_preserves_tool_roundtrip(
    schema_evidence,
):
    llm = ScriptedLlm(
        [
            _tool_response("search-1", "search_xpd_schema", {}),
            _tool_response(
                "run-1",
                "run_xpd_sql",
                {"sql": "SELECT item_id, pay_amt FROM tb_live_goods_daily_stats"},
            ),
            LlmResponse(content="支付金额为 12.50。"),
        ]
    )
    runner = Runner(schema_evidence)
    registry = ToolRegistry()
    registry.register_local_tool(SearchXpdSchemaTool(Catalog(schema_evidence)))
    registry.register_local_tool(RunXpdSqlTool(runner))
    agent = Agent(
        llm_service=llm,
        tool_registry=registry,
        conversation_store=MemoryConversationStore(),
        system_prompt_builder=DefaultSystemPromptBuilder("xpd prompt"),
        workflow_handler=XpdWorkflowHandler(),
        config=AgentConfig(max_tool_iterations=6, temperature=0),
        user=User(id="xpd-local"),
    )

    components = [
        component
        async for component in agent.send_message(
            RequestContext(),
            "查询商品支付金额",
            conversation_id="conv_1",
            request_id="req_1",
        )
    ]

    assert runner.calls == ["SELECT item_id, pay_amt FROM tb_live_goods_daily_stats"]
    assert [request.messages[-1].role for request in llm.requests] == [
        "user",
        "tool",
        "tool",
    ]
    assert llm.requests[1].messages[-2].tool_calls[0].id == "search-1"
    assert llm.requests[1].messages[-1].tool_call_id == "search-1"
    assert llm.requests[2].messages[-2].tool_calls[0].id == "run-1"
    assert llm.requests[2].messages[-1].tool_call_id == "run-1"
    assert any(
        component.rich_component.type.value == "dataframe" for component in components
    )
    assert any(
        getattr(component.rich_component, "content", "") == "支付金额为 12.50。"
        for component in components
    )


@pytest.mark.asyncio
async def test_agent_uses_a_fresh_schema_gate_for_each_user_turn(schema_evidence):
    llm = ScriptedLlm(
        [
            _tool_response("search-1", "search_xpd_schema", {}),
            LlmResponse(content="first complete"),
            _tool_response(
                "run-2",
                "run_xpd_sql",
                {"sql": "SELECT item_id FROM tb_live_goods_daily_stats"},
            ),
            LlmResponse(content="second complete"),
        ]
    )
    runner = Runner(schema_evidence)
    registry = ToolRegistry()
    registry.register_local_tool(SearchXpdSchemaTool(Catalog(schema_evidence)))
    registry.register_local_tool(RunXpdSqlTool(runner))
    agent = Agent(
        llm_service=llm,
        tool_registry=registry,
        conversation_store=MemoryConversationStore(),
        system_prompt_builder=DefaultSystemPromptBuilder("xpd prompt"),
        workflow_handler=XpdWorkflowHandler(),
        user=User(id="xpd-local"),
    )

    for message, request_id in (("first", "req_1"), ("second", "req_2")):
        _ = [
            component
            async for component in agent.send_message(
                RequestContext(),
                message,
                conversation_id="conv_1",
                request_id=request_id,
            )
        ]

    assert runner.calls == []
    rejected_tool_message = llm.requests[3].messages[-1]
    rejection = json.loads(rejected_tool_message.content)
    assert rejection["error"] == "xpd_sql_rejected"
    assert "current user turn" in rejection["message"]


@pytest.mark.asyncio
async def test_starter_and_help_are_handled_without_calling_the_model(schema_evidence):
    llm = ScriptedLlm([])
    registry = ToolRegistry()
    agent = Agent(
        llm_service=llm,
        tool_registry=registry,
        conversation_store=MemoryConversationStore(),
        system_prompt_builder=DefaultSystemPromptBuilder("xpd prompt"),
        workflow_handler=XpdWorkflowHandler(),
        user=User(id="xpd-local"),
    )

    starter = [
        component async for component in agent.send_message(RequestContext(), "")
    ]
    help_components = [
        component async for component in agent.send_message(RequestContext(), "/help")
    ]

    assert llm.requests == []
    assert "XPD 三表只读数据助手" in starter[0].rich_component.content
    assert "XPD 三表只读数据助手" in help_components[0].rich_component.content
