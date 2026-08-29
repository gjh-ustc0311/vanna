"""Minimal request metadata passed into the local XPD agent."""

from typing import Any, Dict

from pydantic import BaseModel, Field


class RequestContext(BaseModel):
    """Framework-neutral metadata with no cookie, role, or auth surface."""

    metadata: Dict[str, Any] = Field(
        default_factory=dict, description="Additional framework-specific metadata"
    )
