"""
FastAPI application entry point.

Changes from original:
  - CORS origins loaded from ALLOWED_ORIGINS env var (no hardcoded localhost list)
  - HTTP security headers via `secure` middleware
  - Shared Redis connection pool created at startup, closed at shutdown
  - Sentry SDK initialised when SENTRY_DSN is set
  - Detailed /health/detailed endpoint
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

logger  = get_logger(__name__)
metrics = get_metrics_collector()

# ── Optional Sentry (Phase 3 — remove the `if` guard when SENTRY_DSN is set) ──
if settings.SENTRY_DSN:
    import sentry_sdk
    from sentry_sdk.integrations.fastapi import FastApiIntegration
    from sentry_sdk.integrations.celery import CeleryIntegration
    from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration

    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        integrations=[FastApiIntegration(), CeleryIntegration(), SqlalchemyIntegration()],
        traces_sample_rate=0.1,
        environment=settings.ENVIRONMENT,
        release=os.getenv("GIT_SHA", "unknown"),
    )
    logger.info("sentry_initialized", dsn=settings.SENTRY_DSN[:20] + "...")


# ── Application lifespan (startup / shutdown) ─────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("app_startup", environment=settings.ENVIRONMENT)

    app.state.redis = aioredis.from_url(
        settings.REDIS_URL,
        decode_responses=True,
        max_connections=20,
    )
    logger.info("redis_pool_created", url=settings.REDIS_URL[:30])

    yield

    # Shutdown
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

# Rate limiter state
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)


# ── CORS ──────────────────────────────────────────────────────────────────────
# Origins are read from the ALLOWED_ORIGINS environment variable.
# Set it to a comma-separated list of production domains before deploying.

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

logger.info("cors_configured", origins=settings.allowed_origins_list)


# ── HTTP security headers ─────────────────────────────────────────────────────
try:
    from secure import Secure

    _secure = Secure.with_default_headers()

    @app.middleware("http")
    async def set_secure_headers(request, call_next):
        response = await call_next(request)
        _secure.framework.fastapi(response)
        return response

    logger.info("security_headers_middleware_added")

except ImportError:
    logger.warning("secure_package_not_installed", hint="pip install secure")


# ── Routers ───────────────────────────────────────────────────────────────────
from app.api.v1.router    import router as survey_router
from app.api.v1.auth      import router as auth_router
from app.api.v1.files     import router as files_router
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
        "message": f"Welcome to {settings.PROJECT_NAME} API",
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
    }


@app.get("/health", tags=["Health"])
def health():
    return {"status": "healthy"}


@app.get("/health/detailed", tags=["Health"])
async def health_detailed():
    """Extended health check — tests Redis connectivity."""
    redis_ok = False
    try:
        await app.state.redis.ping()
        redis_ok = True
    except Exception as exc:
        logger.warning("health_redis_unreachable", error=str(exc))

    uptime_seconds = time.time() - _start_time
    m = metrics.get_stats()

    return {
        "status":          "healthy" if redis_ok else "degraded",
        "version":         settings.VERSION,
        "environment":     settings.ENVIRONMENT,
        "uptime_seconds":  round(uptime_seconds, 1),
        "redis":           "ok" if redis_ok else "unavailable",
        "surveys_started": m.get("surveys_started", 0),
        "surveys_done":    m.get("surveys_completed", 0),
        "surveys_failed":  m.get("surveys_failed", 0),
        "total_requests":  m.get("total_requests", 0),
        "total_errors":    m.get("total_errors", 0),
    }


@app.get("/metrics", tags=["Health"])
def metrics_endpoint():
    return metrics.get_stats()
