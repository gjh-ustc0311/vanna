"""Constant system-prompt builder for the dedicated runtime."""

from typing import List, Optional

from .base import SystemPromptBuilder
from ..tool.models import ToolSchema
from ..user.models import User


class DefaultSystemPromptBuilder(SystemPromptBuilder):
    def __init__(self, base_prompt: Optional[str] = None) -> None:
        self.base_prompt = base_prompt

    async def build_system_prompt(
        self, user: User, tools: List[ToolSchema]
    ) -> Optional[str]:
        return self.base_prompt
