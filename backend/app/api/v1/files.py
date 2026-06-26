"""File download endpoint — serves generated survey DOCX files."""
import os
from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.responses import FileResponse
from app.core.auth import verify_token
from app.core.rate_limit import limiter
from app.core.logging import get_logger

logger = get_logger(__name__)

router = APIRouter(
    prefix="/api/v1/files",
    tags=["Files"],
    dependencies=[Depends(verify_token)],
)


@router.get("/download/{filename}")
@limiter.limit("20/minute")
def download_survey_doc(request: Request, filename: str):
    """
    Download a generated survey document.

    Security: filename is validated to prevent path traversal attacks.
    Any filename resolving outside the questionnaires directory returns 403.
    """
    logger.info("file_download_requested", filename=filename)

    base_dir  = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "../../../questionnaires")
    )
    file_path = os.path.abspath(os.path.join(base_dir, filename))

    # ── Path traversal guard ──────────────────────────────────────────────────
    # file_path must be strictly *inside* base_dir — not equal, not a parent.
    if not file_path.startswith(base_dir + os.sep):
        logger.warning("path_traversal_attempt", filename=filename)
        raise HTTPException(status_code=403, detail="Invalid filename")

    DOCX_MIME = (
        "application/vnd.openxmlformats-officedocument"
        ".wordprocessingml.document"
    )

    # ── Local file (legacy / R2 fallback) ─────────────────────────────────────
    if os.path.exists(file_path):
        logger.info("file_download_local", filename=filename)
        return FileResponse(
            path=file_path,
            filename=filename,
            media_type=DOCX_MIME,
        )

    # ── R2 cloud storage ──────────────────────────────────────────────────────
    try:
        from app.services.storage_service import StorageService
        from fastapi.responses import StreamingResponse

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
