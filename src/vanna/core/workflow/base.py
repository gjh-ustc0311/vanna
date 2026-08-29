"""Workflow hook retained only for XPD help and starter content."""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import TYPE_CHECKING, List, Optional

if TYPE_CHECKING:
    from ..agent.agent import Agent
    from ..components import UiComponent
    from ..storage.models import Conversation
    from ..user.models import User


@dataclass
class WorkflowResult:
    handled: bool = False
    components: List["UiComponent"] = field(default_factory=list)


class WorkflowHandler(ABC):
    @abstractmethod
    async def get_starter_ui(
        self, agent: "Agent", user: "User", conversation: "Conversation"
    ) -> Optional[List["UiComponent"]]:
        raise NotImplementedError

    @abstractmethod
    async def try_handle(
        self, agent: "Agent", user: "User", conversation: "Conversation", message: str
    ) -> WorkflowResult:
        raise NotImplementedError
