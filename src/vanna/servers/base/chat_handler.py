"""
Framework-agnostic chat handling logic.
"""

import uuid
from typing import AsyncGenerator, Union

from ...core import Agent, AgentComponentEvent, AgentProgressEvent
from .models import (
    ChatRequest,
    ChatResponse,
    ChatStreamChunk,
    ChatStreamProgress,
)


class ChatHandler:
    """Core chat handling logic - framework agnostic."""

    def __init__(
        self,
        agent: Agent,
    ):
        """Initialize chat handler.

        Args:
            agent: The agent to handle chat requests
        """
        self.agent = agent

    async def handle_stream(
        self, request: ChatRequest
    ) -> AsyncGenerator[ChatStreamChunk, None]:
        """Stream only persistent chat components for compatibility and polling."""
        async for stream_item in self.handle_events(request):
            if isinstance(stream_item, ChatStreamChunk):
                yield stream_item

    async def handle_events(
        self, request: ChatRequest
    ) -> AsyncGenerator[Union[ChatStreamChunk, ChatStreamProgress], None]:
        """Stream persistent components and transient progress frames."""
        conversation_id = request.conversation_id or self._generate_conversation_id()
        request_id = request.request_id or str(uuid.uuid4())

        send_events = getattr(self.agent, "send_message_events", None)
        if send_events is None:
            async for component in self.agent.send_message(
                request_context=request.request_context,
                message=request.message,
                conversation_id=conversation_id,
            ):
                yield ChatStreamChunk.from_component(
                    component, conversation_id, request_id
                )
            return

        async for event in send_events(
            request_context=request.request_context,
            message=request.message,
            conversation_id=conversation_id,
            request_id=request_id,
        ):
            if isinstance(event, AgentProgressEvent):
                yield ChatStreamProgress.from_progress(
                    event.progress, conversation_id, request_id
                )
            elif isinstance(event, AgentComponentEvent):
                yield ChatStreamChunk.from_component(
                    event.component, conversation_id, request_id
                )

    async def handle_poll(self, request: ChatRequest) -> ChatResponse:
        """Handle polling-based chat.

        Args:
            request: Chat request

        Returns:
            Complete chat response
        """
        chunks = []
        async for chunk in self.handle_stream(request):
            chunks.append(chunk)

        return ChatResponse.from_chunks(
            chunks,
            conversation_id=request.conversation_id or "",
            request_id=request.request_id or "",
        )

    def _generate_conversation_id(self) -> str:
        """Generate new conversation ID."""
        return f"conv_{uuid.uuid4().hex[:8]}"
