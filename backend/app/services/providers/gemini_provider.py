"""
Google Gemini provider.

Implements the LLMProvider Protocol using the official google-genai SDK.
Converts OpenAI-style {role, content} messages to Gemini's contents format
and disables all safety filters (required for demographic survey questions
that would otherwise be blocked as "harassment").
"""
from __future__ import annotations

from typing import Any

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


class GeminiProvider:
    """LLMProvider implementation for Google Gemini models."""

    def __init__(self) -> None:
        self._client = None  # created lazily in initialize()

    # ── Lifecycle ──────────────────────────────────────────────────────────────

    async def initialize(self) -> None:
        from google import genai

        self._client = genai.Client(api_key=settings.GOOGLE_API_KEY)
        logger.info("gemini_provider_initialized", model=settings.GEMINI_MODEL)

    async def close(self) -> None:
        if self._client:
            try:
                if hasattr(self._client, "aclose"):
                    await self._client.aclose()
            except Exception as exc:
                logger.warning("gemini_client_close_error", error=str(exc))
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
            raise RuntimeError("GeminiProvider.initialize() was not called")

        from google.genai import types

        # Map OpenAI roles → Gemini roles
        contents = [
            {
                "role":  "user" if m["role"] != "assistant" else "model",
                "parts": [{"text": m["content"]}],
            }
            for m in messages
        ]

        # All safety filters off — demographic survey questions trigger them
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

        cfg: dict[str, Any] = {
            "temperature":       temperature,
            "max_output_tokens": max_tokens,
        }
        if force_json:
            cfg["response_mime_type"] = "application/json"

        logger.info("gemini_complete_start", model=settings.GEMINI_MODEL)
        response = self._client.models.generate_content(
            model=settings.GEMINI_MODEL,
            contents=contents,
            config=types.GenerateContentConfig(**cfg, safety_settings=safety_off),
        )
        text = response.text.strip()
        logger.info("gemini_complete_done", chars=len(text))
        return text
