"""
LLM provider Protocol — shared interface for OpenAI and Gemini providers.

Phase 3: When AIService is refactored to use the provider pattern, replace
the _call_openai / _call_gemini split in ai_service.py with:

    from app.services.providers.openai_provider import OpenAIProvider
    from app.services.providers.gemini_provider import GeminiProvider

    self._provider = OpenAIProvider(...) if llm_model == 'gpt' else GeminiProvider(...)
    result = await self._provider.complete(messages, ...)

Each provider handles its own retry / SDK quirks internally, keeping
AIService free of if/else branches on llm_model.
"""
from typing import Protocol, runtime_checkable


@runtime_checkable
class LLMProvider(Protocol):
    """Structural interface every LLM provider must satisfy."""

    async def initialize(self) -> None:
        """Open SDK clients, warm up connection pools, etc."""
        ...

    async def close(self) -> None:
        """Release SDK clients and any other resources."""
        ...

    async def complete(
        self,
        messages: list[dict],
        temperature: float = 0.7,
        max_tokens: int = 2000,
        force_json: bool = False,
    ) -> str:
        """
        Run a chat-completion and return the text of the assistant reply.

        Args:
            messages:    List of {role, content} dicts (OpenAI-style).
            temperature: Sampling temperature (0.0 – 2.0).
            max_tokens:  Upper bound on generated tokens.
            force_json:  When True, instruct the model to emit valid JSON only.

        Returns:
            The assistant's reply as a stripped plain-text / JSON string.

        Raises:
            Exception: On API error after any internal retry logic.
        """
        ...
