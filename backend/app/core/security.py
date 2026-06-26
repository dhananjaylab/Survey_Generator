"""
Security utilities: password hashing and JWT token management.

Changes from original:
  - Access token TTL reduced to 1 hour (was 24h)
  - Added refresh token support (72h TTL)
  - Added 'jti' (JWT ID) claim for future token blocklist support
  - Added 'type' claim to distinguish access vs refresh tokens
"""
import uuid
import bcrypt
from datetime import datetime, timedelta, timezone
from typing import Optional, Literal

import jwt
from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS  = 1    # was 24 — refresh token handles long sessions
REFRESH_TOKEN_EXPIRE_HOURS = 72

TokenType = Literal["access", "refresh"]


# ── Password hashing ─────────────────────────────────────────────────────────

def _truncate_password(password: str) -> bytes:
    """Truncate to bcrypt's 72-byte hard limit, respecting UTF-8 boundaries."""
    password_bytes = password.encode("utf-8")
    if len(password_bytes) <= 72:
        return password_bytes
    for length in range(72, max(0, 68), -1):
        try:
            password_bytes[:length].decode("utf-8")
            return password_bytes[:length]
        except UnicodeDecodeError:
            continue
    return password_bytes[:72]


def hash_password(password: str) -> str:
    password_bytes = _truncate_password(password)
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password_bytes, salt).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(
        _truncate_password(password),
        password_hash.encode("utf-8"),
    )


# ── Token creation ────────────────────────────────────────────────────────────

def create_access_token(
    user_id: str,
    expires_delta: Optional[timedelta] = None,
    token_type: TokenType = "access",
) -> str:
    """
    Create a signed JWT.

    Args:
        user_id:       Subject claim value (username).
        expires_delta: Custom expiry — defaults to 1h (access) or 72h (refresh).
        token_type:    'access' or 'refresh'. Stored in the 'type' claim.

    Returns:
        Signed JWT string.
    """
    if expires_delta is None:
        hours = REFRESH_TOKEN_EXPIRE_HOURS if token_type == "refresh" else ACCESS_TOKEN_EXPIRE_HOURS
        expires_delta = timedelta(hours=hours)

    now    = datetime.now(timezone.utc)
    expire = now + expires_delta

    payload = {
        "sub":  user_id,
        "exp":  expire,
        "iat":  now,
        "jti":  str(uuid.uuid4()),   # unique ID — enables per-token revocation
        "type": token_type,
    }

    token = jwt.encode(payload, settings.SECRET_KEY, algorithm=ALGORITHM)
    logger.info(
        "token_created",
        user_id=user_id,
        token_type=token_type,
        expires_at=expire.isoformat(),
    )
    return token


# ── Token validation ──────────────────────────────────────────────────────────

def decode_access_token(
    token: str,
    token_type: TokenType = "access",
) -> Optional[str]:
    """
    Decode and validate a JWT.

    Args:
        token:      Encoded JWT string.
        token_type: Expected type — 'access' or 'refresh'.
                    Tokens of the wrong type are rejected.

    Returns:
        user_id (sub claim) on success, None on any failure.
    """
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])

        user_id: Optional[str] = payload.get("sub")
        if not user_id:
            logger.warning("token_decode_no_sub")
            return None

        if payload.get("type") != token_type:
            logger.warning(
                "token_type_mismatch",
                expected=token_type,
                got=payload.get("type"),
            )
            return None

        logger.info("token_decoded", user_id=user_id, token_type=token_type)
        return user_id

    except jwt.ExpiredSignatureError:
        logger.warning("token_expired")
        return None
    except jwt.InvalidTokenError as exc:
        logger.warning("token_invalid", error=str(exc))
        return None
