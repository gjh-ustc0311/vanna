from __future__ import annotations

from typing import Dict, Iterable, List

import pytest

from vanna.integrations.xpd.config import XpdDatabaseSettings, XpdProfileSettings
from vanna.integrations.xpd.contract import (
    ColumnEvidence,
    RelationshipEvidence,
    SchemaEvidence,
    TableEvidence,
    available_metrics,
)


@pytest.fixture
def database_settings() -> XpdDatabaseSettings:
    return XpdDatabaseSettings(
        host="127.0.0.1",
        port=3306,
        name="test_db",
        username="reader",
        password="secret",
        read_max_attempts=2,
        retry_backoff_ms=0.0,
        query_timeout_ms=1_000,
    )


@pytest.fixture
def profile_settings(database_settings: XpdDatabaseSettings) -> XpdProfileSettings:
    return XpdProfileSettings.model_validate(
        {
            "schema_version": 4,
            "profile": "local",
            "model": {
                "name": "test-model",
                "base_url": "https://model.example.test/v1",
                "api_key": "model-secret",
                "request_timeout_seconds": 30.0,
            },
            "database": database_settings.model_dump(mode="python"),
        }
    )


def _columns(names: Iterable[str]) -> List[ColumnEvidence]:
    return [
        ColumnEvidence(
            name=name,
            data_type="varchar" if name.endswith("id") else "decimal",
            column_type="varchar(64)" if name.endswith("id") else "decimal(18,2)",
            nullable=False,
            ordinal_position=index,
        )
        for index, name in enumerate(names, start=1)
    ]


@pytest.fixture
def schema_evidence() -> SchemaEvidence:
    metric_fields = [
        "pay_amt",
        "pay_itm_qty",
        "pay_ord_cnt",
        "pay_byr_cnt",
        "refund_amt",
        "confirm_amt",
        "item_click_uv",
        "item_exposure_uv",
        "item_exposure_pv",
    ]
    tables: Dict[str, TableEvidence] = {
        "tb_live_goods_daily_stats": TableEvidence(
            name="tb_live_goods_daily_stats",
            table_type="BASE TABLE",
            grain=["item_id", "stat_date"],
            primary_key=["item_id", "stat_date"],
            columns=_columns(["item_id", "stat_date", *metric_fields]),
            indexes=[],
        ),
        "tb_live_goods_session_stats": TableEvidence(
            name="tb_live_goods_session_stats",
            table_type="BASE TABLE",
            grain=["item_id", "live_session_id"],
            primary_key=["item_id", "live_session_id"],
            columns=_columns(["item_id", "live_session_id", *metric_fields]),
            indexes=[],
        ),
        "tb_live_session_endtime_stats": TableEvidence(
            name="tb_live_session_endtime_stats",
            table_type="BASE TABLE",
            grain=["live_session_id"],
            primary_key=["live_session_id"],
            columns=_columns(["live_session_id", "end_time"]),
            indexes=[],
        ),
    }
    relationship = RelationshipEvidence(
        kind="logical",
        name="logical_goods_session_to_endtime",
        left_table="tb_live_goods_session_stats",
        left_columns=["live_session_id"],
        right_table="tb_live_session_endtime_stats",
        right_columns=["live_session_id"],
    )
    return SchemaEvidence(
        database="test_db",
        tables=tables,
        relationships=[relationship],
        metrics=available_metrics(tables),
    )
