import json
import logging
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from sqlalchemy.orm import Session
import secrets
from app.models.database import get_db
from app.models.survey import SurveyRequestRecord
from app.models.schemas import (
    BusinessOverviewRequest, BusinessOverviewResponse,
    ResearchObjectiveRequest, SurveyGenerationRequest, SurveyStatusResponse
)
from app.services.ai_service import AIService
from app.tasks.survey_tasks import generate_survey_task
from app.core.config import settings

logger = logging.getLogger(__name__)

# Basic Auth
security = HTTPBasic()

def verify_credentials(credentials: HTTPBasicCredentials = Depends(security)):
    """Verify HTTP Basic Auth credentials against settings."""
    correct_username = secrets.compare_digest(credentials.username, settings.BASIC_AUTH_USERNAME)
    correct_password = secrets.compare_digest(credentials.password, settings.BASIC_AUTH_PASSWORD)
    if not (correct_username and correct_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Basic"},
        )
    return credentials.username

router = APIRouter(prefix="/api/v1/surveys", tags=["Surveys"], dependencies=[Depends(verify_credentials)])

@router.post("/business-overview", response_model=BusinessOverviewResponse)
async def get_business_overview(request: BusinessOverviewRequest):
    service = AIService()
    try:
        await service.initialize()
        overview = await service.generate_business_overview(request.company_name)
        return BusinessOverviewResponse(
            success=1,
            request_id=request.request_id,
            project_name=request.project_name,
            company_name=request.company_name,
            business_overview=overview,
            industry=request.industry,
            use_case=request.use_case
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        await service.close()

@router.post("/research-objectives")
async def get_research_objectives(request: ResearchObjectiveRequest):
    service = AIService()
    try:
        await service.initialize()
        objectives = await service.generate_research_objectives(
            company_name=request.company_name,
            business_overview=request.business_overview,
            industry=request.industry,
            use_case=request.use_case
        )
        return {
            "success": 1,
            "request_id": request.request_id,
            "project_name": request.project_name,
            "company_name": request.company_name,
            "business_overview": request.business_overview,
            "research_objectives": objectives,
            "industry": request.industry,
            "use_case": request.use_case
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        await service.close()

@router.post("/business-research")
async def get_business_research(request: BusinessOverviewRequest):
    service = AIService()
    try:
        await service.initialize()
        overview = await service.generate_business_overview(request.company_name)
        objectives = await service.generate_research_objectives(
            company_name=request.company_name,
            business_overview=overview,
            industry=request.industry,
            use_case=request.use_case
        )
        return {
            "success": 1,
            "request_id": request.request_id,
            "project_name": request.project_name,
            "company_name": request.company_name,
            "business_overview": overview,
            "research_obj": objectives,
            "industry": request.industry,
            "use_case": request.use_case
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        await service.close()

@router.post("/generate", response_model=SurveyStatusResponse)
def generate_questionnaire(request: SurveyGenerationRequest, db: Session = Depends(get_db)):
    print(f"DEBUG: Hitting /generate endpoint with request_id: {request.request_id}")
    print(f"DEBUG: Using Redis URL: {settings.REDIS_URL}")
    
    # Check if request exists
    record = db.query(SurveyRequestRecord).filter(SurveyRequestRecord.request_id == request.request_id).first()
    
    if not record:
        record = SurveyRequestRecord(
            request_id=request.request_id,
            project_name=request.project_name,
            company_name=request.company_name,
            industry=request.industry,
            use_case=request.use_case,
            business_overview=request.business_overview,
            research_objectives=request.research_objectives,
            status="STARTING"
        )
        db.add(record)
        db.commit()
    elif record.status == "COMPLETED":
        return SurveyStatusResponse(
            success=1,
            status=record.status,
            request_id=request.request_id,
            project_name=request.project_name,
            company_name=request.company_name,
            research_objectives=request.research_objectives,
            business_overview=request.business_overview,
            industry=request.industry,
            use_case=request.use_case,
            pages=record.pages,
            doc_link=record.doc_link
        )
    
    # Launch celery task
    logger.info(f"Dispatching Celery task tasks.generate_survey for request_id: {request.request_id} using Redis: {settings.REDIS_URL}")
    generate_survey_task.delay(
        request_id=request.request_id,
        data={
            "company_name": request.company_name,
            "business_overview": request.business_overview,
            "research_objectives": request.research_objectives,
            "project_name": request.project_name
        }
    )
    
    return SurveyStatusResponse(
        success=2,
        status="RUNNING",
        request_id=request.request_id,
        project_name=request.project_name,
        company_name=request.company_name,
        research_objectives=request.research_objectives,
        business_overview=request.business_overview,
        industry=request.industry,
        use_case=request.use_case,
        pages="",
        doc_link=""
    )

@router.get("/status/{request_id}")
def get_survey_status(request_id: str, db: Session = Depends(get_db)):
    """Poll the status of a survey generation task without re-POSTing."""
    record = db.query(SurveyRequestRecord).filter(SurveyRequestRecord.request_id == request_id).first()
    if not record:
        raise HTTPException(status_code=404, detail=f"Survey request '{request_id}' not found.")
    
    return {
        "success": 1 if record.status == "COMPLETED" else 2,
        "status": record.status,
        "request_id": record.request_id,
        "project_name": record.project_name,
        "company_name": record.company_name,
        "industry": record.industry,
        "use_case": record.use_case,
        "business_overview": record.business_overview or "",
        "research_objectives": record.research_objectives or "",
        "pages": record.pages or "",
        "doc_link": record.doc_link or "",
    }
