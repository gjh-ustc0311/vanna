"""Minimal rich-component envelope used on the XPD SSE/Poll wire."""

import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict

from pydantic import BaseModel, Field


class ComponentType(str, Enum):
    TEXT = "text"
    DATAFRAME = "dataframe"
    STATUS_BAR_UPDATE = "status_bar_update"
    CHAT_INPUT_UPDATE = "chat_input_update"


class RichComponent(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: ComponentType
    timestamp: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )

    def serialize_for_frontend(self) -> Dict[str, Any]:
        shared = {"id", "type", "timestamp"}
        raw = self.model_dump(mode="json")
        component_data: Dict[str, Any] = {}
        payload: Dict[str, Any] = {
            "id": raw["id"],
            "type": self.type.value,
            "timestamp": raw["timestamp"],
        }
        for key, value in raw.items():
            if key in shared:
                continue
            elif key == "rows" and self.type == ComponentType.DATAFRAME:
                component_data["data"] = value
            else:
                component_data[key] = value
        payload["data"] = component_data
        return payload
