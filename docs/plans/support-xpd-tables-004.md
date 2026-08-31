# 实施计划: 三组件与 V3 Chat 协议

> File 组件与多组件 ToolResult 的实施以 [005 计划](./support-xpd-tables-005.md) 为准。

## 1. 协议收敛

- 新建 `Component` 判别联合：`TextComponent | DataFrameComponent |
  LinkComponent`。
- 将 `ToolResult.ui_component` 改为可选 `component`。
- 将 Workflow、Agent、Evaluation 和审计链路改为直接传递组件。
- 删除 Rich/Simple 基类、子类、管理器和生命周期更新协议。

## 2. 产出策略

- Agent 最终回答和工作流命令使用 `TextComponent`。
- SQL/XPD 查询成功使用 `DataFrameComponent`。
- 文件、Python、Memory 等操作型工具不直接输出 UI，由最终回答负责说明。
- 工具失败不向前端暴露内部错误组件。

## 3. HTTP V3

- 路由硬切到 `/api/vanna/v3/chat_sse` 和 `/api/vanna/v3/chat_poll`。
- SSE 使用单组件信封并以 `[DONE]` 结束。
- 流内异常与 Polling 500 使用统一、安全的错误信封。
- 首页模板和默认端点同步升级，不保留 V2 alias。

## 4. WebComponent

- API 客户端增加运行时信封和组件校验。
- 使用 `marked` 解析 Markdown、`DOMPurify` 二次清理，并在解析前转义原始
  HTML。
- 静态渲染 100 行以内的数据表；安全渲染相对/HTTP(S) 链接。
- 删除 Plotly、Rich renderer、任务、旧进度/状态组件与相关 Storybook/demo 代码；
  临时过程反馈由独立 SSE `progress` 信封和单状态 renderer 承担。
- 构建时把同版本 WebComponent 同步进 Python 包，FastAPI 默认本地托管；CDN
  仅作为显式覆盖，防止前后端协议版本错配。
- 保留基础 `<vanna-chat>` 属性和 `sendMessage`、`addMessage`、
  `clearMessages`、自定义 Header 等嵌入 API。

## 5. 验证与文档

- 重写旧组件断言为三组件与 V3 契约断言。
- 增加模型边界、URL、行数、SSE、Polling、Markdown 安全测试。
- 更新 README、API 文档和 3.0 breaking changes。
- 执行 Ruff、Pytest、TypeScript、Vitest 和 Vite build。
