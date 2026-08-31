"""Bounded, read-only XPD query execution and streaming XLSX collection."""

from __future__ import annotations

import asyncio
import base64
import datetime as dt
import decimal
import math
import time
from dataclasses import dataclass
from typing import Any, Callable, Dict, List, Mapping, Optional

from .config import XpdDatabaseSettings
from .errors import (
    XpdDatabaseUnavailable,
    XpdQueryExecutionError,
    XpdQueryTimeout,
)
from .files import (
    XpdFileArtifact,
    XpdFileDraft,
    XpdFileGenerationError,
    XpdFileStore,
    XpdXlsxWriter,
)
from .sql_guard import PreparedSql, XpdSqlGuard


XPD_EXPORT_ROW_LIMIT = 20_000
XPD_QUERY_SENTINEL_LIMIT = XPD_EXPORT_ROW_LIMIT + 1
XPD_PREVIEW_ROW_LIMIT = 30
XPD_LLM_ROW_LIMIT = 100
XPD_DATABASE_FETCH_BATCH = 500


@dataclass(frozen=True)
class XpdQueryResult:
    columns: List[str]
    analysis_rows: List[Dict[str, Any]]
    returned_row_count: int
    query_truncated: bool
    local_artifact: Optional[XpdFileArtifact]
    file_generation_failed: bool = False

    @property
    def row_count(self) -> int:
        return self.returned_row_count

    @property
    def rows(self) -> List[Dict[str, Any]]:
        return self.analysis_rows

    @property
    def truncated(self) -> bool:
        return self.query_truncated


def normalize_cell(value: Any) -> Any:
    """Convert database values to bounded JSON/UI-safe primitives."""

    if value is None or isinstance(value, (str, int, bool)):
        return value
    if isinstance(value, float):
        return value if math.isfinite(value) else str(value)
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
    """Executes one validated SQL query with three bounded consumers."""

    def __init__(
        self,
        database: XpdDatabaseSettings,
        guard: XpdSqlGuard,
        connection_factory: Optional[Callable[[], Any]] = None,
        *,
        file_store: Optional[XpdFileStore] = None,
    ) -> None:
        self.database = database
        self.guard = guard
        self.file_store = file_store
        self._connection_factory = connection_factory or self._default_connection

    def _default_connection(self) -> Any:
        try:
            import pymysql  # type: ignore[import-untyped]
        except ImportError as exc:  # pragma: no cover - optional dependency surface
            raise XpdDatabaseUnavailable(
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
            autocommit=False,
            connect_timeout=min(timeout_seconds, 10),
            read_timeout=timeout_seconds + 2,
            write_timeout=timeout_seconds + 2,
            cursorclass=pymysql.cursors.SSCursor,
        )

    async def run(
        self, sql: str, *, owner_id: str = "xpd-local-user"
    ) -> XpdQueryResult:
        prepared = self.guard.prepare(sql)
        return await asyncio.to_thread(self._execute, prepared, owner_id)

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

    def _execute(self, prepared: PreparedSql, owner_id: str) -> XpdQueryResult:
        connection = self._connect_with_retry()
        cursor = None
        query_started = False
        writer: Optional[XpdXlsxWriter] = None
        draft: Optional[XpdFileDraft] = None
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
                + ") AS _vanna_xpd_bounded_result LIMIT "
                + str(XPD_QUERY_SENTINEL_LIMIT)
            )
            query_started = True
            cursor.execute(bounded_sql)
            description = list(cursor.description or [])
            columns = [str(item[0]) for item in description]
            if not columns or len(columns) != len(set(columns)):
                raise XpdQueryExecutionError()

            analysis_rows: List[Dict[str, Any]] = []
            initial_raw_rows: List[Any] = []
            returned_row_count = 0
            query_truncated = False
            file_generation_failed = False
            local_artifact: Optional[XpdFileArtifact] = None

            while True:
                has_fetchmany = hasattr(cursor, "fetchmany")
                if has_fetchmany:
                    raw_batch = list(cursor.fetchmany(XPD_DATABASE_FETCH_BATCH))
                else:  # pragma: no cover - compatibility with minimal DB-API doubles
                    raw_batch = list(cursor.fetchall())
                if not raw_batch:
                    break

                for raw_row in raw_batch:
                    next_row_number = returned_row_count + 1
                    if next_row_number == XPD_QUERY_SENTINEL_LIMIT:
                        query_truncated = True
                        break

                    returned_row_count = next_row_number
                    if returned_row_count <= XPD_LLM_ROW_LIMIT:
                        analysis_rows.append(self._normalize_row(raw_row, columns))

                    if returned_row_count <= XPD_PREVIEW_ROW_LIMIT:
                        initial_raw_rows.append(raw_row)
                    elif returned_row_count == XPD_PREVIEW_ROW_LIMIT + 1:
                        if self.file_store is None:
                            file_generation_failed = True
                        else:
                            try:
                                draft = self.file_store.create_draft(owner_id)
                                writer = XpdXlsxWriter(draft.staged_path, columns)
                                for cached_row in initial_raw_rows:
                                    writer.append(cached_row)
                                writer.append(raw_row)
                                initial_raw_rows.clear()
                            except Exception:
                                file_generation_failed = True
                                if writer is not None:
                                    writer.abort()
                                if draft is not None:
                                    self.file_store.discard(draft)
                                writer = None
                                draft = None
                    elif writer is not None:
                        try:
                            writer.append(raw_row)
                        except Exception:
                            file_generation_failed = True
                            writer.abort()
                            if draft is not None and self.file_store is not None:
                                self.file_store.discard(draft)
                            writer = None
                            draft = None

                if query_truncated:
                    break
                if not has_fetchmany:
                    break

            if writer is not None and draft is not None and self.file_store is not None:
                try:
                    written_rows = writer.finish()
                    writer = None
                    if written_rows != returned_row_count:
                        raise XpdFileGenerationError(
                            "XLSX row count did not match the query result."
                        )
                    local_artifact = self.file_store.commit(
                        draft,
                        row_count=returned_row_count,
                        truncated=query_truncated,
                    )
                    draft = None
                except Exception:
                    file_generation_failed = True
                    if writer is not None:
                        writer.abort()
                    if draft is not None:
                        self.file_store.discard(draft)
                    writer = None
                    draft = None

            return XpdQueryResult(
                columns=columns,
                analysis_rows=analysis_rows,
                returned_row_count=returned_row_count,
                query_truncated=query_truncated,
                local_artifact=local_artifact,
                file_generation_failed=file_generation_failed,
            )
        except (XpdDatabaseUnavailable, XpdQueryTimeout, XpdQueryExecutionError):
            raise
        except Exception as exc:
            code = self._database_error_code(exc)
            if query_started and code in {1317, 3024}:
                raise XpdQueryTimeout() from exc
            raise XpdQueryExecutionError() from exc
        finally:
            if writer is not None:
                writer.abort()
            if draft is not None and self.file_store is not None:
                self.file_store.discard(draft)
            try:
                connection.rollback()
            except Exception:
                pass
            if cursor is not None:
                try:
                    cursor.close()
                except Exception:
                    pass
            try:
                connection.close()
            except Exception:
                pass

    @staticmethod
    def _database_error_code(exc: Exception) -> Optional[int]:
        if exc.args and isinstance(exc.args[0], int):
            return exc.args[0]
        return None

    @staticmethod
    def _normalize_row(raw_row: Any, columns: List[str]) -> Dict[str, Any]:
        if isinstance(raw_row, Mapping):
            return {column: normalize_cell(raw_row.get(column)) for column in columns}
        return {
            column: normalize_cell(value) for column, value in zip(columns, raw_row)
        }


__all__ = [
    "XPD_DATABASE_FETCH_BATCH",
    "XPD_EXPORT_ROW_LIMIT",
    "XPD_LLM_ROW_LIMIT",
    "XPD_PREVIEW_ROW_LIMIT",
    "XPD_QUERY_SENTINEL_LIMIT",
    "XpdQueryResult",
    "XpdReadOnlyRunner",
    "normalize_cell",
]
