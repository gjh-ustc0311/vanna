"""Owner-scoped FastAPI routes and lifecycle for XPD result files."""

from __future__ import annotations

import asyncio
import contextlib
import logging
import uuid
from typing import Optional

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse

from ...core.user.request_context import RequestContext
from ...core.user.resolver import UserResolver
from ...integrations.xpd.files import (
    XpdFileExpired,
    XpdFileNotFound,
    XpdFileStore,
)
from .request_headers import USER_ID_HEADER, user_id_is_valid


XPD_FILE_CLEANUP_INTERVAL_SECONDS = 3600
logger = logging.getLogger(__name__)


def register_xpd_file_routes(
    app: FastAPI,
    file_store: XpdFileStore,
    user_resolver: UserResolver,
    *,
    enable_download: bool = True,
) -> None:
    """Register the private download endpoint and hourly cleanup task."""

    cleanup_task: Optional[asyncio.Task[None]] = None

    async def cleanup_once() -> None:
        await asyncio.to_thread(file_store.cleanup_expired)

    async def cleanup_loop() -> None:
        while True:
            await asyncio.sleep(XPD_FILE_CLEANUP_INTERVAL_SECONDS)
            try:
                await cleanup_once()
            except Exception:
                logger.warning("Scheduled XPD file cleanup failed")

    async def startup() -> None:
        nonlocal cleanup_task
        await cleanup_once()
        cleanup_task = asyncio.create_task(cleanup_loop(), name="xpd-file-cleanup")

    async def shutdown() -> None:
        nonlocal cleanup_task
        if cleanup_task is None:
            return
        cleanup_task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await cleanup_task
        cleanup_task = None

    app.router.add_event_handler("startup", startup)
    app.router.add_event_handler("shutdown", shutdown)

    if not enable_download:
        return

    @app.get("/api/vanna/v3/files/{file_id}")
    async def download_xpd_file(file_id: str, request: Request) -> FileResponse:
        user_id_values = request.headers.getlist(USER_ID_HEADER)
        if len(user_id_values) != 1 or not user_id_is_valid(user_id_values[0]):
            raise HTTPException(
                status_code=422,
                detail={
                    "code": "USER_ID_INVALID",
                    "message": (
                        f"{USER_ID_HEADER} must be one canonical uint64 decimal value."
                    ),
                },
            )
        try:
            parsed_file_id = uuid.UUID(file_id)
        except ValueError as exc:
            raise HTTPException(status_code=404, detail="File not found") from exc

        user = await user_resolver.resolve_user(
            RequestContext(
                cookies=dict(request.cookies),
                headers=dict(request.headers),
                remote_addr=(request.client.host if request.client else None),
                query_params=dict(request.query_params),
                user_id=user_id_values[0],
            )
        )
        try:
            artifact = await asyncio.to_thread(
                file_store.resolve, parsed_file_id, user.id
            )
            path = file_store.path_for(artifact)
        except XpdFileExpired as exc:
            try:
                await cleanup_once()
            except Exception:
                logger.warning("Expired XPD file cleanup failed")
            raise HTTPException(status_code=410, detail="File expired") from exc
        except XpdFileNotFound as exc:
            raise HTTPException(status_code=404, detail="File not found") from exc

        return FileResponse(
            path=path,
            media_type=artifact.media_type,
            filename=artifact.name,
            headers={
                "Cache-Control": "private, no-store",
                "X-Content-Type-Options": "nosniff",
            },
        )


__all__ = ["XPD_FILE_CLEANUP_INTERVAL_SECONDS", "register_xpd_file_routes"]
