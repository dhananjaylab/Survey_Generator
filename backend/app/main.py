"""
FastAPI application entry point.

Validation fix (Phase 3):
  - metrics.get_stats() corrected to metrics.get_metrics() to match MetricsCollector API
  - RequestLoggingMiddleware added so every request is structured-logged

Phase 1 changes (retained):
  - CORS origins from ALLOWED_ORIGINS env var
  - Shared Redis pool via app.state.redis
  - HTTP security headers via `secure`
  - Sentry init when SENTRY_DSN is set

Phase 3 additions:
  - Observability module initialised at startup (Sentry + OTEL)
"""
import os
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded

import redis.asyncio as aioredis

from app.core.config import settings
from app.core.rate_limit import limiter, rate_limit_exceeded_handler
from app.core.logging import get_logger
from app.core.metrics import get_metrics_collector
from app.core.middleware import RequestLoggingMiddleware

logger  = get_logger(__name__)
metrics = get_metrics_collector()


# ── Lifespan ──────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("app_startup", environment=settings.ENVIRONMENT)

    # Phase 3: initialise observability (Sentry + OTEL)
    from app.core.observability import init_observability
    init_observability(app)

    # Shared Redis pool (used by routes + rate limiter)
    app.state.redis = aioredis.from_url(
        settings.REDIS_URL,
        decode_responses=True,
        max_connections=20,
    )
    logger.info("redis_pool_created", url=settings.REDIS_URL[:30])

    yield

    await app.state.redis.aclose()
    logger.info("redis_pool_closed")
    logger.info("app_shutdown")


# ── App factory ───────────────────────────────────────────────────────────────

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)

# ── Middleware stack (outermost → innermost) ──────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

app.add_middleware(RequestLoggingMiddleware)

logger.info("cors_configured", origins=settings.allowed_origins_list)

try:
    from secure import Secure
    _secure = Secure.with_default_headers()

    @app.middleware("http")
    async def set_secure_headers(request, call_next):
        response = await call_next(request)
        _secure.set_headers(response)
        return response

    logger.info("security_headers_middleware_added")
except ImportError:
    logger.warning("secure_package_not_installed", hint="pip install secure")


# ── Routers ───────────────────────────────────────────────────────────────────

from app.api.v1.router     import router as survey_router
from app.api.v1.auth       import router as auth_router
from app.api.v1.files      import router as files_router
from app.api.v1.websockets import router as ws_router

app.include_router(survey_router)
app.include_router(auth_router)
app.include_router(files_router)
app.include_router(ws_router)


# ── Health endpoints ──────────────────────────────────────────────────────────

_start_time = time.time()


@app.get("/", tags=["Health"])
def root():
    return {
        "message":     f"Welcome to {settings.PROJECT_NAME} API",
        "version":     settings.VERSION,
        "environment": settings.ENVIRONMENT,
    }


@app.get("/health", tags=["Health"])
def health():
    return {"status": "healthy"}


@app.get("/health/detailed", tags=["Health"])
async def health_detailed():
    redis_ok = False
    try:
        await app.state.redis.ping()
        redis_ok = True
    except Exception as exc:
        logger.warning("health_redis_unreachable", error=str(exc))

    uptime_seconds = time.time() - _start_time
    # Validation fix: was get_stats(), correct method is get_metrics()
    m = metrics.get_metrics()

    surveys = m.get("surveys", {})
    return {
        "status":          "healthy" if redis_ok else "degraded",
        "version":         settings.VERSION,
        "environment":     settings.ENVIRONMENT,
        "uptime_seconds":  round(uptime_seconds, 1),
        "redis":           "ok" if redis_ok else "unavailable",
        "surveys_started": surveys.get("started", 0),
        "surveys_done":    surveys.get("completed", 0),
        "surveys_failed":  surveys.get("failed", 0),
        "total_requests":  m.get("total_requests", 0),
        "total_errors":    m.get("errors", {}).get("total", 0),
    }


@app.get("/metrics", tags=["Health"])
def metrics_endpoint():
    return metrics.get_metrics()
