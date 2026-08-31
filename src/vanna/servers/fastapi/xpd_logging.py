"""Structured logging for the XPD SSE client boundary."""

from __future__ import annotations

import json
import logging
import time
from copy import deepcopy
from logging.handlers import RotatingFileHandler
from pathlib import Path
from typing import Any, Optional, TextIO, Union


XPD_CHAT_SSE_LOGGER_NAME = "vanna.xpd.chat_sse"
XPD_CHAT_SSE_LOG_PATH = Path("logs") / "xpd-chat.log"
XPD_CHAT_SSE_MAX_BYTES = 10 * 1024 * 1024
XPD_CHAT_SSE_BACKUP_COUNT = 5

_OWNED_HANDLER_MARKER = "_vanna_xpd_chat_sse_handler"


def configure_xpd_chat_sse_logger(
    log_path: Union[str, Path] = XPD_CHAT_SSE_LOG_PATH,
    *,
    max_bytes: int = XPD_CHAT_SSE_MAX_BYTES,
    backup_count: int = XPD_CHAT_SSE_BACKUP_COUNT,
    console_stream: Optional[TextIO] = None,
) -> logging.Logger:
    """Configure the dedicated XPD SSE logger for console and file output."""

    path = Path(log_path)
    path.parent.mkdir(parents=True, exist_ok=True)

    logger = logging.getLogger(XPD_CHAT_SSE_LOGGER_NAME)
    logger.setLevel(logging.INFO)
    logger.propagate = False

    # App factories may be invoked more than once in tests or notebooks. Replace
    # only handlers owned by this factory so each event is emitted exactly once.
    for handler in list(logger.handlers):
        if getattr(handler, _OWNED_HANDLER_MARKER, False):
            logger.removeHandler(handler)
            handler.close()

    formatter = logging.Formatter("%(message)s")
    console_handler = logging.StreamHandler(console_stream)
    file_handler = RotatingFileHandler(
        path,
        maxBytes=max_bytes,
        backupCount=backup_count,
        encoding="utf-8",
    )

    for handler in (console_handler, file_handler):
        handler.setLevel(logging.INFO)
        handler.setFormatter(formatter)
        setattr(handler, _OWNED_HANDLER_MARKER, True)
        logger.addHandler(handler)

    return logger


def log_xpd_chat_sse_event(
    logger: logging.Logger,
    *,
    event: str,
    path: str,
    conversation_id: str,
    request_id: str,
    message_type: str,
    payload: Any,
    trace_id: str = "",
    transport: str = "sse",
) -> None:
    """Write one complete XPD SSE boundary event as a JSON line."""

    safe_payload = redact_xpd_file_url(payload)
    logger.info(
        json.dumps(
            {
                "event": event,
                "timestamp": time.time(),
                "transport": transport,
                "path": path,
                "conversation_id": conversation_id,
                "request_id": request_id,
                "trace_id": trace_id or request_id,
                "message_type": message_type,
                "payload": safe_payload,
            },
            ensure_ascii=False,
            separators=(",", ":"),
            default=str,
        )
    )


def redact_xpd_file_url(payload: Any) -> Any:
    """Copy one wire payload and redact structured File URLs at any envelope depth."""

    if not isinstance(payload, (dict, list)):
        return payload
    safe_payload = deepcopy(payload)

    def redact(value: Any) -> None:
        if isinstance(value, dict):
            if value.get("type") == "file" and "url" in value:
                value["url"] = "<redacted>"
            for nested in value.values():
                redact(nested)
        elif isinstance(value, list):
            for nested in value:
                redact(nested)

    redact(safe_payload)
    return safe_payload
