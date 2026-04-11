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
    ResearchObjectiveRequest, SurveyGenerationRequest, SurveyStatusResponse,
    RegenerateSurveyDocRequest, RegenerateSurveyDocResponse,
    SurveyListItem, SurveyListResponse, SurveySettingsUpdateRequest
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

@router.post("/generate-use-case")
@limiter.limit("20/minute")
async def generate_use_case(request: Request, req: dict):
    """Generate a descriptive use case based on project details"""
    project_name = req.get("project_name", "")
    company_name = req.get("company_name", "")
    industry = req.get("industry", "")
    existing_use_case = req.get("existing_use_case", "")
    llm_model = req.get("llm_model", "gpt")
    
    logger.info("use_case_generation_requested", project_name=project_name, company_name=company_name, industry=industry, llm_model=llm_model)
    
    # Create a prompt to generate use case
    prompt = f"""Generate a detailed and descriptive use case for a survey project with the following details:

Project Name: {project_name}
Company Name: {company_name}
Industry: {industry}
"""
    
    if existing_use_case:
        prompt += f"\nExisting Use Case (enhance this): {existing_use_case}"
    
    prompt += """

Generate a comprehensive use case description (3-5 paragraphs) that explains:
1. What the survey aims to achieve
2. Who the target audience is
3. What insights or outcomes are expected
4. How the results will be used

Keep it professional and specific to the industry. Do not include any preamble or explanation, just the use case description."""

    service = AIService(llm_model=llm_model)
    try:
        await service.initialize()
        messages = [{"role": "user", "content": prompt}]
        use_case = await service._call_llm(messages=messages, temperature=0.7, max_tokens=800)
        logger.info("use_case_generated", project_name=project_name, company_name=company_name, llm_model=llm_model)
        return {"success": 1, "use_case": use_case.strip()}
    except Exception as e:
        logger.error("use_case_generation_error", error=str(e))
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
                    status="STARTING",
                    username=request.state.user_id if hasattr(request.state, 'user_id') else None
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
@limiter.limit("120/minute")
def get_survey_status(request: Request, request_id: str, db: Session = Depends(get_db)):
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
        "settings": record.settings,
        "doc_link": record.doc_link or "",
    }

@router.post("/regenerate-document", response_model=RegenerateSurveyDocResponse)
@limiter.limit("10/minute")
async def regenerate_survey_document(request: Request, req: RegenerateSurveyDocRequest, db: Session = Depends(get_db)):
    """
    Regenerate the survey DOCX document from the current survey state.
    This is used when the user modifies the survey in the builder and wants to save changes.
    
    **Rate Limits:**
    - 10 requests/minute per IP address
    
    **Request Body:**
    - `request_id` (string, required): The original request ID
    - `project_name` (string, required): Project name
    - `company_name` (string, required): Company name
    - `survey_title` (string, required): Survey title
    - `survey_description` (string, required): Survey description
    - `pages` (array, required): SurveyJS pages with questions
    
    **Response:**
    - `success` (integer): 1 if successful
    - `request_id` (string): The request ID
    - `doc_link` (string): URL to the regenerated document
    - `message` (string): Success message
    
    **Example:**
    ```bash
    curl -X POST -H "Authorization: Bearer <token>" \\
      -H "Content-Type: application/json" \\
      -d '{"request_id": "req-123", "project_name": "Survey", ...}' \\
      "http://localhost:8000/api/v1/surveys/regenerate-document"
    ```
    """
    logger.info("document_regeneration_requested", request_id=req.request_id, project_name=req.project_name)
    
    try:
        from docx import Document
        from pathlib import Path
        import uuid
        
        # Load template
        assets_dir = Path(__file__).resolve().parent.parent.parent / "assets"
        template_path = assets_dir / "template_new.docx"
        
        if not template_path.exists():
            logger.error("template_not_found", template_path=str(template_path))
            doc = Document()
            doc.add_heading(req.survey_title, 0)
        else:
            logger.info("using_template", template_path=str(template_path))
            doc = Document(str(template_path))
        
        # Replace template placeholders
        for p in doc.paragraphs:
            if '<<PROJECT NAME>>' in p.text:
                p.text = p.text.replace('<<PROJECT NAME>>', req.project_name)
            if '<<COMPANY>>' in p.text:
                p.text = p.text.replace('<<COMPANY>>', req.company_name)
        
        # Add survey title and description
        doc.add_heading(req.survey_title, 0)
        if req.survey_description:
            doc.add_paragraph(req.survey_description)
        
        # Process pages and questions
        question_number = 1
        for page in req.pages:
            for element in page.get('elements', []):
                # Add question
                p = doc.add_paragraph(style='List Number')
                
                # Extract question title (strip HTML tags)
                title = element.get('title', '')
                if '<p>' in title:
                    import re
                    title = re.sub(r'<[^>]+>', '', title)
                
                run = p.add_run(f"{title}")
                run.bold = True
                
                # Add choices based on question type
                q_type = element.get('type', '')
                
                if q_type in ['radiogroup', 'checkbox']:
                    # Multiple choice
                    choices = element.get('choices', [])
                    for choice in choices:
                        choice_text = choice.get('text', choice.get('value', ''))
                        if '<p>' in choice_text:
                            import re
                            choice_text = re.sub(r'<[^>]+>', '', choice_text)
                        doc.add_paragraph(choice_text, style='List Bullet 2')
                
                elif q_type == 'matrix':
                    # Matrix question
                    rows = element.get('rows', [])
                    columns = element.get('columns', [])
                    
                    doc.add_paragraph("Rows:", style='List Bullet 2')
                    for row in rows:
                        row_text = row.get('text', row.get('value', ''))
                        if '<p>' in row_text:
                            import re
                            row_text = re.sub(r'<[^>]+>', '', row_text)
                        doc.add_paragraph(row_text, style='List Bullet 3')
                    
                    doc.add_paragraph("Columns:", style='List Bullet 2')
                    for col in columns:
                        col_text = col.get('text', col.get('value', ''))
                        if '<p>' in col_text:
                            import re
                            col_text = re.sub(r'<[^>]+>', '', col_text)
                        doc.add_paragraph(col_text, style='List Bullet 3')
                
                elif q_type == 'comment':
                    # Open-ended question
                    doc.add_paragraph("[Open-ended text response]", style='List Bullet 2')
                
                doc.add_paragraph()  # Spacer
                question_number += 1
        
        # Save document
        output_dir = Path(__file__).resolve().parent.parent.parent.parent / "questionnaires"
        output_dir.mkdir(exist_ok=True)
        filename = f"{req.project_name.replace(' ', '_')}_questionnaire_{req.request_id}_updated.docx"
        output_path = output_dir / filename
        doc.save(str(output_path))
        
        logger.info("document_regenerated", request_id=req.request_id, filename=filename)
        
        # Upload to cloud storage
        from app.services.storage_service import StorageService
        storage_service = StorageService()
        r2_url = storage_service.upload_file(str(output_path), f"questionnaires/{filename}")
        
        if r2_url:
            doc_link = r2_url
            logger.info("document_uploaded_to_r2", request_id=req.request_id, url=r2_url)
        else:
            logger.warning("r2_upload_failed", request_id=req.request_id)
            doc_link = f"/api/v1/files/download/{filename}"
        
        # Update database record
        record = db.query(SurveyRequestRecord).filter(SurveyRequestRecord.request_id == req.request_id).first()
        if record:
            record.doc_link = doc_link
            record.pages = req.pages
            db.commit()
            logger.info("database_updated", request_id=req.request_id)
        
        return RegenerateSurveyDocResponse(
            success=1,
            request_id=req.request_id,
            doc_link=doc_link,
            message=f"Document regenerated successfully with {question_number - 1} questions"
        )
        
    except Exception as e:
        logger.error("document_regeneration_error", request_id=req.request_id, error=str(e))
        metrics.record_error(type(e).__name__)
        raise HTTPException(status_code=500, detail=str(e))
        
@router.post("/settings")
@limiter.limit("20/minute")
async def update_survey_settings(request: Request, req: SurveySettingsUpdateRequest, db: Session = Depends(get_db)):
    """Update behavioral triggers and targeting settings immediately."""
    logger.info("settings_update_requested", request_id=req.request_id)
    
    record = db.query(SurveyRequestRecord).filter(SurveyRequestRecord.request_id == req.request_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Survey not found")
        
    try:
        record.settings = req.settings
        db.commit()
        logger.info("settings_updated_successfully", request_id=req.request_id)
        return {"success": 1, "settings": record.settings}
    except Exception as e:
        db.rollback()
        logger.error("settings_update_error", request_id=req.request_id, error=str(e))
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/", response_model=SurveyListResponse)
@limiter.limit("30/minute")
def list_surveys(request: Request, db: Session = Depends(get_db)):
    """
    List all surveys belonging to the authenticated user.
    Also includes surveys with no username (System Surveys).
    """
    from sqlalchemy import or_
    user_id = request.state.user_id if hasattr(request.state, 'user_id') else None
    
    if not user_id:
        # Fallback if verify_token didn't set request.state.user_id correctly
        # though verify_token should have handled this
        logger.warning("list_surveys_no_user_in_state")
        raise HTTPException(status_code=401, detail="User not identified")

    # Fetch surveys for user OR system surveys (username is NULL)
    surveys = db.query(SurveyRequestRecord).filter(
        or_(SurveyRequestRecord.username == user_id, SurveyRequestRecord.username.is_(None))
    ).order_by(SurveyRequestRecord.created_at.desc()).all()
    
    return {
        "success": 1,
        "surveys": [
            {
                "request_id": s.request_id,
                "project_name": s.project_name,
                "company_name": s.company_name,
                "industry": s.industry,
                "status": s.status,
                "created_at": s.created_at,
                "doc_link": s.doc_link
            } for s in surveys
        ]
    }

@router.delete("/{request_id}")
@limiter.limit("10/minute")
def delete_survey(request: Request, request_id: str, db: Session = Depends(get_db)):
    """Delete a survey owned by the user."""
    user_id = request.state.user_id if hasattr(request.state, 'user_id') else None
    
    record = db.query(SurveyRequestRecord).filter(SurveyRequestRecord.request_id == request_id).first()
    
    if not record:
        raise HTTPException(status_code=404, detail="Survey not found")
    
    # Check ownership (unless it's a system survey and we allow anyone to delete? 
    # Usually only owner or admin can delete. For now, owner or system survey can be deleted by user)
    if record.username and record.username != user_id:
        raise HTTPException(status_code=403, detail="You do not have permission to delete this survey")
    
    db.delete(record)
    db.commit()
    
    logger.info("survey_deleted", request_id=request_id, user_id=user_id)
    return {"success": 1, "message": "Survey deleted successfully"}
