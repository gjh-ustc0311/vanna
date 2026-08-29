# Vanna XPD 专用化 PRD（002）

## 1. 背景与结论

本需求把 Vanna 从通用 Agent 框架硬分叉为单用途 XPD 三表数据助手。002 取代 001 中关于通用集成、Flask、演示登录、Cookie 角色、可选 extra 和通用 Web Component 的设计；001 保留为历史记录。

本次是破坏性变更，版本提升到 `3.0.0`。包名和命令名仍为 `vanna`，但不承诺旧 Python 导入、旧 CLI 参数、旧服务器路由或旧扩展机制兼容。

## 2. 目标

1. 只保留 XPD 三张 MySQL 表的自然语言只读查询链路。
2. 删除与该链路无关的模型、数据库、向量库、文件、图表、审计、评测、认证、服务器、示例和 legacy 代码。
3. 把安全边界从“通用框架可配置”收紧为“代码级固定契约”。
4. 提供单一 FastAPI 本地页面，同时支持 SSE 和 Poll 两种 POST 传输。
5. 保留最小且可测试的 Agent/Tool/LLM/会话/UI 核心，避免重写已经验证的 XPD Guard 与 Runner。

## 3. 用户与信任模型

唯一用户是能够登录运行机器的本地可信操作者。服务只允许绑定 `127.0.0.1`、`localhost` 或 `::1`，不包含登录、登出、Cookie、角色、权限组、Token、CORS 或多租户能力。

回环地址是网络信任边界，但不替代操作系统账号隔离。任何公网、局域网、多用户或反向代理部署都超出范围，不能通过简单放宽 host 白名单实现。

## 4. 数据范围

只允许以下 `BASE TABLE`：

| 表 | 固定业务粒度 |
| --- | --- |
| `tb_live_goods_daily_stats` | `item_id + stat_date` |
| `tb_live_goods_session_stats` | `item_id + live_session_id` |
| `tb_live_session_endtime_stats` | `live_session_id` |

获批逻辑关系只有：

`tb_live_goods_session_stats.live_session_id = tb_live_session_endtime_stats.live_session_id`

版本化指标沿用 `xpd-core-v1`：支付金额、支付商品件数、支付订单数、支付买家数、退款金额、确认收货金额、退款率、点击率、浏览 PV、浏览 UV。只有真实字段齐备的指标才会进入 Schema 证据。

## 5. 功能需求

### 5.1 配置与启动

- 命令必须显式提供 `--xpd-config PATH`，不允许环境变量 fallback、默认路径或目录发现。
- 只接受 `schema_version: 4` 和 `profile: local`。
- Vanna 仅提取 `model`、`database` 及两个版本字段；外部 profile 的其他顶层块不进入运行时。
- `model` 和 `database` 子块拒绝未知字段，YAML 拒绝重复键、anchor、alias、merge 和未解析占位符。
- 模型地址必须是无内嵌凭据、无 fragment 的 HTTPS URL；密钥必须使用敏感类型保存。
- 启动 Web Server 前必须读取 `INFORMATION_SCHEMA`，确认三表、表类型、完整粒度字段及元数据。预检失败时进程 fail-closed。
- 首次预检结果作为进程生命周期内的唯一 Schema 快照；普通调用不能刷新或替换。

### 5.2 Agent 与工具

- 工厂只能注册 `search_xpd_schema` 和 `run_xpd_sql` 两个工具。
- 每个用户回合创建新的 `ToolContext`，同回合内顺序复用。
- `search_xpd_schema` 必须把当前 Guard 使用的同一个证据对象写入上下文。
- `run_xpd_sql` 必须验证对象身份；历史消息、复制对象或上一回合 marker 均不能通过门禁。
- 模型固定 `temperature=0`、`parallel_tool_calls=false`，最大工具循环为 6。
- 模型调用失败统一转换为稳定、脱敏错误，不包含 provider 原始响应。

### 5.3 SQL 与执行

- 只允许单条 MySQL `SELECT` 或带 CTE 的 `SELECT`。
- 拒绝写语句、DDL、事务/锁、`INTO`、多语句、变量、参数、危险函数、可执行注释、跨库、未知表/字段、投影通配符和未获批 JOIN。
- 允许 `COUNT(*)`，不允许 `SELECT *` 或 `table.*`。
- 连接建立阶段可按 profile 重试；查询开始后绝不重放。
- 每次执行设置只读事务和 MySQL `MAX_EXECUTION_TIME`，并由外层查询加 `LIMIT 101`。
- 读取第 101 行只用于判断截断，UI 最多获得前 100 行，模型最多获得前 20 行。
- 不产生 CSV、XLSX、图片或其他结果文件；表格模型中不存在导出字段。

### 5.4 Web 与 CLI

- CLI 只有 `--xpd-config`、`--host`、`--port` 和 Click 自带帮助参数。
- HTTP 业务路由只有 `/`、`/health`、`/api/vanna/v2/chat_sse`、`/api/vanna/v2/chat_poll`；另挂载 `/static` 固定本地资源。
- 禁用 OpenAPI、Swagger、Redoc、WebSocket、登录和登出路由。
- 页面不依赖 CDN、npm 包或运行时远程资源，不使用 `innerHTML` 渲染模型/数据库内容。
- 浏览器在请求发送前选择 SSE 或 Poll。SSE 已经发出后，即使中断，也不允许自动用 Poll 重放。
- 请求拒绝未知字段，消息最大 20,000 字符，客户端 ID 只接受 1–128 位字母、数字、下划线和连字符。
- 响应添加严格 CSP、`nosniff` 和 `no-referrer`，不设置 Cookie 或 CORS 响应头。

## 6. 交付与兼容性

- Python 基线为 3.12。
- 根包只承诺 `load_xpd_profile` 和 `create_xpd_agent` 两个 Python API。
- 项目只按源码交付，不包含公共包发布工作流。
- 外部 `xpd-report-agent` profile、数据库结构和数据不由本项目修改。
- 不需要数据库迁移、数据迁移或历史会话迁移；进程内会话重启即丢失。

## 7. 明确不做

- XPD 之外的 LLM、数据库、向量库或表。
- Flask、通用 Server、嵌入式 Web Component、图表和文件系统工具。
- 登录、角色、RLS、配额、审计平台、持久化会话和 Agent Memory。
- 导出、下载、代码执行、动态插件或任意自定义工具注册。
- 公网部署、高可用、多进程会话共享和查询恢复重放。
- 修改外部 profile 或数据库。

## 8. 验收标准

- 源码树和依赖清单中不存在已删除通用能力，CLI help 不出现旧模式。
- 合法 v4 profile 可加载，危险配置被稳定拒绝，密钥不进入表示或错误。
- 三表/粒度预检通过后只连接一次并复用同一快照；缺表、视图或粒度字段缺失时拒绝启动。
- SQL Guard 的通过/拒绝矩阵、连接重试、超时不重放、100/20 行限制均有自动化测试。
- 连续两个用户回合中，第二回合不能复用第一回合 Schema marker。
- SSE 与 Poll 都返回相同组件结构；SSE 单次请求只执行一次 Agent 链路。
- 页面无远程资产、认证和导出入口，响应无 Cookie/CORS，非合同路由返回 404。
- Python 3.12 CI 执行测试、格式、lint、严格类型检查和源码构建。

真实 MySQL 与真实模型联调依赖外部网络和凭据，应作为部署前 smoke test 单独执行；合成测试通过不等同于真实环境已经联调。
