import asyncio
from typing import List, Dict, Any, Optional
from openai import AsyncOpenAI
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
    """Service for AI-powered content generation with caching and retry logic"""
    
    def __init__(self):
        self.client = AsyncOpenAI(
            api_key=settings.OPENAI_API_KEY,
            timeout=60,
            max_retries=3
        )
        self.redis: Optional[aioredis.Redis] = None
        self.prompt_templates = PromptTemplates()
        
    async def initialize(self):
        """Initialize Redis connection"""
        self.redis = await aioredis.from_url(
            settings.REDIS_URL,
            decode_responses=True
        )
        
    async def close(self):
        """Close Redis connection"""
        if self.redis:
            await self.redis.close()
    
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
    async def _call_openai(self, messages: List[Dict[str, str]], temperature: float = None, max_tokens: int = None) -> str:
        try:
            response = await self.client.chat.completions.create(
                model=settings.CHATGPT_MODEL,
                messages=messages,
                temperature=temperature or 0.7,
                max_tokens=max_tokens or 2000,
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            logger.error(f"OpenAI API error: {e}")
            raise
    
    async def generate_business_overview(self, company_name: str, use_cache: bool = True) -> str:
        cache_key = self._generate_cache_key("business_overview", company=company_name)
        if use_cache:
            cached = await self._get_cached(cache_key)
            if cached: return cached
        
        messages = self.prompt_templates.get_business_overview_prompt(company_name)
        result = await self._call_openai(messages=messages, temperature=settings.BusinessOverviewTemperature, max_tokens=settings.BusinessOverviewMaxToken)
        overview = f"{company_name} is {result}"
        
        await self._set_cached(cache_key, overview)
        return overview
    
    async def generate_research_objectives(self, company_name, business_overview, industry, use_case, use_cache=True):
        cache_key = self._generate_cache_key("research_objectives", company=company_name, overview=business_overview[:100], industry=industry, use_case=use_case)
        if use_cache:
            cached = await self._get_cached(cache_key)
            if cached: return cached
        
        messages = self.prompt_templates.get_research_objectives_prompt(company_name, business_overview, industry, use_case)
        result = await self._call_openai(messages=messages, temperature=settings.ResearchObjectivesTemperature, max_tokens=settings.ResearchObjectivesMaxToken)
        
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
        result = await self._call_openai(messages=messages, max_tokens=settings.QuestionnaireV2MaxToken)
        questions = [q.strip() for q in result.split('\n') if q.strip()]
        return questions
        
    async def generate_extra_question(self, company_name, business_overview, research_objectives, existing_questions_string, idx, q_type):
        messages = self.prompt_templates.get_matrix_oe_prompt(company_name, business_overview, research_objectives, existing_questions_string, f"{idx}. [{q_type}]")
        result = await self._call_openai(messages=messages, max_tokens=settings.MatrixOEMaxToken)
        return f"{idx}. [{q_type}] {result}"

    async def generate_video_questions(self, company_name, business_overview, research_objectives):
        messages = self.prompt_templates.get_video_question_prompt(company_name, business_overview, research_objectives)
        result = await self._call_openai(messages=messages, max_tokens=settings.VideoQuestionMaxToken)
        return [q.strip() for q in result.split("\n") if q.strip()]

    async def generate_question_choices(self, question: str, question_type: str, company_name: str, business_overview: str, research_objectives: str):
        if question_type == "Matrix":
            messages = self.prompt_templates.get_matrix_choices_prompt(question, company_name, business_overview, research_objectives)
            result = await self._call_openai(messages=messages, max_tokens=settings.ChoicesMatrixMaxToken)
            parts = result.split("Columns:")
            if len(parts) == 2:
                rows = [r.strip().replace("-", "", 1).strip() for r in parts[0].split("\n") if r.strip()]
                columns = [c.strip().replace("-", "", 1).strip() for c in parts[1].split("\n") if c.strip()]
                return {"choices": [rows, columns]}
            return {"choices": [[],[]]}
        elif question_type in ["Multiple Choice", "Multiple choice"]:
            messages = self.prompt_templates.get_mcq_choices_prompt(question, company_name, business_overview, research_objectives)
            result = await self._call_openai(messages=messages, max_tokens=settings.ChoicesMCQMaxToken)
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
