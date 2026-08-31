# Vanna FastAPI HTTP API

Vanna 3.0 exposes one append-only component protocol over SSE and polling. The V2
Rich/Simple protocol is removed and has no compatibility route.

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/` | Built-in `<vanna-chat>` page and local demo login. |
| `POST` | `/login` | Set the validated local demo identity cookie. |
| `POST` | `/logout` | Clear the local demo identity cookie. |
| `POST` | `/api/vanna/v3/chat_sse` | Stream one component envelope per SSE event. |
| `POST` | `/api/vanna/v3/chat_poll` | Return all component envelopes after completion. |
| `GET` | `/health` | Health check. |

Both chat endpoints accept:

```json
{
  "message": "Show the top products",
  "conversation_id": "optional-conversation-id",
  "request_id": "optional-request-id",
  "metadata": {"source": "embedded-ui"}
}
```

The route rebuilds `request_context` from trusted HTTP cookies, headers, client
address and query parameters. A client-supplied `user_id` is not part of the V3
contract.

Only three component payloads are supported:

- `{"type":"text","text":"Markdown or plain text"}`
- `{"type":"dataframe","columns":[...],"rows":[...],"title":null,"truncated":false}`
- `{"type":"link","url":"/relative-or-http-url","text":"Optional label"}`

See [SSE and polling contract](./chat_sse.md) for complete envelopes, errors and
client behavior.
