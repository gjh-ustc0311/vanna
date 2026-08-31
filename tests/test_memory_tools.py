"""Tests for memory tools after removal of operational UI components."""

import uuid

import pytest

from vanna.core.tool import ToolContext
from vanna.core.user import User
from vanna.integrations.local.agent_memory import DemoAgentMemory
from vanna.tools.agent_memory import (
    SaveQuestionToolArgsParams,
    SaveQuestionToolArgsTool,
    SaveTextMemoryParams,
    SaveTextMemoryTool,
    SearchSavedCorrectToolUsesParams,
    SearchSavedCorrectToolUsesTool,
)


def make_context(memory, user_id="user"):
    return ToolContext(
        user=User(id=user_id),
        conversation_id=str(uuid.uuid4()),
        request_id=str(uuid.uuid4()),
        agent_memory=memory,
    )


@pytest.mark.asyncio
async def test_search_result_is_for_llm_only():
    memory = DemoAgentMemory(max_items=100)
    context = make_context(memory)
    await memory.save_tool_usage(
        question="What is total sales?",
        tool_name="run_sql",
        args={"sql": "SELECT SUM(total) FROM sales"},
        context=context,
        success=True,
    )

    result = await SearchSavedCorrectToolUsesTool().execute(
        context,
        SearchSavedCorrectToolUsesParams(
            question="What is total sales?", similarity_threshold=0.1
        ),
    )

    assert result.success
    assert result.components == []
    assert "run_sql" in result.result_for_llm
    assert "SELECT SUM(total)" in result.result_for_llm


@pytest.mark.asyncio
async def test_search_has_no_admin_ui_variant():
    memory = DemoAgentMemory(max_items=100)
    admin_context = make_context(memory, "admin")
    user_context = make_context(memory, "user")
    params = SearchSavedCorrectToolUsesParams(question="unknown")

    admin_result = await SearchSavedCorrectToolUsesTool().execute(admin_context, params)
    user_result = await SearchSavedCorrectToolUsesTool().execute(user_context, params)

    assert admin_result.result_for_llm == user_result.result_for_llm
    assert admin_result.components == []
    assert user_result.components == []


@pytest.mark.asyncio
async def test_save_tool_usage_has_no_ui_component():
    memory = DemoAgentMemory(max_items=100)
    result = await SaveQuestionToolArgsTool().execute(
        make_context(memory),
        SaveQuestionToolArgsParams(
            question="q", tool_name="run_sql", args={"sql": "SELECT 1"}
        ),
    )
    assert result.success
    assert result.components == []


@pytest.mark.asyncio
async def test_save_text_memory_has_no_ui_component():
    memory = DemoAgentMemory(max_items=100)
    result = await SaveTextMemoryTool().execute(
        make_context(memory), SaveTextMemoryParams(content="remember this")
    )
    assert result.success
    assert result.components == []
