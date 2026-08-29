"""Plain-text fallback component."""

from enum import Enum
from typing import Any, Dict

from pydantic import BaseModel, Field


class SimpleComponentType(str, Enum):
    TEXT = "text"


class SimpleComponent(BaseModel):
    type: SimpleComponentType = Field(...)

    def serialize_for_frontend(self) -> Dict[str, Any]:
        return self.model_dump(mode="json")
