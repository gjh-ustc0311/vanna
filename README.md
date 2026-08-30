# Vanna 3.0

Vanna turns natural-language questions into database queries and structured answers.
This repository is intentionally focused on the local XPD read-only assistant while
retaining a small, explicit set of Python integrations.

## Supported surface

| Capability | Supported implementations |
| --- | --- |
| LLM | Anthropic, OpenAI |
| Agent memory and local services | Local |
| SQL runners | MySQL, SQLite |
| Product adapter | XPD |
| HTTP server | FastAPI with SSE and polling |

Modules and install extras outside this table are not part of Vanna 3.0. The package
does not include the Vanna 0.x compatibility layer, built-in examples, or a built-in
Plotly chart-generation tool.

## Run the XPD assistant

Install the XPD and server dependencies:

```bash
python -m pip install 'vanna[xpd,servers]'
```

Start the local service with an explicit `xpd-report-agent` schema-v4 profile:

```bash
vanna --xpd-config /absolute/path/to/configs/app-local.yaml
```

The XPD CLI is local-only. Its default address is `127.0.0.1:8000`; `localhost` and
`::1` are also accepted, while public bind addresses are rejected.

```bash
vanna --xpd-config /absolute/path/to/configs/app-local.yaml \
  --host 127.0.0.1 --port 8000
```

The CLI does not discover profiles, load bundled example agents, or start a fallback
demo agent. `--xpd-config` is required.

## XPD safety contract

The XPD adapter:

- reads only the three approved XPD tables;
- preflights table metadata before the server starts;
- requires a same-turn Schema search before SQL execution;
- accepts only guarded single-statement MySQL `SELECT` queries;
- uses a read-only transaction, server-side timeout, and bounded results;
- limits the service to loopback addresses;
- stores local conversation history under `datas/history_storage`;
- writes XPD chat traffic to the configured rotating local log without logging
  profile secrets.

See the [XPD architecture](docs/archs/support-xpd-tables-001.md) and
[3.0 support-surface architecture](docs/archs/support-xpd-tables-003.md) for the
detailed boundaries.

## Python integrations

The retained integrations remain importable as Python SDK building blocks:

```python
from vanna.integrations.openai import OpenAILlmService
from vanna.integrations.mysql import MySQLRunner
from vanna.integrations.local import MemoryConversationStore
from vanna.tools import RunSqlTool
```

Install only the extras you use:

```bash
python -m pip install 'vanna[openai,mysql]'
python -m pip install 'vanna[anthropic]'
```

`local` and `sqlite` use base-package dependencies. `all` installs the retained
integration dependencies; server and development dependencies remain separate.

The component protocol still supports custom `ChartComponent` payloads, but Vanna 3.0
does not ship `PlotlyChartGenerator` or `VisualizeDataTool`.

## HTTP API

The FastAPI server exposes:

| Route | Purpose |
| --- | --- |
| `GET /` | Local login state and WebComponent page |
| `POST /login` | Select a local demo identity |
| `POST /logout` | Clear the local identity cookie |
| `POST /api/vanna/v2/chat_sse` | Stream structured response chunks |
| `POST /api/vanna/v2/chat_poll` | Polling fallback using the same chunk contract |
| `GET /health` | Health check |

There is no Flask, Legacy `/api/v0/*`, or WebSocket chat endpoint. See the
[API overview](docs/api/README.md) and [SSE contract](docs/api/chat_sse.md).

## Development

Install development dependencies and run the supported test matrix:

```bash
python -m pip install -e '.[dev]'
tox
```

Useful focused environments include:

```bash
tox -e py311-unit,py311-xpd
tox -e py311-agent-memory-sanity
tox -e py311-mysql-sanity,py311-sqlite-sanity
tox -e ruff,mypy
```

Build verification must use a clean temporary output directory:

```bash
python -m build --outdir /tmp/vanna-build
python scripts/verify_distribution.py /tmp/vanna-build
```

## Vanna 3.0 breaking changes

- `vanna.legacy.*` and the Python-side legacy adapter were removed.
- `vanna.examples.*`, `--example`, `--list-examples`, and `ExampleAgentLoader` were
  removed.
- Non-supported integration modules and their install extras were removed.
- ChromaDB, FAISS, Hive, Mock, PostgreSQL, and Qdrant are not included.
- Google/Gemini support is not included.
- Built-in Plotly chart generation was removed while the generic component protocol
  was retained.
- The `vanna` command now requires `--xpd-config` and only starts the local XPD mode.

Downstream applications using removed APIs must migrate directly to the current Agent,
Tool, capability, and retained integration interfaces before upgrading.

## License

MIT License. See [LICENSE](LICENSE).
