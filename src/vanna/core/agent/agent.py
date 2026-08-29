"""Minimal conversational tool loop retained for the XPD application."""

from __future__ import annotations

import uuid
from typing import AsyncGenerator, Optional

from vanna.components import (
    ChatInputUpdateComponent,
    RichTextComponent,
    SimpleTextComponent,
    StatusBarUpdateComponent,
    UiComponent,
)
from vanna.core.llm import LlmMessage, LlmRequest, LlmService
from vanna.core.registry import ToolRegistry
from vanna.core.storage import Conversation, ConversationStore, Message
from vanna.core.system_prompt import SystemPromptBuilder
from vanna.core.tool import ToolContext, ToolSchema
from vanna.core.user import RequestContext, User
from vanna.core.workflow import WorkflowHandler

from .config import AgentConfig


class Agent:
    """Execute a sequential LLM/tool loop for one trusted local XPD user."""

    def __init__(
        self,
        *,
        llm_service: LlmService,
        tool_registry: ToolRegistry,
        conversation_store: ConversationStore,
        system_prompt_builder: SystemPromptBuilder,
        workflow_handler: WorkflowHandler,
        config: Optional[AgentConfig] = None,
        user: Optional[User] = None,
    ) -> None:
        self.llm_service = llm_service
        self.tool_registry = tool_registry
        self.conversation_store = conversation_store
        self.system_prompt_builder = system_prompt_builder
        self.workflow_handler = workflow_handler
        self.config = config or AgentConfig()
        self.user = user or User(id="xpd-local")

    async def send_message(
        self,
        request_context: RequestContext,
        message: str,
        *,
        conversation_id: Optional[str] = None,
        request_id: Optional[str] = None,
    ) -> AsyncGenerator[UiComponent, None]:
        conversation_id = conversation_id or f"conv_{uuid.uuid4().hex[:12]}"
        request_id = request_id or str(uuid.uuid4())
        conversation = await self.conversation_store.get_conversation(
            conversation_id, self.user
        )
        if conversation is None:
            conversation = Conversation(id=conversation_id, user=self.user)

        is_starter = not message.strip() or request_context.metadata.get(
            "starter_ui_request", False
        )
        if is_starter:
            components = await self.workflow_handler.get_starter_ui(
                self, self.user, conversation
            )
            for component in components or []:
                yield component
            return

        workflow_result = await self.workflow_handler.try_handle(
            self, self.user, conversation, message
        )
        if workflow_result.handled:
            for component in workflow_result.components:
                yield component
            return

        conversation.add_message(Message(role="user", content=message))
        await self.conversation_store.update_conversation(conversation)

        context = ToolContext(
            user=self.user,
            conversation_id=conversation_id,
            request_id=request_id,
        )
        tool_schemas = await self.tool_registry.get_schemas()
        system_prompt = await self.system_prompt_builder.build_system_prompt(
            self.user, tool_schemas
        )

        yield self._status("working", "正在分析问题")

        for _ in range(self.config.max_tool_iterations):
            response = await self.llm_service.send_request(
                self._build_request(conversation, tool_schemas, system_prompt)
            )
            if response.is_tool_call():
                conversation.add_message(
                    Message(
                        role="assistant",
                        content=response.content or "",
                        tool_calls=response.tool_calls,
                    )
                )
                yield self._status("working", "正在执行只读查询")

                for tool_call in response.tool_calls or []:
                    result = await self.tool_registry.execute(tool_call, context)
                    if result.ui_component is not None:
                        yield result.ui_component
                    conversation.add_message(
                        Message(
                            role="tool",
                            content=result.result_for_llm,
                            tool_call_id=tool_call.id,
                        )
                    )
                await self.conversation_store.update_conversation(conversation)
                continue

            content = response.content or "模型未返回可展示的答案。"
            conversation.add_message(Message(role="assistant", content=content))
            await self.conversation_store.update_conversation(conversation)
            yield UiComponent(
                rich_component=RichTextComponent(content=content),
                simple_component=SimpleTextComponent(text=content),
            )
            yield self._status("idle", "查询完成")
            yield UiComponent(
                rich_component=ChatInputUpdateComponent(
                    placeholder="继续询问 XPD 数据…", disabled=False
                )
            )
            return

        content = "工具调用次数达到上限，请缩小问题范围后重试。"
        yield UiComponent(
            rich_component=RichTextComponent(content=content),
            simple_component=SimpleTextComponent(text=content),
        )
        yield self._status("error", "查询未完成")
        yield UiComponent(
            rich_component=ChatInputUpdateComponent(
                placeholder="请调整问题后重试…", disabled=False
            )
        )

    def _build_request(
        self,
        conversation: Conversation,
        tool_schemas: list[ToolSchema],
        system_prompt: Optional[str],
    ) -> LlmRequest:
        messages = [
            LlmMessage(
                role=item.role,
                content=item.content,
                tool_calls=item.tool_calls,
                tool_call_id=item.tool_call_id,
            )
            for item in conversation.messages
        ]
        return LlmRequest(
            messages=messages,
            tools=tool_schemas,
            user=self.user,
            temperature=self.config.temperature,
            max_tokens=self.config.max_tokens,
            system_prompt=system_prompt,
        )

    @staticmethod
    def _status(status: str, message: str) -> UiComponent:
        return UiComponent(
            rich_component=StatusBarUpdateComponent(
                status=status, message=message, detail=None
            )
        )
