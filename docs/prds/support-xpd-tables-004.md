# PRD: 精简 Vanna 组件协议

## 背景

原协议同时存在 `UiComponent`、`RichComponent` 和 `SimpleComponent`。一次结果
需要同时构造 Rich/Simple 表示，Rich 又包含 ID、生命周期、树结构和动态 UI
状态。当前 XPD 产品只需要展示回答、查询表格和链接，这套抽象的维护成本远高于
产品收益。

## 目标

- 公共协议只保留文本、静态表格、链接三种强类型组件。
- 删除 Rich/Simple 双表示、`data` 二次包裹和组件生命周期。
- 删除图表、卡片、任务、进度、通知、日志、状态栏、按钮和 Artifact UI。
- SSE 与 Polling 使用同一个 V3 组件信封。
- WebComponent 对 Markdown、表格和链接提供安全且可访问的基础渲染。
- Python、HTTP API 和 WebComponent 在 3.0.0 中原子升级。

## 非目标

- 不提供 V2 兼容路由或旧组件适配器。
- 不提供表格搜索、排序、分页和导出。
- 不通过服务端组件表达加载态、工具运行态或通知。
- 不发布包或部署服务。

## 需求

1. `TextComponent` 只有 `type`、`text`；文本按安全 Markdown 渲染。
2. `DataFrameComponent` 只有 `type`、`columns`、`rows`、可选 `title` 和
   `truncated`；最多携带 100 行 JSON 标量。
3. `LinkComponent` 只有 `type`、`url` 和可选 `text`；URL 仅允许相对地址和
   HTTP(S)。
4. 未知字段和未知组件类型必须拒绝，客户端不得猜测降级 renderer。
5. V3 SSE 每帧包含一个 `component` 及会话、请求、时间戳信息。
6. 业务错误由 Agent 生成安全文本；传输错误使用独立的强类型错误信封。
7. 客户端仅在 SSE 尚未收到有效载荷时降级 Polling，避免重复部分响应。
8. 加载状态只存在于客户端，发送期间禁用输入。

## 验收标准

- Python 受支持源码不再包含或导出 Rich/Simple、组件管理器和旧 UI 类型。
- `/api/vanna/v2/*` 不再注册，V3 SSE/Polling 契约测试通过。
- XPD 查询最多展示 100 行静态表格，无法导出。
- 原始 HTML、危险 Markdown 链接和危险 `LinkComponent` URL 不可执行。
- 前端构建、前端单元测试和 Python 测试通过。

