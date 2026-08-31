# V3 Chat SSE and Polling Contract

## Request

`POST /api/vanna/v3/chat_sse` and `POST /api/vanna/v3/chat_poll` share the same
request model:

```json
{
  "message": "近 30 天销售额最高的 10 个商品",
  "conversation_id": "conv_123",
  "request_id": "req_123",
  "metadata": {}
}
```

`message` is required. The two IDs are optional and are generated before execution
when absent. `metadata.starter_ui_request=true` asks the default workflow for its
initial text prompt.

## Component envelope

Every successful stream event is self-contained:

```json
{
  "component": {"type": "text", "text": "查询完成。"},
  "conversation_id": "conv_123",
  "request_id": "req_123",
  "timestamp": 1788115200.0
}
```

Components are append-only. V3 has no component ID, parent/child tree, lifecycle,
patch, replace or remove operation.

### Text

```json
{"type":"text","text":"**总销售额：** 12,345 元"}
```

`text` is Markdown. Plain text is valid without a separate simple representation.
Clients must disable raw HTML and sanitize rendered Markdown.

### Dataframe

```json
{
  "type": "dataframe",
  "columns": ["product", "sales"],
  "rows": [{"product": "A", "sales": 12345.0}],
  "title": "XPD 查询结果",
  "truncated": false
}
```

Rows contain JSON scalar values only and the inline payload is limited to 100 rows.
The bundled client renders a static table: no sorting, filtering, pagination, chart
conversion or export.

### Link

```json
{"type":"link","url":"/reports/123","text":"Open report"}
```

Only relative links and absolute HTTP(S) links are valid. Protocol-relative and
active-content schemes such as `javascript:` are rejected.

## SSE response

```text
data: {"component":{"type":"text","text":"完成"},"conversation_id":"conv_123","request_id":"req_123","timestamp":1788115200.0}

data: [DONE]

```

Each `data:` event contains exactly one envelope. `[DONE]` terminates the stream.

If execution fails after the response has started, the server emits a safe transport
error and then `[DONE]`:

```json
{
  "error": {
    "code": "internal_error",
    "message": "The request could not be completed. Please try again."
  },
  "conversation_id": "conv_123",
  "request_id": "req_123",
  "timestamp": 1788115200.0
}
```

Internal exception details are not sent to clients.

## Polling response

Polling waits for completion and returns the same envelopes in order:

```json
{
  "chunks": [
    {
      "component": {"type":"text","text":"完成"},
      "conversation_id": "conv_123",
      "request_id": "req_123",
      "timestamp": 1788115200.0
    }
  ],
  "conversation_id": "conv_123",
  "request_id": "req_123",
  "total_chunks": 1
}
```

A polling execution failure returns HTTP 500 with the transport error envelope.

## Bundled client behavior

`<vanna-chat>` uses SSE first. It uses polling only when SSE fails before a valid
payload is received; it never replays a partially delivered request. Busy state is
local to the client and is not represented by server components. Unknown component
types and malformed envelopes fail closed.

V3 has no `/api/vanna/v2/*` aliases. Consumers must migrate atomically with the
Python package and WebComponent 3.0.
