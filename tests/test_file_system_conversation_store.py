import json

import pytest

from vanna.core.storage import Conversation, Message
from vanna.core.tool import ToolCall
from vanna.core.user import User
from vanna.integrations.local import FileSystemConversationStore


SAFE_ID_PATTERN = r"[A-Za-z0-9_-]{1,128}"


@pytest.mark.asyncio
async def test_file_store_round_trips_and_appends_messages_across_restarts(tmp_path):
    base_dir = tmp_path / "history"
    user = User(id="user-1", username="测试用户")
    store = FileSystemConversationStore(
        str(base_dir), conversation_id_pattern=SAFE_ID_PATTERN
    )
    conversation = Conversation(
        id="conv_roundtrip",
        user=user,
        messages=[
            Message(role="user", content="查询中文商品"),
            Message(
                role="assistant",
                content="",
                tool_calls=[
                    ToolCall(
                        id="call-1",
                        name="run_xpd_sql",
                        arguments={"sql": "SELECT 1"},
                    )
                ],
            ),
            Message(
                role="tool",
                content='{"rows":[{"name":"商品一"}]}',
                tool_call_id="call-1",
            ),
            Message(role="assistant", content="查询完成"),
        ],
    )

    await store.update_conversation(conversation)
    await store.update_conversation(conversation)

    restarted_store = FileSystemConversationStore(
        str(base_dir), conversation_id_pattern=SAFE_ID_PATTERN
    )
    restored = await restarted_store.get_conversation("conv_roundtrip", user)

    assert restored is not None
    assert [message.role for message in restored.messages] == [
        "user",
        "assistant",
        "tool",
        "assistant",
    ]
    assert restored.messages[0].content == "查询中文商品"
    assert restored.messages[1].tool_calls == [
        ToolCall(
            id="call-1",
            name="run_xpd_sql",
            arguments={"sql": "SELECT 1"},
        )
    ]
    assert restored.messages[2].tool_call_id == "call-1"
    assert len(list((base_dir / "conv_roundtrip" / "messages").glob("*.json"))) == 4

    restored.add_message(Message(role="user", content="继续查询"))
    await restarted_store.update_conversation(restored)
    reloaded = await FileSystemConversationStore(
        str(base_dir), conversation_id_pattern=SAFE_ID_PATTERN
    ).get_conversation("conv_roundtrip", user)

    assert reloaded is not None
    assert [message.content for message in reloaded.messages][-1] == "继续查询"
    assert len(reloaded.messages) == 5
    metadata_text = (base_dir / "conv_roundtrip" / "metadata.json").read_text(
        encoding="utf-8"
    )
    assert "测试用户" in metadata_text


@pytest.mark.asyncio
async def test_file_store_rejects_unsafe_conversation_ids_without_writing_outside(
    tmp_path,
):
    base_dir = tmp_path / "history"
    store = FileSystemConversationStore(
        str(base_dir), conversation_id_pattern=SAFE_ID_PATTERN
    )
    user = User(id="user-1")
    unsafe_ids = [
        "",
        ".",
        "..",
        "../escape",
        "nested/conversation",
        r"nested\conversation",
        str(tmp_path / "absolute"),
        "含中文",
        "a" * 129,
    ]

    for conversation_id in unsafe_ids:
        with pytest.raises(ValueError, match="^Invalid conversation ID$"):
            await store.update_conversation(
                Conversation(id=conversation_id, user=user, messages=[])
            )

    assert list(base_dir.iterdir()) == []
    assert not (tmp_path / "escape").exists()
    assert not (tmp_path / "absolute").exists()


@pytest.mark.asyncio
async def test_file_store_containment_is_enforced_without_an_id_pattern(tmp_path):
    base_dir = tmp_path / "history"
    store = FileSystemConversationStore(str(base_dir))

    with pytest.raises(ValueError, match="^Invalid conversation ID$"):
        await store.update_conversation(
            Conversation(id="../escape", user=User(id="user-1"), messages=[])
        )

    assert not (tmp_path / "escape").exists()


@pytest.mark.asyncio
async def test_file_store_prevents_cross_user_overwrite(tmp_path):
    base_dir = tmp_path / "history"
    store = FileSystemConversationStore(
        str(base_dir), conversation_id_pattern=SAFE_ID_PATTERN
    )
    owner = User(id="owner")
    other_user = User(id="other")
    original = Conversation(
        id="conv_owned",
        user=owner,
        messages=[Message(role="user", content="owner history")],
    )
    await store.update_conversation(original)

    metadata_path = base_dir / "conv_owned" / "metadata.json"
    original_metadata = metadata_path.read_bytes()
    original_message_files = {
        path.name: path.read_bytes()
        for path in (base_dir / "conv_owned" / "messages").glob("*.json")
    }

    with pytest.raises(
        PermissionError, match="^Conversation is owned by a different user$"
    ):
        await store.update_conversation(
            Conversation(
                id="conv_owned",
                user=other_user,
                messages=[Message(role="user", content="overwrite")],
            )
        )

    assert await store.get_conversation("conv_owned", other_user) is None
    assert await store.delete_conversation("conv_owned", other_user) is False
    restored = await store.get_conversation("conv_owned", owner)
    assert restored is not None
    assert [message.content for message in restored.messages] == ["owner history"]
    assert metadata_path.read_bytes() == original_metadata
    assert {
        path.name: path.read_bytes()
        for path in (base_dir / "conv_owned" / "messages").glob("*.json")
    } == original_message_files


@pytest.mark.asyncio
async def test_file_store_rejects_corrupt_existing_owner_metadata(tmp_path):
    base_dir = tmp_path / "history"
    conversation_dir = base_dir / "conv_corrupt"
    conversation_dir.mkdir(parents=True)
    (conversation_dir / "metadata.json").write_text(
        json.dumps({"unexpected": True}), encoding="utf-8"
    )
    store = FileSystemConversationStore(
        str(base_dir), conversation_id_pattern=SAFE_ID_PATTERN
    )

    with pytest.raises(ValueError, match="^Existing conversation metadata is invalid$"):
        await store.update_conversation(
            Conversation(id="conv_corrupt", user=User(id="user-1"), messages=[])
        )

    assert json.loads((conversation_dir / "metadata.json").read_text()) == {
        "unexpected": True
    }


@pytest.mark.asyncio
async def test_owner_scoped_store_allows_same_conversation_id_for_two_users(tmp_path):
    base_dir = tmp_path / "history"
    store = FileSystemConversationStore(
        str(base_dir),
        conversation_id_pattern=SAFE_ID_PATTERN,
        owner_scoped=True,
    )
    first = User(id="123")
    second = User(id="456")

    await store.update_conversation(
        Conversation(
            id="shared_conversation",
            user=first,
            messages=[Message(role="user", content="first owner")],
        )
    )
    await store.update_conversation(
        Conversation(
            id="shared_conversation",
            user=second,
            messages=[Message(role="user", content="second owner")],
        )
    )

    first_result = await store.get_conversation("shared_conversation", first)
    second_result = await store.get_conversation("shared_conversation", second)
    assert first_result is not None
    assert second_result is not None
    assert first_result.messages[0].content == "first owner"
    assert second_result.messages[0].content == "second owner"
    assert len([path for path in base_dir.iterdir() if path.is_dir()]) == 2
    assert (await store.list_conversations(first))[0].messages[
        0
    ].content == "first owner"
    assert (await store.list_conversations(second))[0].messages[
        0
    ].content == "second owner"

    assert await store.delete_conversation("shared_conversation", first) is True
    assert await store.get_conversation("shared_conversation", first) is None
    remaining = await store.get_conversation("shared_conversation", second)
    assert remaining is not None
    assert remaining.messages[0].content == "second owner"
