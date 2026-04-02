import json
import logging
from typing import Any
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
from app.tasks.survey_tasks import update_survey_status
from app.core.config import settings
from app.core.auth import verify_token
from app.core.logging import get_logger
from app.core.metrics import get_metrics_collector

logger = get_logger(__name__)
metrics = get_metrics_collector()

# JWT-protected router
router = APIRouter(prefix="/api/v1/surveys", tags=["Surveys"], dependencies=[Depends(verify_token)])

@router.post("/business-overview", response_model=BusinessOverviewResponse)
async def get_business_overview(request: BusinessOverviewRequest):
    logger.info(f"[{request.request_id}] POST /business-overview - Company: {request.company_name}, LLM: {request.llm_model}")
    service = AIService(llm_model=request.llm_model)
    try:
        await service.initialize()
        logger.debug(f"[{request.request_id}] AIService initialized with model: {request.llm_model}")
        overview = await service.generate_business_overview(request.company_name)
        logger.info(f"[{request.request_id}] Business overview generated successfully")
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
        logger.error(f"[{request.request_id}] Error generating business overview: {str(e)}", exc_info=True)
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        await service.close()

@router.post("/research-objectives")
async def get_research_objectives(request: ResearchObjectiveRequest):
    logger.info(f"[{request.request_id}] POST /research-objectives - Company: {request.company_name}, LLM: {request.llm_model}")
    service = AIService(llm_model=request.llm_model)
    try:
        await service.initialize()
        logger.debug(f"[{request.request_id}] Generating research objectives...")
        objectives = await service.generate_research_objectives(
            company_name=request.company_name,
            business_overview=request.business_overview,
            industry=request.industry,
            use_case=request.use_case
        )
        logger.info(f"[{request.request_id}] Research objectives generated successfully")
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
        logger.error(f"[{request.request_id}] Error generating research objectives: {str(e)}", exc_info=True)
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        await service.close()

@router.post("/business-research")
async def get_business_research(request: BusinessOverviewRequest):
    logger.info(f"[{request.request_id}] POST /business-research - Company: {request.company_name}, LLM: {request.llm_model}")
    service = AIService(llm_model=request.llm_model)
    try:
        await service.initialize()
        logger.debug(f"[{request.request_id}] Generating business overview and research objectives...")
        overview = await service.generate_business_overview(request.company_name)
        objectives = await service.generate_research_objectives(
            company_name=request.company_name,
            business_overview=overview,
            industry=request.industry,
            use_case=request.use_case
        )
        logger.info(f"[{request.request_id}] Business research completed successfully")
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
        logger.error(f"[{request.request_id}] Error in business research: {str(e)}", exc_info=True)
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        await service.close()

@router.post("/generate", response_model=SurveyStatusResponse)
def generate_questionnaire(request: SurveyGenerationRequest, db: Session = Depends(get_db)):
    logger.info(f"[{request.request_id}] POST /generate - Starting survey generation with LLM: {request.llm_model}")
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
            logger.info(f"[{request.request_id}] Returning cached completed survey")
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
        
        # If already running, just return status (but NOT if STARTING - those need the thread launched)
        if record.status == "RUNNING":
            logger.info(f"[{request.request_id}] Survey generation already in progress, returning status")
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
        
        # Delegate to Celery task (non-blocking)
        logger.info(f"[{request.request_id}] Delegating to Celery task queue")
        from app.tasks.survey_tasks import generate_survey_task
        
        task = generate_survey_task.delay(
            request_id=request.request_id,
            data={
                "company_name": request.company_name,
                "business_overview": request.business_overview,
                "research_objectives": request.research_objectives,
                "project_name": request.project_name
            },
            llm_model=request.llm_model
        )
        
        logger.info(f"[{request.request_id}] Celery task queued with ID: {task.id}")
        
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
        logger.error(f"[{request.request_id}] Error in generate_questionnaire: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/status/{request_id}")
def get_survey_status(request_id: str, db: Session = Depends(get_db)):
    """Poll the status of a survey generation task without re-POSTing."""
    record = db.query(SurveyRequestRecord).filter(SurveyRequestRecord.request_id == request_id).first()
    if not record:
        logger.warning(f"[{request_id}] Survey request not found")
        raise HTTPException(status_code=404, detail=f"Survey request '{request_id}' not found.")
    
    logger.info(f"[{request_id}] GET /status - Current status: {record.status}")
    
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
