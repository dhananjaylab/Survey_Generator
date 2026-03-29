import json
import logging
import uuid
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

async def async_generate_survey(request_id: str, data: Dict[str, Any]):
    logger.info(f"Task RECIEVED for request: {request_id}")
    update_survey_status(request_id, "RUNNING")
    
    ai_service = AIService()
    try:
        await ai_service.initialize()
        
        company_name = data["company_name"]
        business_overview = data["business_overview"]
        research_objectives = data["research_objectives"]
        project_name = data["project_name"]
        
        await publish_progress(request_id, "Drafting initial questionnaire...")
        questions = await ai_service.generate_questionnaire(
            company_name, business_overview, research_objectives
        )
        
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

        await publish_progress(request_id, "Adding Matrix and Open-ended questions if necessary...")
        matrix_count = sum(1 for q in parsed_questions if q["type"] == "Matrix")
        oe_count = sum(1 for q in parsed_questions if q["type"] == "Open-ended")
        
        idx = len(parsed_questions)
        while matrix_count < settings.MinMatrixQuestions:
            idx += 1
            new_q = await ai_service.generate_extra_question(company_name, business_overview, research_objectives, questionnaire_str, idx, "Matrix")
            questionnaire_str += f"\n{new_q}"
            parsed_questions.append({"type": "Matrix", "question": new_q.split("]", 1)[1].strip(), "choices": []})
            matrix_count += 1
            
        while oe_count < settings.MinMatrixOEQuestions:
            idx += 1
            new_q = await ai_service.generate_extra_question(company_name, business_overview, research_objectives, questionnaire_str, idx, "Open-ended")
            questionnaire_str += f"\n{new_q}"
            parsed_questions.append({"type": "Open-ended", "question": new_q.split("]", 1)[1].strip(), "choices": []})
            oe_count += 1
            
        await publish_progress(request_id, "Fleshing out choices in parallel batches...")
        
        questions_with_choices = await ai_service.generate_batch_choices(
            parsed_questions, company_name, business_overview, research_objectives
        )
        
        await publish_progress(request_id, "Generating video questions...")
        video_questions = await ai_service.generate_video_questions(
            company_name, business_overview, research_objectives
        )
        
        for vq in video_questions:
            questions_with_choices.append({
                "type": "Video",
                "question": vq.strip(),
                "choices": [""]
            })
            
        # Filtering logic
        seen = set()
        final_questions = []
        for q in questions_with_choices:
            qt = q["question"].lower()
            if any(k in qt for k in ["gender", "ethnicity", "your age", "how old"]): continue
            if qt not in seen:
                seen.add(qt)
                final_questions.append(q)

        # Build Document
        await publish_progress(request_id, "Generating DOCX file...")
        
        # Industry standard: robust path resolution
        assets_dir = Path(__file__).resolve().parent.parent / "assets"
        template_path = assets_dir / "template_new.docx"
        
        if not template_path.exists():
            logger.error(f"Template not found at {template_path}. Falling back to blank document.")
            doc = Document()
            doc.add_heading(project_name, 0)
        else:
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
                rows, cols = q['choices']
                doc.add_paragraph("Rows:", style='List Bullet 2')
                for row in rows:
                    doc.add_paragraph(str(row), style='List Bullet 3')
                doc.add_paragraph("Columns:", style='List Bullet 2')
                for col in cols:
                    doc.add_paragraph(str(col), style='List Bullet 3')
            else:
                for choice in q['choices']:
                    doc.add_paragraph(str(choice), style='List Bullet 2')
            
            doc.add_paragraph() # Spacer

        # Save result (Local Fallback)
        output_dir = Path(__file__).resolve().parent.parent.parent / "questionnaires"
        output_dir.mkdir(exist_ok=True)
        filename = f"{project_name.replace(' ', '_')}_questionnaire_{request_id}.docx"
        output_path = output_dir / filename
        doc.save(str(output_path))
        
        # Build SurveyJS
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
                
        # Upload to Cloudflare R2
        await publish_progress(request_id, "Uploading DOCX file to cloud storage...")
        from app.services.storage_service import StorageService
        storage_service = StorageService()
        r2_url = storage_service.upload_file(str(output_path), f"questionnaires/{filename}")
        
        if r2_url:
            doc_link = r2_url
            await publish_progress(request_id, "SUCCESS")
        else:
            logger.warning(f"R2 upload failed for {request_id}, falling back to local doc_link")
            doc_link = f"/api/v1/files/download/{filename}"
            await publish_progress(request_id, "SUCCESS (Local File Fallback)")
            
        update_survey_status(request_id, "COMPLETED", pages=pages, questionnaire_data=final_questions, doc_link=doc_link)
        
    except Exception as e:
        logger.error(f"Survey generation failed for {request_id}: {e}")
        await publish_progress(request_id, f"ERROR: {str(e)}")
        update_survey_status(request_id, "FAILED")
        raise e
    finally:
        await ai_service.close()

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
async def generate_survey_task(self, request_id: str, data: Dict[str, Any]):
    await async_generate_survey(request_id, data)
