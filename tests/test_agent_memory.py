"""Functional tests for the supported in-memory AgentMemory implementation."""

import pytest

from vanna.core.tool import ToolContext
from vanna.core.user import User
from vanna.integrations.local.agent_memory import DemoAgentMemory


@pytest.fixture
def memory():
    return DemoAgentMemory(max_items=10)


@pytest.fixture
def context(memory):
    return ToolContext(
        user=User(id="test-user", group_memberships=["user"]),
        conversation_id="test-conversation",
        request_id="test-request",
        agent_memory=memory,
    )


@pytest.mark.asyncio
async def test_tool_memory_lifecycle(memory, context):
    await memory.save_tool_usage(
        question="Show top customers",
        tool_name="run_sql",
        args={"sql": "SELECT * FROM customers"},
        context=context,
    )

    matches = await memory.search_similar_usage(
        "Show top customers", context, similarity_threshold=0.5
    )
    recent = await memory.get_recent_memories(context, limit=10)

    assert matches[0].memory.tool_name == "run_sql"
    assert matches[0].similarity_score == 1.0
    assert recent[0].memory_id is not None
    assert await memory.delete_by_id(context, recent[0].memory_id)
    assert not await memory.delete_by_id(context, "missing")


@pytest.mark.asyncio
async def test_tool_filter_and_selective_clear(memory, context):
    await memory.save_tool_usage("Query data", "run_sql", {}, context)
    await memory.save_tool_usage("Search files", "search_files", {}, context)

    matches = await memory.search_similar_usage(
        "data",
        context,
        similarity_threshold=0,
        tool_name_filter="run_sql",
    )
    deleted = await memory.clear_memories(context, tool_name="run_sql")
    remaining = await memory.get_recent_memories(context, limit=10)

    assert [match.memory.tool_name for match in matches] == ["run_sql"]
    assert deleted == 1
    assert [item.tool_name for item in remaining] == ["search_files"]


@pytest.mark.asyncio
async def test_text_memory_lifecycle(memory, context):
    saved = await memory.save_text_memory("The fiscal year starts in April", context)
    matches = await memory.search_text_memories(
        "fiscal year April", context, similarity_threshold=0.2
    )
    recent = await memory.get_recent_text_memories(context, limit=10)

    assert matches[0].memory.content == saved.content
    assert recent == [saved]
    assert await memory.delete_text_memory(context, saved.memory_id)
    assert not await memory.delete_text_memory(context, "missing")


@pytest.mark.asyncio
async def test_fifo_limit_applies_to_tool_and_text_memories(context):
    memory = DemoAgentMemory(max_items=2)
    bounded_context = context.model_copy(update={"agent_memory": memory})

    for index in range(3):
        await memory.save_tool_usage(
            f"Question {index}", "run_sql", {}, bounded_context
        )
        await memory.save_text_memory(f"Text {index}", bounded_context)

    tool_memories = await memory.get_recent_memories(bounded_context, limit=10)
    text_memories = await memory.get_recent_text_memories(bounded_context, limit=10)

    assert [item.question for item in tool_memories] == ["Question 2", "Question 1"]
    assert [item.content for item in text_memories] == ["Text 2", "Text 1"]
