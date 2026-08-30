"""Sanity tests for the supported AgentMemory implementations."""

import importlib
import inspect

import pytest
from pydantic import BaseModel

from vanna.capabilities.agent_memory import (
    AgentMemory,
    TextMemory,
    TextMemorySearchResult,
    ToolMemory,
    ToolMemorySearchResult,
)


REQUIRED_METHODS = {
    "save_tool_usage",
    "save_text_memory",
    "search_similar_usage",
    "search_text_memories",
    "get_recent_memories",
    "get_recent_text_memories",
    "delete_by_id",
    "delete_text_memory",
    "clear_memories",
}

SUPPORTED_MEMORY_CLASSES = [
    ("vanna.integrations.local.agent_memory", "DemoAgentMemory"),
]


def test_agent_memory_contract_is_abstract_and_async():
    assert inspect.isabstract(AgentMemory)
    for method_name in REQUIRED_METHODS:
        method = getattr(AgentMemory, method_name)
        assert inspect.iscoroutinefunction(method), method_name


@pytest.mark.parametrize(
    "model_type,payload",
    [
        (
            ToolMemory,
            {"question": "question", "tool_name": "run_sql", "args": {}},
        ),
        (TextMemory, {"content": "documentation"}),
    ],
)
def test_memory_models_are_pydantic_models(model_type, payload):
    assert issubclass(model_type, BaseModel)
    assert model_type(**payload)


def test_memory_search_result_models():
    tool_memory = ToolMemory(question="q", tool_name="run_sql", args={})
    text_memory = TextMemory(content="doc")

    assert (
        ToolMemorySearchResult(memory=tool_memory, similarity_score=0.9, rank=1).rank
        == 1
    )
    assert (
        TextMemorySearchResult(
            memory=text_memory, similarity_score=0.8, rank=1
        ).memory.content
        == "doc"
    )


@pytest.mark.parametrize("module_name,class_name", SUPPORTED_MEMORY_CLASSES)
def test_supported_memory_implementation_contract(module_name, class_name):
    module = importlib.import_module(module_name)
    implementation = getattr(module, class_name)

    assert issubclass(implementation, AgentMemory)
    for method_name in REQUIRED_METHODS:
        assert hasattr(implementation, method_name), f"{class_name}.{method_name}"


def test_demo_memory_can_be_instantiated():
    from vanna.integrations.local.agent_memory import DemoAgentMemory

    memory = DemoAgentMemory(max_items=10)

    assert isinstance(memory, AgentMemory)
    assert memory._max_items == 10
