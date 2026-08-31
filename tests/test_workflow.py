"""Tests for the text-only default workflow."""

from types import SimpleNamespace

import pytest

from vanna.components import TextComponent
from vanna.core.tool import ToolSchema
from vanna.core.user import User
from vanna.core.workflow.default import DefaultWorkflowHandler
from vanna.integrations.local.agent_memory import DemoAgentMemory


class ToolRegistryStub:
    def __init__(self, names=()):
        self.names = names

    async def get_schemas(self, user):
        del user
        return [
            ToolSchema(name=name, description=name, parameters={})
            for name in self.names
        ]


def make_agent(*, memory=True, tools=()):
    return SimpleNamespace(
        agent_memory=DemoAgentMemory(max_items=100) if memory else None,
        tool_registry=ToolRegistryStub(tools),
    )


USER = User(id="user", group_memberships=["user"])
ADMIN = User(id="admin", group_memberships=["admin"])
CONVERSATION = SimpleNamespace(id="conversation")


@pytest.mark.asyncio
async def test_help_is_one_text_component_and_hides_admin_commands():
    result = await DefaultWorkflowHandler().try_handle(
        make_agent(), USER, CONVERSATION, "/help"
    )

    assert result.should_skip_llm
    assert result.components and len(result.components) == 1
    assert isinstance(result.components[0], TextComponent)
    assert "/help" in result.components[0].text
    assert "/memories" not in result.components[0].text


@pytest.mark.asyncio
async def test_admin_help_and_status_are_text_only():
    handler = DefaultWorkflowHandler()
    agent = make_agent(tools=("run_xpd_sql", "search_saved_correct_tool_uses"))

    help_result = await handler.try_handle(agent, ADMIN, CONVERSATION, "/help")
    status_result = await handler.try_handle(agent, ADMIN, CONVERSATION, "/status")

    assert "/memories" in help_result.components[0].text
    assert isinstance(status_result.components[0], TextComponent)
    assert "SQL query tool" in status_result.components[0].text
    assert "run_xpd_sql" in status_result.components[0].text


@pytest.mark.asyncio
@pytest.mark.parametrize("command", ["/status", "/memories", "/delete id"])
async def test_admin_commands_are_denied_to_regular_users(command):
    result = await DefaultWorkflowHandler().try_handle(
        make_agent(), USER, CONVERSATION, command
    )

    assert result.should_skip_llm
    assert "Access Denied" in result.components[0].text


@pytest.mark.asyncio
async def test_unknown_message_continues_to_llm():
    result = await DefaultWorkflowHandler().try_handle(
        make_agent(), USER, CONVERSATION, "show sales"
    )
    assert not result.should_skip_llm
    assert result.components is None


@pytest.mark.asyncio
async def test_memories_are_collapsed_into_one_markdown_text():
    handler = DefaultWorkflowHandler()
    agent = make_agent()
    context = handler._memory_context(agent, ADMIN, CONVERSATION)
    await agent.agent_memory.save_tool_usage(
        question="total sales",
        tool_name="run_xpd_sql",
        args={"sql": "SELECT 1"},
        context=context,
        success=True,
    )
    await agent.agent_memory.save_text_memory("Important note", context)

    result = await handler.try_handle(agent, ADMIN, CONVERSATION, "/memories")

    assert len(result.components) == 1
    text = result.components[0].text
    assert "Tool Memories" in text
    assert "Text Memories" in text
    assert "/delete" in text


@pytest.mark.asyncio
async def test_memory_delete_uses_text_response():
    handler = DefaultWorkflowHandler()
    agent = make_agent()
    context = handler._memory_context(agent, ADMIN, CONVERSATION)
    memory = await agent.agent_memory.save_text_memory("delete me", context)

    result = await handler.try_handle(
        agent, ADMIN, CONVERSATION, f"/delete {memory.memory_id}"
    )

    assert isinstance(result.components[0], TextComponent)
    assert "Memory Deleted" in result.components[0].text


@pytest.mark.asyncio
async def test_starter_is_one_text_component_and_accepts_xpd_sql_tool():
    components = await DefaultWorkflowHandler().get_starter_ui(
        make_agent(tools=("run_xpd_sql",)), USER, CONVERSATION
    )

    assert components and len(components) == 1
    assert isinstance(components[0], TextComponent)
    assert "Setup Required" not in components[0].text


@pytest.mark.asyncio
async def test_starter_reports_missing_sql_as_text():
    components = await DefaultWorkflowHandler().get_starter_ui(
        make_agent(tools=()), USER, CONVERSATION
    )
    assert components and "Setup Required" in components[0].text
