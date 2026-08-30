import json
from decimal import Decimal

import pytest

from vanna.core.tool import ToolContext
from vanna.core.user import User
from vanna.integrations.local.agent_memory import DemoAgentMemory
from vanna.integrations.xpd.errors import XpdQueryTimeout
from vanna.integrations.xpd.runner import XpdReadOnlyRunner
from vanna.integrations.xpd.sql_guard import XpdSqlGuard
from vanna.integrations.xpd.tools import (
    RunXpdSqlArgs,
    RunXpdSqlTool,
    SearchXpdSchemaArgs,
    SearchXpdSchemaTool,
)


class QueryCursor:
    def __init__(self, rows, query_error=None):
        self.rows = rows
        self.query_error = query_error
        self.description = None
        self.executed = []

    def execute(self, sql, params=None):
        self.executed.append((sql, params))
        if "_vanna_xpd_bounded_result" in sql:
            if self.query_error:
                raise self.query_error
            self.description = [("item_id",), ("pay_amt",)]

    def fetchmany(self, size):
        return self.rows[:size]

    def close(self):
        pass


class QueryConnection:
    def __init__(self, cursor):
        self.cursor_instance = cursor
        self.rolled_back = False

    def cursor(self):
        return self.cursor_instance

    def rollback(self):
        self.rolled_back = True

    def close(self):
        pass


class LoadedCatalog:
    def __init__(self, evidence):
        self.evidence = evidence


@pytest.fixture
def tool_context():
    return ToolContext(
        user=User(id="u", group_memberships=["xpd"]),
        conversation_id="c",
        request_id="r",
        agent_memory=DemoAgentMemory(max_items=10),
    )


@pytest.mark.asyncio
async def test_runner_retries_only_connection_and_bounds_result(
    database_settings, schema_evidence
):
    rows = [(f"item-{index}", Decimal("1.20")) for index in range(101)]
    cursor = QueryCursor(rows)
    connection = QueryConnection(cursor)
    attempts = 0

    def connect():
        nonlocal attempts
        attempts += 1
        if attempts == 1:
            raise OSError("unavailable")
        return connection

    runner = XpdReadOnlyRunner(
        database_settings, XpdSqlGuard(schema_evidence), connection_factory=connect
    )
    result = await runner.run("SELECT item_id, pay_amt FROM tb_live_goods_daily_stats")

    assert attempts == 2
    assert result.row_count == 100
    assert result.truncated is True
    assert result.rows[0]["pay_amt"] == "1.20"
    bounded = [
        sql for sql, _params in cursor.executed if "_vanna_xpd_bounded_result" in sql
    ]
    assert len(bounded) == 1
    assert bounded[0].endswith("LIMIT 101")
    assert connection.rolled_back is True


@pytest.mark.asyncio
async def test_runner_does_not_replay_a_timed_out_query(
    database_settings, schema_evidence
):
    cursor = QueryCursor([], query_error=RuntimeError(3024, "raw database detail"))
    connection = QueryConnection(cursor)
    runner = XpdReadOnlyRunner(
        database_settings,
        XpdSqlGuard(schema_evidence),
        connection_factory=lambda: connection,
    )

    with pytest.raises(XpdQueryTimeout) as caught:
        await runner.run("SELECT item_id FROM tb_live_goods_daily_stats")

    assert "raw database detail" not in str(caught.value)
    assert (
        len([sql for sql, _ in cursor.executed if "_vanna_xpd_bounded_result" in sql])
        == 1
    )


@pytest.mark.asyncio
async def test_tools_require_same_turn_schema_and_limit_llm_rows(
    database_settings, schema_evidence, tool_context
):
    rows = [(f"item-{index}", index) for index in range(25)]
    runner = XpdReadOnlyRunner(
        database_settings,
        XpdSqlGuard(schema_evidence),
        connection_factory=lambda: QueryConnection(QueryCursor(rows)),
    )
    run_tool = RunXpdSqlTool(runner)

    rejected = await run_tool.execute(
        tool_context,
        RunXpdSqlArgs(sql="SELECT item_id, pay_amt FROM tb_live_goods_daily_stats"),
    )
    assert rejected.success is False

    search = await SearchXpdSchemaTool(LoadedCatalog(schema_evidence)).execute(
        tool_context, SearchXpdSchemaArgs()
    )
    result = await run_tool.execute(
        tool_context,
        RunXpdSqlArgs(sql="SELECT item_id, pay_amt FROM tb_live_goods_daily_stats"),
    )

    assert search.success is True
    llm_result = json.loads(result.result_for_llm)
    assert len(llm_result["rows"]) == 20
    assert result.ui_component.rich_component.exportable is False
    assert len(result.ui_component.rich_component.rows) == 25
