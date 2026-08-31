# 实施计划: XPD 大结果集、XLSX 与 File 组件

## 1. 交付目标

本计划实现 [005 PRD](../prds/support-xpd-tables-005.md) 定义的单次查询三路消费，具体
接口与状态机见 [005 架构设计](../archs/support-xpd-tables-005.md)：

```text
一次受控 SQL
  ├── DataFrame：前 30 条
  ├── LLM：前 100 条且最多 64 KiB
  └── XLSX：结果超过 30 条时，最多前 20,000 条
```

实施必须保持 XPD 的只读事务、同轮 Schema evidence、SQL Guard、查询不重放和稳定
脱敏错误边界。

## 2. 阶段 A：公共组件与工具结果协议

- 用 `FileComponent` 全局替换 `LinkComponent`，公共联合固定为
  `TextComponent | DataFrameComponent | FileComponent`。
- File 字段固定为 `type/name/url/media_type/size_bytes/row_count/truncated/expires_at`，
  为名称、URL、数值和 ISO 时间增加严格校验。
- 公共 `DataFrameComponent` 继续允许最多 100 条；30 条限制只在 XPD Tool 产出层实施，
  避免改变通用 SQL Tool 的展示契约。
- 将 `ToolResult.component` 改为 `components: list[Component]`，默认空列表；所有现有工具
  的无组件结果改为空列表，单组件结果改为单元素列表。
- Agent 按列表顺序逐个产生 `AgentComponentEvent`；Workflow 示例和审计模型同步改为
  多组件语义，审计记录 `component_types` 而非单个 `component_type`。
- SSE/Polling 的单帧组件信封保持不变，不新增协议路由；Python 3.0、V3 API 和同版本
  WebComponent 作为一次硬切发布。

完成标准：旧 Link payload 和 import 被拒绝，Tool hook 修改后的有序组件列表可完整送达，
现有 Text/DataFrame 单组件行为不变。

## 3. 阶段 B：有界查询收集与 XLSX

- 定义集中常量：查询 20,000、哨兵 20,001、预览 30、模型 100、模型 JSON 64 KiB、
  数据库批次 500、文件阈值 30。
- 将 Runner 外层限制改为 `LIMIT 20001`，默认 PyMySQL 连接使用服务端游标，并通过
  `fetchmany(500)` 消费；测试 double 继续支持最小 DB-API 接口。
- 重构查询结果模型，只在内存保留模型候选前 100 条、列信息、消费条数和查询截断状态，
  不再保存全部 20,000 条字典。
- 收到第 31 条时创建 write-only XLSX writer，将已缓存的前 31 条写入后继续流式追加；
  30 条以内不生成文件。
- 复用统一的单元格正规化规则处理 Decimal、日期时间、bytes、null 和非有限浮点；XLSX
  额外清理非法控制字符并防护公式注入。
- XLSX 先写入同目录临时路径，成功关闭工作簿后再交给文件存储原子提交；任何异常都
  关闭数据库资源并清理临时文件。

完成标准：20,001+ 行只读取 20,001 条，内存不持有全部结果，第 20,001 条不进入文件，
且一次工具调用只执行一次业务 SQL。

## 4. 阶段 C：本地文件存储与生命周期

- 新增 XPD 专属二进制结果存储，不复用面向 Agent 工具的文本 `LocalFileSystem`。
- 固定根目录 `datas/files`，布局为：

```text
datas/files/<owner-sha256前16位>/<file-id>/
  result.xlsx
  metadata.json
```

- 元数据固定保存 schema version、file ID、owner ID、下载名、相对路径、媒体类型、大小、
  行数、查询截断、created/expires 时间和可选 OSS object key；不保存 SQL 或问题。
- Schema 预检成功后创建并检查目录，设置目录 `0700`、文件 `0600`；不可写时阻止启动。
- 文件显示名使用上海时区和 UUID：
  `xpd-query-YYYYMMDD-HHmmss-<file-id前8位>.xlsx`。
- 注册 `GET /api/vanna/v3/files/{file_id}`，复用当前用户解析器并校验 owner、UUID、路径、
  普通文件、非符号链接和 7 天 TTL。
- 在 FastAPI 生命周期中执行启动清理并启动每小时清理任务；shutdown 时取消任务并等待
  安全退出。到期判断使用可注入 UTC 时钟，`now >= expires_at` 即视为过期。
- 将 `datas/files` 加入 `.gitignore`。

完成标准：本地文件可以跨进程重启继续下载，其他用户无法区分文件不存在或不属于自己，
过期文件立即返回 410，失败写入不留半成品。

## 5. 阶段 D：OSS 上传与直接下载

- 扩展严格 profile loader，只保留新增的 `oss`、`oss_access` 块；继续丢弃其他不属于
  Vanna 的外部配置，且不读取外部 `storage.path`。
- `oss.enabled=false` 时延迟导入 OSS SDK，File URL 指向本地受控路由，`expires_at` 为
  本地 7 天过期时间。
- `oss.enabled=true` 时校验 endpoint、region、bucket、prefix、凭据及 local profile 的
  `oss_presign` provider；配置或 SDK 不完整时启动失败且错误不含字段值。
- 本地提交成功后上传私有 OSS 对象，设置 XLSX MIME、Content-Disposition、禁止覆盖；
  object key 使用 `<prefix>/<YYYYMMDD>/<owner-hash>/<file-id>.xlsx`。
- 上传成功后按 `oss_access.url_ttl_seconds` 生成直接 HTTPS URL，并把实际过期时间写入
  FileComponent。当前外部 local profile 的 TTL 是 86,400 秒。
- 上传或签名失败时保留 DataFrame、移除 File 组件，并通过模型结果明确文件暂不可用；
  不返回本地 URL、不重跑 SQL。本地副本和已上传对象仍进入七天清理流程。
- 清理任务同时删除 OSS 对象；失败时保留不含 URL/凭据的最小过期元数据供下次重试。

完成标准：OSS 关闭时无 SDK 调用；开启时返回直接签名 URL；任何失败路径都不泄露凭据、
签名 query、object key 或本地路径。

## 6. 阶段 E：XPD Tool、前端与日志

- `RunXpdSqlTool` 从查询结果构造前 30 条 DataFrame，并在文件可用时返回
  `[dataframe, file]`；模型 payload 按 64 KiB 预算添加最多前 100 条完整行。
- metadata 区分 `preview_truncated`、`query_truncated`、`file_status`、实际模型行数和
  exported row count，删除 `exportable=false` 旧语义。
- 更新工具描述和 XPD 系统提示，允许受控 XLSX 文件交付，禁止模型声称大于 20,000 条
  的文件是完整结果。
- TypeScript 联合和运行时校验删除 Link、加入 File；File 卡片紧随 DataFrame，展示
  文件名、类型、大小、行数、有效期和 20,000 条截断提示。
- DataFrame 提示从硬编码 100 改为根据 `rows.length` 显示实际预览条数。
- XPD SSE 日志在序列化 File payload 前复制并把 `url` 替换为 `<redacted>`；不得修改
  发送给浏览器的 wire payload。模型结果和历史中不放 URL。
- 重建 WebComponent，并把版本匹配 bundle 同步到 Python 包。

完成标准：SSE 与 Polling 顺序均为 DataFrame、File、最终 Text；OSS 失败时只有
DataFrame 和说明文本；旧 bundle/新服务的协议错配明确 fail closed。

## 7. 阶段 F：测试、文档与构建

- 更新 Python 组件、ToolResult、Agent、Workflow、审计和公共支持面测试。
- 为 Runner 增加 0、1、30、31、100、101、20,000、20,001 行边界与分批游标测试。
- 使用 openpyxl 回读文件，验证列/行顺序、Unicode、数值、日期、null、bytes、公式注入、
  超长单元格和异常清理。
- 为本地下载增加 owner、404/410、路径穿越、符号链接、权限、响应头、重启和并发清理测试。
- 使用合成 profile 和 fake OSS client 验证开关、私有上传、签名 TTL、失败降级、七天删除
  重试和所有日志脱敏；自动化测试不得读取真实 profile 凭据。
- 增加前端 File 校验/渲染、DataFrame 30 条提示、组件顺序和危险 URL 测试。
- 将遗漏的组件/Agent 测试加入 tox，并在 CI 中运行 Vitest、Vite build 和 Python bundle
  同步校验。
- 更新 README、API contract、breaking changes，并在 001/004 文档中增加被 005 取代的
  提示。

## 8. 依赖、发布与回滚

- `xpd` extra 增加 `openpyxl>=3.1.5` 和 `alibabacloud-oss-v2>=1.3.2`；OSS SDK 运行时
  仍按配置延迟导入。
- 发布前用干净临时目录验证 wheel/sdist 包含新版 WebComponent、不包含 `datas/files`。
- Python 包、FastAPI 服务和 WebComponent 必须原子发布；显式 CDN override 必须同步更新。
- 本期没有旧文件或历史组件迁移。回滚必须整体回滚 Python 与前端，并先停止新文件生成；
  已生成文件仍由七天清理器处理，不通过回滚脚本批量删除。

建议的最终验证命令：

```bash
tox -e py311-unit,py311-xpd,ruff,mypy
cd frontends/webcomponent && npm test && npm run build
python -m build --outdir /tmp/vanna-build
python scripts/verify_distribution.py /tmp/vanna-build
```
