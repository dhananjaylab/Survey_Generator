"""
Rate limiting configuration using slowapi.

Provides IP-based rate limiting with custom handlers and logging.
"""

from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi import Request
from fastapi.responses import JSONResponse
from app.core.logging import get_logger
from app.core.metrics import get_metrics_collector

logger = get_logger(__name__)
metrics = get_metrics_collector()


# Initialize limiter with IP-based key function
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["100/minute"],  # Global default: 100 requests/minute
    storage_uri="memory://",  # Use in-memory storage (can be changed to Redis)
)


def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    """
    Custom handler for rate limit exceeded errors.
    
    Returns JSON response with error message and rate limit info.
    
    Args:
        request: FastAPI request object
        exc: RateLimitExceeded exception
        
    Returns:
        JSON response with 429 status code
    """
    client_ip = request.client.host if request.client else "unknown"
    
    logger.warning(
        "rate_limit_exceeded",
        client_ip=client_ip,
        path=request.url.path,
        method=request.method,
        limit=exc.detail
    )
    
    metrics.record_error("RateLimitExceeded")
    
    return JSONResponse(
        status_code=429,
        content={
            "error": "Rate limit exceeded",
            "detail": exc.detail,
            "retry_after": exc.retry_after if hasattr(exc, 'retry_after') else None
        }
    )


# Rate limit definitions
RATE_LIMITS = {
    "global": "100/minute",
    "generate": "10/minute",
    "login": "5/minute",
    "business_overview": "20/minute",
    "research_objectives": "20/minute",
    "status": "30/minute",
}
