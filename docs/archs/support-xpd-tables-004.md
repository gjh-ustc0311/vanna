# 架构: Append-only 三组件协议

> File 组件与多组件 ToolResult 架构已由 [005 架构](./support-xpd-tables-005.md) 取代。

## 决策

Vanna 3.0 的展示边界是一个扁平、强类型、append-only 的判别联合：

```text
Agent / Workflow / Tool
          │
          ▼
 Text | DataFrame | Link
          │
          ▼
 ChatStreamChunk(component, conversation_id, request_id, timestamp)
          │
          ├── SSE event
          └── Polling chunks[]

 AgentProgressEvent(stage, message)
          │
          ▼
 ChatStreamProgress(progress, conversation_id, request_id, timestamp)
          │
          └── SSE temporary status only
```

旧 `UiComponent` 的字段是 `timestamp`、`rich_component` 和可选
`simple_component`。其中 `RichComponent` 又有 `id`、`type`、`lifecycle`、
`data`、`children`、`timestamp`、`visible` 和 `interactive`；具体子类继续增加
字段，序列化时再把字段搬入 `data`。这些字段服务于动态组件树，但当前产品没有
对应需求，因此全部删除。

## 新模型

| 类型 | 字段 | 含义 |
| --- | --- | --- |
| `TextComponent` | `type`, `text` | Markdown 文本；普通文本天然兼容。 |
| `DataFrameComponent` | `type`, `columns`, `rows`, `title?`, `truncated` | 最多 100 行的静态 JSON 标量表格。 |
| `LinkComponent` | `type`, `url`, `text?` | 相对或 HTTP(S) 链接及可选标签。 |

所有模型禁止额外字段。`type` 是判别字段，不存在 `rich`、`simple` 或 `data`
嵌套。

## 状态与错误

组件只描述可持久展示的业务结果。服务端可通过独立 `progress` 信封发送
`analyzing/preparing/executing/summarizing/recovering` 业务阶段；前端只覆盖一条
临时状态，不写入历史或 Polling，也不包含模型思维、工具名、SQL、参数或内部错误。
输入禁用仍由客户端 busy 状态控制。Agent 可恢复的业务失败转成安全文本；
HTTP/流损坏等传输失败使用 `{error:{code,message}, ...}`，与其他信封互斥。

## 数据边界

- Dataframe 行只允许字符串、数字、布尔值和 null。
- Pandas 日期、Decimal、NumPy 标量和非有限浮点在工具边界正规化。
- 组件最多 100 行；完整 SQL 结果仍可留在工具内部元数据或受控文件流程中。
- XPD 继续执行只读、同轮 Schema evidence、SQL guard 和查询超时限制。

## 前端安全

- 原始 HTML 在进入 Markdown parser 前转义，解析结果再经 DOMPurify 清理。
- Markdown 链接由清理器限制，独立 Link 组件再做协议白名单校验。
- 外链设置 `target=_blank` 与 `rel=noopener noreferrer`。
- 未知类型、超行数或畸形信封直接报错，不使用通用 HTML renderer。

## 兼容性

这是 3.0.0 尚未发布阶段的硬切换。Python 类型、V3 API 和 WebComponent 3.0
必须成套部署；不保留旧 import、适配器或 V2 路由，以避免协议继续分叉。
WebComponent 构建产物随 Python wheel/sdist 发布并由 FastAPI 默认从 `/static`
提供；只有调用方显式配置 `cdn_url` 时才使用外部客户端。
