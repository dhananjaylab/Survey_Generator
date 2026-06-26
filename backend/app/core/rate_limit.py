"""
Rate limiting — Redis-backed to share counters across all worker processes.
Falls back to in-memory when USE_REDIS_RATE_LIMIT=false (local dev without Docker).
"""
import os
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi import Request
from fastapi.responses import JSONResponse
from app.core.logging import get_logger
from app.core.metrics import get_metrics_collector

logger = get_logger(__name__)
metrics = get_metrics_collector()

# Redis-backed by default; memory fallback for local dev without Redis
_use_redis = os.getenv("USE_REDIS_RATE_LIMIT", "true").lower() != "false"
_storage_uri = os.getenv("REDIS_URL", "memory://") if _use_redis else "memory://"

limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["100/minute"],
    storage_uri=_storage_uri,
)

logger.info("rate_limiter_initialized", storage=_storage_uri[:30])


def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    """Custom 429 handler with structured logging and metrics."""
    client_ip = request.client.host if request.client else "unknown"
    logger.warning(
        "rate_limit_exceeded",
        client_ip=client_ip,
        path=request.url.path,
        method=request.method,
        limit=exc.detail,
    )
    metrics.record_error("RateLimitExceeded")
    return JSONResponse(
        status_code=429,
        content={
            "error": "Rate limit exceeded",
            "detail": exc.detail,
            "retry_after": getattr(exc, "retry_after", None),
        },
    )
