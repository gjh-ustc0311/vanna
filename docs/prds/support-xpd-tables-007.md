# PRD：Chat SSE 空闲心跳与长连接可靠性

> 本文延续 [006 Header 与 Trace 契约](./support-xpd-tables-006.md)，不改变
> V3 业务信封、身份或 Polling 协议。

## 1. 背景与目标

`POST /api/vanna/v3/chat_sse` 只有在 Agent 产出 progress、component 或 error 时
才写响应。模型首包、工具或查询等待超过代理 idle timeout 时，即使服务仍在正常执行，
Nginx、Ingress 或 LB 也可能关闭连接。

007 的目标是：

- SSE 连续 15 秒无任何输出时写标准 comment heartbeat；
- XPD 模型等待期间保持事件循环可调度，使 15 秒节拍可以兑现；
- 不把传输活性混入业务 payload、历史、日志或 Polling；
- 明确 Nginx 60 秒以及 Ingress/LB 120 秒的部署契约；
- 客户端提前停止消费时及时取消连接和上游工作。

## 2. 已确认决策

| 事项 | 决策 |
| --- | --- |
| 接口范围 | 全部 `/api/vanna/v3/chat_sse` 请求 |
| Heartbeat wire | 精确为 `: heartbeat\n\n` |
| 节拍 | 连续空闲 15 秒后发送；任一实际输出重置计时 |
| 配置 | 生产固定 15 秒，不增加公开配置 |
| 协议身份 | SSE comment，不是 `data:` event 或业务 envelope |
| 日志与存储 | 不记录到 XPD chat 日志，不写历史或模型上下文 |
| Polling | 不发送 heartbeat |
| Fallback | heartbeat 不算有效 payload；heartbeat-only EOF 仍可回退 Poll |
| 强保证边界 | XPD 生产链；扩展实现必须遵守非阻塞 async 契约 |
| 代理配置 | 本仓文档化契约，真实部署仓库落地 |

SSE 规范要求客户端忽略以冒号开头的 comment，并建议约每 15 秒发送 comment
以规避旧代理超时：<https://html.spec.whatwg.org/multipage/server-sent-events.html#authoring-notes>。

## 3. 心跳契约

空闲流示例：

```text
: heartbeat

: heartbeat

data: {"progress":{"stage":"executing","message":"正在执行只读查询…"},"conversation_id":"conv_123","request_id":"req_123","timestamp":1788115199.0}

data: [DONE]

```

- 首个计时从 SSE body 开始迭代时启动。
- progress、component、error 和 heartbeat 写出后重新开始 15 秒空闲计时。
- 上游事件和 timeout 同时就绪时优先发送上游事件，避免冗余 heartbeat。
- 上游立即完成时直接发送 `[DONE]`；异常沿用安全 error 后 `[DONE]`。
- 正常或异常终止、EOF、客户端断连后不得继续发送 heartbeat。
- Heartbeat 无 JSON、Request ID、Trace ID、Conversation ID 或 timestamp。
- ASGI 每次 yield 是应用承诺的写出边界；实际出网还要求所有代理关闭缓冲。

## 4. 非阻塞与取消

XPD 当前使用的 OpenAI Chat Completions 适配器必须使用异步 SDK。请求创建采用
`await`，流采用 `async for`，取消或结束时关闭模型响应。数据库查询已在线程中执行，
因此 XPD 的主要长等待均不会阻塞 Uvicorn 事件循环。

SSE heartbeat 调度只能保证事件循环可运行时的输出。自定义 Agent、Middleware、Tool
或非 XPD 内置集成若在 async 方法中执行同步网络、数据库或 CPU 阻塞，即违反扩展契约，
不属于 007 的强保证范围。

客户端断连或停止迭代时，服务端必须取消仍在等待的上游 `__anext__()` 并关闭 iterator；
WebComponent 必须 cancel `ReadableStream` reader。取消不得转换成面向客户端的
`internal_error`，也不得遗留后台 task。

## 5. 代理与部署

- 直接 Nginx 的 SSE location 使用 `proxy_read_timeout 60s`，关闭 response buffering，
  并确保没有通过 `proxy_ignore_headers` 忽略应用已有的 `X-Accel-Buffering: no`。
- Ingress-Nginx 对 SSE 路径建议显式设置
  `nginx.ingress.kubernetes.io/proxy-read-timeout: "120"` 和
  `nginx.ingress.kubernetes.io/proxy-buffering: "off"`。
- 云 LB idle timeout 至少 120 秒。部署方必须确认它是连续无字节的 idle timeout；
  heartbeat 无法规避绝对请求总时长限制。
- 本仓库没有 Nginx、Ingress 或云 LB manifest，不新建无法对应真实平台的模板部署。

Nginx 的 `proxy_read_timeout` 计算两次上游 read 之间的间隔，默认 60 秒：
<https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_read_timeout>。

## 6. 非目标与兼容性

- 不新增业务 heartbeat 类型、Pydantic/TypeScript payload 或 UI 状态。
- 不改变 `[DONE]`、error、progress、SSE→Poll、Request/Trace 或幂等语义。
- 不增加 heartbeat 日志、指标、重连、终态回放或 Polling 心跳。
- 不在本期异步化 Anthropic、通用 MySQL 或任意第三方扩展。
- 标准 SSE 客户端兼容；把每个空行分隔块都当 JSON 的非标准客户端必须修正。

## 7. 验收标准

- 静默超过两个间隔时可连续观察到 heartbeat，随后真实业务帧仍正常到达。
- 业务帧会重置计时；立即完成、Polling 和预检错误均无 heartbeat。
- heartbeat 后异常仍是安全 error + `[DONE]`，完成后不再输出。
- 断连会取消并关闭 pending 上游读取，不输出伪错误且不残留 task。
- XPD OpenAI 请求期间事件循环可继续调度 heartbeat，流式 Tool Call 结果不变。
- WebComponent 忽略跨网络 chunk 的 comment；heartbeat-only EOF 仍回退 Poll。
- 经真实 Nginx→Ingress/LB 链路保持至少 120 秒，心跳不被缓冲且连接不断开。
