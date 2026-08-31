"""Strict loader for the approved subset of xpd-report-agent profiles."""

from __future__ import annotations

import os
import re
import stat
import warnings
from pathlib import Path
from typing import Any, Dict, Mapping, Optional, Union
from urllib.parse import urlparse

import yaml
from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    SecretStr,
    ValidationError,
    field_validator,
    model_validator,
)
from yaml.tokens import AliasToken, AnchorToken

from .errors import XpdConfigError


class XpdConfigWarning(UserWarning):
    """A non-fatal local profile safety warning."""


class XpdModelSettings(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True, strict=True)

    name: str = Field(min_length=1, max_length=200)
    base_url: str = Field(min_length=1, max_length=2048)
    api_key: SecretStr
    request_timeout_seconds: float = Field(gt=0, le=600)

    @field_validator("base_url")
    @classmethod
    def validate_base_url(cls, value: str) -> str:
        parsed = urlparse(value)
        if (
            parsed.scheme != "https"
            or not parsed.hostname
            or parsed.username is not None
            or parsed.password is not None
            or parsed.fragment
        ):
            raise ValueError(
                "base_url must be an HTTPS URL without credentials or fragment"
            )
        return value.rstrip("/")

    @field_validator("api_key")
    @classmethod
    def validate_api_key(cls, value: SecretStr) -> SecretStr:
        if not value.get_secret_value().strip():
            raise ValueError("api_key must not be empty")
        return value


class XpdDatabaseSettings(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True, strict=True)

    host: str = Field(min_length=1, max_length=255)
    port: int = Field(ge=1, le=65535)
    name: str = Field(pattern=r"^[A-Za-z0-9_$-]+$", min_length=1, max_length=64)
    username: str = Field(min_length=1, max_length=128)
    password: SecretStr
    read_max_attempts: int = Field(ge=1, le=5)
    retry_backoff_ms: float = Field(ge=0, le=10_000)
    query_timeout_ms: int = Field(ge=100, le=300_000)

    @field_validator("host", "username")
    @classmethod
    def reject_control_characters(cls, value: str) -> str:
        if any(ord(char) < 32 or ord(char) == 127 for char in value):
            raise ValueError("control characters are not allowed")
        return value


class XpdOssSettings(BaseModel):
    """Strict private OSS upload settings retained from the external profile."""

    model_config = ConfigDict(extra="forbid", frozen=True, strict=True)

    enabled: bool = False
    endpoint: Optional[str] = None
    region: Optional[str] = Field(default=None, pattern=r"^[a-z0-9][a-z0-9-]{1,62}$")
    bucket: Optional[str] = Field(
        default=None, pattern=r"^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$"
    )
    prefix: Optional[str] = None
    access_key_id: Optional[SecretStr] = None
    access_key_secret: Optional[SecretStr] = None
    security_token: Optional[SecretStr] = None

    @field_validator("endpoint")
    @classmethod
    def validate_endpoint(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        parsed = urlparse(value)
        try:
            port = parsed.port
        except ValueError as exc:
            raise ValueError("endpoint must be a bare HTTPS URL") from exc
        if (
            parsed.scheme != "https"
            or not parsed.hostname
            or parsed.username is not None
            or parsed.password is not None
            or parsed.path not in {"", "/"}
            or parsed.query
            or parsed.fragment
            or port not in {None, 443}
        ):
            raise ValueError("endpoint must be a bare HTTPS URL")
        return value.rstrip("/")

    @field_validator("prefix")
    @classmethod
    def validate_prefix(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        normalized = value.strip().strip("/")
        parts = normalized.split("/") if normalized else []
        if (
            not parts
            or len(normalized) > 512
            or any(part in {"", ".", ".."} or "\\" in part for part in parts)
        ):
            raise ValueError("prefix is invalid")
        return "/".join(parts)

    @model_validator(mode="after")
    def require_enabled_settings(self) -> "XpdOssSettings":
        if not self.enabled:
            return self
        required = (
            self.endpoint,
            self.region,
            self.bucket,
            self.prefix,
            self.access_key_id,
            self.access_key_secret,
        )
        if any(value is None for value in required):
            raise ValueError(
                "enabled OSS requires endpoint, region, bucket, prefix, and credentials"
            )
        for secret in (self.access_key_id, self.access_key_secret):
            if secret is None or not secret.get_secret_value().strip():
                raise ValueError("enabled OSS credentials must not be empty")
        if (
            self.security_token is not None
            and not self.security_token.get_secret_value().strip()
        ):
            raise ValueError("security_token must not be empty")
        return self


class XpdOssAccessSettings(BaseModel):
    """Local-profile OSS access policy."""

    model_config = ConfigDict(extra="forbid", frozen=True, strict=True)

    provider: str = "oss_presign"
    url_ttl_seconds: int = Field(default=86_400, ge=60, le=604_800)

    @field_validator("provider")
    @classmethod
    def require_oss_presign(cls, value: str) -> str:
        if value != "oss_presign":
            raise ValueError("local profile must use oss_presign")
        return value


class XpdProfileSettings(BaseModel):
    """The only profile fields the Vanna XPD adapter accepts or retains."""

    model_config = ConfigDict(extra="forbid", frozen=True, strict=True)

    schema_version: int
    profile: str
    model: XpdModelSettings
    database: XpdDatabaseSettings
    oss: XpdOssSettings = Field(default_factory=XpdOssSettings)
    oss_access: XpdOssAccessSettings = Field(default_factory=XpdOssAccessSettings)

    @field_validator("schema_version")
    @classmethod
    def require_schema_version_four(cls, value: int) -> int:
        if value != 4:
            raise ValueError("schema_version must be 4")
        return value

    @field_validator("profile")
    @classmethod
    def require_local_profile(cls, value: str) -> str:
        if value != "local":
            raise ValueError("profile must be local")
        return value


class _StrictSafeLoader(yaml.SafeLoader):
    pass


def _construct_mapping(
    loader: _StrictSafeLoader, node: yaml.MappingNode, deep: bool = False
) -> Dict[Any, Any]:
    loader.flatten_mapping(node)
    result: Dict[Any, Any] = {}
    for key_node, value_node in node.value:
        if key_node.value == "<<":
            raise XpdConfigError("YAML merge keys are not allowed.")
        key = loader.construct_object(key_node, deep=deep)
        if key in result:
            raise XpdConfigError(f"Duplicate YAML key is not allowed: {key!r}.")
        result[key] = loader.construct_object(value_node, deep=deep)
    return result


_StrictSafeLoader.add_constructor(
    yaml.resolver.BaseResolver.DEFAULT_MAPPING_TAG, _construct_mapping
)

_PLACEHOLDER = re.compile(
    r"(\$\{[^}]+\}|\{\{[^}]+\}\}|\b(?:CHANGE_ME|CHANGEME|YOUR_[A-Z0-9_]+)\b)",
    re.IGNORECASE,
)


def _reject_placeholders(value: Any, path: str = "profile") -> None:
    if isinstance(value, str) and _PLACEHOLDER.search(value):
        raise XpdConfigError(f"Unresolved placeholder at {path}.")
    if isinstance(value, Mapping):
        for key, child in value.items():
            _reject_placeholders(child, f"{path}.{key}")
    elif isinstance(value, list):
        for index, child in enumerate(value):
            _reject_placeholders(child, f"{path}[{index}]")


def _warn_if_profile_permissions_are_wide(path: Path) -> None:
    try:
        mode = stat.S_IMODE(os.stat(path).st_mode)
    except OSError:
        return
    if mode & 0o077:
        warnings.warn(
            f"XPD profile {path} has permissions {mode:04o}; "
            "0600 or stricter is recommended.",
            XpdConfigWarning,
            stacklevel=2,
        )


def load_xpd_profile(
    path: Union[os.PathLike[str], str],
) -> XpdProfileSettings:
    """Load an explicit profile path without discovery or environment fallbacks."""

    profile_path = Path(path).expanduser()
    if not profile_path.is_file():
        raise XpdConfigError("The explicit profile path is not a readable file.")

    try:
        text = profile_path.read_text(encoding="utf-8")
        for token in yaml.scan(text):
            if isinstance(token, (AnchorToken, AliasToken)):
                raise XpdConfigError("YAML anchors and aliases are not allowed.")
        loaded = yaml.load(text, Loader=_StrictSafeLoader)
    except XpdConfigError:
        raise
    except (OSError, UnicodeError, yaml.YAMLError) as exc:
        raise XpdConfigError("The YAML file could not be parsed safely.") from exc

    if not isinstance(loaded, dict):
        raise XpdConfigError("The YAML document must be a mapping.")
    _reject_placeholders(loaded)

    approved = {
        "schema_version": loaded.get("schema_version"),
        "profile": loaded.get("profile"),
        "model": loaded.get("model"),
        "database": loaded.get("database"),
        "oss": loaded.get("oss", {}),
        "oss_access": loaded.get("oss_access", {}),
    }
    try:
        settings = XpdProfileSettings.model_validate(approved)
    except ValidationError as exc:
        fields = sorted(
            {".".join(str(part) for part in error["loc"]) for error in exc.errors()}
        )
        detail = ", ".join(fields[:8]) or "unknown fields"
        raise XpdConfigError(f"Invalid fields: {detail}.") from exc

    _warn_if_profile_permissions_are_wide(profile_path)
    return settings
