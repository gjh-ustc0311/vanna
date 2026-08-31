"""Default text-only workflow handler."""

import traceback
import uuid
from typing import TYPE_CHECKING, Any, Dict, List, Optional

from vanna.components import Component, TextComponent

from .base import WorkflowHandler, WorkflowResult

if TYPE_CHECKING:
    from ..agent.agent import Agent
    from ..storage import Conversation
    from ..tool import ToolContext
    from ..user.models import User


class DefaultWorkflowHandler(WorkflowHandler):
    """Provide starter, help, status, and memory commands as Markdown text."""

    def __init__(self, welcome_message: Optional[str] = None):
        self.welcome_message = welcome_message

    async def try_handle(
        self, agent: "Agent", user: "User", conversation: "Conversation", message: str
    ) -> WorkflowResult:
        normalized = message.strip().lower()

        if normalized in {"/help", "help", "/h"}:
            content = (
                "## 🤖 Vanna AI Assistant\n\n"
                "Ask a question about your data in plain language. Query results are "
                "shown as tables when appropriate.\n\n"
                "**Commands**\n\n- `/help` — show this help message\n"
            )
            if "admin" in user.group_memberships:
                content += (
                    "- `/status` — check setup status\n"
                    "- `/memories` — list recent memories\n"
                    "- `/delete ID` — delete a memory\n"
                )
            return self._text_result(content)

        if normalized in {"/status", "status"}:
            if "admin" not in user.group_memberships:
                return self._access_denied("status")
            return await self._generate_status_check(agent, user)

        if normalized in {
            "/memories",
            "memories",
            "/recent_memories",
            "recent_memories",
        }:
            if "admin" not in user.group_memberships:
                return self._access_denied("memories")
            return await self._get_recent_memories(agent, user, conversation)

        if normalized.startswith("/delete "):
            if "admin" not in user.group_memberships:
                return self._access_denied("delete")
            return await self._delete_memory(
                agent, user, conversation, message.strip()[8:].strip()
            )

        return WorkflowResult(should_skip_llm=False)

    async def get_starter_ui(
        self, agent: "Agent", user: "User", conversation: "Conversation"
    ) -> Optional[List[Component]]:
        if self.welcome_message:
            return [TextComponent(text=self.welcome_message)]

        tools = await agent.tool_registry.get_schemas(user)
        analysis = self._analyze_setup([tool.name for tool in tools])
        if not analysis["has_sql"]:
            return [
                TextComponent(
                    text=(
                        "# ⚠️ Setup Required\n\n"
                        "Vanna AI needs a SQL query tool before it can analyze data."
                    )
                )
            ]

        content = (
            "# 👋 Welcome to Vanna AI\n\n"
            "Ask a question about your data in plain language. "
            "Type `/help` to see available commands."
        )
        if "admin" in user.group_memberships:
            content += "\n\n**Admin setup:** SQL ✓ | Memory " + (
                "✓" if analysis["has_memory"] else "✗"
            )
        return [TextComponent(text=content)]

    @staticmethod
    def _text_result(text: str) -> WorkflowResult:
        return WorkflowResult(
            should_skip_llm=True,
            components=[TextComponent(text=text)],
        )

    def _access_denied(self, command: str) -> WorkflowResult:
        return self._text_result(
            "# 🔒 Access Denied\n\n"
            f"The `/{command}` command is available only to administrators."
        )

    @staticmethod
    def _analyze_setup(tool_names: List[str]) -> Dict[str, Any]:
        has_sql = any(
            name in tool_names
            for name in [
                "run_sql",
                "run_xpd_sql",
                "sql_query",
                "execute_sql",
                "query_sql",
            ]
        )
        has_search = "search_saved_correct_tool_uses" in tool_names
        has_save = "save_question_tool_args" in tool_names
        has_memory = has_search and has_save
        return {
            "has_sql": has_sql,
            "has_memory": has_memory,
            "has_search": has_search,
            "has_save": has_save,
            "is_complete": has_sql and has_memory,
            "tool_count": len(tool_names),
            "tool_names": tool_names,
        }

    async def _generate_status_check(
        self, agent: "Agent", user: "User"
    ) -> WorkflowResult:
        tools = await agent.tool_registry.get_schemas(user)
        analysis = self._analyze_setup([tool.name for tool in tools])
        sql_status = "✅ Available" if analysis["has_sql"] else "❌ Missing"
        if analysis["has_memory"]:
            memory_status = "✅ Complete"
        elif analysis["has_search"] or analysis["has_save"]:
            memory_status = "⚠️ Incomplete"
        else:
            memory_status = "➖ Not configured"

        content = (
            "# 🔍 Setup Status\n\n"
            f"- **SQL query tool:** {sql_status}\n"
            f"- **Memory tools:** {memory_status}\n"
            f"- **Tools detected:** {analysis['tool_count']}\n"
        )
        if analysis["tool_names"]:
            content += "\n**Available tools:** " + ", ".join(
                sorted(analysis["tool_names"])
            )
        return self._text_result(content)

    async def _get_recent_memories(
        self, agent: "Agent", user: "User", conversation: "Conversation"
    ) -> WorkflowResult:
        try:
            context = self._memory_context(agent, user, conversation)
            if context is None:
                return self._text_result(
                    "# ⚠️ No Memory System\n\nAgent memory is not configured."
                )

            tool_memories = await agent.agent_memory.get_recent_memories(
                context=context, limit=10
            )
            try:
                text_memories = await agent.agent_memory.get_recent_text_memories(
                    context=context, limit=10
                )
            except (AttributeError, NotImplementedError):
                text_memories = []

            if not tool_memories and not text_memories:
                return self._text_result(
                    "# 🧠 Recent Memories\n\nNo recent memories were found."
                )

            sections = ["# 🧠 Recent Memories"]
            if text_memories:
                sections.append(f"## 📝 Text Memories ({len(text_memories)})")
                for text_memory in text_memories:
                    sections.append(
                        "\n".join(
                            [
                                f"- **Content:** {text_memory.content}",
                                f"  - ID: `{text_memory.memory_id}`",
                                f"  - Delete: `/delete {text_memory.memory_id}`",
                            ]
                        )
                    )

            if tool_memories:
                sections.append(f"## 🔧 Tool Memories ({len(tool_memories)})")
                for tool_memory in tool_memories:
                    sections.append(
                        "\n".join(
                            [
                                f"- **{tool_memory.tool_name}:** {tool_memory.question}",
                                f"  - Arguments: `{tool_memory.args}`",
                                f"  - ID: `{tool_memory.memory_id}`",
                                f"  - Delete: `/delete {tool_memory.memory_id}`",
                            ]
                        )
                    )
            return self._text_result("\n\n".join(sections))
        except Exception:
            traceback.print_exc()
            return self._text_result(
                "# ❌ Error Retrieving Memories\n\nRecent memories could not be loaded."
            )

    async def _delete_memory(
        self, agent: "Agent", user: "User", conversation: "Conversation", memory_id: str
    ) -> WorkflowResult:
        if not memory_id:
            return self._text_result(
                "# ⚠️ Invalid Command\n\nUsage: `/delete MEMORY_ID`"
            )

        try:
            context = self._memory_context(agent, user, conversation)
            if context is None:
                return self._text_result(
                    "# ⚠️ No Memory System\n\nAgent memory is not configured."
                )

            deleted = await agent.agent_memory.delete_by_id(context, memory_id)
            if not deleted:
                try:
                    deleted = await agent.agent_memory.delete_text_memory(
                        context, memory_id
                    )
                except (AttributeError, NotImplementedError):
                    pass

            if deleted:
                return self._text_result(
                    f"# ✅ Memory Deleted\n\nDeleted memory `{memory_id}`."
                )
            return self._text_result(
                f"# ❌ Memory Not Found\n\nNo memory exists with ID `{memory_id}`."
            )
        except Exception:
            traceback.print_exc()
            return self._text_result(
                "# ❌ Error Deleting Memory\n\nThe memory could not be deleted."
            )

    @staticmethod
    def _memory_context(
        agent: "Agent", user: "User", conversation: "Conversation"
    ) -> Optional["ToolContext"]:
        if not getattr(agent, "agent_memory", None):
            return None

        from vanna.core.tool import ToolContext

        return ToolContext(
            user=user,
            conversation_id=conversation.id,
            request_id=str(uuid.uuid4()),
            agent_memory=agent.agent_memory,
        )
