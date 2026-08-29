# Vanna XPD 专用化实施计划与完成记录（002）

## 1. 决策基线

本计划执行以下已确认决策：

- 采用 XPD-only 破坏性硬分叉，版本为 `3.0.0`；
- 包名和 CLI 名继续使用 `vanna`；
- 只保留 FastAPI，不保留 Flask；
- 只支持本地固定页面，资源随 Python 包交付，不使用 CDN/npm 运行依赖；
- 同时支持 SSE 与 Poll，不支持 WebSocket；
- 不提供登录、Cookie 和角色，回环地址是信任边界；
- 根包公共 Python API 只有 `load_xpd_profile`、`create_xpd_agent`；
- Python 基线为 3.12，只按源码交付，不配置公共包发布；
- 不修改外部 `xpd-report-agent`、数据库或数据。

## 2. 阶段与状态

| 阶段 | 交付 | 状态 |
| --- | --- | --- |
| A | 精简 Agent/Tool/LLM/会话/UI 核心 | 完成 |
| B | XPD 异步模型、工厂、同回合门禁和一次性 Schema 快照 | 完成 |
| C | XPD-only FastAPI、SSE/Poll、本地零依赖页面 | 完成 |
| D | XPD-only CLI、Python 3.12 元数据和依赖裁剪 | 完成 |
| E | 删除通用集成、legacy、服务器、示例、前端和旧测试 | 完成 |
| F | 002 PRD/架构/计划、README、CI 和验证 | 完成 |
| G | 真实 MySQL + 真实模型 smoke test | 部署环境执行 |

## 3. 关键实施内容

### 3.1 核心裁剪

- `Agent` 只保留固定本地用户、会话历史、顺序工具循环、XPD starter/help 和组件流。
- `ToolRegistry` 移除权限组、中间件、生命周期和动态访问控制。
- `RequestContext` 只保留框架元数据，不含 Cookie/header/remote user 解析。
- 会话使用进程内 `MemoryConversationStore`，无磁盘持久化。
- 组件只保留文本、表格、状态栏和输入状态；表格无导出字段。

### 3.2 XPD 合同强化

- Schema 预检新增固定粒度字段存在性校验。
- Catalog 首次加载后只返回同一缓存快照，不再暴露刷新参数。
- SQL Tool 要求 marker 与 Guard 的 evidence 对象完全相同。
- 模型调用改为直接使用异步 Chat Completions，关闭 SDK 重试和并行 Tool Call。
- Factory 在构造 Agent 前同步完成数据库预检，只注册两项 XPD 工具。

### 3.3 Web 与 CLI

- 新增 XPD 专用 FastAPI app；仅暴露首页、健康检查、SSE、Poll 和本地静态资源。
- 请求采用 `extra=forbid`，错误采用稳定 envelope；关闭 docs/schema/CORS/Cookie。
- 文本组件使用兼容的 `type=text,data.markdown` 标记；仅模型最终回答启用 Markdown，其他消息保持纯文本。
- 前端使用零依赖安全 Markdown 节点树和原生 DOM API，不使用 `innerHTML`；SSE 解析支持分块 UTF-8 和尾帧 flush。
- 传输在发送前选择，不实现 SSE 到 Poll 的失败回退。
- CLI 强制显式 profile、回环 host 和单一端口；IPv6 地址以方括号展示。
- 聊天请求及客户端响应使用 `uvicorn.error.xpd` 输出 INFO 级单行 JSON；SSE 逐帧记录，Poll 记录最终 envelope，非聊天路由不记录业务日志。
- 日志按明确需求保留完整用户输入和结果行；只继续屏蔽 profile 密钥及未进入客户端响应的底层异常。

### 3.4 删除与依赖

删除通用 LLM/数据库/向量库集成、capabilities、通用 tools、Flask/FastAPI 通用 server、legacy、examples、notebooks、papers、通用 webcomponent、旧发布工作流和对应测试。

运行依赖收敛为 Click、FastAPI、OpenAI、Pydantic、PyMySQL、PyYAML、sqlglot 和 Uvicorn。开发依赖只覆盖 HTTP 测试、pytest、ruff、mypy 和类型 stub。

## 4. 自动化验证矩阵

| 范围 | 覆盖点 |
| --- | --- |
| 配置 | 顶层投影、密钥遮蔽、HTTPS、占位符、危险 YAML、权限警告 |
| Schema | 三表/BASE TABLE、逻辑关系、指标、注释清理、粒度字段、单次冻结 |
| Guard | SELECT/CTE/获批 JOIN、跨库/写入/星号/危险函数/歧义/关系绕过拒绝 |
| Runner | 只在连接前重试、查询不重放、超时脱敏、LIMIT 101、100 行返回 |
| Tool | 每回合 Search 门禁、快照身份、模型 20 行、UI 100 行、无导出 |
| Agent | assistant tool_call/tool result roundtrip、最终回答 Markdown 标记、顺序执行、跨回合 marker 失效 |
| Model | temperature 0、禁止并行调用、工具消息序列化、provider 异常脱敏 |
| HTTP | 路由白名单、SSE/Poll、ID 传递、稳定错误、安全头、无 auth/CORS |
| 日志 | 完整请求、Poll envelope、SSE chunk/error/DONE、无效请求、异常脱敏、非聊天路由静默 |
| 前端 | Markdown 子集、HTML/危险链接降级、安全 DOM、本地资源、无下载、发送前选传输、无 SSE 重放 |
| CLI/API | 仅三个业务参数、非回环拒绝、预检先于建服、根包仅两个导出 |

## 5. 验证命令

```bash
uv sync --extra dev
uv run pytest -q
node --test tests/integrations/xpd/xpd-markdown.test.mjs
uv run ruff format --check src/vanna tests/integrations/xpd
uv run ruff check src/vanna tests/integrations/xpd
uv run mypy src/vanna
uv build
git diff --check
```

CI 在 Python 3.12 和 Node 22 上执行同等测试、格式、lint、类型和源码构建。Node 测试只使用内置测试器和伪 DOM，不安装 npm 包；所有检查都不需要真实密钥。

## 6. 部署前 smoke test

外部环境准备完成后，由部署操作者执行：

1. 确认 profile 路径明确、权限建议为 `0600`，且使用只读数据库账号。
2. 启动命令只绑定回环地址，日志显示三表预检成功。
3. 分别执行单表聚合、CTE 和唯一获批逻辑 JOIN。
4. 验证 101 行以上结果只显示 100 行并标记截断。
5. 提交未知表、`SELECT *`、写语句和错误 JOIN，确认稳定拒绝。
6. 人工中断一次 SSE，确认浏览器不通过 Poll 重放。
7. 确认 INFO 控制台日志完整包含聊天请求及客户端响应，并检查其中没有 profile、密钥或未返回给客户端的原始模型/数据库异常。
8. 如控制台被重定向，确认日志文件或平台的访问权限和保留周期符合完整业务数据的保护要求。

此 smoke test 需要真实数据库和模型凭据，不能由无外部访问的单元测试替代。

## 7. 发布与回滚

无数据库或数据迁移。合并前可通过版本控制整体回滚代码；3.0 与旧通用 Vanna API 不兼容，不设计运行时双栈或兼容开关。外部 profile 和数据库保持只读，因此代码回滚不涉及外部状态恢复。
