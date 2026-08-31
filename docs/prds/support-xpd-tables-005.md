# PRD: XPD 大结果集文件交付与 File 组件

> 本文是 [004 组件协议精简](./support-xpd-tables-004.md) 的后续需求。
> 文件下载的用户身份传递已由 [006 Header PRD](./support-xpd-tables-006.md) 取代。
> 005 将公共三组件从 `Text/DataFrame/Link` 调整为
> `Text/DataFrame/File`，并取代 001、004 中“XPD 查询最多返回 100 行且不可导出”
> 的既有约束。

## 1. 背景

当前 XPD 查询链路使用外层 `LIMIT 101` 探测截断，只保留前 100 行；模型只接收
前 20 行，前端最多展示 100 行，且明确禁止导出。这个设计适合小结果集，但无法让
用户获取超过预览范围的明细，也无法承载最高 20,000 行的业务查询结果。

005 需要把数据库读取、模型分析、前端预览和文件交付拆成相互独立的边界：数据库
仍受严格上限保护，模型和 SSE 不承载完整大结果，用户通过 XLSX 文件取得预览之外
的明细。

## 2. 用户与目标

用户仍是通过本地 XPD Web/API 使用三表只读查询能力的可信操作者。本期目标是：

- 单次只读查询最多处理并交付前 20,000 条结果；
- 前端只展示紧凑的前 30 条预览；
- 模型最多分析前 100 条，同时受序列化大小限制；
- 结果超过 30 条时提供 XLSX 下载；
- 本地文件始终可生成和留存，OSS 按外部配置选择性启用；
- 使用正式 `FileComponent` 表达文件，不再把文件伪装成普通链接。

## 3. 已确认的产品决策

| 事项 | 决策 |
| --- | --- |
| 数据库结果上限 | 最多消费 20,000 条，读取第 20,001 条作为截断哨兵 |
| DataFrame | 按 SQL 返回顺序展示前 30 条 |
| 模型样本 | 最多前 100 条完整行，紧凑 JSON 总大小不超过 64 KiB |
| 文件阈值 | 查询结果超过 30 条即生成文件 |
| 文件格式 | XLSX |
| 公共组件 | `TextComponent | DataFrameComponent | FileComponent`，删除 Link |
| 本地存储 | `datas/files`，强制启用，保留 7 天 |
| OSS 开关 | 遵循显式外部 profile 的 `oss.enabled` |
| OSS 下载 | 成功时直接返回预签名 HTTPS URL |
| OSS 失败 | 不回退本地下载；只展示 30 条预览并明确提示文件暂不可用 |
| 历史回放 | 本期不恢复 DataFrame/File 卡片，不提供过期链接续签 |

“前 30 条”严格指数据库按 SQL 返回的前 30 条。SQL 未包含 `ORDER BY` 时，系统
不得把该顺序描述为稳定的业务 Top 排名。

### 3.1 相对原始需求的优化

- 原始需求把文件阈值设为大于 100，但表格只展示 30 条，会导致第 31–100 条无法由
  用户取得；005 将文件阈值调整为大于 30，消除该不可达区间。
- 当前模型只接收 20 条，字面上已经满足“不超过 100 条”；005 明确提升为最多 100 条，
  并增加 64 KiB 总量限制，避免宽行或长文本撑大上下文。
- OSS 一天签名、本地七天保留和 OSS 对象七天留存是三个独立时间概念，不再用一个
  “过期时间”混合表达。

## 4. 功能需求

### 4.1 查询与三层结果边界

1. 每次 `run_xpd_sql` 仍只执行一条经过同轮 Schema 门禁和 SQL Guard 验证的 SQL。
2. 服务使用外层 `LIMIT 20001`，第 20,001 条只用于设置查询截断状态，不得进入
   DataFrame、模型或文件。
3. 查询实际返回不超过 20,000 条时，`returned_row_count` 是实际返回条数；超过时
   固定为 20,000，并设置 `query_truncated=true`。
4. XPD Tool 产出的 DataFrame 最多携带前 30 条；结果超过 30 条时设置其
   `truncated=true`。公共 `DataFrameComponent` 仍保留最多 100 条的通用协议上限，
   不因 XPD 的预览策略全局收缩。
5. 模型最多接收前 100 条完整行。序列化后的工具 JSON 上限为 64 KiB，超过时只保留
   能完整装入预算的前若干行，不截断单个 JSON 行，并报告实际可见行数。
6. 结果超过 30 条时生成一个 XLSX，包含列头及前
   `min(实际结果条数, 20000)` 条记录，保持数据库列顺序和行顺序。
7. 查询达到 20,000 条上限时，File 和最终回答必须使用“前 20,000 条”口径，不得
   声称文件包含完整查询结果。
8. 预览、模型样本和文件必须来自同一次数据库执行；不得为导出重放查询。

### 4.2 XLSX 文件

- 工作表名称固定为“查询结果”，冻结首行并启用列筛选。
- 文件名固定为
  `xpd-query-YYYYMMDD-HHmmss-<file-id前8位>.xlsx`，时间使用
  `Asia/Shanghai`，不得包含用户问题、SQL、用户 ID 或原始 request ID。
- MIME 类型固定为
  `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`。
- 以 `=`, `+`, `-`, `@` 开头（忽略前导空白）的文本必须转义，避免电子表格公式注入。
- 清理 XLSX 不允许的控制字符；超过 Excel 单元格限制的值必须使文件生成安全失败，
  不得静默写入损坏工作簿。
- 文件生成使用临时文件并原子提交；查询、生成或提交失败时不得留下半成品。

### 4.3 File 组件

公共 `FileComponent` 使用以下严格字段，禁止额外字段：

```json
{
  "type": "file",
  "name": "xpd-query-20260831-143052-a1b2c3d4.xlsx",
  "url": "https://example.invalid/signed-download",
  "media_type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "size_bytes": 123456,
  "row_count": 20000,
  "truncated": true,
  "expires_at": "2026-09-01T14:30:52+08:00"
}
```

- `name` 是安全下载名，不得包含路径分隔符、控制字符或 CR/LF。
- `url` 只允许安全相对 URL 或绝对 HTTP(S) URL。
- `size_bytes`、`row_count` 为非负整数。
- `truncated` 只表示文件受 20,000 条查询上限截断，不表示 DataFrame 的 30 条预览。
- `expires_at` 表示当前 URL 的实际访问过期时间：本地 URL 为创建后 7 天；OSS URL
  使用 profile 中的签名 TTL，当前 local profile 为 1 天。

### 4.4 本地文件存储与下载

1. 服务在 Schema 预检成功后初始化 `datas/files`；目录不可创建或不可写时启动失败。
2. 每个文件使用不可猜测的 UUID，并按当前用户哈希隔离。元数据只保存 owner、文件
   ID、下载名、相对路径、创建/过期时间、大小、行数、截断状态和可选 OSS object key，
   不保存问题或 SQL。
3. 目录权限为 `0700`，结果文件和元数据权限为 `0600`。
4. OSS 未启用时，File URL 使用受控路由
   `GET /api/vanna/v3/files/{file_id}`，不得直接静态挂载 `datas/files`。
5. 下载路由校验当前用户、文件 ID、普通文件、非符号链接、目录边界和过期时间；其他
   用户或不存在文件返回 404，owner 访问已过期文件返回 410。
6. 下载响应使用 `Content-Disposition: attachment`、正确 MIME、
   `Cache-Control: private, no-store` 和 `X-Content-Type-Options: nosniff`。
7. 文件创建满 7 天后立即不可下载。服务在启动时及每小时执行清理。

### 4.5 OSS

1. Vanna 继续显式、只读地加载外部 `app-local.yaml`，新增保留并验证 `oss` 和
   `oss_access`；外部 `storage.path` 不改变本地固定目录 `datas/files`。
2. `oss.enabled=false` 时不得导入、初始化或调用 OSS SDK，File 使用本地受控 URL。
3. `oss.enabled=true` 时，先原子提交本地文件，再上传为私有、禁止覆盖的 OSS 对象，
   最后按 `oss_access.url_ttl_seconds` 生成直接下载 URL。
4. OSS object key 使用配置 prefix、日期、owner 哈希和 file ID 构造，不包含问题或 SQL。
5. 上传或签名失败不重放查询，也不返回本地兜底 URL；UI 保留 DataFrame，File 组件
   省略，最终回答必须说明“文件暂不可用”。本地副本仍保留至 7 天到期。
6. OSS 对象与本地文件使用相同的 7 天数据留存期。远端删除失败时，文件仍视为过期，
   保留最小过期元数据并由小时任务重试删除。
7. 预签名 URL、签名 query 和 object key 不得进入模型工具结果、会话历史或日志。

### 4.6 前端展示

- 查询成功后按 `DataFrame → File → 最终 Text` 的顺序追加组件。
- DataFrame 截断提示使用实际预览行数，例如“仅展示前 30 条”。
- File 在对应 DataFrame 下方显示为独立下载卡片，至少展示文件名、文件类型、文件大小、
  行数和有效期。
- 文件达到查询上限时显示“文件仅包含前 20,000 条”。
- OSS 失败时不显示空文件卡片，由最终 Text 明确说明文件暂不可用。
- 外部文件链接使用 `target="_blank"` 和 `rel="noopener noreferrer"`；未知或危险 File
  组件继续 fail closed。

### 4.7 错误、日志与历史

- 数据库失败沿用现有稳定、脱敏的 XPD 错误。
- 本地目录初始化失败必须阻止启动；查询后的 XLSX/本地提交失败只保留 DataFrame，并
  通过模型工具结果产生安全的文件不可用提示，不得自动重跑 SQL。
- XPD SSE 日志可以记录 File 的非敏感元数据，但 `url` 必须写为 `<redacted>`；wire
  payload 仍向浏览器发送真实 URL。
- Tool 的模型结果只包含行数、截断、文件状态和受限样本，不包含 URL、本地路径、
  object key 或凭据。
- 本期沿用现有会话行为：组件不写入 Conversation Store，页面刷新后不重建表格或文件
  卡片；用户已保存的本地 URL 在 7 天内仍可直接访问，OSS URL 到期后不续签。

## 5. 非功能需求

- 20,001 条结果仍保持有界内存；数据库使用服务端游标并按固定批次读取。
- 本地文件、OSS 凭据和签名 URL 不得出现在异常文本、对象 repr 或结构化日志中。
- Python 服务和随包 WebComponent 必须原子升级；旧客户端收到 `file` 时允许 fail closed，
  不提供 `link` 兼容降级。
- OSS 是可选交付通道，但本地文件能力和 XLSX 依赖是 XPD 模式的强制启动能力。

## 6. 非目标

- CSV、用户选择文件格式、手动导出按钮或查询全部真实总数。
- 文件卡片历史回放、过期 URL 续签或跨会话文件管理页面。
- 恢复 Link、增加 V4 路由或提供 V3 兼容适配器。
- 修改外部 profile、复用外部项目运行时代码或依赖其 Python 包。
- 生产认证、行级权限、多租户、公网文件服务或长期审计归档。

## 7. 验收标准

| 数据库可读行数 | DataFrame | 模型 | File | File 行数 | 查询截断 |
| ---: | ---: | ---: | --- | ---: | --- |
| 0 | 0 | 0 | 无 | - | false |
| 1 | 1 | 1 | 无 | - | false |
| 30 | 30 | 30 | 无 | - | false |
| 31 | 30 | 不超过 31 | 有 | 31 | false |
| 100 | 30 | 不超过 100 | 有 | 100 | false |
| 101 | 30 | 不超过 100 | 有 | 101 | false |
| 20,000 | 30 | 不超过 100 | 有 | 20,000 | false |
| 20,001+ | 30 | 不超过 100 | 有 | 20,000 | true |

模型列中的条数还必须满足 64 KiB JSON 上限。以上所有场景只允许一次受 Guard 保护的
SQL 执行。OSS 开启且成功时 File 使用直接预签 URL；OSS 失败时相同行数场景不返回
File，但必须保留预览和安全提示。
