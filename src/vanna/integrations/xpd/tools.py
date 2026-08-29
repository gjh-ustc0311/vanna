"""XPD schema-search and bounded query tools."""

from __future__ import annotations

import json
from typing import Type

from pydantic import BaseModel, ConfigDict, Field

from vanna.components import (
    DataFrameComponent,
    RichTextComponent,
    SimpleTextComponent,
    UiComponent,
)
from vanna.core.tool import Tool, ToolContext, ToolResult

from .errors import XpdError, XpdSqlRejected
from .runner import XpdReadOnlyRunner
from .schema import XpdSchemaCatalog


XPD_SCHEMA_EVIDENCE_CONTEXT_KEY = "xpd_schema_evidence_for_request"


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
            "Load the complete startup-validated snapshot for the three approved "
            "XPD tables, "
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
            ui_component=UiComponent(
                rich_component=RichTextComponent(
                    content="已加载 XPD 三表 Schema 契约，可继续生成并执行只读查询。",
                ),
                simple_component=SimpleTextComponent(
                    text="XPD schema contract loaded."
                ),
            ),
            metadata={
                "contract_version": evidence.contract_version,
                "table_count": len(evidence.tables),
            },
        )


class RunXpdSqlTool(Tool[RunXpdSqlArgs]):
    def __init__(self, runner: XpdReadOnlyRunner) -> None:
        self.runner = runner

    @property
    def name(self) -> str:
        return "run_xpd_sql"

    @property
    def description(self) -> str:
        return (
            "Validate and execute one read-only MySQL SELECT against the approved "
            "XPD tables. search_xpd_schema must have succeeded earlier in the same "
            "turn. Returns at most 100 inline rows and never creates files."
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
        if evidence is not self.runner.guard.evidence:
            return _error_result(
                XpdSqlRejected("Schema snapshot does not match the active guard.")
            )

        try:
            result = await self.runner.run(args.sql)
        except XpdError as exc:
            return _error_result(exc)

        llm_payload = {
            "columns": result.columns,
            "rows": result.rows[:20],
            "returned_row_count": result.row_count,
            "rows_visible_to_llm": min(result.row_count, 20),
            "truncated": result.truncated,
        }
        description = f"返回 {result.row_count} 行"
        if result.truncated:
            description += "；结果超过上限，仅展示前 100 行"
        component = DataFrameComponent(
            rows=result.rows,
            columns=result.columns,
            row_count=result.row_count,
            column_count=len(result.columns),
            title="XPD 查询结果",
            description=description,
        )
        return ToolResult(
            success=True,
            result_for_llm=json.dumps(
                llm_payload, ensure_ascii=False, separators=(",", ":")
            ),
            ui_component=UiComponent(
                rich_component=component,
                simple_component=SimpleTextComponent(text=description),
            ),
            metadata={
                "row_count": result.row_count,
                "truncated": result.truncated,
            },
        )


def _error_result(error: XpdError) -> ToolResult:
    message = str(error)
    return ToolResult(
        success=False,
        result_for_llm=json.dumps(
            {"error": error.code, "message": message},
            ensure_ascii=False,
            separators=(",", ":"),
        ),
        ui_component=None,
        error=message,
        metadata={"error_code": error.code},
    )
