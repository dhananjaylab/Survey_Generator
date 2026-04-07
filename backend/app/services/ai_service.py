import asyncio
import time
from typing import List, Dict, Any, Optional
from openai import AsyncOpenAI
from google import genai
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type
)
import logging
import redis.asyncio as aioredis
import json
import hashlib

from app.core.config import settings
from app.utils.prompts import PromptTemplates

logger = logging.getLogger(__name__)

class AIService:
    """Service for AI-powered content generation with caching and retry logic.
    Supports both OpenAI (GPT) and Google Gemini models.
    Uses the latest google-genai SDK for Gemini integration.
    """
    
    def __init__(self, llm_model: str = "gpt"):
        """Initialize AI service with chosen model.
        
        Args:
            llm_model: Either 'gpt' (OpenAI) or 'gemini' (Google Gemini)
        """
        self.llm_model = llm_model.lower()
        if self.llm_model not in ["gpt", "gemini"]:
            logger.warning(f"Unknown model {llm_model}, defaulting to gpt")
            self.llm_model = "gpt"
        
        if self.llm_model == "gpt":
            self.client = AsyncOpenAI(
                api_key=settings.OPENAI_API_KEY,
                timeout=60,
                max_retries=3
            )
        else:  # gemini - using latest google-genai SDK
            self.gemini_client = genai.Client(api_key=settings.GOOGLE_API_KEY)
            self.gemini_model_name = settings.GEMINI_MODEL
        
        self.redis: Optional[aioredis.Redis] = None
        self.prompt_templates = PromptTemplates()
        
    async def initialize(self):
        """Initialize Redis connection"""
        self.redis = await aioredis.from_url(
            settings.REDIS_URL,
            decode_responses=True
        )
        
    async def close(self):
        """Close Redis connection and API clients"""
        if self.redis:
            await self.redis.close()
        
        # Close Gemini client if it exists
        if self.llm_model == "gemini" and hasattr(self, 'gemini_client'):
            try:
                # The google-genai client has an aclose method
                if hasattr(self.gemini_client, 'aclose'):
                    await self.gemini_client.aclose()
            except Exception as e:
                logger.warning(f"Error closing Gemini client: {e}")
        
        # Close OpenAI client if it exists
        if self.llm_model == "gpt" and hasattr(self, 'client'):
            try:
                await self.client.close()
            except Exception as e:
                logger.warning(f"Error closing OpenAI client: {e}")
    
    def _generate_cache_key(self, prefix: str, **kwargs) -> str:
        content = json.dumps(kwargs, sort_keys=True)
        hash_digest = hashlib.md5(content.encode()).hexdigest()
        return f"{prefix}:{hash_digest}"
    
    async def _get_cached(self, key: str) -> Optional[str]:
        if self.redis:
            try: return await self.redis.get(key)
            except Exception as e: logger.warning(f"Cache get failed: {e}")
        return None
    
    async def _set_cached(self, key: str, value: str, ttl: int = 3600):
        if self.redis:
            try: await self.redis.setex(key, ttl, value)
            except Exception as e: logger.warning(f"Cache set failed: {e}")
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=4, max=10),
        retry=retry_if_exception_type((Exception,)),
        reraise=True
    )
    async def _call_llm(self, messages: List[Dict[str, str]], temperature: float = None, max_tokens: int = None) -> str:
        """Call the configured LLM (OpenAI GPT or Google Gemini)."""
        try:
            if self.llm_model == "gpt":
                # OpenAI API call
                response = await self.client.chat.completions.create(
                    model=settings.CHATGPT_MODEL,
                    messages=messages,
                    temperature=temperature or 0.7,
                    max_tokens=max_tokens or 2000,
                )
                return response.choices[0].message.content.strip()
            else:  # gemini - using latest google-genai SDK
                # Convert OpenAI message format to Gemini content format
                contents = []
                for msg in messages:
                    role = msg.get("role", "user")
                    content = msg.get("content", "")
                    
                    # Map OpenAI roles to Gemini roles
                    gemini_role = "user" if role != "assistant" else "model"
                    
                    contents.append({
                        "role": gemini_role,
                        "parts": [{"text": content}]
                    })
                
                # Call Gemini API using google-genai SDK
                response = self.gemini_client.models.generate_content(
                    model=self.gemini_model_name,
                    contents=contents,
                    config={
                        "temperature": temperature or 0.7,
                        "max_output_tokens": max_tokens or 2000,
                    }
                )
                return response.text.strip()
        except Exception as e:
            logger.error(f"LLM API error ({self.llm_model}): {e}")
            raise
    
    async def generate_business_overview(self, company_name: str, use_cache: bool = True) -> str:
        cache_key = self._generate_cache_key("business_overview", company=company_name)
        if use_cache:
            cached = await self._get_cached(cache_key)
            if cached: return cached
        
        messages = self.prompt_templates.get_business_overview_prompt(company_name)
        result = await self._call_llm(messages=messages, temperature=settings.BusinessOverviewTemperature, max_tokens=settings.BusinessOverviewMaxToken)
        overview = f"{company_name} is {result}"
        
        await self._set_cached(cache_key, overview)
        return overview
    
    async def generate_research_objectives(self, company_name, business_overview, industry, use_case, use_cache=True):
        cache_key = self._generate_cache_key("research_objectives", company=company_name, overview=business_overview[:100], industry=industry, use_case=use_case)
        if use_cache:
            cached = await self._get_cached(cache_key)
            if cached: return cached
        
        messages = self.prompt_templates.get_research_objectives_prompt(company_name, business_overview, industry, use_case)
        result = await self._call_llm(messages=messages, temperature=settings.ResearchObjectivesTemperature, max_tokens=settings.ResearchObjectivesMaxToken)
        
        # Formatting markup logic
        ros = result.split("<")
        l = []
        i = 0
        for r in ros:
            if ">" in r:
                s = r.split(">")
                if i == 0: s[0] = '<mark style="background-color: blanchedalmond;">' + s[0] + '</mark>'
                elif i == 1: s[0] = '<mark style="background-color: aqua;">' + s[0] + '</mark>'
                elif i == 2: s[0] = '<mark style="background-color: #90ee90;">' + s[0] + '</mark>'
                t = "".join(s)
                l.append(t)
                i += 1
            else:
                l.append(r)
        final_result = "".join(l)
        
        await self._set_cached(cache_key, final_result)
        return final_result
    
    async def generate_questionnaire(self, company_name, business_overview, research_objectives):
        messages = self.prompt_templates.get_survey_generator_prompt(company_name, business_overview, research_objectives)
        result = await self._call_llm(messages=messages, max_tokens=settings.QuestionnaireV2MaxToken)
        questions = [q.strip() for q in result.split('\n') if q.strip()]
        return questions
        
    async def generate_extra_question(self, company_name, business_overview, research_objectives, existing_questions_string, idx, q_type):
        messages = self.prompt_templates.get_matrix_oe_prompt(company_name, business_overview, research_objectives, existing_questions_string, f"{idx}. [{q_type}]")
        result = await self._call_llm(messages=messages, max_tokens=settings.MatrixOEMaxToken)
        return f"{idx}. [{q_type}] {result}"

    async def generate_video_questions(self, company_name, business_overview, research_objectives):
        messages = self.prompt_templates.get_video_question_prompt(company_name, business_overview, research_objectives)
        result = await self._call_llm(messages=messages, max_tokens=settings.VideoQuestionMaxToken)
        return [q.strip() for q in result.split("\n") if q.strip()]

    async def generate_question_choices(self, question: str, question_type: str, company_name: str, business_overview: str, research_objectives: str):
        if question_type == "Matrix":
            messages = self.prompt_templates.get_matrix_choices_prompt(question, company_name, business_overview, research_objectives)
            result = await self._call_llm(messages=messages, max_tokens=settings.ChoicesMatrixMaxToken)
            parts = result.split("Columns:")
            if len(parts) == 2:
                rows = [r.strip().replace("-", "", 1).strip() for r in parts[0].split("\n") if r.strip()]
                columns = [c.strip().replace("-", "", 1).strip() for c in parts[1].split("\n") if c.strip()]
                return {"choices": [rows, columns]}
            return {"choices": [[],[]]}
        elif question_type in ["Multiple Choice", "Multiple choice"]:
            messages = self.prompt_templates.get_mcq_choices_prompt(question, company_name, business_overview, research_objectives)
            result = await self._call_llm(messages=messages, max_tokens=settings.ChoicesMCQMaxToken)
            choices = [c.strip().replace("-", "", 1).strip() for c in result.split("\n") if c.strip()]
            return {"choices": choices}
        else:
            return {"choices": ["Open-ended text response"]}
    
    async def generate_batch_choices(self, questions: List[Dict[str, Any]], company_name: str, business_overview: str, research_objectives: str) -> List[Dict[str, Any]]:
        tasks = []
        for question in questions:
            t = self.generate_question_choices(question["question"], question["type"], company_name, business_overview, research_objectives)
            tasks.append(t)
        
        results = []
        batch_size = 5
        for i in range(0, len(tasks), batch_size):
            batch = tasks[i:i + batch_size]
            batch_results = await asyncio.gather(*batch, return_exceptions=True)
            results.extend(batch_results)
            if i + batch_size < len(tasks):
                await asyncio.sleep(1)
        
        for i, question in enumerate(questions):
            if isinstance(results[i], Exception):
                logger.error(f"Failed to generate choices: {results[i]}")
                question["choices"] = []
            else:
                question.update(results[i])
        return questions
    
    async def generate_batch_choices_optimized(self, questions: List[Dict[str, Any]], company_name: str, business_overview: str, research_objectives: str) -> List[Dict[str, Any]]:
        """Optimized batch choice generation - generates choices for 5-10 questions in a SINGLE LLM call instead of one per question."""
        start_time = time.time()
        
        if not questions:
            return questions
        
        # Group by type for efficient generation
        mcq_questions = [q for q in questions if q["type"] in ["Multiple Choice", "Multiple choice"]]
        matrix_questions = [q for q in questions if q["type"] == "Matrix"]
        
        logger.info(f"Optimized batch generation: {len(mcq_questions)} MCQ + {len(matrix_questions)} Matrix questions")
        
        # Generate MCQ choices all at once
        if mcq_questions:
            mcq_start = time.time()
            logger.info(f"Generating {len(mcq_questions)} MCQ choices in 1 batch...")
            mcq_prompt = f"""Generate answer choices for these {len(mcq_questions)} multiple choice questions.
For each question, provide 3-4 relevant choices separated by "|"

Company: {company_name}
Context: {business_overview[:200]}

Questions:
"""
            for i, q in enumerate(mcq_questions, 1):
                mcq_prompt += f"{i}. {q['question']}\n"
            
            mcq_prompt += "\nFormat: 1. choice1|choice2|choice3|choice4\n2. choice1|choice2|choice3\nETC"
            
            messages = [{"role": "user", "content": mcq_prompt}]
            try:
                result = await self._call_llm(messages=messages, temperature=0.6, max_tokens=800)
                mcq_elapsed = time.time() - mcq_start
                logger.info(f"MCQ batch generated ({mcq_elapsed:.2f}s): {len(result)} chars")
                
                lines = result.strip().split('\n')
                for i, line in enumerate(lines):
                    if i < len(mcq_questions) and '|' in line:
                        choices = [c.strip().replace('- ', '').replace('* ', '').strip() for c in line.split('|') if c.strip()]
                        mcq_questions[i]['choices'] = choices if choices else ['Yes', 'No']
            except Exception as e:
                mcq_elapsed = time.time() - mcq_start
                logger.warning(f"Optimized MCQ generation failed after {mcq_elapsed:.2f}s: {e}, using fallback")
                for q in mcq_questions:
                    q['choices'] = ['Agree', 'Neutral', 'Disagree']
        
        # Generate Matrix choices all at once
        if matrix_questions:
            matrix_start = time.time()
            logger.info(f"Generating {len(matrix_questions)} Matrix choices in 1 batch...")
            matrix_prompt = f"""Generate row and column options for these {len(matrix_questions)} matrix/Likert scale questions.
For each question, provide rows and columns separated by "---"

Company: {company_name}

Questions:
"""
            for i, q in enumerate(matrix_questions, 1):
                matrix_prompt += f"{i}. {q['question']}\n"
            
            matrix_prompt += "\nFormat for each question:\nRows: row1, row2, row3\nColumns: col1, col2, col3, col4\n---\n"
            
            messages = [{"role": "user", "content": matrix_prompt}]
            try:
                result = await self._call_llm(messages=messages, temperature=0.6, max_tokens=800)
                matrix_elapsed = time.time() - matrix_start
                logger.info(f"Matrix batch generated ({matrix_elapsed:.2f}s): {len(result)} chars")
                logger.debug(f"Matrix response: {result[:200]}...")  # Log first 200 chars for debugging
                
                # Initialize all with defaults first
                for q in matrix_questions:
                    q['choices'] = [['Item 1', 'Item 2', 'Item 3'], ['Poor', 'Average', 'Good', 'Excellent']]
                
                sections = result.split('---')
                parsed_count = 0
                for i, section in enumerate(sections):
                    if i < len(matrix_questions):
                        if 'Rows:' in section and 'Columns:' in section:
                            try:
                                rows_part = section.split('Rows:')[1].split('Columns:')[0].strip()
                                cols_part = section.split('Columns:')[1].strip()
                                rows = [r.strip() for r in rows_part.split(',') if r.strip()]
                                cols = [c.strip() for c in cols_part.split(',') if c.strip()]
                                if rows and cols:
                                    matrix_questions[i]['choices'] = [rows[:3], cols[:4]]
                                    parsed_count += 1
                            except Exception as parse_error:
                                logger.warning(f"Failed to parse Matrix section {i}: {parse_error}")
                
                logger.info(f"Successfully parsed {parsed_count}/{len(matrix_questions)} Matrix questions")
            except Exception as e:
                matrix_elapsed = time.time() - matrix_start
                logger.warning(f"Optimized Matrix generation failed after {matrix_elapsed:.2f}s: {e}, using defaults for all")
                for q in matrix_questions:
                    q['choices'] = [['Item 1', 'Item 2', 'Item 3'], ['Poor', 'Average', 'Good', 'Excellent']]
        
        # Add back open-ended and video questions (they don't need choices)
        for q in questions:
            if q["type"] not in ["Multiple Choice", "Multiple choice", "Matrix"]:
                if "choices" not in q or not q["choices"]:
                    q["choices"] = []
        
        total_elapsed = time.time() - start_time
        logger.info(f"Optimized batch choice generation completed in {total_elapsed:.2f}s")
        return questions
