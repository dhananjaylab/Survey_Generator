import json
import logging
import uuid
import time
from typing import Dict, Any
from celery import Task
import asyncio
from app.core.celery import celery_app
from app.core.logging import get_logger
from app.models.database import SessionLocal
from app.models.survey import SurveyRequestRecord
from app.services.ai_service import AIService
import redis.asyncio as aioredis
from app.core.config import settings
from docx import Document
import os
from pathlib import Path

logger = get_logger(__name__)

async def publish_progress(request_id: str, message: str):
    """
    Publish progress message to Redis pub/sub channel.
    
    Args:
        request_id: Unique request identifier
        message: Progress message to publish
    """
    # Use time.time() for unique timestamps
    timestamp = time.strftime("%I:%M:%S %p", time.localtime())
    logger.info("progress_update", request_id=request_id, message=message, timestamp=timestamp)
    try:
        r = await asyncio.wait_for(aioredis.from_url(settings.REDIS_URL, decode_responses=True), timeout=2.0)
        await r.publish(f"survey_progress_{request_id}", message)
        await r.close()
    except (asyncio.TimeoutError, ConnectionError) as e:
        # Log but don't fail - Redis is optional for development
        logger.debug("redis_publish_failed", request_id=request_id, error=str(e))

def update_survey_status(request_id: str, status: str, pages=None, questionnaire_data=None, doc_link=None):
    """
    Update survey request status in database.
    
    Args:
        request_id: Unique request identifier
        status: New status (STARTING, RUNNING, COMPLETED, FAILED)
        pages: Generated survey pages (SurveyJS format)
        questionnaire_data: Raw question data
        doc_link: URL to generated DOCX file
    """
    db = SessionLocal()
    try:
        record = db.query(SurveyRequestRecord).filter(SurveyRequestRecord.request_id == request_id).first()
        if record:
            record.status = status
            if pages is not None: record.pages = pages
            if questionnaire_data is not None: record.questionnaire_data = questionnaire_data
            if doc_link is not None: record.doc_link = doc_link
            db.commit()
            logger.info("survey_status_updated", request_id=request_id, status=status)
    except Exception as e:
        logger.error("survey_status_update_failed", request_id=request_id, error=str(e))
        db.rollback()
    finally:
        db.close()

async def async_generate_survey(request_id: str, data: Dict[str, Any], llm_model: str = "gpt"):
    """
    Asynchronous survey generation logic.
    
    Responsibilities:
    - Initialize AIService
    - Generate questions and choices
    - Save results to DB
    - Update status: RUNNING → COMPLETED (or FAILED on error)
    - Publish progress updates to Redis pub/sub
    
    Progress Messages:
    - "STARTED": Task initialization complete
    - "QUESTIONS_GENERATED": Initial questions created
    - "CHOICES_GENERATED": Answer choices generated
    - "SUCCESS": Survey generation complete
    - "ERROR": Error occurred during generation
    
    Args:
        request_id: Unique request identifier
        data: Dictionary containing company_name, business_overview, research_objectives, project_name
        llm_model: LLM model to use ("gpt" or "gemini")
    """
    logger.info("survey_generation_started", request_id=request_id, llm_model=llm_model)
    start_time = time.time()
    
    ai_service = AIService(llm_model=llm_model)
    try:
        await ai_service.initialize()
        elapse = time.time() - start_time
        logger.info("aiservice_initialized", request_id=request_id, elapsed_seconds=elapse)
        
        # Publish STARTED message
        await publish_progress(request_id, "STARTED")
        
        company_name = data["company_name"]
        business_overview = data["business_overview"]
        research_objectives = data["research_objectives"]
        project_name = data["project_name"]
        use_web_search = data.get("use_web_search", False)
        
        # STEP 1: Fast JSON Generation
        step_start = time.time()
        await publish_progress(request_id, "Drafting full questionnaire using AI JSON generation...")
        
        final_questions = await ai_service.generate_survey_json(
            company_name, business_overview, research_objectives, use_web_search
        )
        
        step_time = time.time() - step_start
        logger.info("survey_json_generated", request_id=request_id, question_count=len(final_questions), elapsed_seconds=step_time)
        
        # Publish QUESTIONS_GENERATED message
        await publish_progress(request_id, f"QUESTIONS_GENERATED: {len(final_questions)} questions")
        await publish_progress(request_id, "CHOICES_GENERATED: Answer choices structured")

        # STEP 6: Document Building
        step_start = time.time()
        await publish_progress(request_id, "Generating DOCX file...")
        
        # Industry standard: robust path resolution
        assets_dir = Path(__file__).resolve().parent.parent / "assets"
        template_path = assets_dir / "template_new.docx"
        
        if not template_path.exists():
            logger.error("template_not_found", request_id=request_id, template_path=str(template_path))
            doc = Document()
            doc.add_heading(project_name, 0)
        else:
            logger.info("using_template", request_id=request_id, template_path=str(template_path))
            doc = Document(str(template_path))

        # Dynamic template population
        for p in doc.paragraphs:
            if '<<PROJECT NAME>>' in p.text:
                p.text = p.text.replace('<<PROJECT NAME>>', project_name)
            if '<<COMPANY>>' in p.text:
                p.text = p.text.replace('<<COMPANY>>', company_name)
            if '<<RESEARCH OBJECTIVES>>' in p.text:
                p.text = p.text.replace('<<RESEARCH OBJECTIVES>>', research_objectives)

        # Add the generated questions with dynamic styling
        for i, q in enumerate(final_questions, 1):
            p = doc.add_paragraph(style='List Number')
            run = p.add_run(f"{q['question']}")
            run.bold = True
            
            if q['type'] == "Matrix":
                # Safety check: ensure choices is a list with 2 elements [rows, cols]
                if isinstance(q.get('choices'), list) and len(q['choices']) == 2:
                    rows, cols = q['choices']
                else:
                    # Fallback to defaults if parsing failed
                    rows = ['Item 1', 'Item 2', 'Item 3']
                    cols = ['Poor', 'Average', 'Good', 'Excellent']
                    logger.warning("matrix_question_invalid_choices", request_id=request_id, question_index=i)
                
                doc.add_paragraph("Rows:", style='List Bullet 2')
                for row in rows:
                    doc.add_paragraph(str(row), style='List Bullet 3')
                doc.add_paragraph("Columns:", style='List Bullet 2')
                for col in cols:
                    doc.add_paragraph(str(col), style='List Bullet 3')
            else:
                # For MCQ and Open-ended, just add choices as bullet points
                for choice in q.get('choices', []):
                    doc.add_paragraph(str(choice), style='List Bullet 2')
            
            doc.add_paragraph() # Spacer

        # Generate document in memory
        from io import BytesIO
        doc_io = BytesIO()
        doc.save(doc_io)
        doc_io.seek(0)
        
        filename = f"{project_name.replace(' ', '_')}_questionnaire_{request_id}.docx"
        elapse = time.time() - step_start
        logger.info("docx_memory_generated", request_id=request_id, elapsed_seconds=elapse)
        
        step_time = time.time() - step_start
        logger.info("docx_file_created", request_id=request_id, elapsed_seconds=step_time)
        
        # STEP 7: SurveyJS Build
        step_start = time.time()
        pages = []
        for page_idx, q in enumerate(final_questions, 1):
            if q['type'] in ["Multiple Choice", "Multiple choice"]:
                q_type = 'checkbox' if 'select all' in q['question'].lower() else 'radiogroup'
                pages.append({"name": f"page{page_idx}", "elements": [{"type": q_type, "name": f"question{page_idx}", "title": f"<p>{q['question']}</p>", "surveyQID": str(uuid.uuid1()), "choices": [{"value": c, "text": f'<p>{c}</p>'} for c in q['choices']]}]})
            elif q['type'] == 'Open-ended':
                pages.append({"name": f"page{page_idx}", "elements": [{"type": "comment", "name": f"question{page_idx}", "title": f"<p>{q['question']}</p>", "surveyQID": str(uuid.uuid1())}]})
            elif q['type'] == 'Matrix':
                pages.append({"name": f"page{page_idx}", "elements": [{"type": "matrix", "name": f"question{page_idx}", "title": f"<p>{q['question']}</p>", "surveyQID": str(uuid.uuid1()), "columns": [{"value": c, "text": f'<p>{c}</p>'} for c in q['choices'][1]], "rows": [{"value": c, "text": f'<p>{c}</p>'} for c in q['choices'][0]]}]})
            else:
                pages.append({"name": f"page{page_idx}", "elements": [{"type": "videofeedback", "name": f"question{page_idx}", "title": f"<p>{q['question']}</p>", "surveyQID": str(uuid.uuid1())}]})
        
        step_time = time.time() - step_start
        logger.info("surveyjs_pages_built", request_id=request_id, elapsed_seconds=step_time)
                
        # STEP 8: Upload to Storage
        step_start = time.time()
        await publish_progress(request_id, "Uploading DOCX file to cloud storage...")
        from app.services.storage_service import StorageService
        storage_service = StorageService()
        r2_url = await asyncio.to_thread(storage_service.upload_fileobj, doc_io, f"questionnaires/{filename}")
        
        # Always use the local download proxy for the doc_link to avoid CORS issues
        doc_link = f"/api/v1/files/download/{filename}"
        
        if r2_url:
            logger.info("file_uploaded_to_r2", request_id=request_id, url=r2_url)
        else:
            logger.warning("r2_upload_failed_using_local_fallback", request_id=request_id)
        
        step_time = time.time() - step_start
        logger.info("file_uploaded", request_id=request_id, elapsed_seconds=step_time)
            
        # Update status to COMPLETED
        update_survey_status(request_id, "COMPLETED", pages=pages, questionnaire_data=final_questions, doc_link=doc_link)
        
        total_time = time.time() - start_time
        logger.info("survey_generation_completed", request_id=request_id, question_count=len(final_questions), total_seconds=total_time, doc_link=doc_link)
        
        # Publish single SUCCESS message
        await publish_progress(request_id, "SUCCESS")
        
    except Exception as e:
        total_time = time.time() - start_time
        logger.error("survey_generation_failed", request_id=request_id, error=str(e), elapsed_seconds=total_time)
        
        # Publish ERROR message with details
        error_msg = f"ERROR: {str(e)}"
        await publish_progress(request_id, error_msg)
        
        # Status will be updated to FAILED by the Celery task wrapper
        raise
    finally:
        await ai_service.close()
        logger.info("aiservice_closed", request_id=request_id)

class AsyncTask(Task):
    """Base task class that supports async functions"""
    def __call__(self, *args, **kwargs):
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            return loop.run_until_complete(self.run(*args, **kwargs))
        finally:
            # Give pending tasks a chance to complete
            try:
                # Cancel all remaining tasks
                pending = asyncio.all_tasks(loop)
                for task in pending:
                    task.cancel()
                # Wait for all tasks to be cancelled
                if pending:
                    loop.run_until_complete(asyncio.gather(*pending, return_exceptions=True))
            except Exception as e:
                logger.warning(f"Error during loop cleanup: {e}")
            finally:
                loop.close()

@celery_app.task(
    bind=True,
    base=AsyncTask,
    name="tasks.generate_survey",
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_backoff_max=600,
    retry_jitter=True,
    max_retries=3,
    default_retry_delay=60
)
async def generate_survey_task(self, request_id: str, data: Dict[str, Any], llm_model: str = "gpt"):
    """
    Celery task for asynchronous survey generation.
    
    Responsibilities:
    - Load request data from DB
    - Initialize AIService
    - Generate questions and choices
    - Save results to DB
    - Update status: STARTING → RUNNING → COMPLETED
    
    Retry Strategy:
    - Automatically retries on any Exception
    - Exponential backoff with jitter
    - Max 3 retries with up to 10 minutes between attempts
    - Transient failures (AI/API issues) are handled gracefully
    
    Args:
        request_id: Unique request identifier
        data: Dictionary containing company_name, business_overview, research_objectives, project_name
        llm_model: LLM model to use ("gpt" or "gemini")
    """
    logger.info("celery_task_started", request_id=request_id, attempt=self.request.retries + 1, max_retries=self.max_retries + 1, llm_model=llm_model)
    
    try:
        # Load request data from DB
        db = SessionLocal()
        try:
            record = db.query(SurveyRequestRecord).filter(
                SurveyRequestRecord.request_id == request_id
            ).first()
            
            if not record:
                logger.error("survey_record_not_found", request_id=request_id)
                raise ValueError(f"Survey request '{request_id}' not found in database")
            
            # Update status to RUNNING
            record.status = "RUNNING"
            db.commit()
            logger.info("survey_status_updated_to_running", request_id=request_id)
            
        finally:
            db.close()
        
        # Execute async survey generation
        await async_generate_survey(request_id, data, llm_model)
        logger.info("celery_task_completed_successfully", request_id=request_id)
        
    except Exception as e:
        logger.error("celery_task_failed", request_id=request_id, error=str(e), attempt=self.request.retries + 1)
        
        # Update status to FAILED
        try:
            update_survey_status(request_id, "FAILED")
            logger.info("survey_status_updated_to_failed", request_id=request_id)
        except Exception as update_error:
            logger.error("failed_to_update_status_to_failed", request_id=request_id, error=str(update_error))
        
        # Retry logic: autoretry_for handles automatic retries
        if self.request.retries < self.max_retries:
            countdown = 60 * (2 ** self.request.retries)
            logger.info("scheduling_retry", request_id=request_id, attempt=self.request.retries + 1, countdown_seconds=countdown)
            raise self.retry(exc=e, countdown=countdown)
        else:
            logger.error("max_retries_exceeded", request_id=request_id, max_retries=self.max_retries)
            raise
