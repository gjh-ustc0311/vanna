"""
Request and response models for server endpoints.
"""

import time
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field, PrivateAttr, model_validator

from ...components import Component
from ...core.agent import ProgressUpdate
from ...core.user.request_context import RequestContext


class ChatRequest(BaseModel):
    """Request model for chat endpoints."""

    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)

    message: str = Field(description="User message")
    conversation_id: Optional[str] = Field(default=None, description="Conversation ID")
    request_id: Optional[str] = Field(
        default=None, description="Request ID for tracing"
    )
    metadata: Dict[str, Any] = Field(
        default_factory=dict, description="Additional metadata"
    )
    _request_context: RequestContext = PrivateAttr(default_factory=RequestContext)

    @property
    def request_context(self) -> RequestContext:
        """Trusted context attached by the HTTP adapter, never parsed from JSON."""
        return self._request_context

    def attach_request_context(self, context: RequestContext) -> None:
        self._request_context = context


class ChatStreamChunk(BaseModel):
    """Single chunk in a streaming chat response."""

    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)

    component: Component = Field(description="Component to append to the chat")

    # Stream metadata
    conversation_id: str = Field(description="Conversation ID")
    request_id: str = Field(description="Request ID")
    timestamp: float = Field(default_factory=time.time, description="Timestamp")

    @classmethod
    def from_component(
        cls,
        component: Component,
        conversation_id: str,
        request_id: str,
    ) -> "ChatStreamChunk":
        """Create a chunk from a supported component."""

        return cls(
            component=component,
            conversation_id=conversation_id,
            request_id=request_id,
        )


class ChatStreamProgress(BaseModel):
    """Transient progress frame for an SSE chat response."""

    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)

    progress: ProgressUpdate
    conversation_id: str = Field(description="Conversation ID")
    request_id: str = Field(description="Request ID")
    timestamp: float = Field(default_factory=time.time, description="Timestamp")

    @classmethod
    def from_progress(
        cls,
        progress: ProgressUpdate,
        conversation_id: str,
        request_id: str,
    ) -> "ChatStreamProgress":
        return cls(
            progress=progress,
            conversation_id=conversation_id,
            request_id=request_id,
        )


class ChatError(BaseModel):
    """Safe transport-level error details."""

    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)

    code: str
    message: str


class ChatStreamError(BaseModel):
    """Transport-level error frame for SSE and polling."""

    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)

    error: ChatError
    conversation_id: str
    request_id: str
    timestamp: float = Field(default_factory=time.time)


class ChatResponse(BaseModel):
    """Complete chat response for polling endpoints."""

    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)

    chunks: List[ChatStreamChunk] = Field(description="Response chunks")
    conversation_id: str = Field(description="Conversation ID")
    request_id: str = Field(description="Request ID")
    total_chunks: int = Field(description="Total number of chunks")

    @model_validator(mode="after")
    def validate_envelope(self) -> "ChatResponse":
        if self.total_chunks != len(self.chunks):
            raise ValueError("total_chunks must match chunks")
        for chunk in self.chunks:
            if (
                chunk.conversation_id != self.conversation_id
                or chunk.request_id != self.request_id
            ):
                raise ValueError("all chunks must match the response IDs")
        return self

    @classmethod
    def from_chunks(
        cls,
        chunks: List[ChatStreamChunk],
        *,
        conversation_id: str = "",
        request_id: str = "",
    ) -> "ChatResponse":
        """Create response from chunks."""
        if not chunks:
            return cls(
                chunks=[],
                conversation_id=conversation_id,
                request_id=request_id,
                total_chunks=0,
            )

        return cls(
            chunks=chunks,
            conversation_id=chunks[0].conversation_id,
            request_id=chunks[0].request_id,
            total_chunks=len(chunks),
        )
