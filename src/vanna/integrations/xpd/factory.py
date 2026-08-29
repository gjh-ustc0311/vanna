"""Ready-to-run local Agent assembly for the XPD profile."""

from __future__ import annotations

from typing import Optional
from urllib.parse import unquote

from vanna.capabilities.agent_memory import AgentMemory
from vanna.core import Agent, AgentConfig, DefaultSystemPromptBuilder, ToolRegistry
from vanna.core.user import User
from vanna.core.user.request_context import RequestContext
from vanna.core.user.resolver import UserResolver
from vanna.integrations.local import MemoryConversationStore
from vanna.integrations.local.agent_memory import DemoAgentMemory

from .config import XpdProfileSettings
from .llm import XpdOpenAILlmService
from .runner import XpdReadOnlyRunner
from .schema import XpdSchemaCatalog
from .sql_guard import XpdSqlGuard
from .tools import RunXpdSqlTool, SearchXpdSchemaTool


XPD_SYSTEM_PROMPT = """你是一个本地、只读的 XPD 数据分析助手。

严格遵守以下工作流：
1. 每个用户回合必须先调用 search_xpd_schema，读取当次完整 Schema 证据。
2. 只能根据工具返回的字段、粒度、关系和可用指标编写 SQL；不得猜测字段。
3. 需要查询时，只调用 run_xpd_sql，且只提交一个 MySQL SELECT 或带 CTE 的 SELECT。
4. 只能访问三张获批表：tb_live_goods_daily_stats、tb_live_goods_session_stats、tb_live_session_endtime_stats。
5. 不请求或生成写操作、跨库访问、文件导出、EXPLAIN、SELECT * 或未经证据确认的 JOIN。
6. 原始查询表格会直接展示给用户。你的最终回答应简洁解释口径、时间范围、主要发现和截断状态，不要重复粘贴整张表。
7. 如果 Schema、SQL、安全策略或数据库返回稳定错误，如实说明，不要绕过限制。
"""


class FixedLocalXpdUserResolver(UserResolver):
    """Resolve the two local demo identities without adding remote authentication."""

    async def resolve_user(self, request_context: RequestContext) -> User:
        selected_email = unquote(request_context.get_cookie("vanna_email") or "")
        if selected_email == "admin@example.com":
            return User(
                id="xpd-local-admin",
                username="xpd-local-admin",
                email=selected_email,
                group_memberships=["xpd", "admin"],
                metadata={"deployment": "local-loopback"},
            )
        if selected_email == "user@example.com":
            return User(
                id="xpd-local-user",
                username="xpd-local-user",
                email=selected_email,
                group_memberships=["xpd"],
                metadata={"deployment": "local-loopback"},
            )
        return User(
            id="xpd-local-user",
            username="xpd-local-user",
            group_memberships=["xpd"],
            metadata={"deployment": "local-loopback"},
        )


def create_xpd_agent(
    settings: XpdProfileSettings,
    *,
    user_resolver: Optional[UserResolver] = None,
    agent_memory: Optional[AgentMemory] = None,
) -> Agent:
    """Create an XPD agent after a mandatory live schema preflight."""

    catalog = XpdSchemaCatalog(settings.database)
    evidence = catalog.load()
    guard = XpdSqlGuard(evidence)
    runner = XpdReadOnlyRunner(settings.database, guard)

    registry = ToolRegistry()
    registry.register_local_tool(SearchXpdSchemaTool(catalog), access_groups=["xpd"])
    registry.register_local_tool(RunXpdSqlTool(runner), access_groups=["xpd"])

    llm_service = XpdOpenAILlmService(
        model=settings.model.name,
        api_key=settings.model.api_key.get_secret_value(),
        base_url=settings.model.base_url,
        timeout=settings.model.request_timeout_seconds,
        max_retries=0,
    )
    memory = agent_memory or DemoAgentMemory(max_items=1_000)
    agent = Agent(
        llm_service=llm_service,
        tool_registry=registry,
        user_resolver=user_resolver or FixedLocalXpdUserResolver(),
        agent_memory=memory,
        conversation_store=MemoryConversationStore(),
        config=AgentConfig(
            max_tool_iterations=6,
            stream_responses=True,
            auto_save_conversations=True,
            temperature=0,
        ),
        system_prompt_builder=DefaultSystemPromptBuilder(
            base_prompt=XPD_SYSTEM_PROMPT
        ),
    )
    # Intentionally process-local: useful for readiness introspection without adding
    # a public server dependency or persisting any profile/schema contents.
    agent.xpd_schema_catalog = catalog  # type: ignore[attr-defined]
    return agent
