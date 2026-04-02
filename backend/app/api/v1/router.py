import json
import logging
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status, Request
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
from app.core.rate_limit import limiter

logger = get_logger(__name__)
metrics = get_metrics_collector()

# JWT-protected router
router = APIRouter(prefix="/api/v1/surveys", tags=["Surveys"], dependencies=[Depends(verify_token)])

@router.post("/business-overview", response_model=BusinessOverviewResponse)
@limiter.limit("20/minute")
async def get_business_overview(request: Request, req: BusinessOverviewRequest):
    logger.info("business_overview_requested", request_id=req.request_id, company_name=req.company_name, llm_model=req.llm_model)
    service = AIService(llm_model=req.llm_model)
    try:
        await service.initialize()
        logger.info("aiservice_initialized", request_id=req.request_id)
        overview = await service.generate_business_overview(req.company_name)
        logger.info("business_overview_generated", request_id=req.request_id, company_name=req.company_name)
        return BusinessOverviewResponse(
            success=1,
            request_id=req.request_id,
            project_name=req.project_name,
            company_name=req.company_name,
            business_overview=overview,
            industry=req.industry,
            use_case=req.use_case
        )
    except Exception as e:
        logger.error("business_overview_error", request_id=req.request_id, error=str(e))
        metrics.record_error(type(e).__name__)
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        await service.close()

@router.post("/research-objectives")
@limiter.limit("20/minute")
async def get_research_objectives(request: Request, req: ResearchObjectiveRequest):
    logger.info("research_objectives_requested", request_id=req.request_id, company_name=req.company_name, llm_model=req.llm_model)
    service = AIService(llm_model=req.llm_model)
    try:
        await service.initialize()
        logger.info("aiservice_initialized", request_id=req.request_id)
        objectives = await service.generate_research_objectives(
            company_name=req.company_name,
            business_overview=req.business_overview,
            industry=req.industry,
            use_case=req.use_case
        )
        logger.info("research_objectives_generated", request_id=req.request_id, company_name=req.company_name)
        return {
            "success": 1,
            "request_id": req.request_id,
            "project_name": req.project_name,
            "company_name": req.company_name,
            "business_overview": req.business_overview,
            "research_objectives": objectives,
            "industry": req.industry,
            "use_case": req.use_case
        }
    except Exception as e:
        logger.error("research_objectives_error", request_id=req.request_id, error=str(e))
        metrics.record_error(type(e).__name__)
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        await service.close()

@router.post("/business-research")
@limiter.limit("20/minute")
async def get_business_research(request: Request, req: BusinessOverviewRequest):
    logger.info("business_research_requested", request_id=req.request_id, company_name=req.company_name, llm_model=req.llm_model)
    service = AIService(llm_model=req.llm_model)
    try:
        await service.initialize()
        logger.info("aiservice_initialized", request_id=req.request_id)
        overview = await service.generate_business_overview(req.company_name)
        objectives = await service.generate_research_objectives(
            company_name=req.company_name,
            business_overview=overview,
            industry=req.industry,
            use_case=req.use_case
        )
        logger.info("business_research_completed", request_id=req.request_id, company_name=req.company_name)
        return {
            "success": 1,
            "request_id": req.request_id,
            "project_name": req.project_name,
            "company_name": req.company_name,
            "business_overview": overview,
            "research_obj": objectives,
            "industry": req.industry,
            "use_case": req.use_case
        }
    except Exception as e:
        logger.error("business_research_error", request_id=req.request_id, error=str(e))
        metrics.record_error(type(e).__name__)
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        await service.close()

@router.post("/generate", response_model=SurveyStatusResponse)
@limiter.limit("10/minute")
def generate_questionnaire(request: Request, req: SurveyGenerationRequest, db: Session = Depends(get_db)):
    logger.info("survey_generation_requested", request_id=req.request_id, company_name=req.company_name, llm_model=req.llm_model)
    metrics.record_survey_started()
    
    try:
        # Check if request exists
        record = db.query(SurveyRequestRecord).filter(SurveyRequestRecord.request_id == req.request_id).first()
        
        if not record:
            # Try to create new record with IntegrityError handling
            try:
                record = SurveyRequestRecord(
                    request_id=req.request_id,
                    project_name=req.project_name,
                    company_name=req.company_name,
                    industry=req.industry,
                    use_case=req.use_case,
                    business_overview=req.business_overview,
                    research_objectives=req.research_objectives,
                    status="STARTING"
                )
                db.add(record)
                db.commit()
                logger.info("survey_record_created", request_id=req.request_id, company_name=req.company_name)
            except IntegrityError:
                # Record was created by another request, fetch it
                db.rollback()
                record = db.query(SurveyRequestRecord).filter(SurveyRequestRecord.request_id == req.request_id).first()
                if not record:
                    logger.error("survey_record_creation_failed", request_id=req.request_id)
                    raise HTTPException(status_code=500, detail="Failed to retrieve survey request record")
        
        # If already completed, return cached result
        if record.status == "COMPLETED":
            logger.info("survey_cached_result_returned", request_id=req.request_id, company_name=req.company_name, status="COMPLETED")
            metrics.record_survey_completed()
            return SurveyStatusResponse(
                success=1,
                status=record.status,
                request_id=req.request_id,
                project_name=req.project_name,
                company_name=req.company_name,
                research_objectives=req.research_objectives,
                business_overview=req.business_overview,
                industry=req.industry,
                use_case=req.use_case,
                pages=record.pages,
                doc_link=record.doc_link
            )
        
        # If already running, just return status
        if record.status == "RUNNING":
            logger.info("survey_already_running", request_id=req.request_id, company_name=req.company_name)
            return SurveyStatusResponse(
                success=2,
                status="RUNNING",
                request_id=req.request_id,
                project_name=req.project_name,
                company_name=req.company_name,
                research_objectives=req.research_objectives,
                business_overview=req.business_overview,
                industry=req.industry,
                use_case=req.use_case,
                pages="",
                doc_link=""
            )
        
        # Delegate to Celery task (non-blocking)
        logger.info("delegating_to_celery", request_id=req.request_id, company_name=req.company_name)
        from app.tasks.survey_tasks import generate_survey_task
        
        task = generate_survey_task.delay(
            request_id=req.request_id,
            data={
                "company_name": req.company_name,
                "business_overview": req.business_overview,
                "research_objectives": req.research_objectives,
                "project_name": req.project_name
            },
            llm_model=req.llm_model
        )
        
        logger.info("celery_task_queued", request_id=req.request_id, company_name=req.company_name, task_id=task.id)
        
        return SurveyStatusResponse(
            success=2,
            status="RUNNING",
            request_id=req.request_id,
            project_name=req.project_name,
            company_name=req.company_name,
            research_objectives=req.research_objectives,
            business_overview=req.business_overview,
            industry=req.industry,
            use_case=req.use_case,
            pages="",
            doc_link=""
        )
    except Exception as e:
        logger.error("survey_generation_error", request_id=req.request_id, company_name=req.company_name, error=str(e))
        metrics.record_survey_failed()
        metrics.record_error(type(e).__name__)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/status/{request_id}")
@limiter.limit("30/minute")
def get_survey_status(request_id: str, db: Session = Depends(get_db)):
    """
    Poll the status of a survey generation task.
    
    **Rate Limits:**
    - 30 requests/minute per IP address
    
    **Path Parameters:**
    - `request_id` (string, required): The request ID from the survey generation request
    
    **Response:**
    - `success` (integer): 1 if completed, 2 if still running
    - `status` (string): Current status (STARTING, RUNNING, COMPLETED, FAILED)
    - `request_id` (string): The request ID
    - `pages` (string): Generated survey pages (empty if still running)
    - `doc_link` (string): Link to generated document (empty if still running)
    
    **Error Responses:**
    - 404: Survey request not found
    - 429: Rate limit exceeded (30 requests/minute per IP)
    
    **Example:**
    ```bash
    curl -H "Authorization: Bearer <token>" \\
      "http://localhost:8000/api/v1/surveys/status/req-12345"
    ```
    """
    record = db.query(SurveyRequestRecord).filter(SurveyRequestRecord.request_id == request_id).first()
    if not record:
        logger.warning("survey_request_not_found", request_id=request_id)
        raise HTTPException(status_code=404, detail=f"Survey request '{request_id}' not found.")
    
    logger.info("survey_status_polled", request_id=request_id, status=record.status)
    
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
