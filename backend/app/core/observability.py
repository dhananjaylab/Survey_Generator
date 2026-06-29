"""
Observability initialisation — Phase 3.

Wires up:
  1. Sentry (error tracking, performance monitoring, Celery + SQLAlchemy integrations)
  2. OpenTelemetry (distributed tracing) with OTLP gRPC export

Both are no-ops when the corresponding env var is unset, so local dev
requires zero extra infrastructure.

Called once from main.py lifespan:
    from app.core.observability import init_observability
    init_observability(app)
"""
import os
from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


def _init_sentry() -> bool:
    """Initialise Sentry SDK. Returns True if initialised."""
    if not settings.SENTRY_DSN:
        logger.info("sentry_disabled", reason="SENTRY_DSN not set")
        return False

    try:
        import sentry_sdk
        from sentry_sdk.integrations.fastapi import FastApiIntegration
        from sentry_sdk.integrations.starlette import StarletteIntegration
        from sentry_sdk.integrations.celery import CeleryIntegration
        from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
        from sentry_sdk.integrations.redis import RedisIntegration
        from sentry_sdk.integrations.logging import LoggingIntegration
        import logging

        sentry_sdk.init(
            dsn=settings.SENTRY_DSN,
            environment=settings.ENVIRONMENT,
            release=os.getenv("GIT_SHA", "unknown"),

            # Integrations
            integrations=[
                StarletteIntegration(transaction_style="endpoint"),
                FastApiIntegration(transaction_style="endpoint"),
                CeleryIntegration(monitor_beat_tasks=True),
                SqlalchemyIntegration(),
                RedisIntegration(),
                LoggingIntegration(
                    level=logging.WARNING,     # breadcrumb level
                    event_level=logging.ERROR, # send as event
                ),
            ],

            # Performance — 10% of requests traced in production
            traces_sample_rate=0.1 if settings.ENVIRONMENT == "production" else 1.0,

            # Profiles — subset of traced transactions
            profiles_sample_rate=0.1 if settings.ENVIRONMENT == "production" else 0.0,

            # PII scrubbing
            send_default_pii=False,
        )
        logger.info("sentry_initialized", environment=settings.ENVIRONMENT)
        return True

    except ImportError:
        logger.warning(
            "sentry_not_installed",
            hint="pip install 'sentry-sdk[fastapi,celery,sqlalchemy,redis]'",
        )
        return False
    except Exception as exc:
        logger.error("sentry_init_failed", error=str(exc))
        return False


def _init_otel(app) -> bool:
    """Initialise OpenTelemetry with OTLP gRPC export. Returns True if initialised."""
    if not settings.OTEL_ENDPOINT:
        logger.info("otel_disabled", reason="OTEL_ENDPOINT not set")
        return False

    try:
        from opentelemetry import trace
        from opentelemetry.sdk.trace import TracerProvider
        from opentelemetry.sdk.trace.export import BatchSpanProcessor
        from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
        from opentelemetry.sdk.resources import Resource, SERVICE_NAME
        from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
        from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
        from opentelemetry.instrumentation.celery import CeleryInstrumentor
        from opentelemetry.instrumentation.redis import RedisInstrumentor

        resource = Resource.create({SERVICE_NAME: settings.OTEL_SERVICE_NAME})
        provider = TracerProvider(resource=resource)

        exporter = OTLPSpanExporter(endpoint=settings.OTEL_ENDPOINT, insecure=True)
        provider.add_span_processor(BatchSpanProcessor(exporter))

        trace.set_tracer_provider(provider)

        # Auto-instrument frameworks
        FastAPIInstrumentor.instrument_app(app)
        SQLAlchemyInstrumentor().instrument()
        CeleryInstrumentor().instrument()
        RedisInstrumentor().instrument()

        logger.info(
            "otel_initialized",
            endpoint=settings.OTEL_ENDPOINT,
            service=settings.OTEL_SERVICE_NAME,
        )
        return True

    except ImportError:
        logger.warning(
            "otel_not_installed",
            hint=(
                "pip install opentelemetry-sdk "
                "opentelemetry-instrumentation-fastapi "
                "opentelemetry-instrumentation-sqlalchemy "
                "opentelemetry-instrumentation-celery "
                "opentelemetry-instrumentation-redis "
                "opentelemetry-exporter-otlp-proto-grpc"
            ),
        )
        return False
    except Exception as exc:
        logger.error("otel_init_failed", error=str(exc))
        return False


def init_observability(app) -> None:
    """Entry point called from main.py lifespan."""
    _init_sentry()
    _init_otel(app)
