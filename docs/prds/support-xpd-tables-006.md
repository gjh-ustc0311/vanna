# PRD：XPD 请求 Header、可信用户身份与 Trace 关联

> 本文是 [005 大结果集与 File 组件](./support-xpd-tables-005.md) 的后续需求，
> 取代 001/003 中 Cookie 演示身份和 V3 Body `request_id` 的既有约束。

## 1. 背景与目标

当前 V3 把可选 `request_id` 放在 JSON Body，缺失时由服务端生成；XPD 用户由
`vanna_email` Cookie 映射为两个固定身份，且系统没有独立 Trace ID。这与 XPD 既有
中台 Header 契约不一致，也无法让调用方统一关联一次逻辑 Turn 和具体 HTTP 尝试。

006 的目标是：

- SSE 与 Polling 使用同一套严格 Header 契约；
- Request ID 从 Body 硬切到 Header，Trace 缺省回退 Request；
- 数值 `X-User-Id` 成为会话、工具权限、历史和文件 owner 的唯一 XPD 身份；
- 本地页面、文件下载、日志、CORS 和 OpenAPI 同步适配；
- 校验失败必须发生在建流和 Agent 执行之前。

## 2. 已确认决策

| 事项 | 决策 |
| --- | --- |
| 接口范围 | `/api/vanna/v3/chat_sse` 与 `/api/vanna/v3/chat_poll` |
| Request 来源 | 必填 `X-Request-Id`；删除 Body `request_id` |
| Trace 来源 | 可选 `X-Trace-Id`；缺失时等于 Request ID |
| 用户来源 | 必填 `X-User-Id`，替代 Cookie 身份 |
| 用户 ID 类型 | 规范 uint64 十进制文本，包含 `0` |
| Trace 对外面 | 响应 Header、可信上下文和日志，不进入 SSE/Poll payload |
| SSE→Poll | 复用 Request ID，生成新的 Trace ID |
| Content-Type | 严格要求 `application/json`，允许合法参数 |
| Accept | 客户端按端点发送，服务端不执行严格内容协商 |
| 本地用户 | 浏览器 localStorage 保存，可在页面切换 |
| 本地文件 | 同源 Fetch 携带 `X-User-Id` 后保存 Blob |
| 历史目录 | `owner hash / conversation ID` 两级隔离 |
| 旧身份数据 | 不自动迁移；旧文件按原七天 TTL 清理 |

Header 中的示例值不是固定值。`X-User-Id` 是可信上游声明身份，不构成认证；服务必须
保持回环部署，或由可信网关先鉴权、移除外部同名 Header 后再注入。

## 3. 请求契约

```http
POST /api/vanna/v3/chat_sse
X-Request-Id: turn_20260825_001
X-Trace-Id: trace_20260825_001
X-User-Id: 123
Content-Type: application/json
Accept: text/event-stream
```

```json
{
  "conversation_id": "conversation_456",
  "message": "查询近 30 天成交金额最高的商品",
  "metadata": {}
}
```

- Request/Trace 匹配 `[A-Za-z0-9][A-Za-z0-9._:-]{0,127}`。
- User ID 匹配规范十进制 `0..18446744073709551615`；除单独的 `0` 外拒绝前导零，
  并拒绝符号、空白、小数、科学计数法、合并值和越界值。
- 必填 Header 只能出现一次；Trace 最多出现一次；Header 名大小写不敏感。
- Body 禁止额外字段，旧 `request_id` 返回 422。
- SSE 固定返回 `text/event-stream`；Poll 固定返回 JSON。
- 所有 Chat 成功响应和建流前错误回显有效的 `X-Request-Id`、`X-Trace-Id`，不回显用户 ID。

## 4. 身份、历史和文件

XPD User 的 `id` 使用规范化后的十进制字符串，固定属于 `xpd` 组；不得根据数字 ID
推断 admin 权限。现有邮箱选择器、`/login`、`/logout` 和 Cookie resolver 删除。

内置页面在 localStorage 中保存一个规范 uint64 用户 ID。切换用户时必须清空当前
页面消息并生成新 conversation ID，避免把前一个用户的展示状态带入新身份。

本地历史按 owner hash 和 conversation ID 共同分区，使两个用户可安全复用相同
conversation ID。metadata 仍保存并校验原始 owner ID。

本地 File URL 不能继续使用普通导航，因为导航无法附加身份 Header。相对 URL 由客户端
同源 Fetch，携带 `X-User-Id` 并以 Blob 触发下载；绝对 OSS URL 仍使用安全外链，禁止转发
XPD 身份、Request、Trace 或其他自定义 Header。

## 5. 错误、日志与安全

- `REQUEST_ID_INVALID`、`TRACE_ID_INVALID`、`USER_ID_INVALID`：HTTP 422；
- `UNSUPPORTED_MEDIA_TYPE`：HTTP 415；
- `VALIDATION_ERROR`：严格 Body 校验失败，HTTP 422。

非法关联值不得原样进入响应或日志；错误响应使用服务端生成的安全诊断关联 ID。以上错误
必须在 Handler、Agent、模型、数据库或文件操作前返回。

XPD 边界日志覆盖 SSE 和 Poll，记录 transport、conversation、request、trace、消息类型和
安全 payload；不记录原始 Header 集、Cookie、用户 ID 或凭据，File URL 继续脱敏。

跨域配置必须允许三个请求 Header，并向浏览器暴露两个响应关联 Header。前端
`customHeaders` 不得覆盖协议拥有的 Header，比较时大小写不敏感。

## 6. 非目标与兼容性

- 不增加认证、JWT、网关实现、生产权限或行级数据隔离。
- 不把 Trace 加入 SSE/Poll payload、模型上下文或持久会话。
- 不实现 Request ID 幂等、会话互斥或终态回放；相同 Request ID 仍可能执行多次。
- 不恢复旧 Body/Cookie 双轨，不提供兼容期或自动历史迁移。
- 不向 File GET 机械添加 JSON/SSE Header；本地下载只要求 `X-User-Id`。

Python 服务、内置 WebComponent 和 API 调用方必须原子升级。旧客户端会因缺少必填 Header
或继续发送 Body `request_id` 而收到 422。

## 7. 验收标准

- 合法显式 Trace 和缺省 Trace 均贯穿响应、payload Request、内部上下文和日志。
- 缺失、重复、非法、超长关联 ID 以及 User ID 数值边界均在执行前失败。
- JSON Content-Type、严格 Body、OpenAPI 和 CORS 符合契约。
- SSE 和 Poll 使用相同身份；SSE→Poll Request 相同而 Trace 不同。
- 两个用户可安全使用同一 conversation ID，历史和 File 互不可见。
- 本地 File 下载携带当前用户 Header；OSS 外链不携带内部 Header。
- starter 请求、普通聊天、进度、File、错误和日志回归全部通过。
