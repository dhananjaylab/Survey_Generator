"""File download endpoint — serves generated survey DOCX files from R2."""
from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.responses import StreamingResponse
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
    Download a generated survey document from Cloudflare R2.
    """
    logger.info("file_download_requested", filename=filename)

    DOCX_MIME = (
        "application/vnd.openxmlformats-officedocument"
        ".wordprocessingml.document"
    )

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
