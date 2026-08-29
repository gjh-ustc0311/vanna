"""Async OpenAI-compatible Chat Completions client for XPD."""

from __future__ import annotations

import json
from typing import Any, AsyncGenerator, Dict, List, Optional

from openai import AsyncOpenAI

from vanna.core.llm import (
    LlmRequest,
    LlmResponse,
    LlmService,
    LlmStreamChunk,
)
from vanna.core.tool import ToolCall, ToolSchema

from .errors import XpdModelUnavailable


class XpdOpenAILlmService(LlmService):
    def __init__(
        self,
        *,
        model: str,
        api_key: str,
        base_url: str,
        timeout: float,
    ) -> None:
        self.model = model
        self._client = AsyncOpenAI(
            api_key=api_key,
            base_url=base_url,
            timeout=timeout,
            max_retries=0,
        )

    async def send_request(self, request: LlmRequest) -> LlmResponse:
        try:
            response = await self._client.chat.completions.create(
                **self._build_payload(request)
            )
        except Exception as exc:
            raise XpdModelUnavailable() from exc

        if not response.choices:
            return LlmResponse(finish_reason="stop")
        choice = response.choices[0]
        message = choice.message
        usage: Optional[Dict[str, int]] = None
        if response.usage is not None:
            usage = {
                "prompt_tokens": int(response.usage.prompt_tokens or 0),
                "completion_tokens": int(response.usage.completion_tokens or 0),
                "total_tokens": int(response.usage.total_tokens or 0),
            }
        return LlmResponse(
            content=message.content,
            tool_calls=self._extract_tool_calls(message) or None,
            finish_reason=choice.finish_reason,
            usage=usage,
        )

    async def stream_request(
        self, request: LlmRequest
    ) -> AsyncGenerator[LlmStreamChunk, None]:
        response = await self.send_request(request)
        yield LlmStreamChunk(
            content=response.content,
            tool_calls=response.tool_calls,
            finish_reason=response.finish_reason,
        )

    async def validate_tools(self, tools: List[Any]) -> List[str]:
        return [
            "Invalid tool name."
            for tool in tools
            if not isinstance(tool, ToolSchema) or not tool.name or len(tool.name) > 64
        ]

    def _build_payload(self, request: LlmRequest) -> Dict[str, Any]:
        messages: List[Dict[str, Any]] = []
        if request.system_prompt:
            messages.append({"role": "system", "content": request.system_prompt})
        for item in request.messages:
            message: Dict[str, Any] = {"role": item.role, "content": item.content}
            if item.role == "tool" and item.tool_call_id:
                message["tool_call_id"] = item.tool_call_id
            elif item.role == "assistant" and item.tool_calls:
                message["tool_calls"] = [
                    {
                        "id": call.id,
                        "type": "function",
                        "function": {
                            "name": call.name,
                            "arguments": json.dumps(call.arguments),
                        },
                    }
                    for call in item.tool_calls
                ]
            messages.append(message)

        payload: Dict[str, Any] = {
            "model": self.model,
            "messages": messages,
            "temperature": 0,
        }
        if request.max_tokens is not None:
            payload["max_tokens"] = request.max_tokens
        if request.tools:
            payload["tools"] = [
                {
                    "type": "function",
                    "function": {
                        "name": tool.name,
                        "description": tool.description,
                        "parameters": tool.parameters,
                    },
                }
                for tool in request.tools
            ]
            payload["tool_choice"] = "auto"
            payload["parallel_tool_calls"] = False
        return payload

    @staticmethod
    def _extract_tool_calls(message: Any) -> List[ToolCall]:
        calls: List[ToolCall] = []
        for raw in getattr(message, "tool_calls", None) or []:
            function = getattr(raw, "function", None)
            if function is None or not getattr(function, "name", None):
                continue
            try:
                arguments = json.loads(getattr(function, "arguments", "{}"))
                if not isinstance(arguments, dict):
                    arguments = {"args": arguments}
            except Exception:
                arguments = {}
            calls.append(
                ToolCall(
                    id=getattr(raw, "id", "tool_call"),
                    name=function.name,
                    arguments=arguments,
                )
            )
        return calls
