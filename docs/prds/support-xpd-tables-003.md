# Vanna 3.0 支持面精简 PRD

> 历史需求：组件范围已由 [004 精简组件 PRD](./support-xpd-tables-004.md)
> 取代。
> Cookie 身份与请求关联已由 [006 Header PRD](./support-xpd-tables-006.md) 取代。

## 1. 背景与目标

001 期建立了 XPD 三表只读问答链路，002 期把 HTTP 传输收敛为 FastAPI、SSE
和 Polling。仓库仍携带大量未进入 XPD 主链的兼容代码、示例、集成、测试矩阵
和资料资产，并且公开支持说明与实际运行能力不一致。

本期发布边界升级为 Vanna 3.0：以 XPD 本地只读助手为主要可运行产品，同时
保留一组明确维护的 Python Integration。删除能力采用硬删除，不保留导入 shim、
空 extra、失效 CLI 参数或不可运行的示例。

## 2. 用户与产品定位

- 主要用户：使用 `xpd-report-agent` 本地 profile 查询 XPD 三表的可信操作者。
- 次要用户：通过 Python API 使用受支持 LLM、Memory、SQL Runner 和本地服务的
  应用开发者。
- CLI：只负责启动 XPD 本地服务；通用 Agent 由调用方通过 Python API 装配。

## 3. 支持矩阵

`src/vanna/integrations` 只保留以下目录：

| 能力 | Integration |
| --- | --- |
| LLM | `anthropic`、`openai` |
| Memory / Local | `local` |
| SQL | `mysql`、`sqlite` |
| Product Adapter | `xpd` |

`fastapi` 和 `servers` 继续作为可选服务依赖；`test`、`dev` 和重建后的 `all`
继续作为安装便利项。`local`、`sqlite` 不需要独立 extra。

## 4. 删除与变更范围

1. 删除 `src/vanna/examples`、顶层 `examples` 及 CLI 的 `--example`、
   `--list-examples`、`ExampleAgentLoader` 和无参 Demo fallback。
2. 删除整个 `src/vanna/legacy`，包括 `VannaBase`、`LegacyVannaAdapter`、
   `LegacySqlRunner` 及旧 LLM、数据库、向量库实现。
3. 删除全部非白名单 Integration：Azure OpenAI/Search、BigQuery、ChromaDB、
   ClickHouse、DuckDB、FAISS、Google/Gemini、Hive、Marqo、Milvus、Mock、MSSQL、
   Ollama、OpenSearch、Oracle、Pinecone、Plotly、PostgreSQL、Premium、Presto、
   Qdrant、Snowflake、Weaviate。
4. 删除 `PlotlyChartGenerator`、`VisualizeDataTool`、相关导出、依赖、提示和默认
   工作流建议；保留通用 `ChartComponent` 和前端 renderer。
5. 只删除顶层 `src/evals` benchmark/dataset；保留 `vanna.core.evaluation`。
6. 删除 `papers`、`notebooks`、`img`、旧迁移指南和 Legacy README。
7. 将 Python 包、`vanna.__version__` 和 FastAPI metadata 统一为 `3.0.0`。

## 5. CLI 契约

- `--xpd-config PATH` 必填，路径必须存在且可读。
- 默认监听 `127.0.0.1:8000`；只接受 `127.0.0.1`、`localhost`、`::1`。
- 继续支持 Server JSON 配置、开发静态资源目录、CDN URL 和端口参数。
- 缺少 XPD 或 FastAPI 依赖时，提示安装 `vanna[xpd,servers]`。
- 配置加载、三表预检全部成功后才创建并运行 Server。

## 6. 必须保持的能力

- XPD 三表、指标、逻辑关系和 Schema Evidence 契约。
- 同一用户回合先 `search_xpd_schema`、后 `run_xpd_sql` 的门禁。
- 单条只读 MySQL SELECT、获批 JOIN、超时、限行和连接重试策略。
- FastAPI SSE/Polling、登录 Cookie、回环限制、XPD 日志和本地会话历史。
- Rich/Simple Component wire contract、WebComponent renderer 和核心评估框架。
- 通用 `RunSqlTool` 及其文件输出扩展点，但不再提示内置图表工具。

## 7. 破坏性变更

被删除的 Python import、install extra 和 CLI 参数直接失败，不提供兼容响应。
调用方必须在升级前迁移到 Agent/Tool/Capability API 和本 PRD 列出的 Integration。
本期只修改仓库与版本，不执行 PyPI、NPM 或 CDN 发布。

## 8. 验收标准

- 源码和构建产物中的 Integration 目录精确等于 6 项白名单。
- `vanna.examples`、`vanna.legacy`、非白名单模块和内置 Plotly 工具不可导入；
  `import vanna`、白名单模块、核心评估与 ChartComponent 可导入。
- CLI 不含示例参数，缺 `--xpd-config` 或使用公网地址时以 UsageError 失败。
- XPD 既有 45 项回归和支持集成的独立测试通过。
- wheel/sdist 版本和 metadata 为 3.0.0，不包含删除目录、extra 或依赖。
- README、API、贡献、tox、pytest 和 CI 只声明当前支持面。
