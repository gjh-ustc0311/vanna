"""INFORMATION_SCHEMA preflight and evidence construction for XPD."""

from __future__ import annotations

import re
import unicodedata
from collections import defaultdict
from typing import Any, Callable, Dict, Iterable, List, Mapping, Optional, Tuple

from .config import XpdDatabaseSettings
from .contract import (
    ALLOWED_TABLES,
    TABLE_GRAINS,
    ColumnEvidence,
    IndexEvidence,
    RelationshipEvidence,
    SchemaEvidence,
    TableEvidence,
    available_metrics,
)
from .errors import XpdSchemaError


ConnectionFactory = Callable[[], Any]
_WHITESPACE = re.compile(r"\s+")


def sanitize_schema_text(value: Any, max_length: int = 500) -> str:
    """Treat database comments as untrusted prompt input."""

    text = "" if value is None else str(value)
    safe_chars = []
    for char in text:
        category = unicodedata.category(char)
        if category in {"Cc", "Cf", "Cs", "Co", "Cn"}:
            safe_chars.append(" ")
        else:
            safe_chars.append(char)
    normalized = _WHITESPACE.sub(" ", "".join(safe_chars)).strip()
    if len(normalized) > max_length:
        return normalized[: max_length - 1] + "…"
    return normalized


class XpdSchemaCatalog:
    """Loads and caches the exact three-table XPD contract."""

    def __init__(
        self,
        database: XpdDatabaseSettings,
        connection_factory: Optional[ConnectionFactory] = None,
    ) -> None:
        self.database = database
        self._connection_factory = connection_factory or self._default_connection
        self._evidence: Optional[SchemaEvidence] = None

    @property
    def evidence(self) -> SchemaEvidence:
        if self._evidence is None:
            raise XpdSchemaError("Schema evidence has not been loaded.")
        return self._evidence

    def _default_connection(self) -> Any:
        try:
            import pymysql
        except ImportError as exc:  # pragma: no cover - optional dependency surface
            raise XpdSchemaError(
                "Install the 'xpd' extra to enable MySQL access."
            ) from exc

        timeout_seconds = max(1, int(self.database.query_timeout_ms / 1000))
        return pymysql.connect(
            host=self.database.host,
            port=self.database.port,
            user=self.database.username,
            password=self.database.password.get_secret_value(),
            database=self.database.name,
            charset="utf8mb4",
            autocommit=True,
            connect_timeout=min(timeout_seconds, 10),
            read_timeout=timeout_seconds + 2,
            write_timeout=timeout_seconds + 2,
            cursorclass=pymysql.cursors.DictCursor,
        )

    @staticmethod
    def _rows(cursor: Any) -> List[Mapping[str, Any]]:
        rows = cursor.fetchall()
        if rows is None:
            return []
        return list(rows)

    def load(self, force: bool = False) -> SchemaEvidence:
        if self._evidence is not None and not force:
            return self._evidence

        placeholders = ", ".join(["%s"] * len(ALLOWED_TABLES))
        table_params: Tuple[Any, ...] = (self.database.name, *ALLOWED_TABLES)
        connection = None
        cursor = None
        try:
            connection = self._connection_factory()
            cursor = connection.cursor()
            cursor.execute(
                f"""
                SELECT TABLE_NAME, TABLE_TYPE, TABLE_COMMENT
                FROM INFORMATION_SCHEMA.TABLES
                WHERE TABLE_SCHEMA = %s AND TABLE_NAME IN ({placeholders})
                """,
                table_params,
            )
            table_rows = self._rows(cursor)

            cursor.execute(
                f"""
                SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE, COLUMN_TYPE,
                       IS_NULLABLE, ORDINAL_POSITION, COLUMN_COMMENT
                FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_SCHEMA = %s AND TABLE_NAME IN ({placeholders})
                ORDER BY TABLE_NAME, ORDINAL_POSITION
                """,
                table_params,
            )
            column_rows = self._rows(cursor)

            cursor.execute(
                f"""
                SELECT TABLE_NAME, INDEX_NAME, NON_UNIQUE, SEQ_IN_INDEX, COLUMN_NAME
                FROM INFORMATION_SCHEMA.STATISTICS
                WHERE TABLE_SCHEMA = %s AND TABLE_NAME IN ({placeholders})
                ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX
                """,
                table_params,
            )
            index_rows = self._rows(cursor)

            cursor.execute(
                f"""
                SELECT CONSTRAINT_NAME, TABLE_NAME, COLUMN_NAME,
                       REFERENCED_TABLE_SCHEMA, REFERENCED_TABLE_NAME,
                       REFERENCED_COLUMN_NAME,
                       ORDINAL_POSITION
                FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
                WHERE TABLE_SCHEMA = %s
                  AND TABLE_NAME IN ({placeholders})
                  AND REFERENCED_TABLE_NAME IS NOT NULL
                ORDER BY TABLE_NAME, CONSTRAINT_NAME, ORDINAL_POSITION
                """,
                table_params,
            )
            foreign_key_rows = self._rows(cursor)
        except Exception as exc:
            raise XpdSchemaError(
                "Could not read INFORMATION_SCHEMA for the required tables."
            ) from exc
        finally:
            if cursor is not None:
                try:
                    cursor.close()
                except Exception:
                    pass
            if connection is not None:
                try:
                    connection.close()
                except Exception:
                    pass

        try:
            self._evidence = self._build_evidence(
                table_rows, column_rows, index_rows, foreign_key_rows
            )
        except XpdSchemaError:
            raise
        except Exception as exc:
            raise XpdSchemaError(
                "INFORMATION_SCHEMA returned incomplete metadata."
            ) from exc
        return self._evidence

    def _build_evidence(
        self,
        table_rows: Iterable[Mapping[str, Any]],
        column_rows: Iterable[Mapping[str, Any]],
        index_rows: Iterable[Mapping[str, Any]],
        foreign_key_rows: Iterable[Mapping[str, Any]],
    ) -> SchemaEvidence:
        table_by_name = {str(row["TABLE_NAME"]): row for row in table_rows}
        missing = [name for name in ALLOWED_TABLES if name not in table_by_name]
        non_base = [
            name
            for name in ALLOWED_TABLES
            if name in table_by_name
            and str(table_by_name[name].get("TABLE_TYPE", "")).upper() != "BASE TABLE"
        ]
        if missing or non_base:
            details = []
            if missing:
                details.append("missing: " + ", ".join(missing))
            if non_base:
                details.append("not BASE TABLE: " + ", ".join(non_base))
            raise XpdSchemaError("; ".join(details) + ".")

        columns_by_table: Dict[str, List[ColumnEvidence]] = defaultdict(list)
        for row in column_rows:
            table_name = str(row["TABLE_NAME"])
            if table_name not in ALLOWED_TABLES:
                continue
            columns_by_table[table_name].append(
                ColumnEvidence(
                    name=str(row["COLUMN_NAME"]),
                    data_type=str(row.get("DATA_TYPE", "")),
                    column_type=str(row.get("COLUMN_TYPE", "")),
                    nullable=str(row.get("IS_NULLABLE", "")).upper() == "YES",
                    ordinal_position=int(row.get("ORDINAL_POSITION", 0)),
                    comment=sanitize_schema_text(row.get("COLUMN_COMMENT")),
                )
            )

        empty_tables = [name for name in ALLOWED_TABLES if not columns_by_table[name]]
        if empty_tables:
            raise XpdSchemaError(
                "No column metadata for: " + ", ".join(empty_tables) + "."
            )

        index_groups: Dict[Tuple[str, str], List[Mapping[str, Any]]] = defaultdict(list)
        for row in index_rows:
            table_name = str(row["TABLE_NAME"])
            if table_name in ALLOWED_TABLES:
                index_groups[(table_name, str(row["INDEX_NAME"]))].append(row)

        indexes_by_table: Dict[str, List[IndexEvidence]] = defaultdict(list)
        for (table_name, index_name), rows in index_groups.items():
            ordered = sorted(rows, key=lambda row: int(row.get("SEQ_IN_INDEX", 0)))
            indexes_by_table[table_name].append(
                IndexEvidence(
                    name=index_name,
                    unique=int(ordered[0].get("NON_UNIQUE", 1)) == 0,
                    columns=[str(row["COLUMN_NAME"]) for row in ordered],
                )
            )

        tables: Dict[str, TableEvidence] = {}
        for table_name in ALLOWED_TABLES:
            table_indexes = sorted(
                indexes_by_table[table_name], key=lambda index: index.name
            )
            primary_key = next(
                (index.columns for index in table_indexes if index.name == "PRIMARY"),
                [],
            )
            row = table_by_name[table_name]
            tables[table_name] = TableEvidence(
                name=table_name,
                table_type="BASE TABLE",
                comment=sanitize_schema_text(row.get("TABLE_COMMENT")),
                grain=list(TABLE_GRAINS[table_name]),
                primary_key=primary_key,
                columns=sorted(
                    columns_by_table[table_name],
                    key=lambda column: column.ordinal_position,
                ),
                indexes=table_indexes,
            )

        relationships = self._physical_relationships(foreign_key_rows)
        goods_table = "tb_live_goods_session_stats"
        session_table = "tb_live_session_endtime_stats"
        if (
            "live_session_id" in tables[goods_table].column_names
            and "live_session_id" in tables[session_table].column_names
        ):
            relationships.append(
                RelationshipEvidence(
                    kind="logical",
                    name="logical_goods_session_to_endtime",
                    left_table=goods_table,
                    left_columns=["live_session_id"],
                    right_table=session_table,
                    right_columns=["live_session_id"],
                )
            )

        return SchemaEvidence(
            database=self.database.name,
            tables=tables,
            relationships=relationships,
            metrics=available_metrics(tables),
        )

    def _physical_relationships(
        self,
        rows: Iterable[Mapping[str, Any]],
    ) -> List[RelationshipEvidence]:
        groups: Dict[Tuple[str, str, str], List[Mapping[str, Any]]] = defaultdict(list)
        for row in rows:
            left = str(row["TABLE_NAME"])
            right = str(row["REFERENCED_TABLE_NAME"])
            referenced_schema = row.get("REFERENCED_TABLE_SCHEMA")
            if (
                left in ALLOWED_TABLES
                and right in ALLOWED_TABLES
                and (
                    referenced_schema is None
                    or str(referenced_schema) == self.database.name
                )
            ):
                groups[(left, str(row["CONSTRAINT_NAME"]), right)].append(row)

        relationships = []
        for (left, constraint, right), group_rows in groups.items():
            ordered = sorted(
                group_rows, key=lambda row: int(row.get("ORDINAL_POSITION", 0))
            )
            relationships.append(
                RelationshipEvidence(
                    kind="physical_fk",
                    name=constraint,
                    left_table=left,
                    left_columns=[str(row["COLUMN_NAME"]) for row in ordered],
                    right_table=right,
                    right_columns=[
                        str(row["REFERENCED_COLUMN_NAME"]) for row in ordered
                    ],
                )
            )
        return sorted(
            relationships,
            key=lambda relationship: (
                relationship.left_table,
                relationship.name,
                relationship.right_table,
            ),
        )
