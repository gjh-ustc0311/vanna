"""Fixed local-user model for the loopback-only application."""

from typing import Any, Dict

from pydantic import BaseModel, ConfigDict, Field


class User(BaseModel):
    """Internal conversation owner; it is not an authentication identity."""

    id: str = Field(description="Unique user identifier")
    metadata: Dict[str, Any] = Field(
        default_factory=dict, description="Additional user metadata"
    )

    model_config = ConfigDict(extra="forbid", frozen=True)
