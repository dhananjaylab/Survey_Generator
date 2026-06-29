"""
Phase 3 — unit / integration tests.

Covers:
  - TokenBlocklist (add / is_blocked / remove)
  - /auth/logout endpoint
  - /auth/refresh with blocklisted jti
  - Observability init guard (Sentry / OTEL disabled when env vars absent)
"""
import pytest
import pytest_asyncio
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import fakeredis.aioredis as fake_aioredis
from httpx import AsyncClient, ASGITransport

from app.core.token_blocklist import TokenBlocklist
from app.core.security import create_access_token, decode_token_payload


# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture
async def redis():
    """In-memory aioredis compatible with fakeredis."""
    r = await fake_aioredis.FakeRedis(decode_responses=True)
    yield r
    await r.aclose()


@pytest.fixture
def access_token():
    return create_access_token("test_user", token_type="access")


@pytest.fixture
def refresh_token():
    return create_access_token("test_user", token_type="refresh")


@pytest.fixture
async def client():
    from app.main import app
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c


# ── TokenBlocklist tests ──────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_blocklist_add_and_check(redis):
    jti = "test-jti-1234"
    expires_at = datetime.now(timezone.utc) + timedelta(hours=1)

    assert not await TokenBlocklist.is_blocked(jti, redis)

    await TokenBlocklist.add(jti, expires_at, redis)

    assert await TokenBlocklist.is_blocked(jti, redis)


@pytest.mark.asyncio
async def test_blocklist_already_expired_not_stored(redis):
    """Tokens already past their expiry should not be added."""
    jti = "expired-jti"
    expires_at = datetime.now(timezone.utc) - timedelta(seconds=1)

    await TokenBlocklist.add(jti, expires_at, redis)

    assert not await TokenBlocklist.is_blocked(jti, redis)


@pytest.mark.asyncio
async def test_blocklist_remove(redis):
    jti = "remove-jti"
    expires_at = datetime.now(timezone.utc) + timedelta(hours=1)

    await TokenBlocklist.add(jti, expires_at, redis)
    assert await TokenBlocklist.is_blocked(jti, redis)

    await TokenBlocklist.remove(jti, redis)
    assert not await TokenBlocklist.is_blocked(jti, redis)


@pytest.mark.asyncio
async def test_blocklist_redis_none_does_not_raise():
    """When Redis is unavailable, operations should be silent no-ops."""
    jti = "no-redis-jti"
    expires_at = datetime.now(timezone.utc) + timedelta(hours=1)

    await TokenBlocklist.add(jti, expires_at, None)
    result = await TokenBlocklist.is_blocked(jti, None)

    assert result is False


# ── decode_token_payload tests ────────────────────────────────────────────────

def test_decode_token_payload_valid(access_token):
    payload = decode_token_payload(access_token)
    assert payload is not None
    assert payload["sub"] == "test_user"
    assert payload["type"] == "access"
    assert "jti" in payload
    assert "exp" in payload


def test_decode_token_payload_invalid():
    payload = decode_token_payload("not.a.valid.token")
    assert payload is None


# ── /auth/logout tests (require DB + app) ─────────────────────────────────────

@pytest.mark.asyncio
async def test_logout_endpoint_accepts_valid_refresh_token(client, refresh_token):
    """POST /auth/logout with a valid refresh token returns 204."""
    response = await client.post(
        "/api/v1/auth/logout",
        json={"refresh_token": refresh_token},
    )
    assert response.status_code == 204


@pytest.mark.asyncio
async def test_logout_endpoint_accepts_expired_token(client):
    """POST /auth/logout with an expired/invalid token still returns 204 (fail-open)."""
    response = await client.post(
        "/api/v1/auth/logout",
        json={"refresh_token": "invalid.token.value"},
    )
    assert response.status_code == 204


# ── /auth/refresh blocklist tests ─────────────────────────────────────────────

@pytest.mark.asyncio
async def test_refresh_blocks_old_token_after_rotation(client, refresh_token):
    """
    After a successful /refresh call, the old refresh token's jti must be
    blocklisted so the same token cannot be used again.
    """
    # First refresh — should succeed
    r1 = await client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": refresh_token},
    )
    assert r1.status_code == 200
    new_tokens = r1.json()
    assert "access_token" in new_tokens
    assert "refresh_token" in new_tokens

    # Second refresh with same old token — should be blocked
    r2 = await client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": refresh_token},
    )
    # 401 because old jti is now blocklisted
    assert r2.status_code == 401


# ── Observability guard tests ─────────────────────────────────────────────────

def test_init_observability_no_op_when_dsn_unset(monkeypatch):
    """init_observability() must not raise when Sentry / OTEL env vars are absent."""
    monkeypatch.setattr("app.core.config.settings.SENTRY_DSN", "")
    monkeypatch.setattr("app.core.config.settings.OTEL_ENDPOINT", "")

    from app.core.observability import init_observability
    # Should complete without raising
    init_observability(MagicMock())


def test_init_sentry_graceful_when_not_installed(monkeypatch):
    """If sentry-sdk is missing, _init_sentry() logs a warning but doesn't crash."""
    monkeypatch.setattr("app.core.config.settings.SENTRY_DSN", "https://fake@sentry.io/1")
    import sys
    # Simulate missing sentry_sdk
    original = sys.modules.get("sentry_sdk")
    sys.modules["sentry_sdk"] = None  # type: ignore

    try:
        from app.core.observability import _init_sentry
        result = _init_sentry()
        assert result is False
    finally:
        if original is not None:
            sys.modules["sentry_sdk"] = original
        else:
            del sys.modules["sentry_sdk"]
