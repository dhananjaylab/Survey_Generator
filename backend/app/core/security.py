"""
Security utilities — Phase 3 version.

Phase 3 additions vs the original:
  - decode_token_payload()  — returns raw payload dict without type-check.
                               Needed by core/auth.py and api/v1/auth.py to
                               read the jti claim for blocklist lookups.
  - create_token_pair()     — DRY convenience that returns (access, refresh).

Phase 1 / 2 retained:
  - ACCESS_TOKEN_EXPIRE_HOURS = 1  (was 24 h)
  - REFRESH_TOKEN_EXPIRE_HOURS = 72
  - 'type' claim distinguishes access vs refresh tokens
  - 'jti' (UUID4) claim enables per-token revocation via TokenBlocklist
  - 72-byte-safe bcrypt password truncation
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
ACCESS_TOKEN_EXPIRE_HOURS  = 1
REFRESH_TOKEN_EXPIRE_HOURS = 72

TokenType = Literal["access", "refresh"]


# ── Password hashing ──────────────────────────────────────────────────────────

def _truncate_password(password: str) -> bytes:
    """
    Truncate to bcrypt's 72-byte hard limit, respecting UTF-8 char boundaries.
    Without this, a multi-byte character split across byte 72 produces an
    invalid UTF-8 sequence and raises UnicodeDecodeError inside bcrypt.
    """
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
    return bcrypt.hashpw(_truncate_password(password), bcrypt.gensalt()).decode("utf-8")


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
    Create and sign a JWT.

    Args:
        user_id:       Subject claim ('sub').  Equals username throughout the app.
        expires_delta: Override default TTL.  Defaults to 1 h (access) / 72 h (refresh).
        token_type:    Stored in the 'type' claim; validated on decode.

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
    logger.info("token_created", user_id=user_id, token_type=token_type,
                expires_at=expire.isoformat())
    return token


def create_token_pair(user_id: str) -> tuple[str, str]:
    """
    Convenience wrapper — returns (access_token, refresh_token).

    Used by api/v1/auth.py:
        access, refresh = create_token_pair(user_id)
    """
    return (
        create_access_token(user_id, token_type="access"),
        create_access_token(user_id, token_type="refresh"),
    )


# ── Token decoding ────────────────────────────────────────────────────────────

def decode_token_payload(token: str) -> Optional[dict]:
    """
    Decode a JWT and return its full payload dict.

    Does NOT validate the 'type' claim — use decode_access_token() when you
    need the type check.  This function is used by:
      - core/auth.py      to read jti for blocklist lookup
      - api/v1/auth.py    to read jti + exp before blocklisting on /logout or /refresh

    Returns:
        Payload dict on success, None on expiry or any decode error.
    """
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.ExpiredSignatureError:
        logger.warning("token_expired")
        return None
    except jwt.InvalidTokenError as exc:
        logger.warning("token_invalid", error=str(exc))
        return None


def decode_access_token(
    token: str,
    token_type: TokenType = "access",
) -> Optional[str]:
    """
    Decode and validate a JWT, additionally checking the 'type' claim.

    This is the function used by the WebSocket endpoint (which cannot use the
    HTTP Bearer dependency) and by legacy call sites that only need the user_id.

    Returns:
        user_id (sub claim) on success, None on any failure.
    """
    payload = decode_token_payload(token)
    if payload is None:
        return None

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
