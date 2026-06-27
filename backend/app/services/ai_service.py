"""
AI Service — wraps OpenAI GPT and Google Gemini for survey generation.

Phase 2 changes:
  - Accepts an injected `redis` connection (shared pool from app.state.redis).
    initialize() / close() become no-ops when redis is injected.
  - Circuit breaker via @circuit on _call_llm_impl to prevent worker exhaustion
    during AI provider outages.
"""
import json
import asyncio
from typing import Any, Optional

import httpx

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

# ── Circuit breaker (install: pip install circuitbreaker) ────────────────────
try:
    from circuitbreaker import circuit, CircuitBreakerError
    _CB_AVAILABLE = True
except ImportError:
    logger.warning("circuitbreaker_not_installed", hint="pip install circuitbreaker")
    _CB_AVAILABLE = False

    # Stub so the decorator is harmless when library is absent
    def circuit(*args, **kwargs):
        def decorator(fn):
            return fn
        return decorator

    class CircuitBreakerError(Exception):
        pass


class AIService:
    def __init__(self, llm_model: str = "gpt", redis=None):
        """
        Args:
            llm_model: 'gpt' or 'gemini'
            redis:     Optional pre-created aioredis connection (shared pool).
                       When provided, initialize() / close() are no-ops.
        """
        self.llm_model = llm_model
        self._redis_injected = redis is not None
        self._redis = redis
        self._openai_client = None
        self._openai_http_client = None
        self._gemini_client = None

    # ── Lifecycle ─────────────────────────────────────────────────────────────

    async def initialize(self) -> None:
        """Connect AI provider clients and (if not injected) Redis cache."""
        if not self._redis_injected and self._redis is None:
            try:
                import redis.asyncio as aioredis
                self._redis = await aioredis.from_url(
                    settings.REDIS_URL, decode_responses=True
                )
            except Exception as exc:
                logger.warning("redis_cache_unavailable", error=str(exc))
                self._redis = None

        if self.llm_model == "gpt":
            from openai import AsyncOpenAI
            self._openai_http_client = httpx.AsyncClient(timeout=60, trust_env=False)
            self._openai_client = AsyncOpenAI(
                api_key=settings.OPENAI_API_KEY,
                timeout=60,
                max_retries=3,
                http_client=self._openai_http_client,
            )
        elif self.llm_model == "gemini":
            from google import genai
            self._gemini_client = genai.Client(api_key=settings.GOOGLE_API_KEY)

    async def close(self) -> None:
        """Close connections that this instance owns."""
        if not self._redis_injected and self._redis:
            try:
                await self._redis.close()
            except Exception:
                pass
            self._redis = None

        if self._openai_client:
            try:
                await self._openai_client.close()
            except Exception:
                pass
            self._openai_client = None

        if self._openai_http_client:
            try:
                await self._openai_http_client.aclose()
            except Exception:
                pass
            self._openai_http_client = None

    # ── LLM call with circuit breaker ─────────────────────────────────────────

    @circuit(failure_threshold=5, recovery_timeout=60, expected_exception=Exception)
    async def _call_llm_guarded(
        self,
        messages: list[dict],
        temperature: float = 0.7,
        max_tokens: int = 2000,
        force_json: bool = False,
    ) -> str:
        return await self._call_llm_impl(messages, temperature, max_tokens, force_json)

    async def _call_llm(
        self,
        messages: list[dict],
        temperature: float = 0.7,
        max_tokens: int = 2000,
        force_json: bool = False,
    ) -> str:
        try:
            return await self._call_llm_guarded(messages, temperature, max_tokens, force_json)
        except CircuitBreakerError as exc:
            logger.error("llm_circuit_open", model=self.llm_model)
            raise Exception("AI provider temporarily unavailable — please try again shortly") from exc

    async def _call_llm_impl(
        self,
        messages: list[dict],
        temperature: float,
        max_tokens: int,
        force_json: bool,
    ) -> str:
        if self.llm_model == "gpt":
            return await self._call_openai(messages, temperature, max_tokens, force_json)
        elif self.llm_model == "gemini":
            return await self._call_gemini(messages, temperature, max_tokens, force_json)
        else:
            raise ValueError(f"Unknown llm_model: {self.llm_model}")

    # ── OpenAI ────────────────────────────────────────────────────────────────

    async def _call_openai(
        self,
        messages: list[dict],
        temperature: float,
        max_tokens: int,
        force_json: bool,
    ) -> str:
        kwargs: dict[str, Any] = {
            "model":       settings.CHATGPT_MODEL,
            "messages":    messages,
            "temperature": temperature,
            "max_tokens":  max_tokens,
        }
        if force_json:
            kwargs["response_format"] = {"type": "json_object"}

        response = await self._openai_client.chat.completions.create(**kwargs)
        return response.choices[0].message.content.strip()

    # ── Gemini ────────────────────────────────────────────────────────────────

    async def _call_gemini(
        self,
        messages: list[dict],
        temperature: float,
        max_tokens: int,
        force_json: bool,
    ) -> str:
        from google.genai import types

        safety_off = [
            types.SafetySetting(
                category=types.HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                threshold=types.HarmBlockThreshold.BLOCK_NONE,
            ),
            types.SafetySetting(
                category=types.HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                threshold=types.HarmBlockThreshold.BLOCK_NONE,
            ),
            types.SafetySetting(
                category=types.HarmCategory.HARM_CATEGORY_HARASSMENT,
                threshold=types.HarmBlockThreshold.BLOCK_NONE,
            ),
            types.SafetySetting(
                category=types.HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
                threshold=types.HarmBlockThreshold.BLOCK_NONE,
            ),
        ]

        # Map OpenAI role format → Gemini contents format
        contents = [
            {
                "role":  "user" if m["role"] != "assistant" else "model",
                "parts": [{"text": m["content"]}],
            }
            for m in messages
        ]

        cfg: dict[str, Any] = {
            "temperature":      temperature,
            "max_output_tokens": max_tokens,
        }
        if force_json:
            cfg["response_mime_type"] = "application/json"

        response = self._gemini_client.models.generate_content(
            model=settings.GEMINI_MODEL,
            contents=contents,
            config=types.GenerateContentConfig(**cfg, safety_settings=safety_off),
        )
        return response.text.strip()

    # ── Redis cache helpers ────────────────────────────────────────────────────

    async def _cache_get(self, key: str) -> Optional[str]:
        if not self._redis:
            return None
        try:
            return await self._redis.get(key)
        except Exception:
            return None

    async def _cache_set(self, key: str, value: str, ttl: int = 3600) -> None:
        if not self._redis:
            return
        try:
            await self._redis.setex(key, ttl, value)
        except Exception:
            pass

    # ── Public generation methods ─────────────────────────────────────────────

    async def generate_business_overview(
        self,
        company_name: str,
        raw_input: str,
    ) -> str:
        cache_key = f"biz_overview:{self.llm_model}:{hash(company_name + raw_input)}"
        cached = await self._cache_get(cache_key)
        if cached:
            logger.info("cache_hit", cache_key=cache_key[:40])
            return cached

        messages = [
            {
                "role": "system",
                "content": (
                    "You are a business analyst. Produce a concise, professional "
                    "business overview based on the provided information."
                ),
            },
            {
                "role": "user",
                "content": f"Company: {company_name}\n\nContext: {raw_input}",
            },
        ]
        result = await self._call_llm(messages, temperature=0.5)
        await self._cache_set(cache_key, result)
        return result

    async def generate_use_case(
        self,
        company_name: str,
        business_overview: str,
    ) -> str:
        cache_key = f"use_case:{self.llm_model}:{hash(company_name + business_overview)}"
        cached = await self._cache_get(cache_key)
        if cached:
            logger.info("cache_hit", cache_key=cache_key[:40])
            return cached

        messages = [
            {
                "role": "system",
                "content": (
                    "You are a market research strategist. Write a short, clear "
                    "research use case or research goal for a survey. Keep it to "
                    "one concise paragraph and make it specific to the company."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Company: {company_name}\n\n"
                    f"Business overview:\n{business_overview}\n\n"
                    "Draft a research use case that explains what this survey should "
                    "help the company learn."
                ),
            },
        ]
        result = await self._call_llm(messages, temperature=0.5)
        await self._cache_set(cache_key, result)
        return result

    async def generate_research_objectives(
        self,
        business_overview: str,
        use_case: str,
    ) -> str:
        cache_key = f"research_obj:{self.llm_model}:{hash(business_overview + use_case)}"
        cached = await self._cache_get(cache_key)
        if cached:
            logger.info("cache_hit", cache_key=cache_key[:40])
            return cached

        messages = [
            {
                "role": "system",
                "content": (
                    "You are a market research expert. Generate clear, measurable "
                    "research objectives for a survey based on the business context."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Business overview:\n{business_overview}\n\n"
                    f"Use case:\n{use_case}"
                ),
            },
        ]
        result = await self._call_llm(messages, temperature=0.6)
        await self._cache_set(cache_key, result)
        return result

    async def generate_survey_questions(
        self,
        company_name: str,
        business_overview: str,
        research_objectives: str,
        use_web_search: bool = False,
    ) -> str:
        messages = [
            {
                "role": "system",
                "content": (
                    "You are a professional survey designer. Generate a comprehensive "
                    "survey questionnaire in JSON format. Return ONLY valid JSON with "
                    "this structure: {\"questions\": [{\"text\": \"...\", \"type\": "
                    "\"radiogroup\", \"choices\": [\"...\", \"...\"]}]}"
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Company: {company_name}\n\n"
                    f"Business Overview:\n{business_overview}\n\n"
                    f"Research Objectives:\n{research_objectives}\n\n"
                    "Generate 15-20 survey questions with 4-5 choices each."
                ),
            },
        ]
        return await self._call_llm(
            messages,
            temperature=0.7,
            max_tokens=4000,
            force_json=True,
        )
