"""
JWT authentication dependencies for FastAPI route protection.

Two dependency functions are provided:

  verify_token   — Used as a router-level dependency (no return value needed).
                   Applied to all survey, file, and WebSocket routers.

  get_current_user — Used when an endpoint needs to know which user is calling.
                     Returns the user_id string (== username) from the JWT.

Both validate the token via decode_access_token() from core.security.
"""
from typing import Optional

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.core.security import decode_access_token
from app.core.logging import get_logger

logger = get_logger(__name__)

_security = HTTPBearer(auto_error=False)


def _extract_user_id(
    credentials: Optional[HTTPAuthorizationCredentials],
) -> Optional[str]:
    """Decode the Bearer JWT and return the user_id, or None on failure."""
    if not credentials or credentials.scheme.lower() != "bearer":
        return None
    return decode_access_token(credentials.credentials, token_type="access")


def verify_token(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_security),
) -> str:
    """
    FastAPI dependency — verifies the JWT and stores user_id in request.state.

    Raises 401 if the token is absent, expired, or malformed.
    Intended for use as a router-level dependency:

        router = APIRouter(dependencies=[Depends(verify_token)])
    """
    user_id = _extract_user_id(credentials)
    if not user_id:
        logger.warning("token_verification_failed")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    request.state.user_id = user_id
    return user_id


def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_security),
) -> str:
    """
    FastAPI dependency — returns the authenticated user_id.

    Use in endpoint signatures when you need to know the caller:

        @router.get("/surveys/")
        async def list_surveys(current_user: str = Depends(get_current_user)):
            ...

    Raises 401 on failure (same as verify_token).
    """
    # If verify_token already ran (router-level dep), re-use its stored value
    # to avoid decoding the JWT twice.
    if hasattr(request.state, "user_id") and request.state.user_id:
        return request.state.user_id

    user_id = _extract_user_id(credentials)
    if not user_id:
        logger.warning("get_current_user_failed")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    request.state.user_id = user_id
    return user_id
