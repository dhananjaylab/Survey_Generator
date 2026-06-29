"""
Application configuration.

Validation fix (Phase 3):
  - Added PROMPTS_BASE_PATH (required by app.utils.prompts.PromptTemplates)

Phase 1 / 2 additions (retained):
  - SECRET_KEY production guard
  - ALLOWED_ORIGINS comma-separated with allowed_origins_list property
  - SENTRY_DSN + OTEL_ENDPOINT observability stubs
"""
import os
from pydantic import field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # ── Core ─────────────────────────────────────────────────────────────────
    PROJECT_NAME: str = "AI Survey Generator"
    VERSION:      str = "1.0.0"
    ENVIRONMENT:  str = "development"
    DEBUG:        bool = True

    # ── Security ─────────────────────────────────────────────────────────────
    SECRET_KEY: str = "your-secret-key-change-in-production"

    @field_validator("SECRET_KEY")
    @classmethod
    def validate_secret_key(cls, v: str) -> str:
        env = os.getenv("ENVIRONMENT", "development")
        if env != "development" and v == "your-secret-key-change-in-production":
            raise ValueError("SECRET_KEY must be set in production")
        return v

    # ── Database ──────────────────────────────────────────────────────────────
    DATABASE_URL: str = "sqlite:///./survey_generator.db"

    # ── Redis ─────────────────────────────────────────────────────────────────
    REDIS_URL: str = "redis://localhost:6379/0"

    # ── CORS ──────────────────────────────────────────────────────────────────
    ALLOWED_ORIGINS: str = (
        "http://localhost:3000,"
        "http://localhost:5173,"
        "http://127.0.0.1:3000,"
        "http://127.0.0.1:5173"
    )

    @property
    def allowed_origins_list(self) -> list[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",") if o.strip()]

    # ── AI Providers ──────────────────────────────────────────────────────────
    OPENAI_API_KEY: str = ""
    CHATGPT_MODEL:  str = "gpt-4o"
    GOOGLE_API_KEY: str = ""
    GEMINI_MODEL:   str = "gemini-2.5-flash"

    # ── Prompts ───────────────────────────────────────────────────────────────
    # Validation fix: was missing, referenced in app/utils/prompts.py
    PROMPTS_BASE_PATH: str = "prompts/prompts_chatgpt"

    # ── Cloudflare R2 ─────────────────────────────────────────────────────────
    R2_ACCOUNT_ID:        str = ""
    R2_ACCESS_KEY_ID:     str = ""
    R2_SECRET_ACCESS_KEY: str = ""
    R2_BUCKET_NAME:       str = ""
    R2_PUBLIC_URL:        str = ""

    # ── Observability (Phase 3) ───────────────────────────────────────────────
    SENTRY_DSN:    str = ""
    OTEL_ENDPOINT: str = ""
    # Service name shown in Sentry / Grafana traces
    OTEL_SERVICE_NAME: str = "ai-survey-generator"

    class Config:
        env_file = ("app/.env", ".env")
        env_file_encoding = "utf-8"
        case_sensitive = True


settings = Settings()
