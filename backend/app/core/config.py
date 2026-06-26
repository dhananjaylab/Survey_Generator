"""
Application configuration — additions for Phase 1 / 2.

Add the following fields to the existing Settings class in config.py.
The full file is shown here; merge with your existing version if it has
additional fields not listed below.
"""
import os
from typing import Optional
from pydantic import field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # ── Core ─────────────────────────────────────────────────────────────────
    PROJECT_NAME: str = "AI Survey Generator"
    VERSION:      str = "1.0.0"
    ENVIRONMENT:  str = "development"
    DEBUG:        bool = False

    # ── Security ─────────────────────────────────────────────────────────────
    SECRET_KEY: str = "your-secret-key-change-in-production"

    @field_validator("SECRET_KEY")
    @classmethod
    def validate_secret_key(cls, v: str, info) -> str:
        env = os.getenv("ENVIRONMENT", "development")
        if env != "development" and v == "your-secret-key-change-in-production":
            raise ValueError("SECRET_KEY must be set in production")
        return v

    # ── Database ──────────────────────────────────────────────────────────────
    DATABASE_URL: str = "sqlite:///./survey_generator.db"

    # ── Redis ─────────────────────────────────────────────────────────────────
    REDIS_URL: str = "redis://localhost:6379/0"

    # ── CORS ──────────────────────────────────────────────────────────────────
    # Comma-separated list of allowed origins.
    # Example:  ALLOWED_ORIGINS=https://app.example.com,https://www.example.com
    # Defaults to localhost variants for local development.
    ALLOWED_ORIGINS: str = (
        "http://localhost:3000,"
        "http://localhost:5173,"
        "http://127.0.0.1:3000,"
        "http://127.0.0.1:5173"
    )

    @property
    def allowed_origins_list(self) -> list[str]:
        """Parse ALLOWED_ORIGINS into a list, stripping whitespace."""
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",") if o.strip()]

    # ── AI Providers ──────────────────────────────────────────────────────────
    OPENAI_API_KEY:  str = ""
    CHATGPT_MODEL:   str = "gpt-4o"
    GOOGLE_API_KEY:  str = ""
    GEMINI_MODEL:    str = "gemini-2.0-flash"

    # ── Cloudflare R2 ─────────────────────────────────────────────────────────
    R2_ACCOUNT_ID:        str = ""
    R2_ACCESS_KEY_ID:     str = ""
    R2_SECRET_ACCESS_KEY: str = ""
    R2_BUCKET_NAME:       str = ""
    R2_PUBLIC_URL:        str = ""

    # ── Observability (Phase 3) ───────────────────────────────────────────────
    # Set SENTRY_DSN to enable Sentry error tracking.
    SENTRY_DSN: str = ""

    # Set OTEL_ENDPOINT to enable OpenTelemetry tracing.
    # Example: http://localhost:4317  (Grafana Tempo / Jaeger OTLP gRPC endpoint)
    OTEL_ENDPOINT: str = ""

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


settings = Settings()
