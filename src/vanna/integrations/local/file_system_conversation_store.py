"""Owner-aware file-system conversation storage."""

from __future__ import annotations

import hashlib
import json
import re
import time
from datetime import datetime
from pathlib import Path
from typing import List, Optional, Pattern

from vanna.core.storage import Conversation, ConversationStore, Message
from vanna.core.user import User


class FileSystemConversationStore(ConversationStore):
    """Persist conversations as metadata plus append-only message files."""

    def __init__(
        self,
        base_dir: str = "conversations",
        *,
        conversation_id_pattern: Optional[str] = None,
        owner_scoped: bool = False,
    ) -> None:
        self.base_dir = Path(base_dir)
        self.base_dir.mkdir(parents=True, exist_ok=True)
        self._resolved_base_dir = self.base_dir.resolve()
        self._conversation_id_pattern: Optional[Pattern[str]] = (
            re.compile(conversation_id_pattern) if conversation_id_pattern else None
        )
        self.owner_scoped = owner_scoped

    def _validate_conversation_id(self, conversation_id: str) -> None:
        if not conversation_id or (
            self._conversation_id_pattern is not None
            and self._conversation_id_pattern.fullmatch(conversation_id) is None
        ):
            raise ValueError("Invalid conversation ID")

    def _get_owner_dir(self, user_id: str) -> Path:
        if not user_id:
            raise ValueError("User ID is required")
        owner_hash = hashlib.sha256(user_id.encode("utf-8")).hexdigest()[:16]
        owner_dir = (self.base_dir / owner_hash).resolve()
        if owner_dir.parent != self._resolved_base_dir:
            raise ValueError("Invalid user ID")
        return owner_dir

    def _get_conversation_dir(
        self, conversation_id: str, user_id: Optional[str] = None
    ) -> Path:
        self._validate_conversation_id(conversation_id)
        parent = (
            self._get_owner_dir(user_id or "")
            if self.owner_scoped
            else self._resolved_base_dir
        )
        conversation_dir = (parent / conversation_id).resolve()
        if conversation_dir.parent != parent:
            raise ValueError("Invalid conversation ID")
        return conversation_dir

    def _get_metadata_path(
        self, conversation_id: str, user_id: Optional[str] = None
    ) -> Path:
        return self._get_conversation_dir(conversation_id, user_id) / "metadata.json"

    def _get_messages_dir(
        self, conversation_id: str, user_id: Optional[str] = None
    ) -> Path:
        return self._get_conversation_dir(conversation_id, user_id) / "messages"

    def _save_metadata(self, conversation: Conversation) -> None:
        conv_dir = self._get_conversation_dir(conversation.id, conversation.user.id)
        conv_dir.mkdir(parents=True, exist_ok=True)
        metadata_path = self._get_metadata_path(conversation.id, conversation.user.id)
        if metadata_path.exists():
            try:
                with metadata_path.open("r", encoding="utf-8") as metadata_file:
                    existing_metadata = json.load(metadata_file)
                existing_user_id = existing_metadata["user"]["id"]
            except (json.JSONDecodeError, KeyError, TypeError) as exc:
                raise ValueError("Existing conversation metadata is invalid") from exc
            if existing_user_id != conversation.user.id:
                raise PermissionError("Conversation is owned by a different user")

        metadata = {
            "id": conversation.id,
            "user": conversation.user.model_dump(mode="json"),
            "created_at": conversation.created_at.isoformat(),
            "updated_at": conversation.updated_at.isoformat(),
        }
        with metadata_path.open("w", encoding="utf-8") as metadata_file:
            json.dump(metadata, metadata_file, indent=2, ensure_ascii=False)

    def _load_messages(
        self, conversation_id: str, user_id: Optional[str] = None
    ) -> List[Message]:
        messages_dir = self._get_messages_dir(conversation_id, user_id)
        if not messages_dir.exists():
            return []

        messages: List[Message] = []
        for file_path in sorted(messages_dir.glob("*.json")):
            try:
                with file_path.open("r", encoding="utf-8") as message_file:
                    data = json.load(message_file)
                messages.append(Message.model_validate(data))
            except (json.JSONDecodeError, ValueError) as exc:
                print(f"Failed to load message from {file_path}: {exc}")
        return messages

    def _append_message(
        self,
        conversation_id: str,
        message: Message,
        index: int,
        user_id: Optional[str] = None,
    ) -> None:
        messages_dir = self._get_messages_dir(conversation_id, user_id)
        messages_dir.mkdir(parents=True, exist_ok=True)
        timestamp = int(time.time() * 1_000_000)
        file_path = messages_dir / f"{timestamp}_{index:06d}.json"
        with file_path.open("w", encoding="utf-8") as message_file:
            json.dump(
                message.model_dump(mode="json"),
                message_file,
                indent=2,
                ensure_ascii=False,
            )

    async def create_conversation(
        self, conversation_id: str, user: User, initial_message: str
    ) -> Conversation:
        conversation = Conversation(
            id=conversation_id,
            user=user,
            messages=[Message(role="user", content=initial_message)],
        )
        self._save_metadata(conversation)
        self._append_message(conversation_id, conversation.messages[0], 0, user.id)
        return conversation

    async def get_conversation(
        self, conversation_id: str, user: User
    ) -> Optional[Conversation]:
        metadata_path = self._get_metadata_path(conversation_id, user.id)
        if not metadata_path.exists():
            return None

        try:
            with metadata_path.open("r", encoding="utf-8") as metadata_file:
                metadata = json.load(metadata_file)
            if metadata["user"]["id"] != user.id:
                return None
            return Conversation(
                id=metadata["id"],
                user=User.model_validate(metadata["user"]),
                messages=self._load_messages(conversation_id, user.id),
                created_at=datetime.fromisoformat(metadata["created_at"]),
                updated_at=datetime.fromisoformat(metadata["updated_at"]),
            )
        except (json.JSONDecodeError, ValueError, KeyError) as exc:
            print(f"Failed to load conversation {conversation_id}: {exc}")
            return None

    async def update_conversation(self, conversation: Conversation) -> None:
        conversation.updated_at = datetime.now()
        self._save_metadata(conversation)
        existing_count = len(self._load_messages(conversation.id, conversation.user.id))
        for index, message in enumerate(
            conversation.messages[existing_count:], start=existing_count
        ):
            self._append_message(conversation.id, message, index, conversation.user.id)

    async def delete_conversation(self, conversation_id: str, user: User) -> bool:
        conv_dir = self._get_conversation_dir(conversation_id, user.id)
        if not conv_dir.exists():
            return False
        if not await self.get_conversation(conversation_id, user):
            return False

        try:
            messages_dir = self._get_messages_dir(conversation_id, user.id)
            if messages_dir.exists():
                for file_path in messages_dir.glob("*.json"):
                    file_path.unlink()
                messages_dir.rmdir()
            metadata_path = self._get_metadata_path(conversation_id, user.id)
            if metadata_path.exists():
                metadata_path.unlink()
            conv_dir.rmdir()
            if self.owner_scoped:
                try:
                    conv_dir.parent.rmdir()
                except OSError:
                    pass
            return True
        except OSError as exc:
            print(f"Failed to delete conversation {conversation_id}: {exc}")
            return False

    async def list_conversations(
        self, user: User, limit: int = 50, offset: int = 0
    ) -> List[Conversation]:
        search_root = (
            self._get_owner_dir(user.id) if self.owner_scoped else self.base_dir
        )
        if not search_root.exists():
            return []

        conversations: List[Conversation] = []
        for conv_dir in search_root.iterdir():
            if not conv_dir.is_dir():
                continue
            try:
                safe_conv_dir = self._get_conversation_dir(conv_dir.name, user.id)
                metadata_path = safe_conv_dir / "metadata.json"
                if not metadata_path.exists():
                    continue
                with metadata_path.open("r", encoding="utf-8") as metadata_file:
                    metadata = json.load(metadata_file)
                if metadata["user"]["id"] != user.id:
                    continue
                conversations.append(
                    Conversation(
                        id=metadata["id"],
                        user=User.model_validate(metadata["user"]),
                        messages=self._load_messages(conv_dir.name, user.id),
                        created_at=datetime.fromisoformat(metadata["created_at"]),
                        updated_at=datetime.fromisoformat(metadata["updated_at"]),
                    )
                )
            except (json.JSONDecodeError, ValueError, KeyError) as exc:
                print(f"Failed to load conversation from {conv_dir}: {exc}")

        conversations.sort(
            key=lambda conversation: conversation.updated_at, reverse=True
        )
        return conversations[offset : offset + limit]
