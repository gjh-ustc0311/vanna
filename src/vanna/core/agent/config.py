"""Configuration for the minimal XPD agent loop."""

from typing import Optional

from pydantic import BaseModel, Field


class AgentConfig(BaseModel):
    max_tool_iterations: int = Field(default=6, ge=1, le=12)
    temperature: float = Field(default=0, ge=0, le=2)
    max_tokens: Optional[int] = Field(default=None, gt=0)
