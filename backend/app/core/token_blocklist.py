"""
JWT token blocklist — Phase 3.

Stores the `jti` (JWT ID) of revoked tokens in Redis with a TTL equal
to the token's remaining lifetime.  decode_access_token() in security.py
checks this list before returning a user_id.

Why jti, not the full token?
  - Tokens can be long (>500 chars); jti is a short UUID.
  - The full token changes on every refresh; jti is stable for its lifetime.

Usage:
    # On logout or explicit token revocation:
    await TokenBlocklist.add(jti, expires_at, redis)

    # In security.py after decoding:
    if await TokenBlocklist.is_blocked(jti, redis):
        return None
"""
from __future__ import annotations

import math
from datetime import datetime, timezone
from typing import Optional

from app.core.logging import get_logger

logger = get_logger(__name__)

_KEY_PREFIX = "jwt_blocklist:"


class TokenBlocklist:
    """Redis-backed store for revoked JWT jti values."""

    @staticmethod
    def _key(jti: str) -> str:
        return f"{_KEY_PREFIX}{jti}"

    @staticmethod
    async def add(
        jti: str,
        expires_at: datetime,
        redis,
    ) -> None:
        """
        Blocklist a token by its jti until it naturally expires.

        Args:
            jti:        The JWT's 'jti' claim value.
            expires_at: The JWT's 'exp' claim as a timezone-aware datetime.
            redis:      Shared aioredis connection from app.state.redis.
        """
        if redis is None:
            logger.warning("blocklist_redis_unavailable", jti=jti[:8])
            return

        now = datetime.now(timezone.utc)
        ttl_seconds = math.ceil((expires_at - now).total_seconds())

        if ttl_seconds <= 0:
            # Already expired — nothing to store
            return

        try:
            await redis.setex(TokenBlocklist._key(jti), ttl_seconds, "1")
            logger.info("token_blocklisted", jti=jti[:8], ttl_seconds=ttl_seconds)
        except Exception as exc:
            logger.error("blocklist_add_failed", jti=jti[:8], error=str(exc))

    @staticmethod
    async def is_blocked(jti: str, redis) -> bool:
        """
        Return True if the jti is on the blocklist.

        A Redis connection failure is treated as NOT blocked to avoid
        locking out all users if Redis is temporarily unavailable.
        """
        if redis is None:
            return False
        try:
            return await redis.exists(TokenBlocklist._key(jti)) == 1
        except Exception as exc:
            logger.warning("blocklist_check_failed", jti=jti[:8], error=str(exc))
            return False

    @staticmethod
    async def remove(jti: str, redis) -> None:
        """Explicitly un-blocklist a jti (e.g. in tests)."""
        if redis is None:
            return
        try:
            await redis.delete(TokenBlocklist._key(jti))
        except Exception as exc:
            logger.warning("blocklist_remove_failed", jti=jti[:8], error=str(exc))
