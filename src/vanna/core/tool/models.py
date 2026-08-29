"""Minimal tool models used by the XPD agent."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any, Dict, Optional

from pydantic import BaseModel, Field

if TYPE_CHECKING:
    from ..components import UiComponent
    from ..user.models import User


class ToolCall(BaseModel):
    id: str
    name: str
    arguments: Dict[str, Any]


class ToolContext(BaseModel):
    """Private context shared by all tool calls in one user turn."""

    user: "User"
    conversation_id: str
    request_id: str
    metadata: Dict[str, Any] = Field(default_factory=dict)

    model_config = {"arbitrary_types_allowed": True}


class ToolResult(BaseModel):
    success: bool
    result_for_llm: str
    ui_component: Optional["UiComponent"] = None
    error: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class ToolSchema(BaseModel):
    name: str
    description: str
    parameters: Dict[str, Any]
