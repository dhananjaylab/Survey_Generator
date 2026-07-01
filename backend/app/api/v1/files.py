"""
File download endpoint — serves generated survey DOCX files.

P2 fix vs current repo state:
  The repo version forwards `filename` straight to StorageService.get_file()
  with zero validation, and has no local-disk fallback. Restored both:
    1. Path traversal guard — filename is resolved against the local
       questionnaires/ dir and rejected if it escapes that directory.
    2. Local disk is checked first (cheap, no network round-trip); R2 is
       the fallback, matching how survey_tasks.py writes documents.
"""
import os
from pathlib import Path

from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.responses import StreamingResponse, FileResponse
from app.core.auth import verify_token
from app.core.rate_limit import limiter
from app.core.logging import get_logger

logger = get_logger(__name__)

router = APIRouter(
    prefix="/api/v1/files",
    tags=["Files"],
    dependencies=[Depends(verify_token)],
)

DOCX_MIME = (
    "application/vnd.openxmlformats-officedocument"
    ".wordprocessingml.document"
)

# Local directory survey_tasks.py would write to as a fallback when R2 upload fails.
_LOCAL_DOCS_DIR = (Path(__file__).resolve().parent.parent.parent / "questionnaires").resolve()


def _safe_local_path(filename: str) -> Path | None:
    """
    Resolve filename against the local questionnaires/ directory and verify
    the resolved path does not escape that directory (path traversal guard).

    Returns the resolved Path if safe and the file exists, else None.
    """
    # Reject obviously malicious input early.
    if not filename or "/" in filename or "\\" in filename or filename.startswith("."):
        return None

    candidate = (_LOCAL_DOCS_DIR / filename).resolve()

    try:
        candidate.relative_to(_LOCAL_DOCS_DIR)
    except ValueError:
        # Resolved path escaped the base directory — reject.
        logger.warning("path_traversal_attempt", filename=filename)
        return None

    return candidate if candidate.is_file() else None


@router.get("/download/{filename}")
@limiter.limit("20/minute")
def download_survey_doc(request: Request, filename: str):
    """
    Download a generated survey document.

    Lookup order:
      1. Local disk (questionnaires/) — fast path, used when R2 upload failed
         and survey_tasks.py fell back to a local file.
      2. Cloudflare R2 — primary storage for successfully uploaded documents.
    """
    logger.info("file_download_requested", filename=filename)

    # ── 1. Local disk ────────────────────────────────────────────────────────
    local_path = _safe_local_path(filename)
    if local_path:
        logger.info("file_download_local", filename=filename)
        return FileResponse(
            path=str(local_path),
            media_type=DOCX_MIME,
            filename=filename,
        )

    # ── 2. Cloudflare R2 ─────────────────────────────────────────────────────
    try:
        from app.services.storage_service import StorageService

        storage_service = StorageService()
        file_body = storage_service.get_file(f"questionnaires/{filename}")

        if not file_body:
            logger.warning("file_not_found", filename=filename)
            raise HTTPException(status_code=404, detail="File not found")

        logger.info("file_download_r2", filename=filename)
        return StreamingResponse(
            file_body,
            media_type=DOCX_MIME,
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )

    except HTTPException:
        raise
    except Exception as exc:
        logger.error("file_download_r2_failed", filename=filename, error=str(exc))
        raise HTTPException(status_code=404, detail="File not found")
