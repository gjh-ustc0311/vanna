# V3 Chat SSE and Polling Contract

## Request

`POST /api/vanna/v3/chat_sse` and `POST /api/vanna/v3/chat_poll` share the same
request model:

```http
X-Request-Id: turn_20260825_001
X-Trace-Id: trace_20260825_001
X-User-Id: 123
Content-Type: application/json
Accept: text/event-stream
```

```json
{
  "message": "近 30 天销售额最高的 10 个商品",
  "conversation_id": "conv_123",
  "metadata": {}
}
```

`message` is required. The body rejects extra fields, including the removed
`request_id`. `metadata.starter_ui_request=true` asks the default workflow for its
initial text prompt.

`X-Request-Id` is a required 1–128 character safe identifier matching
`[A-Za-z0-9][A-Za-z0-9._:-]{0,127}`. `X-Trace-Id` uses the same format and defaults
to the request ID when absent. `X-User-Id` is canonical decimal uint64 text in the
inclusive range `0..18446744073709551615`; signs, whitespace, leading zeros except
the single value `0`, decimals and scientific notation are rejected. Repeated or
invalid values fail with HTTP 422 before Agent execution; a non-JSON Content-Type
fails with HTTP 415. `Accept` is advisory: the SSE endpoint always returns
`text/event-stream`, while Poll returns JSON.

Chat responses echo `X-Request-Id` and `X-Trace-Id`. Trace identifies one HTTP
attempt and does not appear in SSE/Poll payloads; Request identifies the logical
client turn and remains in every existing envelope.

## Component envelope

Every persistent result is self-contained:

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

Rows contain JSON scalar values only and the public payload is limited to 100 rows.
XPD emits at most 30 preview rows; other tools may use the public 100-row ceiling.
The bundled client renders a static table with no sorting, filtering, pagination or
chart conversion.

### File

```json
{
  "type": "file",
  "name": "xpd-query-20260831-120000-1234abcd.xlsx",
  "url": "/api/vanna/v3/files/12345678-1234-1234-1234-123456789abc",
  "media_type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "size_bytes": 12345,
  "row_count": 20000,
  "truncated": true,
  "expires_at": "2026-09-07T12:00:00+08:00"
}
```

File names reject path separators and control characters. URLs must be relative or
absolute HTTP(S); protocol-relative and active-content schemes are rejected. XPD
emits File immediately after its DataFrame when a result exceeds 30 rows. The XLSX
contains at most 20,000 rows, and `truncated=true` means an additional sentinel row
was observed but not exported. File URLs are not stored in model context or history.
Relative File URLs are fetched with `X-User-Id`; absolute OSS URLs are opened directly
without forwarding identity or correlation Headers.

## Progress envelope

SSE emits transient business progress by default for non-starter requests:

```json
{
  "progress": {
    "stage": "executing",
    "message": "正在执行只读查询…"
  },
  "conversation_id": "conv_123",
  "request_id": "req_123",
  "timestamp": 1788115199.0
}
```

`stage` is one of `analyzing`, `preparing`, `executing`, `summarizing` or
`recovering`. `message` is a server-controlled display string of at most 120
characters. Progress never contains model reasoning, tool names, SQL, arguments or
internal errors.

Progress is not a component: it is replaced in one temporary client status, is not
stored in conversation history and is not returned by polling. There is no progress
ID, percentage or completed state; `[DONE]` is the completion signal.

## SSE response

```text
: heartbeat

data: {"progress":{"stage":"analyzing","message":"正在分析问题…"},"conversation_id":"conv_123","request_id":"req_123","timestamp":1788115199.0}

data: {"component":{"type":"text","text":"完成"},"conversation_id":"conv_123","request_id":"req_123","timestamp":1788115200.0}

data: [DONE]

```

After 15 seconds with no outbound SSE bytes, the server writes the comment frame
`: heartbeat\n\n`. Any progress, component, error or heartbeat frame restarts the
idle timer. Comments contain no JSON or correlation values and clients must ignore
them; they are transport keepalives, not application events. An immediately
completed stream does not emit a heartbeat.

Each application `data:` event contains exactly one progress, component or error
envelope.
`[DONE]` terminates a complete stream; EOF before `[DONE]` is a transport failure.
No heartbeat is sent after an error followed by `[DONE]`, after normal `[DONE]`, or
on polling responses and pre-stream JSON errors.

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

Polling waits for completion and returns only persistent component envelopes in
order:

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
payload is received; progress counts as a valid payload, so a request that has begun
is never replayed through polling. Heartbeat comments do not count as valid payloads,
so heartbeat-only EOF still permits polling fallback. The latest progress message
replaces one local status and is cleared on `[DONE]` or failure. Unknown component
types, unknown progress stages and malformed envelopes fail closed.

The client generates one Request ID per logical turn. An SSE-to-Poll fallback reuses
that Request ID but creates a new Trace ID. This correlation behavior is not an
idempotency guarantee; a failure before the first valid SSE payload can still result
in more than one server execution.

V3 has no `/api/vanna/v2/*` aliases. Consumers must migrate atomically with the
Python package and WebComponent 3.0.
