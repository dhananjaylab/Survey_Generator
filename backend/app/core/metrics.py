"""
Application metrics collection and tracking.

Provides in-memory metrics that can be extended for Prometheus integration.
"""

import time
from typing import Dict, Any
from threading import Lock
from app.core.logging import get_logger

logger = get_logger(__name__)


class MetricsCollector:
    """
    Simple in-memory metrics collector.
    
    Tracks:
    - Application uptime
    - Request counts by method and status
    - Survey generation metrics
    - Error counts
    
    Extensible for Prometheus integration.
    """
    
    def __init__(self):
        """Initialize metrics collector."""
        self.start_time = time.time()
        self.lock = Lock()
        
        # Request metrics
        self.total_requests = 0
        self.requests_by_method: Dict[str, int] = {}
        self.requests_by_status: Dict[int, int] = {}
        
        # Survey metrics
        self.surveys_started = 0
        self.surveys_completed = 0
        self.surveys_failed = 0
        
        # Error metrics
        self.total_errors = 0
        self.errors_by_type: Dict[str, int] = {}
    
    def record_request(self, method: str, status_code: int) -> None:
        """
        Record HTTP request metrics.
        
        Args:
            method: HTTP method (GET, POST, etc.)
            status_code: HTTP response status code
        """
        with self.lock:
            self.total_requests += 1
            self.requests_by_method[method] = self.requests_by_method.get(method, 0) + 1
            self.requests_by_status[status_code] = self.requests_by_status.get(status_code, 0) + 1
    
    def record_survey_started(self) -> None:
        """Record survey generation start."""
        with self.lock:
            self.surveys_started += 1
    
    def record_survey_completed(self) -> None:
        """Record survey generation completion."""
        with self.lock:
            self.surveys_completed += 1
    
    def record_survey_failed(self) -> None:
        """Record survey generation failure."""
        with self.lock:
            self.surveys_failed += 1
    
    def record_error(self, error_type: str) -> None:
        """
        Record error occurrence.
        
        Args:
            error_type: Type of error (e.g., "ValueError", "TimeoutError")
        """
        with self.lock:
            self.total_errors += 1
            self.errors_by_type[error_type] = self.errors_by_type.get(error_type, 0) + 1
    
    def get_uptime_seconds(self) -> float:
        """
        Get application uptime in seconds.
        
        Returns:
            Uptime in seconds
        """
        return time.time() - self.start_time
    
    def get_metrics(self) -> Dict[str, Any]:
        """
        Get all collected metrics.
        
        Returns:
            Dictionary of metrics
        """
        with self.lock:
            uptime_seconds = self.get_uptime_seconds()
            
            return {
                "uptime_seconds": round(uptime_seconds, 2),
                "uptime_minutes": round(uptime_seconds / 60, 2),
                "uptime_hours": round(uptime_seconds / 3600, 2),
                "total_requests": self.total_requests,
                "requests_by_method": dict(self.requests_by_method),
                "requests_by_status": dict(self.requests_by_status),
                "surveys": {
                    "started": self.surveys_started,
                    "completed": self.surveys_completed,
                    "failed": self.surveys_failed,
                    "success_rate": (
                        round(self.surveys_completed / self.surveys_started * 100, 2)
                        if self.surveys_started > 0
                        else 0
                    )
                },
                "errors": {
                    "total": self.total_errors,
                    "by_type": dict(self.errors_by_type)
                }
            }


# Global metrics instance
_metrics = MetricsCollector()


def get_metrics_collector() -> MetricsCollector:
    """
    Get the global metrics collector instance.
    
    Returns:
        MetricsCollector instance
    """
    return _metrics
