"""Ready-to-run local Agent assembly for the XPD profile."""

from __future__ import annotations

from typing import Optional

from vanna.capabilities.agent_memory import AgentMemory
from vanna.core import (
    Agent,
    AgentConfig,
    DefaultSystemPromptBuilder,
    ProgressConfig,
    ProgressUpdate,
    ToolProgressSpec,
    ToolRegistry,
)
from vanna.core.user import User
from vanna.core.user.identifiers import is_canonical_uint64
from vanna.core.user.request_context import RequestContext
from vanna.core.user.resolver import UserResolver
from vanna.integrations.local import FileSystemConversationStore
from vanna.integrations.local.agent_memory import DemoAgentMemory

from .config import XpdProfileSettings
from .files import XpdFileStore, XpdOssPublisher
from .llm import XpdOpenAILlmService
from .runner import XpdReadOnlyRunner
from .schema import XpdSchemaCatalog
from .sql_guard import XpdSqlGuard
from .tools import RunXpdSqlTool, SearchXpdSchemaTool


XPD_HISTORY_STORAGE_DIR = "datas/history_storage"
XPD_CONVERSATION_ID_PATTERN = r"[A-Za-z0-9_-]{1,128}"


XPD_SYSTEM_PROMPT = """你是一个本地、只读的 XPD 数据查询分析助手。

最高优先级的身份与回答规则：
1. 面向用户时，始终以“XPD 数据查询分析助手”作为你的产品身份。
2. 用户只是寒暄，例如“你好”、“你好呀”时，简短问候并介绍自己是 XPD 数据查询分析助手，可以帮助用户查询和分析 XPD 直播数据。
3. 用户问“你是谁”、“你是什么助手”、底层模型或供应商时，按以下口径回答：“我是 XPD 数据查询分析助手，专门为你提供已授权 XPD 直播数据的只读查询与分析。”
4. 不要自称 Qwen、千问、Vanna、阿里模型或其他通用 AI 助手，不要披露底层模型或供应商身份。
5. 不要把产品身份概括为“通用 AI 助手”；这只是身份口径，不限制你完成用户提出的安全通用任务。

请求处理规则：
1. 对无需 XPD 数据或外部实时信息即可完成的安全通用问题，包括常识、数学、翻译、写作和编程，直接基于已有知识回答。
2. 不得仅因问题与 XPD 无关而拒绝回答、声称“超出服务范围”，或强行把话题转回 XPD。通用回答后不要固定追加 XPD 宣传或引导语。
3. 寒暄、身份问答和通用问题都不调用 search_xpd_schema 或 run_xpd_sql。
4. 对依赖最新外部信息、私有信息或当前无法验证的事实，如实说明无法实时核验；不要编造最新结果。用户提供材料后，可以直接帮助分析、翻译、写作或编程。
5. 如果一个请求同时包含通用任务和 XPD 数据任务，直接完成通用部分；XPD 数据部分仍严格执行下述工具流程。

XPD 数据任务必须严格遵守以下工作流：
1. 每个涉及 XPD 数据查询或分析的用户回合，必须先调用 search_xpd_schema，读取当次完整 Schema 证据。
2. 只能根据工具返回的字段、粒度、关系和可用指标编写 SQL；不得猜测字段。
3. 需要查询时，只调用 run_xpd_sql，且只提交一个 MySQL SELECT 或带 CTE 的 SELECT。
4. 只能访问三张获批表：tb_live_goods_daily_stats、tb_live_goods_session_stats、tb_live_session_endtime_stats。
5. 不请求或生成写操作、跨库访问、EXPLAIN、SELECT * 或未经证据确认的 JOIN。只允许工具自动生成受控 XLSX 查询结果文件。
6. 原始查询前 30 行会直接展示给用户；超过 30 行时工具会尝试提供最多 20,000 行的 XLSX。你的最终回答应简洁解释口径、时间范围、主要发现、文件可用状态和截断状态，不要重复粘贴整张表，也不得把已截断文件描述为完整结果。
7. 如果 Schema、SQL、安全策略或数据库返回稳定错误，如实说明，不要绕过限制。
"""


class XpdHeaderUserResolver(UserResolver):
    """Trust the numeric user identity validated by the HTTP boundary."""

    async def resolve_user(self, request_context: RequestContext) -> User:
        user_id = request_context.user_id or request_context.get_header("X-User-Id")
        if not is_canonical_uint64(user_id):
            raise ValueError("A validated X-User-Id is required.")
        assert isinstance(user_id, str)
        return User(
            id=user_id,
            username=f"xpd-user-{user_id}",
            group_memberships=["xpd"],
            metadata={"identity_source": "trusted-x-user-id"},
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
    file_store = XpdFileStore()
    file_store.initialize()
    oss_publisher = None
    if settings.oss.enabled:
        oss_publisher = XpdOssPublisher(settings.oss, settings.oss_access)
        oss_publisher.initialize()
        file_store.set_remote_deleter(oss_publisher.delete)
    guard = XpdSqlGuard(evidence)
    runner = XpdReadOnlyRunner(settings.database, guard, file_store=file_store)

    registry = ToolRegistry()
    registry.register_local_tool(SearchXpdSchemaTool(catalog), access_groups=["xpd"])
    registry.register_local_tool(
        RunXpdSqlTool(
            runner,
            file_store=file_store,
            oss_publisher=oss_publisher,
        ),
        access_groups=["xpd"],
    )

    llm_service = XpdOpenAILlmService(
        model=settings.model.name,
        api_key=settings.model.api_key.get_secret_value(),
        base_url=settings.model.base_url,
        timeout=settings.model.request_timeout_seconds,
        max_retries=0,
    )
    memory = agent_memory or DemoAgentMemory(max_items=1_000)
    active_user_resolver = user_resolver or XpdHeaderUserResolver()
    agent = Agent(
        llm_service=llm_service,
        tool_registry=registry,
        user_resolver=active_user_resolver,
        agent_memory=memory,
        conversation_store=FileSystemConversationStore(
            base_dir=XPD_HISTORY_STORAGE_DIR,
            conversation_id_pattern=XPD_CONVERSATION_ID_PATTERN,
            owner_scoped=True,
        ),
        config=AgentConfig(
            max_tool_iterations=6,
            stream_responses=True,
            auto_save_conversations=True,
            temperature=0,
            progress=ProgressConfig(
                initial=ProgressUpdate(stage="analyzing", message="正在分析问题…"),
                default_tool=ToolProgressSpec(
                    started=ProgressUpdate(stage="executing", message="正在处理请求…"),
                    succeeded=ProgressUpdate(
                        stage="summarizing", message="正在整理结果…"
                    ),
                    failed=ProgressUpdate(
                        stage="recovering", message="正在调整处理方案…"
                    ),
                ),
                tools={
                    "search_xpd_schema": ToolProgressSpec(
                        started=ProgressUpdate(
                            stage="preparing", message="正在读取数据结构…"
                        ),
                        succeeded=ProgressUpdate(
                            stage="preparing", message="正在生成查询方案…"
                        ),
                        failed=ProgressUpdate(
                            stage="recovering", message="正在调整查询方案…"
                        ),
                    ),
                    "run_xpd_sql": ToolProgressSpec(
                        started=ProgressUpdate(
                            stage="executing", message="正在执行只读查询…"
                        ),
                        succeeded=ProgressUpdate(
                            stage="summarizing", message="正在整理查询结果…"
                        ),
                        failed=ProgressUpdate(
                            stage="recovering", message="正在调整查询方案…"
                        ),
                    ),
                },
            ),
        ),
        system_prompt_builder=DefaultSystemPromptBuilder(base_prompt=XPD_SYSTEM_PROMPT),
    )
    # Intentionally process-local: useful for readiness introspection without adding
    # a public server dependency or persisting any profile/schema contents.
    agent.xpd_schema_catalog = catalog  # type: ignore[attr-defined]
    agent.xpd_file_store = file_store  # type: ignore[attr-defined]
    agent.xpd_oss_publisher = oss_publisher  # type: ignore[attr-defined]
    agent.xpd_user_resolver = active_user_resolver  # type: ignore[attr-defined]
    agent.xpd_local_file_download_enabled = oss_publisher is None  # type: ignore[attr-defined]
    return agent
