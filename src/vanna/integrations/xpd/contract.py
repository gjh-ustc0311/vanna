"""Versioned table and metric contract for the XPD local assistant."""

from __future__ import annotations

from typing import Dict, List, Tuple

from pydantic import BaseModel, ConfigDict


SCHEMA_CONTRACT_VERSION = "xpd-core-v1"
ALLOWED_TABLES: Tuple[str, ...] = (
    "tb_live_goods_daily_stats",
    "tb_live_goods_session_stats",
    "tb_live_session_endtime_stats",
)

TABLE_GRAINS: Dict[str, Tuple[str, ...]] = {
    "tb_live_goods_daily_stats": ("item_id", "stat_date"),
    "tb_live_goods_session_stats": ("item_id", "live_session_id"),
    "tb_live_session_endtime_stats": ("live_session_id",),
}


class ColumnEvidence(BaseModel):
    model_config = ConfigDict(frozen=True)

    name: str
    data_type: str
    column_type: str
    nullable: bool
    ordinal_position: int
    comment: str = ""


class IndexEvidence(BaseModel):
    model_config = ConfigDict(frozen=True)

    name: str
    unique: bool
    columns: List[str]


class TableEvidence(BaseModel):
    model_config = ConfigDict(frozen=True)

    name: str
    table_type: str
    comment: str = ""
    grain: List[str]
    primary_key: List[str]
    columns: List[ColumnEvidence]
    indexes: List[IndexEvidence]

    @property
    def column_names(self) -> set[str]:
        return {column.name for column in self.columns}


class RelationshipEvidence(BaseModel):
    model_config = ConfigDict(frozen=True)

    kind: str
    name: str
    left_table: str
    left_columns: List[str]
    right_table: str
    right_columns: List[str]


class MetricEvidence(BaseModel):
    model_config = ConfigDict(frozen=True)

    name: str
    label: str
    expression: str
    required_columns: List[str]
    available_tables: List[str]


class SchemaEvidence(BaseModel):
    model_config = ConfigDict(frozen=True)

    contract_version: str = SCHEMA_CONTRACT_VERSION
    database: str
    tables: Dict[str, TableEvidence]
    relationships: List[RelationshipEvidence]
    metrics: List[MetricEvidence]

    def llm_payload(self) -> Dict[str, object]:
        return self.model_dump(mode="json")


METRIC_CONTRACT: Tuple[Tuple[str, str, str, Tuple[str, ...]], ...] = (
    ("pay_amount", "支付金额", "SUM(pay_amt)", ("pay_amt",)),
    ("pay_item_quantity", "支付商品件数", "SUM(pay_itm_qty)", ("pay_itm_qty",)),
    ("pay_order_count", "支付订单数", "SUM(pay_ord_cnt)", ("pay_ord_cnt",)),
    ("pay_buyer_count", "支付买家数", "SUM(pay_byr_cnt)", ("pay_byr_cnt",)),
    ("refund_amount", "退款金额", "SUM(refund_amt)", ("refund_amt",)),
    ("confirm_amount", "确认收货金额", "SUM(confirm_amt)", ("confirm_amt",)),
    (
        "refund_rate",
        "退款率",
        "SUM(refund_amt) / NULLIF(SUM(pay_amt), 0)",
        ("refund_amt", "pay_amt"),
    ),
    (
        "click_rate",
        "点击率",
        "SUM(item_click_uv) / NULLIF(SUM(item_exposure_uv), 0)",
        ("item_click_uv", "item_exposure_uv"),
    ),
    ("browse_pv", "浏览PV", "SUM(item_exposure_pv)", ("item_exposure_pv",)),
    ("browse_uv", "浏览UV", "SUM(item_exposure_uv)", ("item_exposure_uv",)),
)


def available_metrics(tables: Dict[str, TableEvidence]) -> List[MetricEvidence]:
    candidates = (
        "tb_live_goods_daily_stats",
        "tb_live_goods_session_stats",
    )
    metrics: List[MetricEvidence] = []
    for name, label, expression, required in METRIC_CONTRACT:
        available = [
            table_name
            for table_name in candidates
            if table_name in tables
            and set(required).issubset(tables[table_name].column_names)
        ]
        if available:
            metrics.append(
                MetricEvidence(
                    name=name,
                    label=label,
                    expression=expression,
                    required_columns=list(required),
                    available_tables=available,
                )
            )
    return metrics
