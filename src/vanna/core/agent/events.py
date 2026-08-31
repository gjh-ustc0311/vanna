"""Typed events produced while an Agent handles one message."""

from typing import Annotated, Literal, Union

from pydantic import BaseModel, ConfigDict, Field

from vanna.components import Component


ProgressStage = Literal[
    "analyzing",
    "preparing",
    "executing",
    "summarizing",
    "recovering",
]


class _AgentEventModel(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)


class ProgressUpdate(_AgentEventModel):
    """One safe, transient status update for the current request."""

    stage: ProgressStage
    message: str = Field(min_length=1, max_length=120)


class AgentComponentEvent(_AgentEventModel):
    """A persistent component produced by the Agent."""

    type: Literal["component"] = "component"
    component: Component


class AgentProgressEvent(_AgentEventModel):
    """A transient progress update produced by the Agent."""

    type: Literal["progress"] = "progress"
    progress: ProgressUpdate


AgentEvent = Annotated[
    Union[AgentComponentEvent, AgentProgressEvent],
    Field(discriminator="type"),
]


__all__ = [
    "AgentComponentEvent",
    "AgentEvent",
    "AgentProgressEvent",
    "ProgressStage",
    "ProgressUpdate",
]
