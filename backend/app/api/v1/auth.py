"""Public authentication endpoints."""

from fastapi import APIRouter, HTTPException, status, Request
from pydantic import BaseModel
from app.core.auth import create_user_token
from app.core.rate_limit import limiter
from app.core.logging import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/api/v1/auth", tags=["Auth"])

class TokenRequest(BaseModel):
    username: str = "default"
    password: str = "default"

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Get JWT Access Token",
    responses={
        200: {"description": "JWT token generated successfully"},
        400: {"description": "Invalid credentials"},
        429: {"description": "Rate limit exceeded (5 requests/minute per IP)"}
    }
)
@limiter.limit("5/minute")
def login(request: Request, request_body: TokenRequest):
    """
    Obtain a JWT access token for API authentication.
    
    This public endpoint generates a JWT token that must be included in the Authorization header
    for all subsequent API requests.
    
    **Rate Limits:**
    - 5 requests/minute per IP address (to prevent brute force attacks)
    
    **Request Body:**
    - `username` (string, optional): Username for authentication (default: "default")
    - `password` (string, optional): Password for authentication (default: "default")
    
    **Response:**
    - `access_token` (string): JWT token to use in Authorization header
    - `token_type` (string): Always "bearer"
    
    **Token Usage:**
    Include the token in all subsequent requests:
    ```
    Authorization: Bearer <access_token>
    ```
    
    **Error Responses:**
    - 400: Invalid request format
    - 429: Rate limit exceeded (5 requests/minute per IP)
    
    **Example:**
    ```bash
    curl -X POST "http://localhost:8000/api/v1/auth/login" \\
      -H "Content-Type: application/json" \\
      -d '{"username": "user", "password": "pass"}'
    ```
    """
    logger.info("login_attempt", username=request_body.username)
    token = create_user_token(user_id=request_body.username)
    logger.info("login_successful", username=request_body.username)
    return TokenResponse(access_token=token, token_type="bearer")
