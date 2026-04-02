"""Public authentication endpoints."""

from fastapi import APIRouter, HTTPException, status, Request, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.models.database import get_db
from app.models.user import User
from app.core.security import hash_password, verify_password, create_access_token
from app.core.rate_limit import limiter
from app.core.logging import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/api/v1/auth", tags=["Auth"])


class RegisterRequest(BaseModel):
    """User registration request."""
    username: str = Field(..., min_length=3, max_length=255, description="Username (3-255 characters)")
    password: str = Field(..., min_length=8, description="Password (minimum 8 characters)")


class LoginRequest(BaseModel):
    """User login request."""
    username: str = Field(..., description="Username")
    password: str = Field(..., description="Password")


class TokenResponse(BaseModel):
    """JWT token response."""
    access_token: str = Field(..., description="JWT access token")
    token_type: str = Field(default="bearer", description="Token type (always 'bearer')")


@router.post(
    "/register",
    response_model=TokenResponse,
    summary="Register New User",
    responses={
        200: {"description": "User registered successfully, JWT token returned"},
        400: {"description": "Invalid request or username already exists"},
        422: {"description": "Validation error (username/password requirements)"},
        429: {"description": "Rate limit exceeded (5 requests/minute per IP)"}
    }
)
@limiter.limit("5/minute")
def register(request: Request, req: RegisterRequest, db: Session = Depends(get_db)):
    """
    Register a new user account.
    
    Creates a new user with hashed password and returns a JWT token for immediate use.
    
    **Rate Limits:**
    - 5 requests/minute per IP address
    
    **Request Body:**
    - `username` (string, required): Username (3-255 characters, must be unique)
    - `password` (string, required): Password (minimum 8 characters)
    
    **Response:**
    - `access_token` (string): JWT token for API authentication
    - `token_type` (string): Always "bearer"
    
    **Error Responses:**
    - 400: Username already exists or invalid input
    - 422: Validation error (username too short/long, password too short)
    - 429: Rate limit exceeded (5 requests/minute per IP)
    
    **Example:**
    ```bash
    curl -X POST "http://localhost:8000/api/v1/auth/register" \\
      -H "Content-Type: application/json" \\
      -d '{
        "username": "newuser",
        "password": "securepassword123"
      }'
    ```
    
    **Security Notes:**
    - Passwords are hashed using bcrypt (never stored in plain text)
    - Usernames must be unique
    - Minimum password length is 8 characters
    - Token expires after 24 hours
    """
    logger.info("user_registration_attempted", username=req.username)
    
    try:
        # Check if user already exists
        existing_user = db.query(User).filter(User.username == req.username).first()
        if existing_user:
            logger.warning("user_registration_failed_username_exists", username=req.username)
            raise HTTPException(
                status_code=400,
                detail="Username already exists"
            )
        
        # Hash password
        password_hash = hash_password(req.password)
        
        # Create new user
        new_user = User(
            username=req.username,
            password_hash=password_hash,
            is_active=True
        )
        
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        logger.info("user_registered_successfully", username=req.username)
        
        # Generate token
        token = create_access_token(user_id=req.username)
        
        return TokenResponse(access_token=token, token_type="bearer")
        
    except IntegrityError:
        db.rollback()
        logger.warning("user_registration_failed_integrity_error", username=req.username)
        raise HTTPException(
            status_code=400,
            detail="Username already exists"
        )
    except Exception as e:
        db.rollback()
        logger.error("user_registration_error", username=req.username, error=str(e))
        raise HTTPException(
            status_code=500,
            detail="Registration failed"
        )


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Get JWT Access Token",
    responses={
        200: {"description": "JWT token generated successfully"},
        401: {"description": "Invalid username or password"},
        422: {"description": "Validation error"},
        429: {"description": "Rate limit exceeded (5 requests/minute per IP)"}
    }
)
@limiter.limit("5/minute")
def login(request: Request, req: LoginRequest, db: Session = Depends(get_db)):
    """
    Authenticate user and obtain JWT access token.
    
    Validates username and password, then returns a JWT token for API authentication.
    
    **Rate Limits:**
    - 5 requests/minute per IP address (prevents brute force attacks)
    
    **Request Body:**
    - `username` (string, required): Username
    - `password` (string, required): Password
    
    **Response:**
    - `access_token` (string): JWT token to use in Authorization header
    - `token_type` (string): Always "bearer"
    
    **Token Usage:**
    Include the token in all subsequent requests:
    ```
    Authorization: Bearer <access_token>
    ```
    
    **Token Expiration:**
    - Tokens expire after 24 hours
    - Request a new token when you receive a 401 Unauthorized response
    
    **Error Responses:**
    - 401: Invalid username or password
    - 429: Rate limit exceeded (5 requests/minute per IP)
    
    **Example:**
    ```bash
    curl -X POST "http://localhost:8000/api/v1/auth/login" \\
      -H "Content-Type: application/json" \\
      -d '{
        "username": "user",
        "password": "password123"
      }'
    ```
    
    **Response Example:**
    ```json
    {
      "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "token_type": "bearer"
    }
    ```
    
    **Security Notes:**
    - Passwords are never logged or stored in plain text
    - Rate limited to prevent brute force attacks
    - Use HTTPS in production
    - Store tokens securely (e.g., in secure HTTP-only cookies)
    """
    logger.info("login_attempt", username=req.username)
    
    try:
        # Find user by username
        user = db.query(User).filter(User.username == req.username).first()
        
        if not user:
            logger.warning("login_failed_user_not_found", username=req.username)
            raise HTTPException(
                status_code=401,
                detail="Invalid username or password"
            )
        
        # Verify password
        if not verify_password(req.password, user.password_hash):
            logger.warning("login_failed_invalid_password", username=req.username)
            raise HTTPException(
                status_code=401,
                detail="Invalid username or password"
            )
        
        # Check if user is active
        if not user.is_active:
            logger.warning("login_failed_user_inactive", username=req.username)
            raise HTTPException(
                status_code=401,
                detail="User account is inactive"
            )
        
        # Generate token
        token = create_access_token(user_id=req.username)
        logger.info("login_successful", username=req.username)
        
        return TokenResponse(access_token=token, token_type="bearer")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("login_error", username=req.username, error=str(e))
        raise HTTPException(
            status_code=500,
            detail="Login failed"
        )
