"""Small, append-only UI component contract.

Components are intentionally limited to the three payloads supported by the
bundled client. They serialize directly onto the wire without a rich/simple
wrapper or a second ``data`` envelope.
"""

import re
from datetime import datetime
from typing import Annotated, Dict, List, Literal, Optional, Union
from urllib.parse import urlsplit

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


JsonScalar = Union[str, int, float, bool, None]


class _ComponentModel(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False, strict=True)


class TextComponent(_ComponentModel):
    """Markdown text; plain text is valid Markdown and needs no special mode."""

    type: Literal["text"] = "text"
    text: str


class DataFrameComponent(_ComponentModel):
    """A bounded, static table payload."""

    type: Literal["dataframe"] = "dataframe"
    columns: List[str]
    rows: List[Dict[str, JsonScalar]] = Field(max_length=100)
    title: Optional[str] = None
    truncated: bool = False

    @field_validator("columns")
    @classmethod
    def columns_must_be_unique(cls, columns: List[str]) -> List[str]:
        if len(columns) != len(set(columns)):
            raise ValueError("columns must be unique")
        return columns

    @model_validator(mode="after")
    def rows_must_match_columns(self) -> "DataFrameComponent":
        expected = set(self.columns)
        for row in self.rows:
            if set(row) != expected:
                raise ValueError("every row must contain exactly the declared columns")
        return self

    @classmethod
    def from_records(
        cls,
        records: List[Dict[str, JsonScalar]],
        *,
        title: Optional[str] = None,
    ) -> "DataFrameComponent":
        columns = list(records[0].keys()) if records else []
        return cls(
            columns=columns,
            rows=records[:100],
            title=title,
            truncated=len(records) > 100,
        )


class FileComponent(_ComponentModel):
    """A downloadable file rendered by clients as a file card."""

    type: Literal["file"] = "file"
    name: str = Field(min_length=1, max_length=255)
    url: str = Field(min_length=1, max_length=8192)
    media_type: str = Field(min_length=3, max_length=255)
    size_bytes: int = Field(ge=0)
    row_count: int = Field(ge=0)
    truncated: bool
    expires_at: datetime

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        if (
            value != value.strip()
            or any(char in value for char in {"/", "\\"})
            or any(ord(char) < 32 or ord(char) == 127 for char in value)
        ):
            raise ValueError(
                "file name must be trimmed and contain no control characters"
            )
        return value

    @field_validator("url")
    @classmethod
    def validate_url(cls, url: str) -> str:
        value = url.strip()
        if not value:
            raise ValueError("url must not be empty")

        parsed = urlsplit(value)
        if parsed.scheme:
            if parsed.scheme.lower() not in {"http", "https"} or not parsed.netloc:
                raise ValueError("url must be relative or use http/https")
        elif parsed.netloc:
            raise ValueError("protocol-relative URLs are not supported")
        return value

    @field_validator("media_type")
    @classmethod
    def validate_media_type(cls, value: str) -> str:
        if not re.fullmatch(r"[A-Za-z0-9!#$&^_.+-]+/[A-Za-z0-9!#$&^_.+-]+", value):
            raise ValueError("media_type must be a valid MIME type")
        return value.lower()

    @field_validator("expires_at")
    @classmethod
    def validate_expires_at(cls, value: datetime) -> datetime:
        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError("expires_at must include a timezone")
        return value


Component = Annotated[
    Union[TextComponent, DataFrameComponent, FileComponent],
    Field(discriminator="type"),
]


__all__ = [
    "Component",
    "DataFrameComponent",
    "JsonScalar",
    "FileComponent",
    "TextComponent",
]
