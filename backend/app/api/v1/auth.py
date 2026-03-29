"""Public authentication endpoints."""

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from app.core.auth import create_user_token

router = APIRouter(prefix="/api/v1/auth", tags=["Auth"])

class TokenRequest(BaseModel):
    username: str = "default"
    password: str = "default"

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

@router.post("/login", response_model=TokenResponse)
def login(request: TokenRequest):
    """
    Get a JWT access token (public endpoint - no auth required).
    For now, accepts any username/password combination.
    """
    # You can add actual user validation here if needed
    token = create_user_token(user_id=request.username)
    return TokenResponse(access_token=token, token_type="bearer")
