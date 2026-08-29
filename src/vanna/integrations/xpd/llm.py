"""OpenAI-compatible model adapter with XPD-specific deterministic settings."""

from __future__ import annotations

from typing import Any, Dict

from vanna.core.llm import LlmRequest
from vanna.integrations.openai.llm import OpenAILlmService


class XpdOpenAILlmService(OpenAILlmService):
    """Keep XPD payload policy local instead of changing the generic adapter."""

    def _build_payload(self, request: LlmRequest) -> Dict[str, Any]:
        payload = super()._build_payload(request)
        payload["temperature"] = 0
        if payload.get("tools"):
            payload["parallel_tool_calls"] = False
        return payload
