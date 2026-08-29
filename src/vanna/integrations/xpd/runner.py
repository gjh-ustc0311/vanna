"""Bounded, read-only XPD query execution."""

from __future__ import annotations

import asyncio
import base64
from contextlib import suppress
import datetime as dt
import decimal
import time
from dataclasses import dataclass
from typing import Any, Callable, Dict, List, Mapping, Optional

from .config import XpdDatabaseSettings
from .errors import (
    XpdDatabaseUnavailable,
    XpdQueryExecutionError,
    XpdQueryTimeout,
)
from .sql_guard import PreparedSql, XpdSqlGuard


@dataclass(frozen=True)
class XpdQueryResult:
    columns: List[str]
    rows: List[Dict[str, Any]]
    truncated: bool

    @property
    def row_count(self) -> int:
        return len(self.rows)


def normalize_cell(value: Any) -> Any:
    """Convert database values to bounded JSON/UI-safe primitives."""

    if value is None or isinstance(value, (str, int, float, bool)):
        return value
    if isinstance(value, decimal.Decimal):
        return str(value)
    if isinstance(value, (dt.datetime, dt.date, dt.time)):
        return value.isoformat()
    if isinstance(value, dt.timedelta):
        return str(value)
    if isinstance(value, memoryview):
        value = value.tobytes()
    if isinstance(value, bytes):
        return "base64:" + base64.b64encode(value).decode("ascii")
    return str(value)


class XpdReadOnlyRunner:
    """Executes validated SQL once and returns at most 100 rows."""

    def __init__(
        self,
        database: XpdDatabaseSettings,
        guard: XpdSqlGuard,
        connection_factory: Optional[Callable[[], Any]] = None,
    ) -> None:
        self.database = database
        self.guard = guard
        self._connection_factory = connection_factory or self._default_connection

    def _default_connection(self) -> Any:
        try:
            import pymysql
        except ImportError as exc:  # pragma: no cover - dependency installation fault
            raise XpdDatabaseUnavailable(
                "PyMySQL is required for XPD MySQL access."
            ) from exc

        timeout_seconds = max(1, int(self.database.query_timeout_ms / 1000))
        return pymysql.connect(
            host=self.database.host,
            port=self.database.port,
            user=self.database.username,
            password=self.database.password.get_secret_value(),
            database=self.database.name,
            charset="utf8mb4",
            autocommit=False,
            connect_timeout=min(timeout_seconds, 10),
            read_timeout=timeout_seconds + 2,
            write_timeout=timeout_seconds + 2,
        )

    async def run(self, sql: str) -> XpdQueryResult:
        prepared = self.guard.prepare(sql)
        return await asyncio.to_thread(self._execute, prepared)

    def _connect_with_retry(self) -> Any:
        last_error: Optional[Exception] = None
        for attempt in range(1, self.database.read_max_attempts + 1):
            try:
                return self._connection_factory()
            except Exception as exc:
                last_error = exc
                if attempt < self.database.read_max_attempts:
                    time.sleep(self.database.retry_backoff_ms / 1000)
        raise XpdDatabaseUnavailable(
            "Connection attempts were exhausted before query execution."
        ) from last_error

    def _execute(self, prepared: PreparedSql) -> XpdQueryResult:
        connection = self._connect_with_retry()
        cursor = None
        query_started = False
        try:
            cursor = connection.cursor()
            cursor.execute("SET SESSION TRANSACTION READ ONLY")
            cursor.execute(
                "SET SESSION MAX_EXECUTION_TIME = %s",
                (self.database.query_timeout_ms,),
            )
            cursor.execute("START TRANSACTION READ ONLY")

            bounded_sql = (
                "SELECT * FROM ("
                + prepared.sql
                + ") AS _vanna_xpd_bounded_result LIMIT 101"
            )
            query_started = True
            cursor.execute(bounded_sql)
            if hasattr(cursor, "fetchmany"):
                raw_rows = list(cursor.fetchmany(101))
            else:  # pragma: no cover - compatibility with minimal DB-API doubles
                raw_rows = list(cursor.fetchall())[:101]
            description = list(cursor.description or [])
            columns = [str(item[0]) for item in description]
            normalized_rows = self._normalize_rows(raw_rows, columns)
            truncated = len(normalized_rows) > 100
            return XpdQueryResult(
                columns=columns,
                rows=normalized_rows[:100],
                truncated=truncated,
            )
        except (XpdDatabaseUnavailable, XpdQueryTimeout, XpdQueryExecutionError):
            raise
        except Exception as exc:
            code = self._database_error_code(exc)
            if query_started and code in {1317, 3024}:
                raise XpdQueryTimeout() from exc
            raise XpdQueryExecutionError() from exc
        finally:
            with suppress(Exception):
                connection.rollback()
            if cursor is not None:
                with suppress(Exception):
                    cursor.close()
            with suppress(Exception):
                connection.close()

    @staticmethod
    def _database_error_code(exc: Exception) -> Optional[int]:
        if exc.args and isinstance(exc.args[0], int):
            return exc.args[0]
        return None

    @staticmethod
    def _normalize_rows(
        raw_rows: List[Any], columns: List[str]
    ) -> List[Dict[str, Any]]:
        rows: List[Dict[str, Any]] = []
        for raw_row in raw_rows:
            if isinstance(raw_row, Mapping):
                rows.append(
                    {column: normalize_cell(raw_row.get(column)) for column in columns}
                )
            else:
                rows.append(
                    {
                        column: normalize_cell(value)
                        for column, value in zip(columns, raw_row, strict=False)
                    }
                )
        return rows
