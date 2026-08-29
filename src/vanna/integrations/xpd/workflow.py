"""XPD-specific starter and help workflow."""

from typing import List, Optional

from vanna.components import RichTextComponent, SimpleTextComponent, UiComponent
from vanna.core import Agent, Conversation, User
from vanna.core.workflow import WorkflowHandler, WorkflowResult


WELCOME_TEXT = """XPD 三表只读数据助手

可查询商品日统计、商品直播场次统计和直播场次结束时间。
系统会在每个问题中先读取启动时验证的 Schema 快照，再生成并执行只读 SQL。
示例：查询最近 7 天按日汇总的支付金额和退款率。"""


def _text_component(content: str) -> UiComponent:
    return UiComponent(
        rich_component=RichTextComponent(content=content),
        simple_component=SimpleTextComponent(text=content),
    )


class XpdWorkflowHandler(WorkflowHandler):
    async def get_starter_ui(
        self, agent: Agent, user: User, conversation: Conversation
    ) -> Optional[List[UiComponent]]:
        return [_text_component(WELCOME_TEXT)]

    async def try_handle(
        self,
        agent: Agent,
        user: User,
        conversation: Conversation,
        message: str,
    ) -> WorkflowResult:
        if message.strip().lower() in {"/help", "help", "/h"}:
            return WorkflowResult(
                handled=True, components=[_text_component(WELCOME_TEXT)]
            )
        return WorkflowResult()
