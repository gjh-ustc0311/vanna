# Vanna FastAPI-only 服务栈架构与代码设计

> 本文是 002 期历史架构；Legacy Adapter 和支持矩阵已由
> [003 支持面精简](./support-xpd-tables-003.md) 取代。

## 1. 目标架构

```mermaid
flowchart LR
    U[Browser / API Client] -->|POST chat_sse| F[FastAPI]
    U -. SSE 失败 .->|POST chat_poll| F
    F --> RC[RequestContext]
    RC --> UR[UserResolver]
    UR --> CH[ChatHandler]
    CH --> A[Agent]
    A --> T[Tools / Data Sources]

    LA[LegacyVannaAdapter] --> T
```

服务只有一个 HTTP 框架和两种 Chat 传输行为：SSE 负责逐块推送，Polling
负责一次性返回同一组 Chunk。两者共享 `ChatHandler`、Agent 和权限链路。

## 2. 路由契约

| 路由 | 职责 |
| --- | --- |
| `GET /` | 渲染登录状态和 `<vanna-chat>`。 |
| `POST /login`、`POST /logout` | 本地演示身份 Cookie。 |
| `POST /api/vanna/v2/chat_sse` | `text/event-stream`，末尾发送 `[DONE]`。 |
| `POST /api/vanna/v2/chat_poll` | 返回 `ChatResponse`。 |
| `GET /health` | 服务健康检查。 |

不存在 `/api/vanna/v2/chat_websocket`、`/api/v0/*`、Flask factory 或兼容占位。
旧请求由 ASGI 路由层按不存在处理，不在业务代码中维护 tombstone。

## 3. 数据流

1. 路由使用真实 HTTP Cookie、Header、客户端地址、Query 参数和 Body metadata
   创建 `RequestContext`。
2. `ChatHandler` 为缺失的 conversation/request ID 生成标识，并调用 Agent。
3. SSE 将每个 Rich Component 序列化为 `ChatStreamChunk` 后立即发送。
4. Polling 复用相同 stream，将 Chunk 收集到 `ChatResponse`。
5. WebComponent 默认消费 SSE；建连或读取失败时，以同一 ChatRequest 调用 Polling。

删除 WebSocket 不改变模型、组件、会话或工具协议。

## 4. 代码与打包边界

- `vanna.servers.fastapi` 是唯一内置 Server 实现。
- CLI 无框架选择，始终延迟导入并创建 `VannaFastAPIServer`。
- `fastapi` extra 提供 FastAPI/Uvicorn；`servers` 是它的聚合别名。
- 不提供空 `flask` extra，因为这会让不受支持的安装命令静默成功。
- `vanna.legacy.flask` 整体删除；`vanna.legacy.adapter` 继续把 VannaBase 能力
  包装成 Agent Tools，但没有任何 HTTP 路由职责。
- Python sdist 排除 `frontends/`，因此 WebComponent 源码和 CDN 发布必须由
  前端发布流程单独协调。

## 5. 兼容与失败模式

- 旧 Python import 失败，旧 CLI 参数由 Click 报错，旧 HTTP 路由不存在。
- 外部页面遗留的 `ws-endpoint` 不再被组件识别，也不会自动改写成 SSE。
- SSE 流建立后的错误仍以错误帧返回；建立失败时前端可以回退 Polling。
- Polling 会重新发起一次 Agent 请求，因此业务工具必须继续遵守既有幂等性和
  权限约束；本期不改变该既有行为。
- 对外发布时需要以破坏性版本发布，并协调 Python、NPM/CDN 和文档；本期只
  修改仓库实现与设计，不执行发布。

## 6. 扩展约束

未来如需新的实时传输协议，应以独立需求定义完整 wire contract、认证、错误、
断线重连和前端接入测试，不能恢复本期删除的半成品 WebSocket 路径。增加其他
Web 框架同样需要独立维护承诺，而不能重新引入 CLI 分支和重复路由实现。
