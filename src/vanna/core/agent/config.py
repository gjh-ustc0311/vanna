"""Agent configuration models."""

from typing import Dict, Optional

from pydantic import BaseModel, ConfigDict, Field

from .events import ProgressUpdate


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


class ToolProgressSpec(BaseModel):
    """Safe progress messages for one tool without exposing its invocation data."""

    model_config = ConfigDict(extra="forbid")

    started: Optional[ProgressUpdate] = None
    succeeded: Optional[ProgressUpdate] = None
    failed: Optional[ProgressUpdate] = None


def _default_initial_progress() -> ProgressUpdate:
    return ProgressUpdate(stage="analyzing", message="Analyzing your question…")


def _default_tool_progress() -> ToolProgressSpec:
    return ToolProgressSpec(
        started=ProgressUpdate(stage="executing", message="Working on your request…"),
        succeeded=ProgressUpdate(stage="summarizing", message="Preparing the result…"),
        failed=ProgressUpdate(stage="recovering", message="Adjusting the approach…"),
    )


class ProgressConfig(BaseModel):
    """Configure transient, user-facing Agent progress events."""

    model_config = ConfigDict(extra="forbid")

    enabled: bool = True
    initial: Optional[ProgressUpdate] = Field(default_factory=_default_initial_progress)
    default_tool: ToolProgressSpec = Field(default_factory=_default_tool_progress)
    tools: Dict[str, ToolProgressSpec] = Field(default_factory=dict)

    def for_tool(self, tool_name: str) -> ToolProgressSpec:
        return self.tools.get(tool_name, self.default_tool)


class AgentConfig(BaseModel):
    """Configuration for agent behavior."""

    model_config = ConfigDict(extra="forbid")

    max_tool_iterations: int = Field(default=10, gt=0)
    stream_responses: bool = Field(default=True)
    auto_save_conversations: bool = Field(default=True)
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)
    max_tokens: Optional[int] = Field(default=None, gt=0)
    audit_config: AuditConfig = Field(default_factory=AuditConfig)
    progress: ProgressConfig = Field(default_factory=ProgressConfig)
