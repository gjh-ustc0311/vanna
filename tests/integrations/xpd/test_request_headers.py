from __future__ import annotations

import json

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from vanna.servers.base import ChatResponse
from vanna.servers.fastapi.routes import register_chat_routes


VALID_HEADERS = {
    "X-Request-Id": "turn_20260825_001",
    "X-Trace-Id": "trace_20260825_001",
    "X-User-Id": "123",
}


class RecordingHandler:
    def __init__(self):
        self.requests = []

    async def handle_poll(self, request):
        self.requests.append(request)
        return ChatResponse.from_chunks(
            [],
            conversation_id=request.conversation_id or "",
            request_id=request.request_id or "",
        )

    async def handle_stream(self, request):
        self.requests.append(request)
        if False:
            yield None


def _client():
    handler = RecordingHandler()
    app = FastAPI()
    register_chat_routes(app, handler)  # type: ignore[arg-type]
    return TestClient(app), handler, app


def test_poll_uses_header_identity_and_trace_fallback_before_execution():
    client, handler, _ = _client()
    headers = {
        key: value for key, value in VALID_HEADERS.items() if key != "X-Trace-Id"
    }

    response = client.post(
        "/api/vanna/v3/chat_poll",
        json={"message": "hello", "conversation_id": "conv_1"},
        headers=headers,
    )

    assert response.status_code == 200
    assert response.headers["x-request-id"] == "turn_20260825_001"
    assert response.headers["x-trace-id"] == "turn_20260825_001"
    assert response.json()["request_id"] == "turn_20260825_001"
    assert len(handler.requests) == 1
    request = handler.requests[0]
    assert request.request_id == "turn_20260825_001"
    assert request.request_context.request_id == "turn_20260825_001"
    assert request.request_context.trace_id == "turn_20260825_001"
    assert request.request_context.user_id == "123"


@pytest.mark.parametrize(
    ("headers", "code"),
    [
        ({"X-Trace-Id": "trace_1", "X-User-Id": "123"}, "REQUEST_ID_INVALID"),
        ({"X-Request-Id": "bad value", "X-User-Id": "123"}, "REQUEST_ID_INVALID"),
        ({"X-Request-Id": "r" * 129, "X-User-Id": "123"}, "REQUEST_ID_INVALID"),
        (
            {
                "X-Request-Id": "request_1",
                "X-Trace-Id": "bad value",
                "X-User-Id": "123",
            },
            "TRACE_ID_INVALID",
        ),
        (
            {
                "X-Request-Id": "request_1",
                "X-Trace-Id": "t" * 129,
                "X-User-Id": "123",
            },
            "TRACE_ID_INVALID",
        ),
        ({"X-Request-Id": "request_1"}, "USER_ID_INVALID"),
        ({"X-Request-Id": "request_1", "X-User-Id": "+1"}, "USER_ID_INVALID"),
        ({"X-Request-Id": "request_1", "X-User-Id": "01"}, "USER_ID_INVALID"),
        (
            {"X-Request-Id": "request_1", "X-User-Id": "18446744073709551616"},
            "USER_ID_INVALID",
        ),
    ],
)
def test_invalid_or_missing_identity_headers_fail_before_handler(headers, code):
    client, handler, _ = _client()

    response = client.post(
        "/api/vanna/v3/chat_poll",
        json={"message": "hello"},
        headers=headers,
    )

    assert response.status_code == 422
    assert response.json()["error"]["code"] == code
    assert response.headers["x-request-id"]
    assert response.headers["x-trace-id"]
    assert handler.requests == []


@pytest.mark.parametrize(
    "user_id",
    ["0", "9223372036854775808", "18446744073709551615"],
)
def test_json_parameters_accept_advisory_and_uint64_values_are_supported(user_id):
    client, handler, _ = _client()

    response = client.post(
        "/api/vanna/v3/chat_poll",
        content=json.dumps({"message": "hello"}),
        headers={
            "Content-Type": "application/json; charset=utf-8",
            "Accept": "text/plain",
            "X-Request-Id": "r" * 128,
            "X-User-Id": user_id,
        },
    )

    assert response.status_code == 200
    assert response.headers["x-trace-id"] == "r" * 128
    assert handler.requests[0].request_context.user_id == user_id


@pytest.mark.parametrize(
    ("duplicate_name", "first", "second", "code"),
    [
        ("X-Request-Id", "request_1", "request_2", "REQUEST_ID_INVALID"),
        ("X-Trace-Id", "trace_1", "trace_2", "TRACE_ID_INVALID"),
        ("X-User-Id", "123", "456", "USER_ID_INVALID"),
    ],
)
def test_duplicate_correlation_and_user_headers_are_rejected(
    duplicate_name, first, second, code
):
    client, handler, _ = _client()
    headers = [
        ("Content-Type", "application/json"),
        ("X-Request-Id", "request_1"),
        ("X-Trace-Id", "trace_1"),
        ("X-User-Id", "123"),
        (duplicate_name, first),
        (duplicate_name, second),
    ]
    response = client.post(
        "/api/vanna/v3/chat_poll",
        content=json.dumps({"message": "hello"}),
        headers=headers,
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == code
    assert handler.requests == []


def test_body_request_id_and_wrong_content_type_fail_closed():
    client, handler, _ = _client()

    body_error = client.post(
        "/api/vanna/v3/chat_poll",
        json={"message": "hello", "request_id": "legacy"},
        headers=VALID_HEADERS,
    )
    media_error = client.post(
        "/api/vanna/v3/chat_poll",
        content=json.dumps({"message": "hello"}),
        headers={**VALID_HEADERS, "Content-Type": "text/plain"},
    )

    assert body_error.status_code == 422
    assert body_error.json()["error"]["code"] == "VALIDATION_ERROR"
    assert media_error.status_code == 415
    assert media_error.json()["error"]["code"] == "UNSUPPORTED_MEDIA_TYPE"
    assert handler.requests == []


def test_openapi_declares_hard_cut_header_and_body_contract():
    _, _, app = _client()
    operation = app.openapi()["paths"]["/api/vanna/v3/chat_sse"]["post"]
    parameters = {parameter["name"]: parameter for parameter in operation["parameters"]}

    assert parameters["X-Request-Id"]["required"] is True
    assert parameters["X-Trace-Id"]["required"] is False
    assert parameters["X-User-Id"]["required"] is True
    body_ref = operation["requestBody"]["content"]["application/json"]["schema"]["$ref"]
    body_schema = app.openapi()["components"]["schemas"][body_ref.rsplit("/", 1)[-1]]
    assert "request_id" not in body_schema["properties"]
    assert body_schema["additionalProperties"] is False
