"""JWT Authentication utilities for the Survey Generator API."""

from typing import Optional
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.security import decode_access_token
from app.core.logging import get_logger

logger = get_logger(__name__)

security = HTTPBearer()


def verify_token(request: Request, credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> str:
    """
    Verify JWT token from Authorization header and set user_id in request state.
    
    Args:
        request: FastAPI request object
        credentials: HTTP Bearer credentials from Authorization header
        
    Returns:
        User ID from token
        
    Raises:
        HTTPException: If token is invalid, expired, or missing
    """
    if not credentials:
        logger.warning("token_verification_failed_no_credentials")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authorization credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token = credentials.credentials
    
    # Decode and validate token
    user_id = decode_access_token(token)
    
    if user_id is None:
        logger.warning("token_verification_failed_invalid_token")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Set user_id in request state for downstream use
    request.state.user_id = user_id
    
    logger.info("token_verified_successfully", user_id=user_id)
    return user_id

