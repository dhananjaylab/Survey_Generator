"""
JWT authentication dependencies — Phase 3 update.

Phase 3 addition:
  - verify_token() and get_current_user() check the token's jti against
    the Redis blocklist (populated by /logout and /refresh).
    This closes the window where a stolen access token could be used
    after the user has logged out.

Phase 1 / 2 (retained):
  - HTTPBearer extraction
  - request.state.user_id caching to avoid double-decode per request
"""
from typing import Optional
from datetime import datetime, timezone

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.core.security import decode_access_token, decode_token_payload
from app.core.token_blocklist import TokenBlocklist
from app.core.logging import get_logger

logger = get_logger(__name__)

_security = HTTPBearer(auto_error=False)


def _get_redis(request: Request):
    return getattr(request.app.state, "redis", None)


async def _resolve_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials],
) -> Optional[str]:
    """
    Decode Bearer JWT, validate type and blocklist, return user_id or None.
    Result is cached on request.state so it is only computed once per request.
    """
    if hasattr(request.state, "user_id") and request.state.user_id:
        return request.state.user_id

    if not credentials or credentials.scheme.lower() != "bearer":
        return None

    token = credentials.credentials

    # Decode payload first to get jti (needed for blocklist check)
    payload = decode_token_payload(token)
    if not payload or payload.get("type") != "access":
        return None

    user_id: Optional[str] = payload.get("sub")
    if not user_id:
        return None

    # Phase 3: blocklist check
    jti = payload.get("jti")
    if jti:
        redis = _get_redis(request)
        if await TokenBlocklist.is_blocked(jti, redis):
            logger.warning("access_token_blocklisted", jti=jti[:8])
            return None

    request.state.user_id = user_id
    return user_id


async def verify_token(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_security),
) -> str:
    """Router-level dependency — raises 401 if token is absent/invalid/revoked."""
    user_id = await _resolve_user(request, credentials)
    if not user_id:
        logger.warning("token_verification_failed")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user_id


async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_security),
) -> str:
    """Endpoint-level dependency — returns authenticated user_id."""
    user_id = await _resolve_user(request, credentials)
    if not user_id:
        logger.warning("get_current_user_failed")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user_id
