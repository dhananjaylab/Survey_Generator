import json
import logging
from typing import Any
import threading
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
import secrets
from app.models.database import get_db
from app.models.survey import SurveyRequestRecord
from app.models.schemas import (
    BusinessOverviewRequest, BusinessOverviewResponse,
    ResearchObjectiveRequest, SurveyGenerationRequest, SurveyStatusResponse
)
from app.services.ai_service import AIService
from app.tasks.survey_tasks import async_generate_survey
from app.core.config import settings
from app.core.auth import verify_token
import asyncio

logger = logging.getLogger(__name__)

# JWT-protected router
router = APIRouter(prefix="/api/v1/surveys", tags=["Surveys"], dependencies=[Depends(verify_token)])

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
    try:
        # Check if request exists
        record = db.query(SurveyRequestRecord).filter(SurveyRequestRecord.request_id == request.request_id).first()
        
        if not record:
            # Try to create new record with IntegrityError handling
            try:
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
            except IntegrityError:
                # Record was created by another request, fetch it
                db.rollback()
                record = db.query(SurveyRequestRecord).filter(SurveyRequestRecord.request_id == request.request_id).first()
                if not record:
                    raise HTTPException(status_code=500, detail="Failed to retrieve survey request record")
        
        # If already completed, return cached result
        if record.status == "COMPLETED":
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
        
        # If already running, just return status
        if record.status in ["STARTING", "RUNNING"]:
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
        
        # Launch async task in background thread
        logger.info(f"Starting background task for request_id: {request.request_id}")
        
        def run_task():
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                loop.run_until_complete(async_generate_survey(
                    request_id=request.request_id,
                    data={
                        "company_name": request.company_name,
                        "business_overview": request.business_overview,
                        "research_objectives": request.research_objectives,
                        "project_name": request.project_name
                    }
                ))
            finally:
                loop.close()
        
        thread = threading.Thread(target=run_task, daemon=True)
        thread.start()
        
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
    except Exception as e:
        logger.error(f"Error in generate_questionnaire: {e}")
        raise HTTPException(status_code=500, detail=str(e))

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
