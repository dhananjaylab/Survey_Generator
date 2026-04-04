import os
from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.responses import FileResponse
from app.core.auth import verify_token
from app.core.rate_limit import limiter
from app.core.logging import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/api/v1/files", tags=["Files"], dependencies=[Depends(verify_token)])

@router.get("/download/{filename}")
@limiter.limit("20/minute")
def download_survey_doc(request: Request, filename: str):
    """
    Download a generated survey document.
    
    **Rate Limits:**
    - 20 requests/minute per IP address
    
    **Path Parameters:**
    - `filename` (string, required): The filename of the survey document to download
    
    **Response:**
    - Returns the DOCX file as a downloadable attachment
    
    **Error Responses:**
    - 404: File not found
    - 429: Rate limit exceeded (20 requests/minute per IP)
    
    **Example:**
    ```bash
    curl -H "Authorization: Bearer <token>" \\
      "http://localhost:8000/api/v1/files/download/survey_12345.docx" \\
      -o survey.docx
    ```
    """
    logger.info("file_download_requested", filename=filename)
    
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../questionnaires"))
    file_path = os.path.abspath(os.path.join(base_dir, filename))
    if not file_path.startswith(base_dir + os.sep) and file_path != base_dir:
        logger.warning("path_traversal_attempt", filename=filename)
        raise HTTPException(status_code=403, detail="Invalid filename")
    
    if not os.path.exists(file_path):
        logger.warning("file_not_found", filename=filename, path=file_path)
        raise HTTPException(status_code=404, detail="File not found")
    
    logger.info("file_download_started", filename=filename)
    
    return FileResponse(
        path=file_path, 
        filename=filename, 
        media_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    )
