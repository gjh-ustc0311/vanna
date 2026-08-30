"""Sanity tests for the supported SQL runner integrations."""

import inspect

import pandas as pd
import pytest
from pydantic import BaseModel

from vanna.capabilities.sql_runner import RunSqlToolArgs, SqlRunner


def test_sql_runner_contract():
    assert inspect.isabstract(SqlRunner)
    assert inspect.iscoroutinefunction(SqlRunner.run_sql)
    assert "args" in inspect.signature(SqlRunner.run_sql).parameters
    assert "context" in inspect.signature(SqlRunner.run_sql).parameters


def test_run_sql_tool_args_model():
    assert issubclass(RunSqlToolArgs, BaseModel)
    assert RunSqlToolArgs(sql="SELECT 1").sql == "SELECT 1"


@pytest.mark.parametrize(
    "module_name,class_name",
    [
        ("vanna.integrations.mysql", "MySQLRunner"),
        ("vanna.integrations.sqlite", "SqliteRunner"),
    ],
)
def test_supported_database_runner_contract(module_name, class_name):
    module = __import__(module_name, fromlist=[class_name])
    runner = getattr(module, class_name)

    assert issubclass(runner, SqlRunner)
    assert inspect.iscoroutinefunction(runner.run_sql)


class TestMySQLRunner:
    def test_mysql_runner_instantiation(self):
        pytest.importorskip("pymysql")
        from vanna.integrations.mysql import MySQLRunner

        runner = MySQLRunner(host="host", database="db", user="user", password="secret")
        assert runner.database == "db"
        assert runner.port == 3306


class TestSqliteRunner:
    @pytest.mark.asyncio
    async def test_sqlite_select_and_write(self, tmp_path):
        from vanna.integrations.sqlite import SqliteRunner

        runner = SqliteRunner(str(tmp_path / "test.sqlite"))
        inserted = await runner.run_sql(
            RunSqlToolArgs(sql="CREATE TABLE values_table (value INTEGER)"), None
        )
        await runner.run_sql(
            RunSqlToolArgs(sql="INSERT INTO values_table VALUES (42)"), None
        )
        selected = await runner.run_sql(
            RunSqlToolArgs(sql="SELECT value FROM values_table"), None
        )

        assert isinstance(inserted, pd.DataFrame)
        assert selected.to_dict("records") == [{"value": 42}]
