"""Strict correlation and XPD identity headers for V3 chat requests."""

from __future__ import annotations

import re
import uuid
from dataclasses import dataclass
from typing import Annotated, Optional

from fastapi import Header, Request

from ...core.user.identifiers import MAX_UINT64, is_canonical_uint64


REQUEST_ID_HEADER = "X-Request-Id"
TRACE_ID_HEADER = "X-Trace-Id"
USER_ID_HEADER = "X-User-Id"

_IDENTIFIER_PATTERN = re.compile(r"[A-Za-z0-9][A-Za-z0-9._:-]{0,127}")


@dataclass(frozen=True)
class ChatRequestHeaders:
    """Validated headers used throughout one HTTP chat attempt."""

    request_id: str
    trace_id: str
    user_id: str

    def response_headers(self) -> dict[str, str]:
        return {
            REQUEST_ID_HEADER: self.request_id,
            TRACE_ID_HEADER: self.trace_id,
        }


class ChatProtocolError(Exception):
    """A safe error raised before chat execution begins."""

    def __init__(
        self,
        status_code: int,
        code: str,
        message: str,
        *,
        request_id: str,
        trace_id: str,
    ) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.message = message
        self.request_id = request_id
        self.trace_id = trace_id


def identifier_is_valid(value: Optional[str]) -> bool:
    return bool(_IDENTIFIER_PATTERN.fullmatch((value or "").strip()))


def user_id_is_valid(value: Optional[str]) -> bool:
    return is_canonical_uint64(value)


def diagnostic_correlation(request: Request) -> tuple[str, str]:
    """Return only safe correlation values for a preflight error response."""

    request_values = request.headers.getlist(REQUEST_ID_HEADER)
    trace_values = request.headers.getlist(TRACE_ID_HEADER)
    request_id = (
        request_values[0].strip()
        if len(request_values) == 1 and identifier_is_valid(request_values[0])
        else f"req_{uuid.uuid4().hex}"
    )
    trace_id = (
        trace_values[0].strip()
        if len(trace_values) == 1 and identifier_is_valid(trace_values[0])
        else request_id
    )
    return request_id, trace_id


def _raise_protocol_error(
    request: Request, status_code: int, code: str, message: str
) -> None:
    request_id, trace_id = diagnostic_correlation(request)
    raise ChatProtocolError(
        status_code,
        code,
        message,
        request_id=request_id,
        trace_id=trace_id,
    )


def require_chat_request_headers(
    request: Request,
    request_id_header: Annotated[str, Header(alias=REQUEST_ID_HEADER)],
    user_id_header: Annotated[str, Header(alias=USER_ID_HEADER)],
    trace_id_header: Annotated[Optional[str], Header(alias=TRACE_ID_HEADER)] = None,
) -> ChatRequestHeaders:
    """Validate content type, duplicate headers, IDs, and trace fallback."""

    content_type_values = request.headers.getlist("Content-Type")
    media_type = (
        content_type_values[0].split(";", 1)[0].strip().lower()
        if len(content_type_values) == 1
        else ""
    )
    if media_type != "application/json":
        _raise_protocol_error(
            request,
            415,
            "UNSUPPORTED_MEDIA_TYPE",
            "Content-Type must be application/json.",
        )

    request_values = request.headers.getlist(REQUEST_ID_HEADER)
    if len(request_values) != 1 or not identifier_is_valid(request_id_header):
        _raise_protocol_error(
            request,
            422,
            "REQUEST_ID_INVALID",
            f"{REQUEST_ID_HEADER} must be one safe identifier of 1 to 128 characters.",
        )

    trace_values = request.headers.getlist(TRACE_ID_HEADER)
    if len(trace_values) > 1 or (
        trace_id_header is not None and not identifier_is_valid(trace_id_header)
    ):
        _raise_protocol_error(
            request,
            422,
            "TRACE_ID_INVALID",
            f"{TRACE_ID_HEADER} must be at most one safe identifier of 1 to 128 characters.",
        )

    user_values = request.headers.getlist(USER_ID_HEADER)
    if len(user_values) != 1 or not user_id_is_valid(user_id_header):
        _raise_protocol_error(
            request,
            422,
            "USER_ID_INVALID",
            f"{USER_ID_HEADER} must be one canonical uint64 decimal value.",
        )

    request_id = request_id_header.strip()
    trace_id = (trace_id_header or request_id).strip()
    return ChatRequestHeaders(
        request_id=request_id,
        trace_id=trace_id,
        user_id=user_id_header,
    )


__all__ = [
    "ChatProtocolError",
    "ChatRequestHeaders",
    "MAX_UINT64",
    "REQUEST_ID_HEADER",
    "TRACE_ID_HEADER",
    "USER_ID_HEADER",
    "diagnostic_correlation",
    "identifier_is_valid",
    "require_chat_request_headers",
    "user_id_is_valid",
]
