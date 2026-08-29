"""Small registry for the two XPD tools."""

from __future__ import annotations

import time
from typing import Any, Dict, List, Optional

from .tool import Tool, ToolCall, ToolContext, ToolResult, ToolSchema


class ToolRegistry:
    def __init__(self) -> None:
        self._tools: Dict[str, Tool[Any]] = {}

    def register_local_tool(self, tool: Tool[Any]) -> None:
        if tool.name in self._tools:
            raise ValueError(f"Tool '{tool.name}' is already registered")
        self._tools[tool.name] = tool

    async def get_tool(self, name: str) -> Optional[Tool[Any]]:
        return self._tools.get(name)

    async def list_tools(self) -> List[str]:
        return list(self._tools)

    async def get_schemas(self) -> List[ToolSchema]:
        return [tool.get_schema() for tool in self._tools.values()]

    async def execute(self, tool_call: ToolCall, context: ToolContext) -> ToolResult:
        tool = self._tools.get(tool_call.name)
        if tool is None:
            return ToolResult(
                success=False,
                result_for_llm="The requested tool is unavailable.",
                error="tool_not_found",
            )

        try:
            args = tool.get_args_schema().model_validate(tool_call.arguments)
        except Exception:
            return ToolResult(
                success=False,
                result_for_llm="The tool arguments are invalid.",
                error="tool_arguments_invalid",
            )

        try:
            started = time.perf_counter()
            result = await tool.execute(context, args)
            result.metadata["execution_time_ms"] = (
                time.perf_counter() - started
            ) * 1000
            return result
        except Exception:
            return ToolResult(
                success=False,
                result_for_llm="The tool could not be completed.",
                error="tool_execution_failed",
            )
