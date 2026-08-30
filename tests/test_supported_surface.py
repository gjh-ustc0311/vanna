"""Contract tests for the intentionally supported Vanna 3 surface."""

import importlib
from pathlib import Path

import pytest


SUPPORTED_INTEGRATIONS = {
    "anthropic",
    "local",
    "mysql",
    "openai",
    "sqlite",
    "xpd",
}

REMOVED_INTEGRATIONS = {
    "azureopenai",
    "azuresearch",
    "bigquery",
    "chromadb",
    "clickhouse",
    "duckdb",
    "faiss",
    "google",
    "hive",
    "marqo",
    "milvus",
    "mock",
    "mssql",
    "ollama",
    "opensearch",
    "oracle",
    "pinecone",
    "plotly",
    "postgres",
    "premium",
    "presto",
    "qdrant",
    "snowflake",
    "weaviate",
}


def test_integration_directory_matches_supported_set():
    integration_root = Path(__file__).parents[1] / "src" / "vanna" / "integrations"
    actual = {
        path.name
        for path in integration_root.iterdir()
        if path.is_dir() and path.name != "__pycache__"
    }

    assert actual == SUPPORTED_INTEGRATIONS


@pytest.mark.parametrize("integration", sorted(SUPPORTED_INTEGRATIONS))
def test_supported_integrations_import(integration):
    assert importlib.import_module(f"vanna.integrations.{integration}")


@pytest.mark.parametrize("integration", sorted(REMOVED_INTEGRATIONS))
def test_removed_integrations_do_not_import(integration):
    with pytest.raises(ModuleNotFoundError):
        importlib.import_module(f"vanna.integrations.{integration}")


@pytest.mark.parametrize("module_name", ["vanna.examples", "vanna.legacy"])
def test_removed_packages_do_not_import(module_name):
    with pytest.raises(ModuleNotFoundError):
        importlib.import_module(module_name)


def test_core_evaluation_and_chart_protocol_remain_supported():
    from vanna import EvaluationRunner, __version__
    from vanna.components import ChartComponent

    chart = ChartComponent(chart_type="bar", data={"x": ["a"], "y": [1]})

    assert EvaluationRunner is not None
    assert chart.model_dump(mode="json")["type"] == "chart"
    assert __version__ == "3.0.0"


def test_builtin_plotly_visualization_tool_is_removed():
    import vanna.integrations
    import vanna.tools

    assert not hasattr(vanna.integrations, "PlotlyChartGenerator")
    assert not hasattr(vanna.tools, "PlotlyChartGenerator")
    assert not hasattr(vanna.tools, "VisualizeDataTool")


@pytest.mark.asyncio
async def test_run_sql_keeps_generic_file_output_without_chart_instruction(tmp_path):
    import pandas as pd

    from vanna.capabilities.sql_runner import RunSqlToolArgs, SqlRunner
    from vanna.core.tool import ToolContext
    from vanna.core.user import User
    from vanna.integrations.local import LocalFileSystem
    from vanna.integrations.local.agent_memory import DemoAgentMemory
    from vanna.tools import RunSqlTool

    class StaticRunner(SqlRunner):
        async def run_sql(self, args, context):
            return pd.DataFrame([{"value": 42}])

    file_system = LocalFileSystem(str(tmp_path))
    context = ToolContext(
        user=User(id="test-user"),
        conversation_id="conversation",
        request_id="request",
        agent_memory=DemoAgentMemory(),
    )
    result = await RunSqlTool(StaticRunner(), file_system).execute(
        context, RunSqlToolArgs(sql="SELECT 42 AS value")
    )

    assert result.success
    assert "Results saved to file:" in result.result_for_llm
    assert "visualize" not in result.result_for_llm.lower()
    assert await file_system.read_file(result.metadata["output_file"], context)
