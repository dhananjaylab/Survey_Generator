import os
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

router = APIRouter(prefix="/api/v1/files", tags=["Files"])

@router.get("/download/{filename}")
def download_survey_doc(filename: str):
    file_path = os.path.normpath(os.path.join(os.path.dirname(__file__), "../../../questionnaires", filename))
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    
    return FileResponse(
        path=file_path, 
        filename=filename, 
        media_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    )
