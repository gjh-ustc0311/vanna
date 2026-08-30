from collections import deque

import pytest

from vanna.integrations.xpd.errors import XpdSchemaError
from vanna.integrations.xpd.schema import XpdSchemaCatalog, sanitize_schema_text


class MetadataCursor:
    def __init__(self, result_sets):
        self.result_sets = deque(result_sets)
        self.current = []

    def execute(self, sql, params=None):
        self.current = self.result_sets.popleft()

    def fetchall(self):
        return self.current

    def close(self):
        pass


class MetadataConnection:
    def __init__(self, result_sets):
        self.cursor_instance = MetadataCursor(result_sets)

    def cursor(self):
        return self.cursor_instance

    def close(self):
        pass


def _metadata(include_all=True):
    table_names = [
        "tb_live_goods_daily_stats",
        "tb_live_goods_session_stats",
        "tb_live_session_endtime_stats",
    ]
    if not include_all:
        table_names.pop()
    tables = [
        {
            "TABLE_NAME": name,
            "TABLE_TYPE": "BASE TABLE",
            "TABLE_COMMENT": "safe\x00 comment",
        }
        for name in table_names
    ]
    columns = [
        {
            "TABLE_NAME": "tb_live_goods_daily_stats",
            "COLUMN_NAME": "item_id",
            "DATA_TYPE": "varchar",
            "COLUMN_TYPE": "varchar(64)",
            "IS_NULLABLE": "NO",
            "ORDINAL_POSITION": 1,
            "COLUMN_COMMENT": "item\u202e id",
        },
        {
            "TABLE_NAME": "tb_live_goods_daily_stats",
            "COLUMN_NAME": "stat_date",
            "DATA_TYPE": "date",
            "COLUMN_TYPE": "date",
            "IS_NULLABLE": "NO",
            "ORDINAL_POSITION": 2,
            "COLUMN_COMMENT": "",
        },
        {
            "TABLE_NAME": "tb_live_goods_daily_stats",
            "COLUMN_NAME": "pay_amt",
            "DATA_TYPE": "decimal",
            "COLUMN_TYPE": "decimal(18,2)",
            "IS_NULLABLE": "YES",
            "ORDINAL_POSITION": 3,
            "COLUMN_COMMENT": "",
        },
        {
            "TABLE_NAME": "tb_live_goods_session_stats",
            "COLUMN_NAME": "item_id",
            "DATA_TYPE": "varchar",
            "COLUMN_TYPE": "varchar(64)",
            "IS_NULLABLE": "NO",
            "ORDINAL_POSITION": 1,
            "COLUMN_COMMENT": "",
        },
        {
            "TABLE_NAME": "tb_live_goods_session_stats",
            "COLUMN_NAME": "live_session_id",
            "DATA_TYPE": "varchar",
            "COLUMN_TYPE": "varchar(64)",
            "IS_NULLABLE": "NO",
            "ORDINAL_POSITION": 2,
            "COLUMN_COMMENT": "",
        },
        {
            "TABLE_NAME": "tb_live_session_endtime_stats",
            "COLUMN_NAME": "live_session_id",
            "DATA_TYPE": "varchar",
            "COLUMN_TYPE": "varchar(64)",
            "IS_NULLABLE": "NO",
            "ORDINAL_POSITION": 1,
            "COLUMN_COMMENT": "",
        },
    ]
    indexes = [
        {
            "TABLE_NAME": "tb_live_goods_daily_stats",
            "INDEX_NAME": "PRIMARY",
            "NON_UNIQUE": 0,
            "SEQ_IN_INDEX": 1,
            "COLUMN_NAME": "item_id",
        },
        {
            "TABLE_NAME": "tb_live_goods_daily_stats",
            "INDEX_NAME": "PRIMARY",
            "NON_UNIQUE": 0,
            "SEQ_IN_INDEX": 2,
            "COLUMN_NAME": "stat_date",
        },
    ]
    return [tables, columns, indexes, []]


def test_catalog_requires_all_three_base_tables_and_builds_logical_join(
    database_settings,
):
    connection = MetadataConnection(_metadata())
    catalog = XpdSchemaCatalog(database_settings, connection_factory=lambda: connection)

    evidence = catalog.load()

    assert list(evidence.tables) == [
        "tb_live_goods_daily_stats",
        "tb_live_goods_session_stats",
        "tb_live_session_endtime_stats",
    ]
    assert evidence.tables["tb_live_goods_daily_stats"].primary_key == [
        "item_id",
        "stat_date",
    ]
    assert evidence.relationships[0].kind == "logical"
    assert [metric.name for metric in evidence.metrics] == ["pay_amount"]
    assert (
        "\u202e" not in evidence.tables["tb_live_goods_daily_stats"].columns[0].comment
    )


def test_catalog_fails_preflight_when_required_table_is_missing(database_settings):
    connection = MetadataConnection(_metadata(include_all=False))
    catalog = XpdSchemaCatalog(database_settings, connection_factory=lambda: connection)
    with pytest.raises(XpdSchemaError, match="missing"):
        catalog.load()


def test_schema_comment_sanitization_is_bounded_and_removes_controls():
    value = "hello\x00\u202e" + "x" * 600
    sanitized = sanitize_schema_text(value)
    assert "\x00" not in sanitized
    assert "\u202e" not in sanitized
    assert len(sanitized) == 500
