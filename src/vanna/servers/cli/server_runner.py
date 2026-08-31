"""CLI for running the local XPD Vanna server."""

import json
from pathlib import Path
from typing import Optional, TextIO, cast

import click

from ...integrations.xpd.errors import XpdError


@click.command()
@click.option("--port", default=8000, help="Port to run server on")
@click.option(
    "--host",
    default="127.0.0.1",
    show_default=True,
    help="Loopback host to bind the local XPD server to",
)
@click.option(
    "--config", type=click.File("r"), help="JSON config file for server settings"
)
@click.option(
    "--xpd-config",
    type=click.Path(
        exists=True,
        file_okay=True,
        dir_okay=False,
        readable=True,
        path_type=Path,
    ),
    required=True,
    help="Explicit xpd-report-agent schema v4 local YAML profile",
)
@click.option(
    "--dev",
    is_flag=True,
    help="Enable development mode (load components from local assets)",
)
@click.option(
    "--static-folder", default=None, help="Static folder path for development mode"
)
@click.option(
    "--cdn-url",
    default=None,
    help="Explicit CDN override for the bundled web components",
)
def main(
    port: int,
    host: str,
    config: Optional[click.File],
    xpd_config: Path,
    dev: bool,
    static_folder: Optional[str],
    cdn_url: Optional[str],
) -> None:
    """Run the XPD local read-only data assistant."""

    if host not in {"127.0.0.1", "localhost", "::1"}:
        raise click.UsageError(
            "XPD mode is local-only; --host must be 127.0.0.1, localhost, or ::1"
        )

    server_config = {}
    if config:
        server_config = json.load(cast(TextIO, config))

    if dev and static_folder is None:
        static_folder = "frontends/webcomponent/dist"

    server_config.update(
        {
            "dev_mode": dev,
            "static_folder": static_folder,
            "cdn_url": None if dev else cdn_url,
            "api_base_url": "",
            "_xpd_chat_sse_logging": True,
        }
    )

    try:
        from ...integrations.xpd import create_xpd_agent, load_xpd_profile
        from ..fastapi.app import VannaFastAPIServer

        settings = load_xpd_profile(xpd_config)
        agent = create_xpd_agent(settings)
        click.echo("✓ Loaded XPD local profile and verified the three-table schema")
    except XpdError as e:
        raise click.ClickException(str(e)) from e
    except ImportError as e:
        raise click.ClickException(
            "XPD dependencies are unavailable; install with 'vanna[xpd,servers]'"
        ) from e

    server = VannaFastAPIServer(agent, config=server_config)
    click.echo(f"🚀 Starting FastAPI server on http://{host}:{port}")
    click.echo(f"📖 API docs available at http://{host}:{port}/docs")
    if dev:
        click.echo(
            f"📦 Development mode: loading web components from ./{static_folder}/"
        )
    elif cdn_url:
        click.echo("🌍 Production mode: loading web components from CDN")
    else:
        click.echo("📦 Loading the version-matched bundled web components")
    try:
        server.run(host=host, port=port)
    except KeyboardInterrupt:
        click.echo("\n👋 Server stopped")


if __name__ == "__main__":
    main()
