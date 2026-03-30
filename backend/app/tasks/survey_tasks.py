import json
import logging
import uuid
import time
from typing import Dict, Any
from celery import Task
import asyncio
from app.core.celery import celery_app
from app.models.database import SessionLocal
from app.models.survey import SurveyRequestRecord
from app.services.ai_service import AIService
import redis.asyncio as aioredis
from app.core.config import settings
from docx import Document
import os
from pathlib import Path

logger = logging.getLogger(__name__)

async def publish_progress(request_id: str, message: str):
    """Publish progress message to Redis (non-blocking if connection fails)."""
    logger.info(f"[{request_id}] {message}")
    try:
        r = await asyncio.wait_for(aioredis.from_url(settings.REDIS_URL, decode_responses=True), timeout=2.0)
        await r.publish(f"survey_progress_{request_id}", message)
        await r.close()
    except (asyncio.TimeoutError, Exception) as e:
        # Log but don't fail - Redis is optional for development
        logger.debug(f"Redis publish failed (non-blocking): {type(e).__name__}: {e}")

def update_survey_status(request_id: str, status: str, pages=None, questionnaire_data=None, doc_link=None):
    db = SessionLocal()
    try:
        record = db.query(SurveyRequestRecord).filter(SurveyRequestRecord.request_id == request_id).first()
        if record:
            record.status = status
            if pages is not None: record.pages = pages
            if questionnaire_data is not None: record.questionnaire_data = questionnaire_data
            if doc_link is not None: record.doc_link = doc_link
            db.commit()
    except Exception as e:
        logger.error(f"Error updating DB: {e}")
        db.rollback()
    finally:
        db.close()

async def async_generate_survey(request_id: str, data: Dict[str, Any], llm_model: str = "gpt"):
    logger.info(f"[{request_id}] Task STARTED with model: {llm_model}")
    start_time = time.time()
    update_survey_status(request_id, "RUNNING")
    
    ai_service = AIService(llm_model=llm_model)
    try:
        await ai_service.initialize()
        elapse = time.time() - start_time
        logger.info(f"[{request_id}] AIService initialized ({elapse:.2f}s)")
        
        company_name = data["company_name"]
        business_overview = data["business_overview"]
        research_objectives = data["research_objectives"]
        project_name = data["project_name"]
        
        # STEP 1: Questionnaire
        step_start = time.time()
        await publish_progress(request_id, "Drafting initial questionnaire...")
        questions = await ai_service.generate_questionnaire(
            company_name, business_overview, research_objectives
        )
        step_time = time.time() - step_start
        logger.info(f"[{request_id}] STEP 1 - Questionnaire generated ({step_time:.2f}s) - {len(questions)} questions")
        
        questionnaire_str = "\n".join(questions)
        
        parsed_questions = []
        for q in questions:
            if "[" in q and "]" in q:
                type_part = q.split("]")[0].split("[")[-1].strip()
                question_part = q.split("]", 1)[1].strip()
                parsed_questions.append({
                    "type": type_part,
                    "question": question_part,
                    "choices": []
                })

        # STEP 2: Extra Questions
        step_start = time.time()
        await publish_progress(request_id, "Adding Matrix and Open-ended questions if necessary...")
        matrix_count = sum(1 for q in parsed_questions if q["type"] == "Matrix")
        oe_count = sum(1 for q in parsed_questions if q["type"] == "Open-ended")
        logger.info(f"[{request_id}] Initial counts - Matrix: {matrix_count}, OE: {oe_count}")
        
        idx = len(parsed_questions)
        while matrix_count < settings.MinMatrixQuestions:
            idx += 1
            logger.info(f"[{request_id}] Adding Matrix question {matrix_count + 1}/{settings.MinMatrixQuestions}")
            new_q = await ai_service.generate_extra_question(company_name, business_overview, research_objectives, questionnaire_str, idx, "Matrix")
            questionnaire_str += f"\n{new_q}"
            parsed_questions.append({"type": "Matrix", "question": new_q.split("]", 1)[1].strip(), "choices": []})
            matrix_count += 1
            
        while oe_count < settings.MinMatrixOEQuestions:
            idx += 1
            logger.info(f"[{request_id}] Adding Open-ended question {oe_count + 1}/{settings.MinMatrixOEQuestions}")
            new_q = await ai_service.generate_extra_question(company_name, business_overview, research_objectives, questionnaire_str, idx, "Open-ended")
            questionnaire_str += f"\n{new_q}"
            parsed_questions.append({"type": "Open-ended", "question": new_q.split("]", 1)[1].strip(), "choices": []})
            oe_count += 1
        
        step_time = time.time() - step_start
        logger.info(f"[{request_id}] STEP 2 - Extra questions added ({step_time:.2f}s) - Total questions: {len(parsed_questions)}")
            
        # STEP 3: Batch Choices (Optimized)
        step_start = time.time()
        await publish_progress(request_id, "Fleshing out choices using optimized batch generation...")
        logger.info(f"[{request_id}] Starting optimized batch choice generation for {len(parsed_questions)} questions...")
        questions_with_choices = await ai_service.generate_batch_choices_optimized(
            parsed_questions, company_name, business_overview, research_objectives
        )
        step_time = time.time() - step_start
        logger.info(f"[{request_id}] STEP 3 - Batch choices generated ({step_time:.2f}s)")
        
        # STEP 4: Video Questions (Optional)
        if settings.INCLUDE_VIDEO_QUESTIONS:
            step_start = time.time()
            await publish_progress(request_id, "Generating video questions...")
            video_questions = await ai_service.generate_video_questions(
                company_name, business_overview, research_objectives
            )
            step_time = time.time() - step_start
            logger.info(f"[{request_id}] STEP 4 - Video questions generated ({step_time:.2f}s)")
            
            for vq in video_questions:
                questions_with_choices.append({
                    "type": "Video",
                    "question": vq.strip(),
                    "choices": [""]
                })
        
        # STEP 5: Filtering
        step_start = time.time()
        seen = set()
        final_questions = []
        for q in questions_with_choices:
            qt = q["question"].lower()
            if any(k in qt for k in ["gender", "ethnicity", "your age", "how old"]): continue
            if qt not in seen:
                seen.add(qt)
                final_questions.append(q)
        step_time = time.time() - step_start
        logger.info(f"[{request_id}] STEP 5 - Filtering complete ({step_time:.2f}s) - Final questions: {len(final_questions)}")

        # STEP 6: Document Building
        step_start = time.time()
        await publish_progress(request_id, "Generating DOCX file...")
        
        # Industry standard: robust path resolution
        assets_dir = Path(__file__).resolve().parent.parent / "assets"
        template_path = assets_dir / "template_new.docx"
        
        if not template_path.exists():
            logger.error(f"[{request_id}] Template not found at {template_path}. Falling back to blank document.")
            doc = Document()
            doc.add_heading(project_name, 0)
        else:
            logger.info(f"[{request_id}] Using template: {template_path}")
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
                    logger.warning(f"[{request_id}] Matrix question {i} had invalid choices, using defaults")
                
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

        # Save result (Local Fallback)
        output_dir = Path(__file__).resolve().parent.parent.parent / "questionnaires"
        output_dir.mkdir(exist_ok=True)
        filename = f"{project_name.replace(' ', '_')}_questionnaire_{request_id}.docx"
        output_path = output_dir / filename
        doc.save(str(output_path))
        
        step_time = time.time() - step_start
        logger.info(f"[{request_id}] STEP 6 - DOCX file created ({step_time:.2f}s)")
        
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
        logger.info(f"[{request_id}] STEP 7 - SurveyJS pages built ({step_time:.2f}s)")
                
        # STEP 8: Upload to Storage
        step_start = time.time()
        await publish_progress(request_id, "Uploading DOCX file to cloud storage...")
        from app.services.storage_service import StorageService
        storage_service = StorageService()
        r2_url = storage_service.upload_file(str(output_path), f"questionnaires/{filename}")
        
        if r2_url:
            doc_link = r2_url
            await publish_progress(request_id, "SUCCESS")
            logger.info(f"[{request_id}] File uploaded to R2: {r2_url}")
        else:
            logger.warning(f"[{request_id}] R2 upload failed, falling back to local doc_link")
            doc_link = f"/api/v1/files/download/{filename}"
            await publish_progress(request_id, "SUCCESS (Local File Fallback)")
        
        step_time = time.time() - step_start
        logger.info(f"[{request_id}] STEP 8 - File uploaded ({step_time:.2f}s)")
            
        update_survey_status(request_id, "COMPLETED", pages=pages, questionnaire_data=final_questions, doc_link=doc_link)
        
        total_time = time.time() - start_time
        logger.info(f"[{request_id}] ✓ SURVEY GENERATION COMPLETE ({total_time:.2f}s total) - Generated {len(final_questions)} questions. Doc: {doc_link}")
        
    except Exception as e:
        total_time = time.time() - start_time
        logger.error(f"[{request_id}] ✗ SURVEY GENERATION FAILED after {total_time:.2f}s: {str(e)}", exc_info=True)
        await publish_progress(request_id, f"ERROR: {str(e)}")
        update_survey_status(request_id, "FAILED")
        raise e
    finally:
        await ai_service.close()
        logger.info(f"[{request_id}] AIService closed")

class AsyncTask(Task):
    """Base task class that supports async functions"""
    def __call__(self, *args, **kwargs):
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            return loop.run_until_complete(self.run(*args, **kwargs))
        finally:
            loop.close()

@celery_app.task(
    bind=True,
    base=AsyncTask,
    name="tasks.generate_survey",
    max_retries=3,
    default_retry_delay=60
)
async def generate_survey_task(self, request_id: str, data: Dict[str, Any], llm_model: str = "gpt"):
    logger.info(f"[{request_id}] Celery task started for survey generation with model: {llm_model}")
    try:
        await async_generate_survey(request_id, data, llm_model)
        logger.info(f"[{request_id}] Celery task completed successfully")
    except Exception as e:
        logger.error(f"[{request_id}] Celery task failed: {str(e)}", exc_info=True)
        if self.request.retries < self.max_retries:
            logger.info(f"[{request_id}] Retrying task (attempt {self.request.retries + 1}/{self.max_retries})")
            raise self.retry(exc=e, countdown=60)
        raise
