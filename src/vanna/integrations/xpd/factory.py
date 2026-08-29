"""Ready-to-run assembly for the XPD-only application."""

from vanna.core import (
    Agent,
    AgentConfig,
    DefaultSystemPromptBuilder,
    ToolRegistry,
    User,
)
from vanna.core.storage import MemoryConversationStore

from .config import XpdProfileSettings
from .llm import XpdOpenAILlmService
from .runner import XpdReadOnlyRunner
from .schema import XpdSchemaCatalog
from .sql_guard import XpdSqlGuard
from .tools import RunXpdSqlTool, SearchXpdSchemaTool
from .workflow import XpdWorkflowHandler


XPD_SYSTEM_PROMPT = """你是本地、只读的 XPD 数据分析助手。

每个用户回合必须先调用 search_xpd_schema，读取启动时验证并冻结的完整 Schema 快照。
只能根据工具返回的字段、粒度、关系和指标编写 SQL，不得猜测字段。
需要查询时只调用 run_xpd_sql，并提交一条 MySQL SELECT 或带 CTE 的 SELECT。
只能访问 tb_live_goods_daily_stats、tb_live_goods_session_stats、tb_live_session_endtime_stats。
禁止写操作、跨库、文件导出、EXPLAIN、SELECT * 和未经证据确认的 JOIN。
查询表格会直接显示；最终回答使用简洁 Markdown 说明口径、时间范围、主要发现和截断状态。
Markdown 只使用段落、标题、粗体、斜体、列表、引用、行内代码、围栏代码和链接。
不要输出 HTML、图片、Markdown 表格、任务列表或删除线。
遇到稳定错误时如实说明，不得尝试绕过限制。"""


def create_xpd_agent(settings: XpdProfileSettings) -> Agent:
    """Create the agent only after the live database preflight succeeds."""

    catalog = XpdSchemaCatalog(settings.database)
    evidence = catalog.load()
    guard = XpdSqlGuard(evidence)
    runner = XpdReadOnlyRunner(settings.database, guard)

    registry = ToolRegistry()
    registry.register_local_tool(SearchXpdSchemaTool(catalog))
    registry.register_local_tool(RunXpdSqlTool(runner))

    agent = Agent(
        llm_service=XpdOpenAILlmService(
            model=settings.model.name,
            api_key=settings.model.api_key.get_secret_value(),
            base_url=settings.model.base_url,
            timeout=settings.model.request_timeout_seconds,
        ),
        tool_registry=registry,
        conversation_store=MemoryConversationStore(),
        system_prompt_builder=DefaultSystemPromptBuilder(XPD_SYSTEM_PROMPT),
        workflow_handler=XpdWorkflowHandler(),
        config=AgentConfig(max_tool_iterations=6, temperature=0),
        user=User(id="xpd-local", metadata={"deployment": "local-loopback"}),
    )
    agent.xpd_schema_catalog = catalog  # type: ignore[attr-defined]
    return agent
