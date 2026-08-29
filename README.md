# Vanna XPD

Vanna XPD 是一个面向 XPD 三表契约的本地、只读自然语言数据助手。当前代码库是破坏性精简后的 3.0 分支，不再提供通用模型、通用数据库、Flask、认证、图表、导出、Agent Memory 或 legacy 兼容能力。

## 支持范围

运行时只访问三张 MySQL 8.0 物理表：

- `tb_live_goods_daily_stats`，粒度为 `item_id + stat_date`
- `tb_live_goods_session_stats`，粒度为 `item_id + live_session_id`
- `tb_live_session_endtime_stats`，粒度为 `live_session_id`

服务启动前会从 `INFORMATION_SCHEMA` 验证并冻结 Schema 快照。每个用户回合必须先执行 `search_xpd_schema`，之后才允许执行一次或多次 `run_xpd_sql`。SQL 仅限单条 MySQL `SELECT`/CTE、已验证字段和获批关系。

查询结果最多在页面显示 100 行，模型最多看到前 20 行；没有下载、导出或结果文件落盘能力。

## 环境与安装

- Python 3.12 或更高版本
- 可访问 profile 中 MySQL 数据库的本机环境
- OpenAI Chat Completions 兼容的 HTTPS 模型服务

本仓库只按源码交付，不配置公共包发布：

```bash
python -m pip install -e .
```

开发环境推荐：

```bash
uv sync --extra dev
```

## Profile

启动时必须显式提供外部 `xpd-report-agent` schema v4 本地 profile 的路径。Vanna 只读取，不发现、不复制、不改写该文件；未知顶层块会被忽略，`model` 和 `database` 子块必须精确匹配以下字段：

```yaml
schema_version: 4
profile: local
model:
  name: your-model
  base_url: https://model.example.com/v1
  api_key: replace-with-real-secret
  request_timeout_seconds: 30.0
database:
  host: 127.0.0.1
  port: 3306
  name: xpd_database
  username: readonly_user
  password: replace-with-real-secret
  read_max_attempts: 2
  retry_backoff_ms: 100.0
  query_timeout_ms: 30000
```

建议 profile 权限为 `0600`；权限更宽时程序会警告但不会自动修改。

## 启动

```bash
vanna --xpd-config /absolute/path/to/app-local.yaml
```

可选参数只有回环地址和端口：

```bash
vanna --xpd-config /absolute/path/to/app-local.yaml \
  --host 127.0.0.1 \
  --port 8000
```

允许的监听地址为 `127.0.0.1`、`localhost` 和 `::1`。服务不包含登录、Cookie、角色或 CORS；回环边界和本机访问控制就是信任边界，不能直接用于公网部署。

## 接口

HTTP 仅包含：

- `GET /`
- `GET /health`
- `POST /api/vanna/v2/chat_sse`
- `POST /api/vanna/v2/chat_poll`
- `/static/*` 本地固定前端资源

不提供 WebSocket、OpenAPI/Swagger、登录、登出或导出路由。浏览器会在发出请求前选择 SSE 或 Poll；已发出的 SSE 请求不会回退重放为 Poll。

模型最终回答使用 Markdown 展示，支持标题、段落、粗斜体、列表、引用、行内/围栏代码和 HTTP(S) 链接。渲染器随 Python 包本地交付，只通过安全 DOM API 创建固定元素；不执行 HTML、不加载图片，也不使用 `innerHTML` 或运行时前端依赖。欢迎、帮助、工具提示、错误和用户输入仍按纯文本展示。

## 日志

SSE 和 Poll 聊天接口会在 INFO 级别向 Uvicorn 控制台输出单行 JSON 日志：请求记录一次；SSE 逐帧记录组件、错误和 `[DONE]`；Poll 记录最终完整响应。日志包含用户问题、客户端文本和最多 100 行数据库结果，不做脱敏、截断或采样。

程序不创建日志文件。若将控制台重定向到文件或日志平台，操作者必须自行限制访问权限、保留周期和备份范围。profile 密钥以及未进入客户端响应的模型/数据库原始异常仍不会写入日志。

根包只承诺两个 Python API：

```python
from vanna import create_xpd_agent, load_xpd_profile

settings = load_xpd_profile("/absolute/path/to/app-local.yaml")
agent = create_xpd_agent(settings)
```

## 验证

```bash
uv run pytest -q
node --test tests/integrations/xpd/xpd-markdown.test.mjs
uv run ruff format --check src/vanna tests/integrations/xpd
uv run ruff check src/vanna tests/integrations/xpd
uv run mypy src/vanna
uv build
```

Node 22 只用于执行零依赖前端单元测试，不是应用运行依赖。

详细需求、架构和实施记录见：

- `docs-dev/prds/support-xpd-tables-002.md`
- `docs-dev/archs/support-xpd-tables-002.md`
- `docs-dev/plans/support-xpd-tables-002.md`
