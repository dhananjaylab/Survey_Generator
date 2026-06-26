"""
OpenAI GPT provider.

Implements the LLMProvider Protocol using the official AsyncOpenAI SDK.
All model/timeout/retry configuration is read from app.core.config.settings
so it stays in one place and benefits from the existing config validators.
"""
from __future__ import annotations

from typing import Any

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


class OpenAIProvider:
    """LLMProvider implementation for OpenAI GPT models."""

    def __init__(self) -> None:
        self._client = None  # created lazily in initialize()

    # ── Lifecycle ──────────────────────────────────────────────────────────────

    async def initialize(self) -> None:
        from openai import AsyncOpenAI

        self._client = AsyncOpenAI(
            api_key=settings.OPENAI_API_KEY,
            timeout=60,
            max_retries=3,
        )
        logger.info("openai_provider_initialized", model=settings.CHATGPT_MODEL)

    async def close(self) -> None:
        if self._client:
            try:
                await self._client.close()
            except Exception as exc:
                logger.warning("openai_client_close_error", error=str(exc))
            self._client = None

    # ── Completion ─────────────────────────────────────────────────────────────

    async def complete(
        self,
        messages: list[dict],
        temperature: float = 0.7,
        max_tokens: int = 2000,
        force_json: bool = False,
    ) -> str:
        if not self._client:
            raise RuntimeError("OpenAIProvider.initialize() was not called")

        kwargs: dict[str, Any] = {
            "model":       settings.CHATGPT_MODEL,
            "messages":    messages,
            "temperature": temperature,
            "max_tokens":  max_tokens,
        }
        if force_json:
            kwargs["response_format"] = {"type": "json_object"}

        logger.info("openai_complete_start", model=settings.CHATGPT_MODEL)
        response = await self._client.chat.completions.create(**kwargs)
        text = response.choices[0].message.content.strip()
        logger.info("openai_complete_done", chars=len(text))
        return text
