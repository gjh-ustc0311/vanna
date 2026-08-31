"""Agent-memory tools without operational UI payloads."""

import logging
from typing import Any, Dict, Optional, Type

from pydantic import BaseModel, Field

from vanna.core.tool import Tool, ToolContext, ToolResult

logger = logging.getLogger(__name__)


class SaveQuestionToolArgsParams(BaseModel):
    """Parameters for saving question-tool-argument combinations."""

    question: str = Field(description="The original question that was asked")
    tool_name: str = Field(
        description="The name of the tool that was used successfully"
    )
    args: Dict[str, Any] = Field(
        description="The arguments that were passed to the tool"
    )


class SearchSavedCorrectToolUsesParams(BaseModel):
    """Parameters for searching saved tool usage patterns."""

    question: str = Field(
        description="The question to find similar tool usage patterns for"
    )
    limit: Optional[int] = Field(
        default=10, description="Maximum number of results to return"
    )
    similarity_threshold: Optional[float] = Field(
        default=0.7, description="Minimum similarity score for results (0.0-1.0)"
    )
    tool_name_filter: Optional[str] = Field(
        default=None, description="Filter results to a specific tool name"
    )


class SaveTextMemoryParams(BaseModel):
    """Parameters for saving free-form text memories."""

    content: str = Field(description="The text content to save as a memory")


class SaveQuestionToolArgsTool(Tool[SaveQuestionToolArgsParams]):
    """Save a successful question/tool invocation for later reuse."""

    @property
    def name(self) -> str:
        return "save_question_tool_args"

    @property
    def description(self) -> str:
        return (
            "Save a successful question-tool-argument combination for future reference"
        )

    def get_args_schema(self) -> Type[SaveQuestionToolArgsParams]:
        return SaveQuestionToolArgsParams

    async def execute(
        self, context: ToolContext, args: SaveQuestionToolArgsParams
    ) -> ToolResult:
        try:
            await context.agent_memory.save_tool_usage(
                question=args.question,
                tool_name=args.tool_name,
                args=args.args,
                context=context,
                success=True,
            )
            return ToolResult(
                success=True,
                result_for_llm=f"Successfully saved usage pattern for '{args.tool_name}' tool",
            )
        except Exception as exc:
            return _error_result("Failed to save memory", exc)


class SearchSavedCorrectToolUsesTool(Tool[SearchSavedCorrectToolUsesParams]):
    """Search saved tool invocation patterns."""

    @property
    def name(self) -> str:
        return "search_saved_correct_tool_uses"

    @property
    def description(self) -> str:
        return "Search for similar tool usage patterns based on a question"

    def get_args_schema(self) -> Type[SearchSavedCorrectToolUsesParams]:
        return SearchSavedCorrectToolUsesParams

    async def execute(
        self, context: ToolContext, args: SearchSavedCorrectToolUsesParams
    ) -> ToolResult:
        try:
            results = await context.agent_memory.search_similar_usage(
                question=args.question,
                context=context,
                limit=args.limit or 10,
                similarity_threshold=args.similarity_threshold or 0.7,
                tool_name_filter=args.tool_name_filter,
            )
            if not results:
                return ToolResult(
                    success=True,
                    result_for_llm="No similar tool usage patterns found for this question.",
                )

            lines = [f"Found {len(results)} similar tool usage pattern(s):", ""]
            for index, result in enumerate(results, 1):
                memory = result.memory
                lines.extend(
                    [
                        f"{index}. {memory.tool_name} (similarity: {result.similarity_score:.2f})",
                        f"   Question: {memory.question}",
                        f"   Args: {memory.args}",
                        "",
                    ]
                )
            result_text = "\n".join(lines).strip()
            logger.info("Agent memory search returned %d result(s)", len(results))
            return ToolResult(success=True, result_for_llm=result_text)
        except Exception as exc:
            return _error_result("Failed to search memories", exc)


class SaveTextMemoryTool(Tool[SaveTextMemoryParams]):
    """Save free-form text memory."""

    @property
    def name(self) -> str:
        return "save_text_memory"

    @property
    def description(self) -> str:
        return "Save free-form text memory for important insights, observations, or context"

    def get_args_schema(self) -> Type[SaveTextMemoryParams]:
        return SaveTextMemoryParams

    async def execute(
        self, context: ToolContext, args: SaveTextMemoryParams
    ) -> ToolResult:
        try:
            memory = await context.agent_memory.save_text_memory(
                content=args.content, context=context
            )
            return ToolResult(
                success=True,
                result_for_llm=f"Successfully saved text memory with ID: {memory.memory_id}",
            )
        except Exception as exc:
            return _error_result("Failed to save text memory", exc)


def _error_result(prefix: str, exc: Exception) -> ToolResult:
    message = f"{prefix}: {exc}"
    return ToolResult(
        success=False,
        result_for_llm=message,
        components=[],
        error=str(exc),
    )
