# backend/app/services/ai_service.py
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
from redis import asyncio as aioredis
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
            timeout=settings.OPENAI_TIMEOUT,
            max_retries=settings.OPENAI_MAX_RETRIES
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
        """Generate cache key from parameters"""
        content = json.dumps(kwargs, sort_keys=True)
        hash_digest = hashlib.md5(content.encode()).hexdigest()
        return f"{prefix}:{hash_digest}"
    
    async def _get_cached(self, key: str) -> Optional[str]:
        """Get cached response"""
        if self.redis:
            try:
                return await self.redis.get(key)
            except Exception as e:
                logger.warning(f"Cache get failed: {e}")
        return None
    
    async def _set_cached(self, key: str, value: str, ttl: int = None):
        """Set cached response"""
        if self.redis:
            try:
                await self.redis.setex(
                    key, 
                    ttl or settings.CACHE_TTL, 
                    value
                )
            except Exception as e:
                logger.warning(f"Cache set failed: {e}")
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=4, max=10),
        retry=retry_if_exception_type((Exception,)),
        reraise=True
    )
    async def _call_openai(
        self,
        messages: List[Dict[str, str]],
        temperature: float = None,
        max_tokens: int = None
    ) -> str:
        """Call OpenAI API with retry logic"""
        try:
            response = await self.client.chat.completions.create(
                model=settings.OPENAI_MODEL,
                messages=messages,
                temperature=temperature or settings.OPENAI_TEMPERATURE,
                max_tokens=max_tokens or settings.OPENAI_MAX_TOKENS,
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            logger.error(f"OpenAI API error: {e}")
            raise
    
    async def generate_business_overview(
        self, 
        company_name: str,
        use_cache: bool = True
    ) -> str:
        """Generate business overview for a company"""
        cache_key = self._generate_cache_key("business_overview", company=company_name)
        
        # Check cache
        if use_cache:
            cached = await self._get_cached(cache_key)
            if cached:
                logger.info(f"Cache hit for business overview: {company_name}")
                return cached
        
        # Generate using AI
        messages = self.prompt_templates.get_business_overview_prompt(company_name)
        
        result = await self._call_openai(
            messages=messages,
            temperature=0.7,
            max_tokens=200
        )
        
        overview = f"{company_name} is {result}"
        
        # Cache result
        await self._set_cached(cache_key, overview)
        
        return overview
    
    async def generate_research_objectives(
        self,
        company_name: str,
        business_overview: str,
        industry: str,
        use_case: str,
        use_cache: bool = True
    ) -> str:
        """Generate research objectives"""
        cache_key = self._generate_cache_key(
            "research_objectives",
            company=company_name,
            overview=business_overview[:100],  # Partial to avoid huge keys
            industry=industry,
            use_case=use_case
        )
        
        if use_cache:
            cached = await self._get_cached(cache_key)
            if cached:
                logger.info(f"Cache hit for research objectives: {company_name}")
                return cached
        
        messages = self.prompt_templates.get_research_objectives_prompt(
            company_name, business_overview, industry, use_case
        )
        
        result = await self._call_openai(
            messages=messages,
            temperature=0.2,
            max_tokens=400
        )
        
        await self._set_cached(cache_key, result)
        
        return result
    
    async def generate_questionnaire(
        self,
        company_name: str,
        business_overview: str,
        research_objectives: str
    ) -> List[str]:
        """Generate initial questionnaire"""
        messages = self.prompt_templates.get_survey_generator_prompt(
            company_name, business_overview, research_objectives
        )
        
        result = await self._call_openai(
            messages=messages,
            max_tokens=1000
        )
        
        questions = [q.strip() for q in result.split('\n') if q.strip()]
        return questions
    
    async def generate_question_choices(
        self,
        question: str,
        question_type: str,
        company_name: str,
        business_overview: str,
        research_objectives: str
    ) -> Dict[str, Any]:
        """Generate choices for a specific question"""
        if question_type == "Matrix":
            return await self._generate_matrix_choices(
                question, company_name, business_overview, research_objectives
            )
        elif question_type in ["Multiple Choice", "Multiple choice"]:
            return await self._generate_mcq_choices(
                question, company_name, business_overview, research_objectives
            )
        else:
            return {"choices": ["Open-ended text response"]}
    
    async def _generate_matrix_choices(
        self,
        question: str,
        company_name: str,
        business_overview: str,
        research_objectives: str
    ) -> Dict[str, List[str]]:
        """Generate matrix question choices"""
        messages = self.prompt_templates.get_matrix_choices_prompt(
            question, company_name, business_overview, research_objectives
        )
        
        result = await self._call_openai(
            messages=messages,
            max_tokens=100
        )
        
        parts = result.split("Columns:")
        rows = [r.strip().replace("-", "", 1).strip() 
                for r in parts[0].split("\n") if r.strip()]
        columns = [c.strip().replace("-", "", 1).strip() 
                   for c in parts[1].split("\n") if c.strip()]
        
        return {"rows": rows, "columns": columns}
    
    async def _generate_mcq_choices(
        self,
        question: str,
        company_name: str,
        business_overview: str,
        research_objectives: str
    ) -> Dict[str, List[str]]:
        """Generate multiple choice options"""
        messages = self.prompt_templates.get_mcq_choices_prompt(
            question, company_name, business_overview, research_objectives
        )
        
        result = await self._call_openai(
            messages=messages,
            max_tokens=200
        )
        
        choices = [c.strip().replace("-", "", 1).strip() 
                   for c in result.split("\n") if c.strip()]
        
        return {"choices": choices}
    
    async def generate_batch_choices(
        self,
        questions: List[Dict[str, Any]],
        company_name: str,
        business_overview: str,
        research_objectives: str
    ) -> List[Dict[str, Any]]:
        """Generate choices for multiple questions in parallel"""
        tasks = []
        
        for question in questions:
            task = self.generate_question_choices(
                question["question"],
                question["type"],
                company_name,
                business_overview,
                research_objectives
            )
            tasks.append(task)
        
        # Execute in parallel with concurrency limit
        results = []
        batch_size = 5  # Process 5 at a time to avoid rate limits
        
        for i in range(0, len(tasks), batch_size):
            batch = tasks[i:i + batch_size]
            batch_results = await asyncio.gather(*batch, return_exceptions=True)
            results.extend(batch_results)
            
            # Small delay between batches
            if i + batch_size < len(tasks):
                await asyncio.sleep(1)
        
        # Merge results with questions
        for i, question in enumerate(questions):
            if isinstance(results[i], Exception):
                logger.error(f"Failed to generate choices for question {i}: {results[i]}")
                question["choices"] = []
            else:
                question.update(results[i])
        
        return questions


# Singleton instance
ai_service = AIService()
