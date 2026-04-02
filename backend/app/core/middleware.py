"""
FastAPI middleware for request logging and metrics collection.
"""

import time
from typing import Callable
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
from app.core.logging import get_logger

logger = get_logger(__name__)


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """
    Middleware to log all HTTP requests with structured logging.
    
    Logs:
    - HTTP method
    - Path
    - Status code
    - Request duration (ms)
    - Request ID (if available)
    """
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """
        Process request and log details.
        
        Args:
            request: FastAPI request object
            call_next: Next middleware/handler
            
        Returns:
            Response from handler
        """
        # Extract request ID from headers or generate one
        request_id = request.headers.get("X-Request-ID", request.headers.get("request-id", ""))
        
        # Record start time
        start_time = time.time()
        
        # Extract relevant request info
        method = request.method
        path = request.url.path
        
        # Log request start
        logger.info(
            "http_request_started",
            request_id=request_id,
            method=method,
            path=path,
            client_ip=request.client.host if request.client else "unknown"
        )
        
        try:
            # Call next middleware/handler
            response = await call_next(request)
            
            # Calculate duration
            duration_ms = (time.time() - start_time) * 1000
            
            # Record metrics
            from app.core.metrics import get_metrics_collector
            metrics = get_metrics_collector()
            metrics.record_request(method, response.status_code)
            
            # Log request completion
            logger.info(
                "http_request_completed",
                request_id=request_id,
                method=method,
                path=path,
                status_code=response.status_code,
                duration_ms=round(duration_ms, 2)
            )
            
            return response
            
        except Exception as e:
            # Calculate duration
            duration_ms = (time.time() - start_time) * 1000
            
            # Record error metrics
            from app.core.metrics import get_metrics_collector
            metrics = get_metrics_collector()
            metrics.record_error(type(e).__name__)
            
            # Log request error
            logger.error(
                "http_request_failed",
                request_id=request_id,
                method=method,
                path=path,
                error=str(e),
                duration_ms=round(duration_ms, 2)
            )
            
            raise
