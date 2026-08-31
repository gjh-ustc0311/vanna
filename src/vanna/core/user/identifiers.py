"""Canonical identifier validation shared by trusted user boundaries."""

from __future__ import annotations

import re
from typing import Optional


MAX_UINT64 = 18_446_744_073_709_551_615
_CANONICAL_UINT64_PATTERN = re.compile(r"(?:0|[1-9][0-9]{0,19})")


def is_canonical_uint64(value: Optional[str]) -> bool:
    """Return whether a string is the canonical decimal form of one uint64."""

    if not isinstance(value, str) or not _CANONICAL_UINT64_PATTERN.fullmatch(value):
        return False
    return int(value) <= MAX_UINT64


__all__ = ["MAX_UINT64", "is_canonical_uint64"]
