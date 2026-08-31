"""Verify that built Vanna distributions expose only the supported 3.0 surface."""

from __future__ import annotations

import argparse
from email.parser import Parser
from pathlib import Path
import tarfile
import zipfile


SUPPORTED_INTEGRATIONS = {
    "anthropic",
    "local",
    "mysql",
    "openai",
    "sqlite",
    "xpd",
}

SUPPORTED_EXTRAS = {
    "all",
    "anthropic",
    "dev",
    "fastapi",
    "mysql",
    "openai",
    "servers",
    "test",
    "xpd",
}

BANNED_DEPENDENCY_NAMES = {
    "azure",
    "boto",
    "chromadb",
    "clickhouse",
    "duckdb",
    "faiss",
    "google-genai",
    "google-generativeai",
    "google-cloud",
    "langchain",
    "marqo",
    "mistralai",
    "ollama",
    "opensearch",
    "oracledb",
    "pinecone",
    "plotly",
    "pymilvus",
    "pyodbc",
    "pyhive",
    "psycopg",
    "qianfan",
    "qdrant",
    "snowflake",
    "transformers",
    "thrift",
    "weaviate",
    "zhipuai",
}

BANNED_WHEEL_PREFIXES = (
    "vanna/examples/",
    "vanna/legacy/",
)

BANNED_SDIST_PREFIXES = (
    "examples/",
    "img/",
    "notebooks/",
    "papers/",
    "src/evals/",
    "src/vanna/examples/",
    "src/vanna/legacy/",
)


def _integration_names(names: list[str], prefix: str) -> set[str]:
    integrations = set()
    for name in names:
        if not name.startswith(prefix):
            continue
        remainder = name[len(prefix) :]
        if "/" in remainder:
            integrations.add(remainder.split("/", 1)[0])
    return integrations


def verify_wheel(wheel: Path) -> None:
    with zipfile.ZipFile(wheel) as archive:
        names = archive.namelist()
        assert "vanna/web_components/vanna-components.js" in names
        assert not any(
            name.startswith(prefix)
            for name in names
            for prefix in BANNED_WHEEL_PREFIXES
        )
        assert (
            _integration_names(names, "vanna/integrations/") == SUPPORTED_INTEGRATIONS
        )

        metadata_name = next(
            name for name in names if name.endswith(".dist-info/METADATA")
        )
        metadata = Parser().parsestr(archive.read(metadata_name).decode("utf-8"))

    assert metadata["Version"] == "3.0.0"
    assert set(metadata.get_all("Provides-Extra", [])) == SUPPORTED_EXTRAS

    requirements = "\n".join(metadata.get_all("Requires-Dist", [])).lower()
    for dependency in BANNED_DEPENDENCY_NAMES:
        assert dependency not in requirements, dependency


def verify_sdist(sdist: Path) -> None:
    with tarfile.open(sdist) as archive:
        names = archive.getnames()

    normalized = [name.split("/", 1)[1] for name in names if "/" in name]
    assert "src/vanna/web_components/vanna-components.js" in normalized
    assert not any(
        name.startswith(prefix)
        for name in normalized
        for prefix in BANNED_SDIST_PREFIXES
    )
    assert (
        _integration_names(normalized, "src/vanna/integrations/")
        == SUPPORTED_INTEGRATIONS
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("dist_dir", type=Path)
    args = parser.parse_args()

    wheel = next(args.dist_dir.glob("vanna-3.0.0-*.whl"))
    sdist = next(args.dist_dir.glob("vanna-3.0.0.tar.gz"))
    verify_wheel(wheel)
    verify_sdist(sdist)
    print("Vanna 3.0 distribution surface verified")


if __name__ == "__main__":
    main()
