import os
import warnings

import pytest

from vanna.integrations.xpd.config import XpdConfigWarning, load_xpd_profile
from vanna.integrations.xpd.errors import XpdConfigError


VALID_PROFILE = """\
schema_version: 4
profile: local
app:
  host: 0.0.0.0
  port: 9999
model:
  name: model-a
  base_url: https://models.example.test/v1
  api_key: top-secret-model-key
  request_timeout_seconds: 30.0
database:
  host: 127.0.0.1
  port: 3306
  name: test_db
  username: reader
  password: top-secret-db-key
  read_max_attempts: 2
  retry_backoff_ms: 10.0
  query_timeout_ms: 2000
history:
  enabled: true
"""


def test_loader_keeps_only_approved_profile_fields_and_masks_secrets(tmp_path):
    path = tmp_path / "app-local.yaml"
    path.write_text(VALID_PROFILE, encoding="utf-8")
    os.chmod(path, 0o600)

    settings = load_xpd_profile(path)

    assert settings.schema_version == 4
    assert settings.profile == "local"
    assert not hasattr(settings, "app")
    assert not hasattr(settings, "history")
    assert "top-secret" not in repr(settings)
    assert settings.database.password.get_secret_value() == "top-secret-db-key"


@pytest.mark.parametrize(
    "replacement",
    [
        "base_url: http://models.example.test/v1",
        "base_url: https://user:pass@models.example.test/v1",
        "api_key: ${MODEL_KEY}",
    ],
)
def test_loader_rejects_unsafe_urls_and_placeholders(tmp_path, replacement):
    path = tmp_path / "bad.yaml"
    lines = []
    for line in VALID_PROFILE.splitlines():
        if replacement.startswith("base_url:") and line.strip().startswith("base_url:"):
            lines.append("  " + replacement)
        elif replacement.startswith("api_key:") and line.strip().startswith("api_key:"):
            lines.append("  " + replacement)
        else:
            lines.append(line)
    path.write_text("\n".join(lines), encoding="utf-8")

    with pytest.raises(XpdConfigError):
        load_xpd_profile(path)


@pytest.mark.parametrize(
    "yaml_text",
    [
        VALID_PROFILE + "\nprofile: local\n",
        VALID_PROFILE.replace("name: model-a", "name: &model model-a").replace(
            "username: reader", "username: *model"
        ),
        VALID_PROFILE.replace(
            "model:\n", "defaults: &defaults {name: x}\nmodel:\n  <<: *defaults\n"
        ),
    ],
)
def test_loader_rejects_duplicate_keys_anchors_aliases_and_merges(tmp_path, yaml_text):
    path = tmp_path / "bad.yaml"
    path.write_text(yaml_text, encoding="utf-8")
    with pytest.raises(XpdConfigError):
        load_xpd_profile(path)


def test_loader_warns_but_does_not_fail_for_wide_file_permissions(tmp_path):
    path = tmp_path / "app-local.yaml"
    path.write_text(VALID_PROFILE, encoding="utf-8")
    os.chmod(path, 0o644)

    with warnings.catch_warnings(record=True) as caught:
        warnings.simplefilter("always")
        settings = load_xpd_profile(path)

    assert settings.database.name == "test_db"
    assert any(issubclass(item.category, XpdConfigWarning) for item in caught)
