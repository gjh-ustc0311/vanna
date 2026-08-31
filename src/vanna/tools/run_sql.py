"""Generic SQL query execution tool with dependency injection."""

import datetime as dt
import decimal
import math
from typing import Any, Optional, Type
import uuid

import pandas as pd

from vanna.core.tool import Tool, ToolContext, ToolResult
from vanna.components import DataFrameComponent, JsonScalar
from vanna.capabilities.sql_runner import SqlRunner, RunSqlToolArgs
from vanna.capabilities.file_system import FileSystem
from vanna.integrations.local import LocalFileSystem


def _to_json_scalar(value: Any) -> JsonScalar:
    """Normalize dataframe cell values for the public component contract."""
    if value is None or isinstance(value, (str, bool, int)):
        return value
    if isinstance(value, float):
        return value if math.isfinite(value) else None
    if isinstance(value, decimal.Decimal):
        return str(value)
    if isinstance(value, (dt.datetime, dt.date, dt.time)):
        return value.isoformat()
    if isinstance(value, dt.timedelta):
        return str(value)

    try:
        if bool(pd.isna(value)):
            return None
    except (TypeError, ValueError):
        pass

    item = getattr(value, "item", None)
    if callable(item):
        try:
            return _to_json_scalar(item())
        except (TypeError, ValueError):
            pass

    try:
        if value != value:
            return None
    except (TypeError, ValueError):
        pass
    return str(value)


class RunSqlTool(Tool[RunSqlToolArgs]):
    """Tool that executes SQL queries using an injected SqlRunner implementation."""

    def __init__(
        self,
        sql_runner: SqlRunner,
        file_system: Optional[FileSystem] = None,
        custom_tool_name: Optional[str] = None,
        custom_tool_description: Optional[str] = None,
    ):
        """Initialize the tool with a SqlRunner implementation.

        Args:
            sql_runner: SqlRunner implementation that handles actual query execution
            file_system: FileSystem implementation for saving results (defaults to LocalFileSystem)
            custom_tool_name: Optional custom name for the tool (overrides default "run_sql")
            custom_tool_description: Optional custom description for the tool (overrides default description)
        """
        self.sql_runner = sql_runner
        self.file_system = file_system or LocalFileSystem()
        self._custom_name = custom_tool_name
        self._custom_description = custom_tool_description

    @property
    def name(self) -> str:
        return self._custom_name if self._custom_name else "run_sql"

    @property
    def description(self) -> str:
        return (
            self._custom_description
            if self._custom_description
            else "Execute SQL queries against the configured database"
        )

    def get_args_schema(self) -> Type[RunSqlToolArgs]:
        return RunSqlToolArgs

    async def execute(self, context: ToolContext, args: RunSqlToolArgs) -> ToolResult:
        """Execute a SQL query using the injected SqlRunner."""
        try:
            # Use the injected SqlRunner to execute the query
            df = await self.sql_runner.run_sql(args, context)

            # Determine query type
            query_type = args.sql.strip().upper().split()[0]

            if query_type == "SELECT":
                # Handle SELECT queries with results
                if df.empty:
                    result = "Query executed successfully. No rows returned."
                    component = DataFrameComponent(
                        rows=[],
                        columns=[],
                        title="Query Results",
                    )
                    metadata = {
                        "row_count": 0,
                        "columns": [],
                        "query_type": query_type,
                        "results": [],
                    }
                else:
                    # Convert DataFrame to records
                    raw_results = df.to_dict("records")
                    results_data = [
                        {
                            str(column): _to_json_scalar(value)
                            for column, value in record.items()
                        }
                        for record in raw_results
                    ]
                    columns = [str(column) for column in df.columns.tolist()]
                    row_count = len(df)

                    # Write DataFrame to CSV file for downstream tools
                    file_id = str(uuid.uuid4())[:8]
                    filename = f"query_results_{file_id}.csv"
                    csv_content = df.to_csv(index=False)
                    await self.file_system.write_file(
                        filename, csv_content, context, overwrite=True
                    )

                    # Create result text for LLM with truncated results
                    results_preview = csv_content
                    if len(results_preview) > 1000:
                        results_preview = (
                            results_preview[:1000]
                            + "\n(Results truncated to 1000 characters; use the saved CSV for the complete result.)"
                        )

                    result = f"{results_preview}\n\nResults saved to file: {filename}"

                    # Create DataFrame component for UI
                    component = DataFrameComponent.from_records(
                        records=results_data,
                        title="Query Results",
                    )

                    metadata = {
                        "row_count": row_count,
                        "columns": columns,
                        "query_type": query_type,
                        "results": results_data,
                        "output_file": filename,
                    }
            else:
                # For non-SELECT queries (INSERT, UPDATE, DELETE, etc.)
                # The SqlRunner should return a DataFrame with affected row count
                rows_affected = len(df) if not df.empty else 0
                result = (
                    f"Query executed successfully. {rows_affected} row(s) affected."
                )

                metadata = {"rows_affected": rows_affected, "query_type": query_type}
                component = None

            return ToolResult(
                success=True,
                result_for_llm=result,
                component=component,
                metadata=metadata,
            )

        except Exception as e:
            error_message = f"Error executing query: {str(e)}"
            return ToolResult(
                success=False,
                result_for_llm=error_message,
                component=None,
                error=str(e),
                metadata={"error_type": "sql_error"},
            )
