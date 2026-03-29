# backend/app/tasks/celery_tasks.py
from celery import Celery, Task
from celery.signals import task_postrun, task_prerun
import logging
from typing import Dict, Any
import asyncio

from app.core.config import settings
from app.services.ai_service import AIService
from app.services.export_service import ExportService
from app.models.survey import SurveyStatus
from app.core.database import async_session

logger = logging.getLogger(__name__)

# Initialize Celery
celery_app = Celery(
    "survey_generator",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=600,  # 10 minutes max
    task_soft_time_limit=540,  # 9 minutes soft limit
    worker_prefetch_multiplier=1,
    worker_max_tasks_per_child=100,
)


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
    name="tasks.generate_complete_survey",
    max_retries=3,
    default_retry_delay=60
)
async def generate_complete_survey(
    self,
    survey_id: str,
    company_name: str,
    business_overview: str,
    research_objectives: str,
    project_name: str
) -> Dict[str, Any]:
    """
    Background task to generate complete survey with questions and choices
    
    This replaces the subprocess approach with a proper async task
    """
    logger.info(f"Starting survey generation for survey_id: {survey_id}")
    
    ai_service = AIService()
    export_service = ExportService()
    
    try:
        # Initialize services
        await ai_service.initialize()
        
        # Update status to processing
        await update_survey_status(survey_id, SurveyStatus.PROCESSING, 10)
        
        # Step 1: Generate initial questionnaire (30% progress)
        logger.info(f"Generating questionnaire for {company_name}")
        questions = await ai_service.generate_questionnaire(
            company_name, business_overview, research_objectives
        )
        
        await update_survey_status(survey_id, SurveyStatus.PROCESSING, 30)
        
        # Step 2: Parse questions into structured format
        parsed_questions = []
        for q in questions:
            if not q.strip():
                continue
                
            question_dict = {
                "question": "",
                "type": "",
                "choices": []
            }
            
            # Extract type and question text
            if "[" in q and "]" in q:
                type_part = q.split("]")[0].replace("[", "").strip()
                question_part = q.split("]", 1)[1].strip()
                
                question_dict["type"] = type_part
                question_dict["question"] = question_part
                parsed_questions.append(question_dict)
        
        await update_survey_status(survey_id, SurveyStatus.PROCESSING, 50)
        
        # Step 3: Ensure minimum required question types
        matrix_count = sum(1 for q in parsed_questions if q["type"] == "Matrix")
        oe_count = sum(1 for q in parsed_questions if q["type"] == "Open-ended")
        
        # Add matrix questions if needed
        while matrix_count < settings.MIN_MATRIX_QUESTIONS:
            # Generate additional matrix question
            logger.info(f"Adding matrix question {matrix_count + 1}")
            # Implementation would generate additional questions
            matrix_count += 1
        
        await update_survey_status(survey_id, SurveyStatus.PROCESSING, 60)
        
        # Step 4: Generate choices for all questions in parallel (batched)
        logger.info(f"Generating choices for {len(parsed_questions)} questions")
        questions_with_choices = await ai_service.generate_batch_choices(
            parsed_questions,
            company_name,
            business_overview,
            research_objectives
        )
        
        await update_survey_status(survey_id, SurveyStatus.PROCESSING, 80)
        
        # Step 5: Generate video questions
        video_questions = await ai_service.generate_video_questions(
            company_name, business_overview, research_objectives
        )
        
        for vq in video_questions:
            questions_with_choices.append({
                "question": vq.strip(),
                "type": "Video",
                "choices": []
            })
        
        # Step 6: Remove duplicates and filter sensitive questions
        final_questions = remove_duplicates_and_filter(questions_with_choices)
        
        await update_survey_status(survey_id, SurveyStatus.PROCESSING, 90)
        
        # Step 7: Export to DOCX
        logger.info(f"Exporting survey to DOCX")
        doc_url = await export_service.export_to_docx(
            survey_id,
            project_name,
            company_name,
            research_objectives,
            final_questions
        )
        
        # Step 8: Save to database and update status
        await save_survey_results(
            survey_id,
            final_questions,
            doc_url
        )
        
        await update_survey_status(survey_id, SurveyStatus.COMPLETED, 100)
        
        logger.info(f"Survey generation completed: {survey_id}")
        
        return {
            "survey_id": survey_id,
            "status": "completed",
            "questions": final_questions,
            "doc_url": doc_url,
            "question_count": len(final_questions)
        }
        
    except Exception as e:
        logger.error(f"Survey generation failed: {e}", exc_info=True)
        await update_survey_status(survey_id, SurveyStatus.FAILED, 0)
        
        # Retry if not max retries
        if self.request.retries < self.max_retries:
            raise self.retry(exc=e)
        
        raise
        
    finally:
        await ai_service.close()


async def update_survey_status(
    survey_id: str,
    status: SurveyStatus,
    progress: int
):
    """Update survey status in database"""
    async with async_session() as session:
        from app.models.survey import Survey
        from sqlalchemy import select
        
        result = await session.execute(
            select(Survey).where(Survey.id == survey_id)
        )
        survey = result.scalar_one_or_none()
        
        if survey:
            survey.status = status
            survey.progress = progress
            await session.commit()


async def save_survey_results(
    survey_id: str,
    questions: list,
    doc_url: str
):
    """Save completed survey results"""
    async with async_session() as session:
        from app.models.survey import Survey
        from sqlalchemy import select
        import json
        
        result = await session.execute(
            select(Survey).where(Survey.id == survey_id)
        )
        survey = result.scalar_one_or_none()
        
        if survey:
            survey.questions = json.dumps(questions)
            survey.document_url = doc_url
            await session.commit()


def remove_duplicates_and_filter(questions: list) -> list:
    """Remove duplicate questions and filter sensitive content"""
    seen = set()
    filtered = []
    
    sensitive_keywords = ["gender", "ethnicity", "your age", "how old", "race"]
    
    for q in questions:
        question_text = q["question"].lower()
        
        # Skip if duplicate
        if question_text in seen:
            continue
        
        # Skip if contains sensitive keywords
        if any(keyword in question_text for keyword in sensitive_keywords):
            logger.info(f"Filtering sensitive question: {question_text[:50]}")
            continue
        
        seen.add(question_text)
        filtered.append(q)
    
    return filtered


@task_prerun.connect
def task_prerun_handler(sender=None, **kwargs):
    """Log task start"""
    logger.info(f"Task {sender.name} started")


@task_postrun.connect
def task_postrun_handler(sender=None, **kwargs):
    """Log task completion"""
    logger.info(f"Task {sender.name} completed")
