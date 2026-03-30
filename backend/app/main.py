import logging
import asyncio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.v1 import router, files, websockets, auth
from app.models.database import engine, Base
import redis.asyncio as aioredis

# Configure logging - set appropriate levels
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# Set specific loggers
logging.getLogger("app").setLevel(logging.INFO)
logging.getLogger("app.api").setLevel(logging.INFO)
logging.getLogger("app.tasks").setLevel(logging.INFO)
logging.getLogger("app.services").setLevel(logging.INFO)
logging.getLogger("app.core").setLevel(logging.INFO)

# Silence noisy external loggers
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
logging.getLogger("redis").setLevel(logging.ERROR)
logging.getLogger("kombu").setLevel(logging.WARNING)

logger = logging.getLogger(__name__)

# Initialize DB
logger.info("Initializing NeonDB via SQLAlchemy...")
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Asynchronous Survey Generator API",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router.router)
app.include_router(files.router)
app.include_router(websockets.router)
app.include_router(auth.router)

@app.get("/")
def health_check():
    return {"status": "ok", "message": "Survey API is running."}

@app.get("/health/detailed")
async def detailed_health_check():
    """Detailed health check including Redis and Celery status."""
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
        logger.info("Redis health check: OK")
    except Exception as e:
        health_status["redis"] = f"error: {str(e)}"
        logger.warning(f"Redis health check failed: {e}")
    
    # Check Celery
    try:
        from app.core.celery import celery_app
        from celery.exceptions import Timeout
        
        # Try to inspect active workers
        inspect = celery_app.control.inspect()
        active_workers = inspect.active(timeout=2)
        
        if active_workers is None or len(active_workers) == 0:
            health_status["celery"] = "warning: no active workers"
            logger.warning("Celery: No active workers detected")
        else:
            health_status["celery"] = "ok"
            logger.info(f"Celery health check: OK - {len(active_workers)} worker(s) active")
    except Exception as e:
        health_status["celery"] = f"error: {str(e)}"
        logger.warning(f"Celery health check failed: {e}")
    
    return health_status
