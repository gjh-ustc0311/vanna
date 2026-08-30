# Vanna FastAPI-only 服务栈精简实施计划

> 本文是 002 期历史计划；当前源码、依赖和 CLI 边界以
> [003 支持面精简](./support-xpd-tables-003.md) 为准。

## 1. 实施原则

- 采用硬删除，不保留兼容路由、导入 shim 或空 `flask` extra。
- 先删除运行时入口，再清理前端、打包、测试和文档引用。
- 只删除与 Flask、Legacy HTTP 和 WebSocket 直接关联的代码及依赖。
- 以 FastAPI SSE/Polling 契约和非 Flask Legacy Adapter 回归作为安全边界。

## 2. 工作分解

### 阶段 A：后端与 CLI

- 删除 `vanna.legacy.flask` 和 `vanna.servers.flask`。
- 删除 FastAPI `chat_websocket` 路由和 WebSocket imports。
- CLI 固定创建 `VannaFastAPIServer`，删除 `--framework`、`--debug`、
  Flask import、Union 和分支。
- 清理顶层导出、server 模块描述和首页 WS Endpoint。

完成标准：Python 源码不存在 Flask Server 或 WebSocket Route，保留的 FastAPI
路由集合完整。

### 阶段 B：前端与依赖

- 删除 `ApiClientConfig.wsEndpoint`、WebSocket 连接/发送方法和专用 timeout。
- 删除 `<vanna-chat>` 的 `ws-endpoint` 属性和客户端装配参数。
- 删除 `flask` extra，令 `servers` 仅依赖 `fastapi`。
- 将 WebComponent 测试后端依赖从 `uvicorn[standard]` 收敛到基础 Uvicorn。

完成标准：TypeScript 不包含 WebSocket API，SSE 主链和 Polling fallback 构建通过。

### 阶段 C：测试契约

- 删除 XPD Flask 登录测试。
- 增加 FastAPI Route 集合、无 WebSocket Route、模板无 WS 和健康检查断言。
- 增加 CLI FastAPI-only help 与旧参数失败断言。
- 保留 XPD 回环限制、FastAPI 登录和 `py311-legacy` 回归。

完成标准：目标测试和静态检查通过，删除面有正向保留和负向缺失断言。

### 阶段 D：文档与资产

- 重写 API 总览为 FastAPI SSE/Polling。
- 更新 README、Migration Guide、SSE 文档、Contributing、Notebook 和归档
  Legacy README。
- 新增 002 PRD、实施计划和架构文档；给 001 文档添加取代提示。
- 用 Mermaid 取代包含 Flask/WebSocket 的两张静态架构图并删除旧资产。

完成标准：活文档只将被删名称用于明确的 Breaking Changes 或迁移说明。

### 阶段 E：构建与验收

- 在全新临时目录构建 wheel/sdist并检查文件列表与 METADATA。
- 在隔离环境安装 `wheel[servers]`，执行 `pip check`、FastAPI 和 Adapter 导入。
- 执行 Python、前端、残留引用和空目录检查。

## 3. 验证命令

```bash
tox -e ruff,mypy,py311-unit,py311-xpd,py311-legacy
```

```bash
cd frontends/webcomponent
npx tsc --noEmit
npx vite build
```

不使用 `npm run build` 做纯验证，因为其版本同步步骤会改写 `package.json`。

```bash
uv build --out-dir /tmp/vanna-fastapi-only-build
```

检查新 wheel 不含 `vanna/legacy/flask`、`vanna/servers/flask`，METADATA 不含
`Provides-Extra: flask`、Flask 或 Flask-CORS 依赖，且 `servers` 指向 FastAPI。

## 4. 交付检查

- 默认 UI 可以登录并完成一次 SSE 对话。
- 人为破坏 SSE 后能够使用 Polling 返回相同 Chunk 外壳。
- 旧模块、CLI 参数和路由直接不可用，没有静默兼容。
- `LegacyVannaAdapter` 和已有 XPD 三表能力仍可用。
- 删除目录没有空壳，工作树不存在意外生成的版本文件或构建产物。
