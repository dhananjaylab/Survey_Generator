import json
import logging
from typing import Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
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

router = APIRouter(prefix="/api/v1/surveys", tags=["Surveys"])

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
