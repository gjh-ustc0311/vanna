"""Progress-event behavior across Agent and chat transport boundaries."""

from typing import AsyncGenerator, Type

import pytest
from pydantic import BaseModel, ConfigDict

from vanna.components import TextComponent
from vanna.core import (
    Agent,
    AgentComponentEvent,
    AgentConfig,
    AgentProgressEvent,
    ProgressConfig,
    ProgressUpdate,
    Tool,
    ToolCall,
    ToolContext,
    ToolProgressSpec,
    ToolRegistry,
    ToolResult,
)
from vanna.core.llm import LlmRequest, LlmResponse, LlmService, LlmStreamChunk
from vanna.core.user import User
from vanna.core.user.request_context import RequestContext
from vanna.core.user.resolver import UserResolver
from vanna.integrations.local.agent_memory import DemoAgentMemory
from vanna.servers.base import ChatHandler, ChatRequest, ChatStreamProgress


class EmptyArgs(BaseModel):
    model_config = ConfigDict(extra="forbid")


class RecordingTool(Tool[EmptyArgs]):
    def __init__(self) -> None:
        self.request_ids: list[str] = []

    @property
    def name(self) -> str:
        return "recording_tool"

    @property
    def description(self) -> str:
        return "Return a user-facing test result."

    def get_args_schema(self) -> Type[EmptyArgs]:
        return EmptyArgs

    async def execute(self, context: ToolContext, args: EmptyArgs) -> ToolResult:
        self.request_ids.append(context.request_id)
        return ToolResult(
            success=True,
            result_for_llm="tool-result",
            component=TextComponent(text="tool-output"),
        )


class FixedUserResolver(UserResolver):
    async def resolve_user(self, request_context: RequestContext) -> User:
        return User(id="progress-user")


class ToolThenAnswerLlm(LlmService):
    def __init__(self) -> None:
        self.calls = 0

    async def send_request(self, request: LlmRequest) -> LlmResponse:
        self.calls += 1
        if self.calls == 1:
            return LlmResponse(
                tool_calls=[
                    ToolCall(
                        id="tool-call",
                        name="recording_tool",
                        arguments={},
                    )
                ]
            )
        return LlmResponse(content="final-answer")

    async def stream_request(
        self, request: LlmRequest
    ) -> AsyncGenerator[LlmStreamChunk, None]:
        raise AssertionError("stream_request is disabled for this test")
        yield  # pragma: no cover

    async def validate_tools(self, tools):
        return []


def make_agent() -> tuple[Agent, RecordingTool]:
    tool = RecordingTool()
    registry = ToolRegistry()
    registry.register_local_tool(tool, access_groups=[])
    agent = Agent(
        llm_service=ToolThenAnswerLlm(),
        tool_registry=registry,
        user_resolver=FixedUserResolver(),
        agent_memory=DemoAgentMemory(max_items=10),
        config=AgentConfig(
            stream_responses=False,
            progress=ProgressConfig(
                initial=ProgressUpdate(stage="analyzing", message="正在分析问题…"),
                default_tool=ToolProgressSpec(
                    started=ProgressUpdate(stage="executing", message="正在执行操作…"),
                    succeeded=ProgressUpdate(
                        stage="summarizing", message="正在整理结果…"
                    ),
                    failed=ProgressUpdate(stage="recovering", message="正在调整方案…"),
                ),
            ),
        ),
    )
    return agent, tool


@pytest.mark.asyncio
async def test_agent_events_order_and_transport_request_id_propagation():
    agent, tool = make_agent()

    events = [
        event
        async for event in agent.send_message_events(
            RequestContext(),
            "run it",
            conversation_id="conversation",
            request_id="wire-request",
        )
    ]

    assert [event.type for event in events] == [
        "progress",
        "progress",
        "component",
        "progress",
        "component",
    ]
    assert [
        event.progress.stage
        for event in events
        if isinstance(event, AgentProgressEvent)
    ] == ["analyzing", "executing", "summarizing"]
    assert [
        event.component.text
        for event in events
        if isinstance(event, AgentComponentEvent)
        and isinstance(event.component, TextComponent)
    ] == ["tool-output", "final-answer"]
    assert tool.request_ids == ["wire-request"]


@pytest.mark.asyncio
async def test_component_api_and_polling_filter_transient_progress():
    component_agent, _ = make_agent()
    components = [
        component
        async for component in component_agent.send_message(
            RequestContext(), "run it", conversation_id="component-conversation"
        )
    ]
    assert [component.text for component in components] == [
        "tool-output",
        "final-answer",
    ]

    poll_agent, poll_tool = make_agent()
    response = await ChatHandler(poll_agent).handle_poll(
        ChatRequest(
            message="run it",
            conversation_id="poll-conversation",
            request_id="poll-request",
        )
    )
    assert response.total_chunks == 2
    assert all(not isinstance(chunk, ChatStreamProgress) for chunk in response.chunks)
    assert [chunk.component.text for chunk in response.chunks] == [
        "tool-output",
        "final-answer",
    ]
    assert poll_tool.request_ids == ["poll-request"]


@pytest.mark.asyncio
async def test_starter_request_does_not_emit_progress():
    agent, _ = make_agent()
    events = [
        event
        async for event in agent.send_message_events(
            RequestContext(metadata={"starter_ui_request": True}),
            "",
            conversation_id="starter-conversation",
            request_id="starter-request",
        )
    ]
    assert events
    assert all(isinstance(event, AgentComponentEvent) for event in events)
