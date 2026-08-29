"""Single-purpose command line entry point for XPD."""

from pathlib import Path

import click
import uvicorn

from .config import load_xpd_profile
from .errors import XpdError
from .factory import create_xpd_agent
from .web import create_xpd_app


@click.command()
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
    help="Explicit xpd-report-agent schema v4 local YAML profile.",
)
@click.option(
    "--host",
    type=click.Choice(["127.0.0.1", "localhost", "::1"]),
    default="127.0.0.1",
    show_default=True,
    help="Loopback address to bind.",
)
@click.option("--port", type=click.IntRange(1, 65535), default=8000, show_default=True)
def main(xpd_config: Path, host: str, port: int) -> None:
    """Run the local, read-only XPD data assistant."""

    try:
        settings = load_xpd_profile(xpd_config)
        agent = create_xpd_agent(settings)
    except XpdError as exc:
        raise click.ClickException(str(exc)) from exc

    click.echo("Loaded XPD profile and verified the three-table schema.")
    display_host = f"[{host}]" if ":" in host else host
    click.echo(f"Starting XPD assistant on http://{display_host}:{port}")
    uvicorn.run(create_xpd_app(agent), host=host, port=port, log_level="info")
