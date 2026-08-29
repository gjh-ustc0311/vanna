"""Process-local conversation storage."""

from typing import Dict, List, Optional

from .base import ConversationStore
from .models import Conversation, Message
from ..user.models import User


class MemoryConversationStore(ConversationStore):
    def __init__(self) -> None:
        self._conversations: Dict[str, Conversation] = {}

    async def create_conversation(
        self, conversation_id: str, user: User, initial_message: str
    ) -> Conversation:
        conversation = Conversation(
            id=conversation_id,
            user=user,
            messages=[Message(role="user", content=initial_message)],
        )
        self._conversations[conversation_id] = conversation
        return conversation

    async def get_conversation(
        self, conversation_id: str, user: User
    ) -> Optional[Conversation]:
        conversation = self._conversations.get(conversation_id)
        if conversation is not None and conversation.user.id == user.id:
            return conversation
        return None

    async def update_conversation(self, conversation: Conversation) -> None:
        self._conversations[conversation.id] = conversation

    async def delete_conversation(self, conversation_id: str, user: User) -> bool:
        conversation = await self.get_conversation(conversation_id, user)
        if conversation is None:
            return False
        del self._conversations[conversation_id]
        return True

    async def list_conversations(
        self, user: User, limit: int = 50, offset: int = 0
    ) -> List[Conversation]:
        conversations = [
            item for item in self._conversations.values() if item.user.id == user.id
        ]
        conversations.sort(key=lambda item: item.updated_at, reverse=True)
        return conversations[offset : offset + limit]
