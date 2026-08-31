"""Boundary tests for the public three-component contract."""

import pytest
from pydantic import ValidationError

from vanna.components import DataFrameComponent, LinkComponent, TextComponent
from vanna.core.agent import AgentConfig, ProgressUpdate
from vanna.core.tool import ToolResult
from vanna.servers.base import (
    ChatRequest,
    ChatResponse,
    ChatStreamChunk,
    ChatStreamProgress,
)


def test_component_payloads_are_flat_and_forbid_extra_fields():
    text = TextComponent(text="hello")
    assert text.model_dump() == {"type": "text", "text": "hello"}

    with pytest.raises(ValidationError):
        TextComponent(text="hello", data={})  # type: ignore[call-arg]


def test_dataframe_from_records_is_bounded_to_100_rows():
    component = DataFrameComponent.from_records(
        [{"value": index} for index in range(101)], title="Results"
    )
    assert component.columns == ["value"]
    assert len(component.rows) == 100
    assert component.truncated is True

    with pytest.raises(ValidationError):
        DataFrameComponent(
            columns=["value"], rows=[{"value": index} for index in range(101)]
        )

    with pytest.raises(ValidationError):
        DataFrameComponent(columns=["value"], rows=[{"other": 1}])

    with pytest.raises(ValidationError):
        DataFrameComponent(columns=["value"], rows=[{"value": float("inf")}])


@pytest.mark.parametrize(
    "url",
    ["/reports/1", "reports/1", "https://example.com/report", "http://localhost/x"],
)
def test_link_accepts_relative_and_http_urls(url):
    assert LinkComponent(url=url).url == url


@pytest.mark.parametrize(
    "url", ["", "//example.com/path", "javascript:alert(1)", "data:text/html,x"]
)
def test_link_rejects_unsafe_urls(url):
    with pytest.raises(ValidationError):
        LinkComponent(url=url)


def test_tool_result_parses_only_supported_discriminated_components():
    result = ToolResult(
        success=True,
        result_for_llm="ok",
        component={"type": "link", "url": "/report"},  # type: ignore[arg-type]
    )
    assert isinstance(result.component, LinkComponent)

    with pytest.raises(ValidationError):
        ToolResult(
            success=True,
            result_for_llm="bad",
            component={"type": "chart", "data": {}},  # type: ignore[arg-type]
        )

    with pytest.raises(ValidationError):
        ToolResult(
            success=True,
            result_for_llm="old",
            ui_component=None,  # type: ignore[call-arg]
        )


def test_poll_response_requires_consistent_chunk_envelopes():
    chunk = ChatStreamChunk(
        component=TextComponent(text="ok"),
        conversation_id="conversation",
        request_id="request",
    )
    assert ChatResponse.from_chunks([chunk]).total_chunks == 1

    with pytest.raises(ValidationError):
        ChatResponse(
            chunks=[chunk],
            conversation_id="other-conversation",
            request_id="request",
            total_chunks=1,
        )


def test_progress_envelope_is_strict_and_not_a_poll_chunk():
    progress = ChatStreamProgress(
        progress=ProgressUpdate(stage="executing", message="正在执行只读查询…"),
        conversation_id="conversation",
        request_id="request",
        timestamp=1,
    )
    assert progress.model_dump()["progress"] == {
        "stage": "executing",
        "message": "正在执行只读查询…",
    }

    with pytest.raises(ValidationError):
        ProgressUpdate(stage="unknown", message="bad")  # type: ignore[arg-type]

    with pytest.raises(ValidationError):
        ProgressUpdate(stage="analyzing", message="")

    with pytest.raises(ValidationError):
        ChatStreamProgress(
            progress=ProgressUpdate(stage="analyzing", message="ok"),
            conversation_id="conversation",
            request_id="request",
            timestamp=float("nan"),
        )

    with pytest.raises(ValidationError):
        ChatResponse(
            chunks=[progress],  # type: ignore[list-item]
            conversation_id="conversation",
            request_id="request",
            total_chunks=1,
        )


@pytest.mark.parametrize("field", ["user_id", "request_context"])
def test_chat_request_rejects_client_identity_and_context_fields(field):
    with pytest.raises(ValidationError):
        ChatRequest.model_validate({"message": "hello", field: {}})


def test_removed_ui_configuration_is_rejected():
    with pytest.raises(ValidationError):
        AgentConfig.model_validate({"ui_features": {}})
