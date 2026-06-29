"""
Survey generation API router.

Phase 2 change: shared Redis pool injected via get_redis() dependency
into the four endpoints that call AIService with caching.

Validation fix:
  - Removed stray `import crypto` / `import os`
  - Added _survey_access_filter() so legacy rows with username=NULL
    remain visible to the signed-in user after the auth migration
"""
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import Optional

from app.models.database import get_db
from app.models.survey import SurveyRequestRecord
from app.services.ai_service import AIService
from app.core.auth import verify_token, get_current_user
from app.core.rate_limit import limiter
from app.core.logging import get_logger
from app.core.metrics import get_metrics_collector

logger  = get_logger(__name__)
metrics = get_metrics_collector()

router = APIRouter(
    prefix="/api/v1/surveys",
    tags=["Surveys"],
    dependencies=[Depends(verify_token)],
)


# ── Ownership filter ──────────────────────────────────────────────────────────

def _survey_access_filter(current_user: str):
    """
    Legacy surveys created before username ownership was stored may have a NULL
    username. Keep them visible to the signed-in user so older history does not
    disappear after auth migrations.
    """
    return or_(
        SurveyRequestRecord.username == current_user,
        SurveyRequestRecord.username.is_(None),
    )


# ── Redis dependency ──────────────────────────────────────────────────────────

def get_redis(request: Request):
    """Inject the shared Redis pool from app state (created at startup)."""
    return request.app.state.redis


# ── Request / Response models ─────────────────────────────────────────────────

class BusinessOverviewRequest(BaseModel):
    company_name: str = Field(..., min_length=1, max_length=200)
    raw_input:    str = Field(..., min_length=1, max_length=2000)
    llm_model:    str = Field(default="gpt")


class UseCaseRequest(BaseModel):
    company_name:      str = Field(..., min_length=1, max_length=200)
    business_overview: str = Field(..., min_length=1, max_length=5000)
    llm_model:         str = Field(default="gpt")


class ResearchObjectivesRequest(BaseModel):
    business_overview: str = Field(..., min_length=10, max_length=5000)
    use_case:          str = Field(..., min_length=10, max_length=2000)
    llm_model:         str = Field(default="gpt")


class GenerateSurveyRequest(BaseModel):
    request_id:          str = Field(...)
    project_name:        str = Field(..., min_length=1, max_length=200)
    company_name:        str = Field(..., min_length=1, max_length=200)
    business_overview:   str = Field(default="", max_length=5000)
    research_objectives: str = Field(default="", max_length=2000)
    industry:            str = Field(..., max_length=100)
    use_case:            str = Field(default="", max_length=2000)
    llm_model:           str = Field(default="gpt")
    use_web_search:      bool = Field(default=False)


class RegenerateDocumentRequest(BaseModel):
    request_id:         str
    project_name:       str = Field(..., min_length=1, max_length=200)
    company_name:       str = Field(default="", max_length=200)
    survey_title:       str = Field(default="", max_length=200)
    survey_description: str = Field(default="", max_length=1000)
    pages:              list = Field(default_factory=list)


class SurveySettingsRequest(BaseModel):
    llm_model:      Optional[str] = None
    use_web_search: Optional[bool] = None


# ── AI endpoints (shared Redis cache) ─────────────────────────────────────────

@router.post("/business-overview")
@limiter.limit("10/minute")
async def get_business_overview(
    request: Request,
    req: BusinessOverviewRequest,
    redis=Depends(get_redis),
    current_user: str = Depends(get_current_user),
):
    logger.info("business_overview_requested", user=current_user)
    service = AIService(llm_model=req.llm_model, redis=redis)
    await service.initialize()
    try:
        result = await service.generate_business_overview(
            company_name=req.company_name,
            raw_input=req.raw_input,
        )
        return {"business_overview": result}
    finally:
        await service.close()


@router.post("/generate-use-case")
@limiter.limit("10/minute")
async def generate_use_case(
    request: Request,
    req: UseCaseRequest,
    redis=Depends(get_redis),
    current_user: str = Depends(get_current_user),
):
    logger.info("use_case_requested", user=current_user)
    service = AIService(llm_model=req.llm_model, redis=redis)
    await service.initialize()
    try:
        result = await service.generate_use_case(
            company_name=req.company_name,
            business_overview=req.business_overview,
        )
        return {"use_case": result}
    finally:
        await service.close()


@router.post("/research-objectives")
@limiter.limit("10/minute")
async def get_research_objectives(
    request: Request,
    req: ResearchObjectivesRequest,
    redis=Depends(get_redis),
    current_user: str = Depends(get_current_user),
):
    logger.info("research_objectives_requested", user=current_user)
    service = AIService(llm_model=req.llm_model, redis=redis)
    await service.initialize()
    try:
        result = await service.generate_research_objectives(
            business_overview=req.business_overview,
            use_case=req.use_case,
        )
        return {"research_objectives": result}
    finally:
        await service.close()


# ── Survey CRUD + generation ──────────────────────────────────────────────────

@router.post("/generate", status_code=status.HTTP_202_ACCEPTED)
@limiter.limit("5/minute")
async def generate_survey(
    request: Request,
    req: GenerateSurveyRequest,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user),
):
    logger.info("survey_generate_requested", request_id=req.request_id, user=current_user)
    metrics.record_survey_started()

    record = SurveyRequestRecord(
        request_id=req.request_id,
        username=current_user,
        project_name=req.project_name,
        company_name=req.company_name,
        industry=req.industry,
        use_case=req.use_case or None,
        business_overview=req.business_overview or None,
        research_objectives=req.research_objectives or None,
        status="PENDING",
    )
    db.add(record)
    db.commit()

    from app.tasks.survey_tasks import generate_survey_task
    generate_survey_task.delay(
        request_id=req.request_id,
        data=req.model_dump(),
        llm_model=req.llm_model,
    )

    return {
        "request_id": req.request_id,
        "status": "PENDING",
        "message": "Survey generation started",
    }


@router.get("/status/{request_id}")
async def get_survey_status(
    request_id: str,
    current_user: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    record = (
        db.query(SurveyRequestRecord)
        .filter(
            SurveyRequestRecord.request_id == request_id,
            _survey_access_filter(current_user),
        )
        .first()
    )
    if not record:
        raise HTTPException(status_code=404, detail="Survey not found")

    return {
        "request_id":          record.request_id,
        "status":              record.status,
        "doc_link":            record.doc_link,
        "pages":               record.pages,
        "project_name":        record.project_name,
        "company_name":        record.company_name,
        "industry":            record.industry,
        "use_case":            record.use_case,
        "business_overview":   record.business_overview,
        "research_objectives": record.research_objectives,
    }


@router.get("/")
async def list_surveys(
    current_user: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    records = (
        db.query(SurveyRequestRecord)
        .filter(_survey_access_filter(current_user))
        .order_by(SurveyRequestRecord.created_at.desc())
        .all()
    )
    return {
        "surveys": [
            {
                "request_id":   r.request_id,
                "project_name": r.project_name,
                "company_name": r.company_name,
                "status":       r.status,
                "doc_link":     r.doc_link,
                "created_at":   r.created_at.isoformat() if r.created_at else None,
            }
            for r in records
        ],
        "success": 1,
    }


@router.delete("/{request_id}")
async def delete_survey(
    request_id: str,
    current_user: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    record = (
        db.query(SurveyRequestRecord)
        .filter(
            SurveyRequestRecord.request_id == request_id,
            _survey_access_filter(current_user),
        )
        .first()
    )
    if not record:
        raise HTTPException(status_code=404, detail="Survey not found")

    db.delete(record)
    db.commit()
    logger.info("survey_deleted", request_id=request_id, user=current_user)
    return {"message": "Survey deleted", "success": 1}


@router.post("/regenerate-document")
@limiter.limit("3/minute")
async def regenerate_survey_document(
    request: Request,
    req: RegenerateDocumentRequest,
    current_user: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    record = (
        db.query(SurveyRequestRecord)
        .filter(
            SurveyRequestRecord.request_id == req.request_id,
            _survey_access_filter(current_user),
        )
        .first()
    )
    if not record:
        raise HTTPException(status_code=404, detail="Survey not found")

    from app.tasks.survey_tasks import generate_survey_task
    generate_survey_task.delay(
        request_id=req.request_id,
        data={
            "project_name": req.project_name,
            "company_name": req.company_name or record.company_name,
        },
        llm_model="gpt",
    )
    return {
        "message": "Document regeneration started",
        "request_id": req.request_id,
        "success": 1,
    }


@router.put("/{survey_id}/settings")
async def update_survey_settings(
    survey_id: str,
    settings: dict,
    current_user: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Persist behavioural trigger settings from the Builder page."""
    record = (
        db.query(SurveyRequestRecord)
        .filter(
            SurveyRequestRecord.request_id == survey_id,
            _survey_access_filter(current_user),
        )
        .first()
    )
    if not record:
        raise HTTPException(status_code=404, detail="Survey not found")

    record.settings = settings
    db.commit()
    return {"message": "Settings updated", "success": 1}


@router.get("/settings")
async def get_settings(current_user: str = Depends(get_current_user)):
    return {
        "available_models": ["gpt", "gemini"],
        "default_model":    "gpt",
        "web_search":       False,
    }
