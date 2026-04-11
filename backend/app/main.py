import logging
import asyncio
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi
from app.core.config import settings
from app.core.logging import configure_logging, get_logger
from app.core.middleware import RequestLoggingMiddleware
from app.core.metrics import get_metrics_collector
from app.core.rate_limit import limiter, rate_limit_exceeded_handler
from app.core.auth import verify_token
from slowapi.errors import RateLimitExceeded
from app.api.v1 import router, files, websockets, auth
from app.models.database import engine, Base
import redis.asyncio as aioredis

# Configure structured logging
configure_logging(log_level=settings.LOGGING_LEVEL)
logger = get_logger(__name__)

# Initialize metrics
metrics = get_metrics_collector()

# Initialize DB
logger.info("database_initialization_started", database_url=settings.DATABASE_URL)
Base.metadata.create_all(bind=engine)
logger.info("database_initialization_completed")

description = """
# AI Survey Generator API

## Features

### 🤖 AI-Powered Survey Generation
- **Intelligent Survey Creation**: Automatically generate comprehensive surveys using advanced LLMs (GPT-4, Gemini)
- **Business Overview Analysis**: Extract key business context and objectives
- **Research Objective Synthesis**: Generate focused research objectives from business context
- **Dynamic Question Generation**: Create contextually relevant survey questions
- **Smart Choice Generation**: Automatically generate answer choices for multiple choice questions
- **Batch Processing**: Efficiently process multiple questions in parallel

### 📡 Real-Time Progress Tracking
- **WebSocket Support**: Real-time progress updates during survey generation
- **Streaming Responses**: Monitor generation progress as it happens
- **Status Polling**: Alternative REST endpoints for status checks

### 📄 Document Export
- **DOCX Generation**: Export surveys as formatted Word documents
- **Template Support**: Customizable document templates
- **Cloud Storage**: Automatic upload to R2/S3 storage

### 🔐 Security & Authentication
- **JWT Bearer Tokens**: Secure API access with JWT authentication
- **Basic Auth Support**: Alternative authentication method for development
- **CORS Protection**: Configured cross-origin resource sharing

## Authentication

All protected endpoints require a JWT Bearer token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

### Getting a Token
1. Use the `/api/v1/auth/login` endpoint with credentials
2. Include the returned token in subsequent requests
3. Tokens expire after 24 hours (configurable)

### Example Request
```bash
curl -H "Authorization: Bearer eyJhbGc..." \\
  https://api.example.com/api/v1/surveys
```

## Rate Limits

- **Default Rate Limit**: 100 requests per minute per IP
- **Authenticated Users**: 1000 requests per minute
- **Batch Operations**: 10 concurrent requests maximum
- **WebSocket Connections**: 5 concurrent connections per user

Rate limit headers are included in all responses:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Requests remaining in current window
- `X-RateLimit-Reset`: Unix timestamp when limit resets

## API Endpoints

### Survey Generation
- `POST /api/v1/surveys/business-overview` - Generate business overview
- `POST /api/v1/surveys/research-objectives` - Generate research objectives
- `POST /api/v1/surveys/generate` - Generate complete survey
- `GET /api/v1/surveys/{request_id}/status` - Check generation status

### File Management
- `GET /api/v1/files/{request_id}` - Download generated survey
- `DELETE /api/v1/files/{request_id}` - Delete survey file

### WebSocket
- `WS /ws/survey/{request_id}` - Real-time progress updates

### Health
- `GET /health` - Basic health check
- `GET /health/detailed` - Detailed system status

## Error Handling

All errors return standard JSON format:
```json
{
  "detail": "Error message",
  "error_code": "ERROR_CODE",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

## Support

For issues or questions, contact: support@example.com
"""

import os

is_development = os.getenv("ENVIRONMENT", "").lower() == "development"

app = FastAPI(
    title="AI Survey Generator API",
    description=description,
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

# Add rate limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)

# Add request logging middleware
app.add_middleware(RequestLoggingMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "http://localhost:5173",  # Default Vite port
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)


def custom_openapi():
    """
    Custom OpenAPI schema with JWT Bearer authentication.
    
    Adds security scheme and applies it globally to all endpoints
    except /api/v1/auth/login and /api/v1/auth/register.
    """
    if app.openapi_schema:
        return app.openapi_schema
    
    openapi_schema = get_openapi(
        title="AI Survey Generator API",
        version="1.0.0",
        description=description,
        routes=app.routes,
    )
    
    # Add JWT Bearer security scheme
    openapi_schema["components"]["securitySchemes"] = {
        "BearerAuth": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
            "description": "JWT Bearer token for API authentication. Obtain a token from /api/v1/auth/login"
        }
    }
    
    # Apply security globally to all endpoints except login and register
    public_endpoints = [
        "/api/v1/auth/login",
        "/api/v1/auth/register",
        "/health",
        "/health/detailed",
        "/metrics",
        "/"
    ]
    
    for path, path_item in openapi_schema.get("paths", {}).items():
        # Skip public endpoints
        if path in public_endpoints:
            continue
        
        # Apply security to all methods in this path
        for method in path_item:
            if method in ["get", "post", "put", "delete", "patch", "options", "head", "trace"]:
                if method in path_item:
                    path_item[method]["security"] = [{"BearerAuth": []}]
    
    app.openapi_schema = openapi_schema
    return app.openapi_schema


# Set custom OpenAPI schema
app.openapi = custom_openapi

app.include_router(router.router)
app.include_router(files.router)
app.include_router(websockets.router)
app.include_router(auth.router)

@app.get("/")
def health_check():
    logger.info("health_check_basic")
    return {"status": "ok", "message": "Survey API is running."}

@app.get("/metrics")
def get_metrics():
    """
    Get application metrics.
    
    Returns:
    - uptime (seconds, minutes, hours)
    - total request count
    - requests by HTTP method
    - requests by status code
    - survey generation metrics (started, completed, failed, success rate)
    - error metrics (total, by type)
    
    This endpoint is extensible for Prometheus integration.
    """
    logger.info("metrics_endpoint_accessed")
    return metrics.get_metrics()

@app.get("/health/detailed")
async def detailed_health_check():
    """Detailed health check including Redis and Celery status."""
    logger.info("health_check_detailed_started")
    
    health_status = {
        "api": "ok",
        "database": "unknown",
        "redis": "unknown",
        "celery": "unknown"
    }
    
    # Check Redis
    try:
        redis_conn = await asyncio.wait_for(
            aioredis.from_url(settings.REDIS_URL, decode_responses=True),
            timeout=2.0
        )
        await redis_conn.ping()
        await redis_conn.close()
        health_status["redis"] = "ok"
        logger.info("redis_health_check_passed")
    except Exception as e:
        health_status["redis"] = f"error: {str(e)}"
        logger.warning("redis_health_check_failed", error=str(e))
    
    # Check Celery
    try:
        from app.core.celery import celery_app
        from celery.exceptions import TimeoutError as CeleryTimeoutError
        
        # Try to inspect active workers
        inspect = celery_app.control.inspect(timeout=2)
        active_workers = inspect.active()
        
        if active_workers is None or len(active_workers) == 0:
            health_status["celery"] = "warning: no active workers"
            logger.warning("celery_health_check_no_workers")
        else:
            health_status["celery"] = "ok"
            logger.info("celery_health_check_passed", worker_count=len(active_workers))
    except Exception as e:
        health_status["celery"] = f"error: {str(e)}"
        logger.warning("celery_health_check_failed", error=str(e))
    
    logger.info("health_check_detailed_completed", status=health_status)
    return health_status
