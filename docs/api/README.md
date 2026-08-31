# Vanna FastAPI HTTP API

Vanna 3.0 exposes append-only result components over SSE and polling, plus transient
business progress over SSE. The V2 Rich/Simple protocol is removed and has no
compatibility route.

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/` | Built-in `<vanna-chat>` page with a browser-local numeric user ID. |
| `POST` | `/api/vanna/v3/chat_sse` | Stream progress and component envelopes. |
| `POST` | `/api/vanna/v3/chat_poll` | Return all component envelopes after completion. |
| `GET` | `/api/vanna/v3/files/{file_id}` | Download an owned, unexpired XPD result when OSS delivery is disabled. |
| `GET` | `/health` | Health check. |

Both chat endpoints accept:

```http
X-Request-Id: turn_20260825_001
X-Trace-Id: trace_20260825_001
X-User-Id: 123
Content-Type: application/json
```

`X-Request-Id` and `X-User-Id` are required single-value headers.
`X-Trace-Id` is optional and defaults to the request ID. SSE clients send
`Accept: text/event-stream`; Poll clients send `Accept: application/json`.
`X-User-Id` must be canonical decimal uint64 text in the inclusive range
`0..18446744073709551615`.

```json
{
  "message": "Show the top products",
  "conversation_id": "optional-conversation-id",
  "metadata": {"source": "embedded-ui"}
}
```

The service validates all IDs before execution and returns `X-Request-Id` and
`X-Trace-Id` on chat responses. `X-User-Id` is a trusted upstream identity, not an
authentication mechanism; the service must remain on loopback or behind a gateway
that authenticates users and replaces any caller-supplied value.

Local file downloads require the same `X-User-Id`. The bundled client therefore
fetches relative File URLs with the Header before saving the Blob. It opens absolute
OSS URLs directly and never forwards internal Headers to that external origin.

Only three component payloads are supported:

- `{"type":"text","text":"Markdown or plain text"}`
- `{"type":"dataframe","columns":[...],"rows":[...],"title":null,"truncated":false}`
- `{"type":"file","name":"result.xlsx","url":"/api/vanna/v3/files/...","media_type":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet","size_bytes":1234,"row_count":31,"truncated":false,"expires_at":"2026-09-01T00:00:00+08:00"}`

Progress is a separate top-level envelope and never expands the component union or
appears in polling results.

See [SSE and polling contract](./chat_sse.md) for complete envelopes, 15-second
idle heartbeat comments, errors and client behavior.
