# Vanna FastAPI HTTP API 总览

本文基于当前仓库实现，说明 Vanna Agent Server 对外提供的 FastAPI、SSE
与 Polling 接口。服务端不再包含 Flask Server、Legacy `/api/v0/*` API 或
WebSocket 对话端点。

主要实现位置：

- `src/vanna/servers/fastapi/app.py`
- `src/vanna/servers/fastapi/routes.py`
- `src/vanna/servers/base/chat_handler.py`
- `src/vanna/servers/base/models.py`

`chat_sse` 的帧、组件和历史处理细节见 [chat_sse API 与处理说明](./chat_sse.md)。

## 1. 服务与 Endpoint

CLI 仅启动 XPD 本地模式，默认端口为 `8000`，默认绑定 `127.0.0.1`。
监听地址只允许 `127.0.0.1`、`localhost` 或 `::1`。

| Method | Path | 说明 |
| --- | --- | --- |
| `GET` | `/` | 内置 `<vanna-chat>` 页面和本地演示登录入口。 |
| `POST` | `/login` | 校验本地演示邮箱，设置 `vanna_email` Cookie 后 303 重定向。 |
| `POST` | `/logout` | 删除演示 Cookie 后 303 重定向。 |
| `POST` | `/api/vanna/v2/chat_sse` | SSE 流式对话，WebComponent 的默认传输方式。 |
| `POST` | `/api/vanna/v2/chat_poll` | 一次性返回全部 Chunk，作为 SSE 失败时的降级方式。 |
| `GET` | `/health` | 返回服务健康状态。 |
| `GET` | `/docs` | FastAPI 自动生成的 Swagger UI。 |
| `GET` | `/openapi.json` | FastAPI OpenAPI Schema。 |

当前没有 `/api/vanna/v2/chat_websocket`，也没有 `/api/v0/*` 兼容路由。

## 2. ChatRequest

SSE 和 Polling 使用同一 JSON Body：

```json
{
  "message": "Show the top products",
  "conversation_id": "optional-conversation-id",
  "request_id": "optional-request-id",
  "metadata": {
    "source": "embedded-ui"
  }
}
```

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `message` | 是 | 当前用户消息。空消息是否有效由 Agent 工作流决定。 |
| `conversation_id` | 否 | 继续已有会话；省略时服务端生成 ID。 |
| `request_id` | 否 | 请求追踪 ID；省略时服务端生成 UUID。 |
| `metadata` | 否 | 传给 `RequestContext.metadata` 的扩展元数据。 |

`request_context` 是服务端保留字段。路由会使用真实请求的 Cookie、Header、
客户端地址、Query 参数和 `metadata` 重建它，客户端不得依赖 Body 中的
`request_context` 或额外 `user_id` 传递身份。

## 3. 身份与 RequestContext

每个 Chat 请求在进入 `ChatHandler` 前都会构造：

```text
HTTP Cookie / Header / Client / Query / Metadata
                    │
                    ▼
              RequestContext
                    │
                    ▼
               UserResolver
                    │
                    ▼
             User-aware Agent
```

身份解析和权限校验必须由服务端可信信息完成。内置 `/login` 只接受
`admin@example.com` 与 `user@example.com`，用于本地演示，不是生产认证。

## 4. SSE `/api/vanna/v2/chat_sse`

请求：

```bash
curl -N -X POST http://127.0.0.1:8000/api/vanna/v2/chat_sse \
  -H 'Content-Type: application/json' \
  -H 'Accept: text/event-stream' \
  -d '{"message":"Show the top products"}'
```

成功响应使用 `text/event-stream`。每个组件为一个 `data:` 帧：

```text
data: {"rich":{"type":"rich_text",...},"simple":null,"conversation_id":"conv_123","request_id":"req_123","timestamp":1750000000.0}

data: [DONE]

```

流开始后发生的异常也通过 `data:` 错误对象返回；此时 HTTP 状态可能已经是
`200`。客户端必须同时处理 HTTP 建连错误、错误帧和流中断。

## 5. Polling `/api/vanna/v2/chat_poll`

Polling 使用相同请求结构，成功时返回：

```json
{
  "chunks": [
    {
      "rich": {"type": "rich_text"},
      "simple": null,
      "conversation_id": "conv_123",
      "request_id": "req_123",
      "timestamp": 1750000000.0
    }
  ],
  "conversation_id": "conv_123",
  "request_id": "req_123",
  "total_chunks": 1
}
```

Polling 会等待 Agent 完成后一次性返回结果，不具备逐块展示能力。当前
WebComponent 的策略是优先 SSE，建连或读取失败后使用 Polling 重试。

## 6. ChatStreamChunk

| 字段 | 说明 |
| --- | --- |
| `rich` | Rich Component 序列化结果，前端主要消费对象。 |
| `simple` | 可选的简单组件表示。 |
| `conversation_id` | 所属会话 ID。 |
| `request_id` | 所属请求 ID。 |
| `timestamp` | 服务端生成 Chunk 的 Unix 时间戳。 |

`rich` 的具体结构由组件类型决定。创建、更新、替换和删除组件都通过相同
Chunk 外壳传输。

## 7. 服务启动与集成

XPD CLI 必须显式传入 profile：

```bash
vanna --xpd-config /absolute/path/to/app-local.yaml
```

CLI 不再提供内置 Example Agent、无参 Demo 或外部 Agent factory；通用 Agent
服务应通过下面的 Python API 装配。

Python：

```python
from vanna.servers.fastapi import VannaFastAPIServer

server = VannaFastAPIServer(agent)
app = server.create_app()
```

接入已有 FastAPI 应用：

```python
from fastapi import FastAPI
from vanna.servers.base import ChatHandler
from vanna.servers.fastapi.routes import register_chat_routes

app = FastAPI()
register_chat_routes(app, ChatHandler(agent))
```

`VannaFastAPIServer` 支持的通用配置包括 `fastapi`、`cors`、`dev_mode`、
`static_folder`、`cdn_url` 和 `api_base_url`。`dev_mode=false` 时首页默认从
配置的 CDN 加载 WebComponent；发布前应确保 CDN 版本与服务端契约兼容。

## 8. 已移除接口的迁移

- Flask Server 使用者迁移到 `VannaFastAPIServer` 或把路由注册到已有
  FastAPI 应用。
- Legacy `/api/v0/*` 客户端需要迁移为一次 ChatRequest，并消费 SSE Chunk
  或 Polling 的 `ChatResponse`；不存在逐 Endpoint 的兼容映射。
- WebSocket 客户端迁移到 SSE。浏览器无法使用自定义 Header 时，应使用
  Cookie、同源网关或服务端支持的认证方式。
- Vanna 0.x Python 兼容包和 Adapter 已全部删除；调用方必须直接迁移到当前
  `Agent`、`ToolRegistry`、Capability 和受支持 Integration API。
