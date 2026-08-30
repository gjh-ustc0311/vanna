# Vanna FastAPI-only 服务栈精简 PRD

> 本文是 002 期历史需求；其中保留 Legacy Adapter 和通用 CLI 的承诺已由
> [003 支持面精简](./support-xpd-tables-003.md) 取代。

## 1. 背景与目标

仓库同时保留了 V2 Flask Server、Legacy Flask `/api/v0/*`、FastAPI
WebSocket 以及对应前端接口。实际 WebComponent 始终使用 SSE，并在失败后
回退 Polling；WebSocket 没有进入主链，客户端完成帧判断也与服务端协议不一致。

本期将服务传输层收敛为 FastAPI，将对话协议收敛为 SSE 主链和 Polling
降级，删除无效实现、直接依赖、公开入口和过时文档。

## 2. 删除范围

1. 删除 `vanna.legacy.flask` 整个包，包括：
   - 所有 `/api/v0/*` 路由及 catch-all；
   - `VannaFlaskAPI`、`VannaFlaskApp`、Cache、认证接口；
   - 旧页面、静态资源、Flasgger 文档和 `/api/v0/log` 调试 WebSocket。
2. 删除 `vanna.servers.flask` 整个包，包括 V2 Flask 的页面、登录、SSE、
   Polling、健康检查及 WebSocket 501 占位路由。
3. 删除 FastAPI `/api/vanna/v2/chat_websocket`。
4. 删除 CLI Flask 选择与只服务 Flask 的 debug 参数。
5. 删除 WebComponent 的 `ws-endpoint`、WS 客户端方法和专用配置。
6. 删除 `flask` extra、`flask`、`flask-cors` 和测试侧仅为 WebSocket 引入的
   Uvicorn standard extra。

## 3. 保留能力

- `VannaFastAPIServer` 与已有 FastAPI 路由集成。
- `/`、`/login`、`/logout`、`/health`。
- `/api/vanna/v2/chat_sse` 和 `/api/vanna/v2/chat_poll`。
- WebComponent 的 SSE 主链和 Polling fallback。
- `VannaBase`、`LegacyVannaAdapter`、`LegacySqlRunner` 及其他非 Flask
  Legacy LLM、数据库和向量库集成。
- `fastapi` extra；`servers` 名称继续保留，但仅安装 FastAPI/Uvicorn。

## 4. 破坏性变更

| 旧入口 | 新行为或迁移方向 |
| --- | --- |
| `vanna.legacy.flask.*` | 导入失败；HTTP 客户端迁移到 V2 ChatRequest。 |
| `vanna.servers.flask.*` | 导入失败；改用 `vanna.servers.fastapi`。 |
| `vanna --framework ...` | 参数不存在；CLI 固定 FastAPI。 |
| `vanna --debug` | 参数不存在；该参数原本只控制 Flask。 |
| `/api/v0/*` | 路由不存在，不返回 410 或兼容响应。 |
| `/api/vanna/v2/chat_websocket` | 路由不存在；改用 SSE。 |
| `ws-endpoint` 和前端 WS 方法 | 从前端公开契约删除。 |
| `vanna[flask]` | extra 不再提供；使用 `vanna[fastapi]` 或 `vanna[servers]`。 |

## 5. 非功能要求

- 不允许通过兼容 shim、空 extra、501/410 路由或死配置保留已删除能力。
- SSE、Polling、身份解析、XPD 回环限制和非 Flask Legacy Adapter 不回归。
- 新构建的 wheel/sdist 不包含 Flask 包目录或 Flask 依赖元数据。
- 活跃源码、模板、前端和 API 文档不得继续宣传 Flask、Legacy HTTP 或
  WebSocket 支持。
- 删除目标后不得保留空目录或占位文件。

## 6. 明确不做

- 不把 `/api/v0/*` 逐一迁移到 FastAPI。
- 不删除全部 `vanna.legacy`，不重写 VannaBase 生态。
- 不改变 ChatRequest、ChatStreamChunk、ChatResponse 或 SSE 帧协议。
- 不修改版本号，不执行 PyPI、NPM 或 CDN 发布。
- 不扩展为全仓通用依赖清理。

## 7. 验收标准

- 两个 Flask 包和 FastAPI WebSocket Route 均不存在。
- CLI help 不包含 `--framework`、`--debug`，XPD 默认仍启动 FastAPI。
- 首页只展示 SSE、Polling 和健康检查，前端不再暴露 WS 配置或方法。
- SSE 正常以 `[DONE]` 结束，失败时 Polling fallback 可用。
- FastAPI 登录 Cookie、健康检查和 XPD 安全边界通过回归。
- `servers` extra 只解析到 FastAPI/Uvicorn；`LegacyVannaAdapter` 仍可导入。
- 文档、构建产物、残留扫描和空目录检查全部通过。
