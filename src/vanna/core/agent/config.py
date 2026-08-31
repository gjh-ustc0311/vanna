"""
Agent configuration.

This module contains configuration models that control agent behavior.
"""

from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class AuditConfig(BaseModel):
    """Configuration for audit logging."""

    model_config = ConfigDict(extra="forbid")

    enabled: bool = Field(default=True, description="Enable audit logging")
    log_tool_access_checks: bool = Field(
        default=True, description="Log tool access permission checks"
    )
    log_tool_invocations: bool = Field(
        default=True, description="Log tool invocations with parameters"
    )
    log_tool_results: bool = Field(
        default=True, description="Log tool execution results"
    )
    log_ai_responses: bool = Field(
        default=True, description="Log AI-generated responses"
    )
    include_full_ai_responses: bool = Field(
        default=False,
        description="Include full AI response text in logs (privacy concern)",
    )
    sanitize_tool_parameters: bool = Field(
        default=True, description="Sanitize sensitive parameters (passwords, tokens)"
    )


class AgentConfig(BaseModel):
    """Configuration for agent behavior."""

    model_config = ConfigDict(extra="forbid")

    max_tool_iterations: int = Field(default=10, gt=0)
    stream_responses: bool = Field(default=True)
    auto_save_conversations: bool = Field(default=True)
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)
    max_tokens: Optional[int] = Field(default=None, gt=0)
    audit_config: AuditConfig = Field(default_factory=AuditConfig)
