"""
Authentication endpoints — Phase 3 update.

Phase 3 additions (additive only — existing endpoints unchanged):
  - POST /api/v1/auth/logout  — server-side token revocation via jti blocklist
  - /refresh  — old refresh token's jti is blocklisted before issuing new pair,
                preventing replay attacks if a leaked refresh token is used later.

Phase 1 / 2 (retained):
  - /register, /login  — unchanged
  - TokenResponse      — unchanged (access_token, refresh_token, token_type)
"""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.models.database import get_db
from app.models.user import User
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    decode_access_token,
    decode_token_payload,
)
from app.core.token_blocklist import TokenBlocklist
from app.core.rate_limit import limiter
from app.core.logging import get_logger
from sqlalchemy.exc import IntegrityError

logger = get_logger(__name__)

router = APIRouter(prefix="/api/v1/auth", tags=["Auth"])


# ── Models ────────────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=255)
    password: str = Field(..., min_length=8)


class LoginRequest(BaseModel):
    username: str
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


class LogoutRequest(BaseModel):
    """Phase 3: client submits its refresh token so we can blocklist it."""
    refresh_token: str


class TokenResponse(BaseModel):
    access_token:  str = Field(..., description="Short-lived JWT (1 hour)")
    refresh_token: str = Field(..., description="Long-lived JWT (72 hours)")
    token_type:    str = Field(default="bearer")


# ── Helpers ───────────────────────────────────────────────────────────────────

def _make_token_pair(user_id: str) -> TokenResponse:
    return TokenResponse(
        access_token=create_access_token(user_id=user_id, token_type="access"),
        refresh_token=create_access_token(user_id=user_id, token_type="refresh"),
    )


def _get_redis(request: Request):
    return getattr(request.app.state, "redis", None)


# ── /register ─────────────────────────────────────────────────────────────────

@router.post("/register", response_model=TokenResponse)
@limiter.limit("5/minute")
def register(
    request: Request,
    req: RegisterRequest,
    db: Session = Depends(get_db),
) -> TokenResponse:
    logger.info("user_registration_attempted", username=req.username)
    try:
        if db.query(User).filter(User.username == req.username).first():
            raise HTTPException(status_code=400, detail="Username already exists")

        new_user = User(
            username=req.username,
            password_hash=hash_password(req.password),
            is_active=True,
        )
        db.add(new_user)
        db.commit()
        logger.info("user_registered", username=req.username)
        return _make_token_pair(req.username)

    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Username already exists")
    except HTTPException:
        raise
    except Exception as exc:
        db.rollback()
        logger.error("registration_error", error=str(exc))
        raise HTTPException(status_code=500, detail="Registration failed")


# ── /login ────────────────────────────────────────────────────────────────────

@router.post("/login", response_model=TokenResponse)
@limiter.limit("5/minute")
def login(
    request: Request,
    req: LoginRequest,
    db: Session = Depends(get_db),
) -> TokenResponse:
    logger.info("login_attempt", username=req.username)
    try:
        user = db.query(User).filter(User.username == req.username).first()
        if not user or not verify_password(req.password, user.password_hash):
            raise HTTPException(status_code=401, detail="Invalid username or password")
        if not user.is_active:
            raise HTTPException(status_code=401, detail="User account is inactive")

        logger.info("login_successful", username=req.username)
        return _make_token_pair(req.username)

    except HTTPException:
        raise
    except Exception as exc:
        logger.error("login_error", error=str(exc))
        raise HTTPException(status_code=500, detail="Login failed")


# ── /refresh ──────────────────────────────────────────────────────────────────

@router.post("/refresh", response_model=TokenResponse)
@limiter.limit("10/minute")
async def refresh(
    request: Request,
    req: RefreshRequest,
) -> TokenResponse:
    """
    Exchange a valid refresh token for a new access + refresh pair.

    Phase 3: The old refresh token's jti is blocklisted so it cannot
    be replayed even if it hasn't expired yet.
    """
    logger.info("token_refresh_requested")

    payload = decode_token_payload(req.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

    user_id = payload.get("sub")
    jti     = payload.get("jti")
    exp     = payload.get("exp")

    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")

    # Phase 3: check blocklist before issuing new pair
    redis = _get_redis(request)
    if jti and await TokenBlocklist.is_blocked(jti, redis):
        logger.warning("refresh_token_already_revoked", jti=jti[:8])
        raise HTTPException(status_code=401, detail="Refresh token has been revoked")

    # Phase 3: blocklist the consumed refresh token
    if jti and exp and redis:
        expires_at = datetime.fromtimestamp(exp, tz=timezone.utc)
        await TokenBlocklist.add(jti, expires_at, redis)

    logger.info("tokens_refreshed", user_id=user_id)
    return _make_token_pair(user_id)


# ── /logout (Phase 3 — new) ───────────────────────────────────────────────────

@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("20/minute")
async def logout(
    request: Request,
    req: LogoutRequest,
) -> None:
    """
    Server-side logout — revokes the submitted refresh token.

    The client must also delete its locally-stored access token.
    Access tokens are short-lived (1 hour) and are not individually
    blocklisted here for performance reasons; they expire naturally.

    If the access token TTL is a concern, pass it as `access_token`
    and blocklist it too (extend LogoutRequest to include it).
    """
    logger.info("logout_requested")

    payload = decode_token_payload(req.refresh_token)
    if not payload:
        # Token is already expired / invalid — treat as already logged out
        return

    jti = payload.get("jti")
    exp = payload.get("exp")

    if jti and exp:
        redis = _get_redis(request)
        expires_at = datetime.fromtimestamp(exp, tz=timezone.utc)
        await TokenBlocklist.add(jti, expires_at, redis)
        logger.info("logout_token_revoked", jti=jti[:8])
