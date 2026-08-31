"""
Agent module.

This module contains the core Agent implementation and configuration.
"""

from .agent import Agent
from .config import AgentConfig, ProgressConfig, ToolProgressSpec
from .events import (
    AgentComponentEvent,
    AgentEvent,
    AgentProgressEvent,
    ProgressStage,
    ProgressUpdate,
)

__all__ = [
    "Agent",
    "AgentComponentEvent",
    "AgentConfig",
    "AgentEvent",
    "AgentProgressEvent",
    "ProgressConfig",
    "ProgressStage",
    "ProgressUpdate",
    "ToolProgressSpec",
]
