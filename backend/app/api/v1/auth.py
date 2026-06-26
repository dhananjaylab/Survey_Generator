"""Public authentication endpoints."""
from fastapi import APIRouter, HTTPException, status, Request, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.models.database import get_db
from app.models.user import User
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    decode_access_token,
)
from app.core.rate_limit import limiter
from app.core.logging import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/api/v1/auth", tags=["Auth"])


# ── Request / response models ─────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=255)
    password: str = Field(..., min_length=8)


class LoginRequest(BaseModel):
    username: str = Field(...)
    password: str = Field(...)


class RefreshRequest(BaseModel):
    refresh_token: str = Field(..., description="Valid refresh token")


class TokenResponse(BaseModel):
    """Returned by login, register, and refresh endpoints."""
    access_token:  str = Field(..., description="Short-lived JWT (1 hour)")
    refresh_token: str = Field(..., description="Long-lived JWT (72 hours)")
    token_type:    str = Field(default="bearer")


# ── Helpers ───────────────────────────────────────────────────────────────────

def _make_token_pair(user_id: str) -> TokenResponse:
    """Create a fresh access + refresh token pair for the given user."""
    return TokenResponse(
        access_token=create_access_token(user_id=user_id, token_type="access"),
        refresh_token=create_access_token(user_id=user_id, token_type="refresh"),
    )


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post(
    "/register",
    response_model=TokenResponse,
    summary="Register New User",
    responses={
        200: {"description": "Registered successfully — token pair returned"},
        400: {"description": "Username already exists"},
        429: {"description": "Rate limit exceeded (5/minute)"},
    },
)
@limiter.limit("5/minute")
def register(
    request: Request,
    req: RegisterRequest,
    db: Session = Depends(get_db),
) -> TokenResponse:
    """Create a new account and return a token pair for immediate use."""
    logger.info("user_registration_attempted", username=req.username)

    try:
        if db.query(User).filter(User.username == req.username).first():
            logger.warning("registration_username_taken", username=req.username)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already exists",
            )

        new_user = User(
            username=req.username,
            password_hash=hash_password(req.password),
            is_active=True,
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        logger.info("user_registered", username=req.username)
        return _make_token_pair(req.username)

    except IntegrityError:
        db.rollback()
        logger.warning("registration_integrity_error", username=req.username)
        raise HTTPException(status_code=400, detail="Username already exists")

    except HTTPException:
        raise

    except Exception as exc:
        db.rollback()
        logger.error("registration_error", username=req.username, error=str(exc))
        raise HTTPException(status_code=500, detail="Registration failed")


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Obtain Token Pair",
    responses={
        200: {"description": "Token pair returned"},
        401: {"description": "Invalid credentials"},
        429: {"description": "Rate limit exceeded (5/minute)"},
    },
)
@limiter.limit("5/minute")
def login(
    request: Request,
    req: LoginRequest,
    db: Session = Depends(get_db),
) -> TokenResponse:
    """
    Authenticate and return access + refresh tokens.

    Include the access_token in subsequent requests:
        Authorization: Bearer <access_token>

    When the access_token expires (1 hour), call /auth/refresh with
    the refresh_token to obtain a new pair without re-entering credentials.
    """
    logger.info("login_attempt", username=req.username)

    try:
        user = db.query(User).filter(User.username == req.username).first()

        if not user:
            logger.warning("login_user_not_found", username=req.username)
            raise HTTPException(status_code=401, detail="Invalid username or password")

        if not verify_password(req.password, user.password_hash):
            logger.warning("login_invalid_password", username=req.username)
            raise HTTPException(status_code=401, detail="Invalid username or password")

        if not user.is_active:
            logger.warning("login_inactive_user", username=req.username)
            raise HTTPException(status_code=401, detail="User account is inactive")

        logger.info("login_successful", username=req.username)
        return _make_token_pair(req.username)

    except HTTPException:
        raise

    except Exception as exc:
        logger.error("login_error", username=req.username, error=str(exc))
        raise HTTPException(status_code=500, detail="Login failed")


@router.post(
    "/refresh",
    response_model=TokenResponse,
    summary="Refresh Token Pair",
    responses={
        200: {"description": "New token pair returned"},
        401: {"description": "Invalid or expired refresh token"},
        429: {"description": "Rate limit exceeded (10/minute)"},
    },
)
@limiter.limit("10/minute")
def refresh(request: Request, req: RefreshRequest) -> TokenResponse:
    """
    Exchange a valid refresh_token for a new access + refresh token pair.

    The previous refresh_token is implicitly invalidated by the client
    replacing it with the new one.  A token blocklist (Phase 3) will
    make this invalidation server-side.
    """
    logger.info("token_refresh_requested")

    user_id = decode_access_token(req.refresh_token, token_type="refresh")
    if not user_id:
        logger.warning("token_refresh_invalid")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )

    logger.info("tokens_refreshed", user_id=user_id)
    return _make_token_pair(user_id)
