from celery import Celery
from app.core.config import settings
import logging
import platform
import os

logger = logging.getLogger(__name__)


def _get_worker_pool():
    """
    Determine the appropriate Celery worker pool based on platform and environment.
    
    PLATFORM DETECTION LOGIC:
    ========================
    
    Windows Compatibility Issue:
    - Celery's default 'prefork' pool uses POSIX fork() operations
    - Windows does NOT support POSIX fork operations
    - This causes PermissionError [WinError 5] in billiard pool synchronization
    - Solution: Use Windows-compatible pools (solo or gevent)
    
    Pool Selection Strategy:
    - Windows + Development: Use 'solo' pool (simple, single-threaded)
    - Windows + Production: Use 'gevent' pool (async, better performance)
    - Linux/Mac: Use 'prefork' pool (existing behavior, optimal performance)
    
    Environment Detection:
    - Check CELERY_ENV environment variable
    - Default to 'development' if not set
    - Set CELERY_ENV=production for production deployments
    
    Returns:
        str: The pool type ('solo', 'gevent', or 'prefork')
        - 'solo': Windows development (simple, single-threaded)
        - 'gevent': Windows production (async, better performance)
        - 'prefork': Linux/Mac (existing behavior, no change)
    """
    system = platform.system()
    # Check for development environment via environment variable
    # Default to development mode if not explicitly set to production
    is_development = os.getenv('CELERY_ENV', 'development').lower() != 'production'
    
    if system == 'Windows':
        if is_development:
            pool_type = 'solo'
            logger.info("Windows development environment detected - using 'solo' pool")
        else:
            pool_type = 'gevent'
            logger.info("Windows production environment detected - using 'gevent' pool")
            # Apply gevent monkey-patching for production
            # ONLY apply if running as a celery worker process to avoid corrupting web processes
            import sys
            is_celery = 'celery' in sys.argv[0] or any('celery' in arg for arg in sys.argv)
            if is_celery or os.getenv('IS_CELERY_WORKER') == 'true':
                try:
                    from gevent import monkey
                    monkey.patch_all()
                    logger.info("Gevent monkey-patching applied successfully")
                except ImportError:
                    logger.error(
                        "Gevent pool selected but gevent is not installed. "
                        "Install gevent with: pip install gevent>=23.0.0"
                    )
                    raise
            else:
                logger.info("Skipping gevent monkey-patching (not running as Celery worker)")
    else:
        pool_type = 'prefork'
        logger.info(f"{system} platform detected - using 'prefork' pool")
    
    logger.info(f"Worker pool type: {pool_type}")
    return pool_type


celery_app = Celery(
    "survey_worker",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["app.tasks.survey_tasks"]
)

# Configure Celery with platform-aware pool selection and standard settings
# The worker_pool is automatically selected based on platform and environment
# See _get_worker_pool() function above for platform detection logic
celery_app.conf.update(
    worker_pool=_get_worker_pool(),  # Platform-aware pool selection
    task_serializer="json",  # Serialize tasks as JSON (preserved across all platforms)
    accept_content=["json"],  # Accept JSON-serialized tasks
    result_serializer="json",  # Serialize results as JSON (preserved across all platforms)
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=3600,  # 1 hour hard limit (preserved across all platforms)
    task_soft_time_limit=3300,  # 55 minutes soft limit (preserved across all platforms)
)

logger.info("Celery app initialized successfully")
logger.info(f"Broker: {settings.REDIS_URL}")
logger.info(f"Backend: {settings.REDIS_URL}")
