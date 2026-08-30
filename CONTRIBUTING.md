# Contributing to Vanna 3.0

Vanna 3.0 is an XPD-first local data assistant with a deliberately curated Python
integration surface. Contributions should preserve that boundary unless an approved
product requirement explicitly changes it.

## Setup

Create an isolated environment and install development dependencies:

```bash
python -m pip install -e '.[dev]'
```

For XPD work, also install the runtime extras:

```bash
python -m pip install -e '.[xpd,servers]'
```

Install an integration extra only when working on that integration, for example:

```bash
python -m pip install -e '.[mysql]'
python -m pip install -e '.[anthropic]'
```

## Supported modules

New work may target these built-in integrations:

- LLM: `anthropic`, `openai`
- Memory/local services: `local`
- SQL: `mysql`, `sqlite`
- Product adapter: `xpd`

Do not restore removed compatibility packages, bundled examples, unsupported database
or model integrations, or the built-in Plotly visualization tool as an incidental part
of another change. Expanding the support matrix requires its own product and maintenance
decision.

## Tests

Run the complete supported matrix:

```bash
tox
```

Common focused checks:

```bash
tox -e py311-unit
tox -e py311-xpd
tox -e py311-agent-memory-sanity
tox -e py311-mysql-sanity,py311-sqlite-sanity
tox -e ruff,mypy
```

Anthropic and OpenAI end-to-end tests are skipped when their API keys are unavailable.
Tests for SQL and memory integrations must not require a live external service unless
they are explicitly marked and isolated.

When changing the supported package surface, update and run:

```bash
pytest tests/test_supported_surface.py -v
python -m build --outdir /tmp/vanna-build
python scripts/verify_distribution.py /tmp/vanna-build
```

The distribution verification must confirm that wheel/sdist contents and optional
dependency metadata match the supported integration set.

## XPD invariants

Changes touching XPD must preserve all of the following unless the approved requirement
explicitly changes them:

- explicit schema-v4 local profile loading;
- three-table startup preflight;
- same-turn Schema-search gate;
- guarded read-only MySQL queries;
- timeout, retry, and result-size bounds;
- loopback-only CLI binding;
- stable redacted errors;
- local chat logging and conversation-history ownership checks.

Run all tests under `tests/integrations/xpd/` for any change to the Agent, tools, server,
storage, logging, CLI, OpenAI service, MySQL behavior, or component serialization.

## Code quality

- Keep Python compatible with the versions declared in `pyproject.toml`.
- Add type annotations for new public and internal APIs.
- Prefer focused modules and dependency injection over hidden global state.
- Never log configuration secrets, database credentials, or raw database exceptions in
  client-visible output.
- Preserve unrelated working-tree changes and generated local data.

Run formatting and static analysis before opening a change:

```bash
ruff format src/vanna tests scripts
ruff check src/vanna tests scripts
mypy src/vanna/tools src/vanna/core src/vanna/capabilities \
  src/vanna/agents src/vanna/utils src/vanna/web_components src/vanna/components --strict
```

## Documentation

- Product requirements belong in `docs/prds/`.
- Implementation plans belong in `docs/plans/`.
- Architecture and code contracts belong in `docs/archs/`.
- Update README and API documentation when public imports, CLI flags, routes, extras, or
  response contracts change.
- Keep historical requirement documents intact, but add a clear superseded notice when
  a later decision changes their support promises.

## Pull requests

A pull request should include:

- a concise description of the behavior change;
- tests for success, failure, and security boundaries;
- documentation for any public change;
- confirmation that the supported-surface and distribution checks pass;
- no unrelated generated files, local data, credentials, or build artifacts.

By contributing, you agree that your contribution is licensed under the MIT License.
