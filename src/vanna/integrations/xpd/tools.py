"""XPD schema-search and bounded query tools."""

from __future__ import annotations

import json
import asyncio
from typing import Any, Dict, List, Optional, Tuple, Type

from pydantic import BaseModel, ConfigDict, Field

from vanna.components import (
    Component,
    DataFrameComponent,
    FileComponent,
)
from vanna.core.tool import Tool, ToolContext, ToolResult

from .errors import XpdError, XpdSqlRejected
from .files import XpdFileDeliveryError, XpdFileStore, XpdOssPublisher
from .runner import XPD_LLM_ROW_LIMIT, XPD_PREVIEW_ROW_LIMIT, XpdReadOnlyRunner
from .schema import XpdSchemaCatalog


XPD_SCHEMA_EVIDENCE_CONTEXT_KEY = "xpd_schema_evidence_for_request"
XPD_LLM_JSON_BYTE_LIMIT = 64 * 1024


class SearchXpdSchemaArgs(BaseModel):
    model_config = ConfigDict(extra="forbid")


class RunXpdSqlArgs(BaseModel):
    model_config = ConfigDict(extra="forbid")

    sql: str = Field(
        min_length=1,
        max_length=100_000,
        description=(
            "One MySQL SELECT/CTE statement using only the searched XPD schema."
        ),
    )


class SearchXpdSchemaTool(Tool[SearchXpdSchemaArgs]):
    def __init__(self, catalog: XpdSchemaCatalog) -> None:
        self.catalog = catalog

    @property
    def name(self) -> str:
        return "search_xpd_schema"

    @property
    def description(self) -> str:
        return (
            "Load the complete live evidence for the three approved XPD tables, "
            "relationships, grains, and available metrics. Call this once in every "
            "user turn before run_xpd_sql. It takes no arguments."
        )

    def get_args_schema(self) -> Type[SearchXpdSchemaArgs]:
        return SearchXpdSchemaArgs

    async def execute(
        self, context: ToolContext, args: SearchXpdSchemaArgs
    ) -> ToolResult:
        try:
            evidence = self.catalog.evidence
        except XpdError as exc:
            return _error_result(exc)

        context.metadata[XPD_SCHEMA_EVIDENCE_CONTEXT_KEY] = evidence
        payload = evidence.llm_payload()
        return ToolResult(
            success=True,
            result_for_llm=json.dumps(
                payload, ensure_ascii=False, separators=(",", ":")
            ),
            components=[],
            metadata={
                "contract_version": evidence.contract_version,
                "table_count": len(evidence.tables),
            },
        )


class RunXpdSqlTool(Tool[RunXpdSqlArgs]):
    def __init__(
        self,
        runner: XpdReadOnlyRunner,
        *,
        file_store: Optional[XpdFileStore] = None,
        oss_publisher: Optional[XpdOssPublisher] = None,
    ) -> None:
        self.runner = runner
        self.file_store = file_store or runner.file_store
        self.oss_publisher = oss_publisher

    @property
    def name(self) -> str:
        return "run_xpd_sql"

    @property
    def description(self) -> str:
        return (
            "Validate and execute one read-only MySQL SELECT against the approved "
            "XPD tables. search_xpd_schema must have succeeded earlier in the same "
            "turn. Shows a 30-row preview and creates a bounded XLSX download when "
            "the result has more than 30 rows. The XLSX contains at most 20,000 rows."
        )

    def get_args_schema(self) -> Type[RunXpdSqlArgs]:
        return RunXpdSqlArgs

    async def execute(self, context: ToolContext, args: RunXpdSqlArgs) -> ToolResult:
        evidence = context.metadata.get(XPD_SCHEMA_EVIDENCE_CONTEXT_KEY)
        if evidence is None:
            return _error_result(
                XpdSqlRejected(
                    "Call search_xpd_schema in the current user turn before "
                    "executing SQL."
                )
            )
        if evidence.contract_version != self.runner.guard.evidence.contract_version:
            return _error_result(
                XpdSqlRejected("Schema evidence does not match the active contract.")
            )

        try:
            result = await self.runner.run(args.sql, owner_id=context.user.id)
        except XpdError as exc:
            return _error_result(exc)

        preview_rows = result.analysis_rows[:XPD_PREVIEW_ROW_LIMIT]
        components: List[Component] = [
            DataFrameComponent(
                rows=preview_rows,
                columns=result.columns,
                title="XPD 查询结果",
                truncated=result.returned_row_count > XPD_PREVIEW_ROW_LIMIT,
            )
        ]

        file_status = "not_requested"
        if result.returned_row_count > XPD_PREVIEW_ROW_LIMIT:
            file_status = "unavailable"
            artifact = result.local_artifact
            if artifact is not None and self.file_store is not None:
                file_url: Optional[str] = None
                file_expires_at = artifact.expires_at
                if self.oss_publisher is None:
                    file_url = f"/api/vanna/v3/files/{artifact.file_id}"
                else:
                    try:
                        published = await asyncio.to_thread(
                            self.oss_publisher.publish,
                            artifact,
                            self.file_store,
                        )
                        file_url = published.url
                        file_expires_at = published.expires_at
                    except XpdFileDeliveryError:
                        file_url = None
                if file_url is not None:
                    components.append(
                        FileComponent(
                            name=artifact.name,
                            url=file_url,
                            media_type=artifact.media_type,
                            size_bytes=artifact.size_bytes,
                            row_count=artifact.row_count,
                            truncated=artifact.truncated,
                            expires_at=file_expires_at,
                        )
                    )
                    file_status = "available"

        base_payload: Dict[str, Any] = {
            "columns": result.columns,
            "rows": [],
            "returned_row_count": result.returned_row_count,
            "rows_visible_to_llm": 0,
            "preview_row_count": len(preview_rows),
            "query_truncated": result.query_truncated,
            "file_status": file_status,
        }
        if file_status == "unavailable":
            base_payload["file_message"] = (
                "查询结果超过 30 行，但下载文件暂不可用；前 30 行预览仍可用。"
            )
        result_for_llm, llm_row_count = _bounded_llm_payload(
            base_payload, result.analysis_rows
        )
        return ToolResult(
            success=True,
            result_for_llm=result_for_llm,
            components=components,
            metadata={
                "row_count": result.returned_row_count,
                "preview_truncated": (
                    result.returned_row_count > XPD_PREVIEW_ROW_LIMIT
                ),
                "query_truncated": result.query_truncated,
                "file_status": file_status,
                "rows_visible_to_llm": llm_row_count,
                "exported_row_count": (
                    result.local_artifact.row_count
                    if result.local_artifact is not None
                    else 0
                ),
            },
        )


def _bounded_llm_payload(
    base_payload: Dict[str, Any], rows: List[Dict[str, Any]]
) -> Tuple[str, int]:
    payload = dict(base_payload)
    base_encoded = json.dumps(
        payload, ensure_ascii=False, separators=(",", ":")
    ).encode("utf-8")
    if len(base_encoded) > XPD_LLM_JSON_BYTE_LIMIT:
        payload["columns"] = []
        payload["columns_omitted_for_size"] = True
    accepted_rows: List[Dict[str, Any]] = []
    for row in rows[:XPD_LLM_ROW_LIMIT]:
        candidate_rows = accepted_rows + [row]
        payload["rows"] = candidate_rows
        payload["rows_visible_to_llm"] = len(candidate_rows)
        encoded = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode(
            "utf-8"
        )
        if len(encoded) > XPD_LLM_JSON_BYTE_LIMIT:
            break
        accepted_rows = candidate_rows
    payload["rows"] = accepted_rows
    payload["rows_visible_to_llm"] = len(accepted_rows)
    encoded_text = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
    if len(encoded_text.encode("utf-8")) > XPD_LLM_JSON_BYTE_LIMIT:
        raise ValueError("XPD model payload metadata exceeds its byte budget")
    return encoded_text, len(accepted_rows)


def _error_result(error: XpdError) -> ToolResult:
    message = str(error)
    return ToolResult(
        success=False,
        result_for_llm=json.dumps(
            {"error": error.code, "message": message},
            ensure_ascii=False,
            separators=(",", ":"),
        ),
        components=[],
        error=message,
        metadata={"error_code": error.code},
    )
