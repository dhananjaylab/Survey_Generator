"""
Security utilities for password hashing and JWT token management.
"""

import bcrypt
from datetime import datetime, timedelta, timezone
from typing import Optional
import jwt
from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

def _truncate_password(password: str) -> bytes:
    """
    Truncate password to 72 bytes (bcrypt's hard limit) and return as bytes.
    
    Handles UTF-8 multi-byte characters properly by finding a valid
    UTF-8 boundary within the 72-byte limit.
    
    Args:
        password: Plain text password
        
    Returns:
        Truncated password as bytes (≤72 bytes)
    """
    password_bytes = password.encode('utf-8')
    
    if len(password_bytes) <= 72:
        return password_bytes
    
    # Truncate to 72 bytes, handling UTF-8 boundaries
    for length in range(72, max(0, 72 - 4), -1):  # UTF-8 chars are max 4 bytes
        try:
            password_bytes[:length].decode('utf-8')
            return password_bytes[:length]
        except UnicodeDecodeError:
            continue
    
    # Fallback: use first 72 bytes
    return password_bytes[:72]

# JWT configuration
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24


def hash_password(password: str) -> str:
    """
    Hash a plain text password using bcrypt.
    
    Bcrypt has a hard limit of 72 bytes. This function truncates passwords
    to 72 bytes (UTF-8 encoded) before hashing to prevent bcrypt errors
    while maintaining backward compatibility for passwords ≤72 bytes.
    
    Args:
        password: Plain text password to hash
        
    Returns:
        Hashed password string
    """
    password_bytes = _truncate_password(password)
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode('utf-8')


def verify_password(password: str, password_hash: str) -> bool:
    """
    Verify a plain text password against a bcrypt hash.
    
    Applies the same 72-byte truncation as hash_password() to ensure
    consistency between registration and login flows.
    
    Args:
        password: Plain text password to verify
        password_hash: Bcrypt hash to verify against
        
    Returns:
        True if password matches hash, False otherwise
    """
    password_bytes = _truncate_password(password)
    hash_bytes = password_hash.encode('utf-8')
    return bcrypt.checkpw(password_bytes, hash_bytes)


def create_access_token(user_id: str, expires_delta: Optional[timedelta] = None) -> str:
    """
    Create a JWT access token with expiration.
    
    Args:
        user_id: User identifier to encode in token
        expires_delta: Optional custom expiration time (default: 24 hours)
        
    Returns:
        JWT token string
    """
    if expires_delta is None:
        expires_delta = timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    
    expire = datetime.now(timezone.utc) + expires_delta
    
    payload = {
        "sub": user_id,
        "exp": expire,
        "iat": datetime.now(timezone.utc)
    }
    
    token = jwt.encode(payload, settings.SECRET_KEY, algorithm=ALGORITHM)
    logger.info("access_token_created", user_id=user_id, expires_at=expire.isoformat())
    
    return token


def decode_access_token(token: str) -> Optional[str]:
    """
    Decode and validate a JWT access token.
    
    Args:
        token: JWT token string to decode
        
    Returns:
        User ID if token is valid, None if invalid or expired
    """
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        
        if user_id is None:
            logger.warning("token_decode_failed_no_sub")
            return None
        
        logger.info("token_decoded_successfully", user_id=user_id)
        return user_id
        
    except jwt.ExpiredSignatureError:
        logger.warning("token_expired")
        return None
    except jwt.InvalidTokenError as e:
        logger.warning("token_invalid", error=str(e))
        return None
