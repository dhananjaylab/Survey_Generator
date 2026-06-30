"""
Shared pytest fixtures for the backend test suite.

P2 fix: test_phase3.py's `client` fixture builds an AsyncClient around
`app` directly via ASGITransport, which does NOT run FastAPI's lifespan
context manager. That means app.state.redis is never set, so:
  - _get_redis(request) in auth.py returns None
  - TokenBlocklist.add()/is_blocked() silently no-op (their fail-open behavior)
  - test_refresh_blocks_old_token_after_rotation will fail because the second
    refresh attempt is never actually blocked

This conftest provides:
  1. An isolated SQLite DB per test session (so tests don't touch the dev DB)
  2. A `client` fixture that runs the app's lifespan (sets app.state.redis)
  3. A `redis` fixture backed by fakeredis, monkeypatched onto app.state
     so blocklist operations actually take effect during tests
"""
import asyncio
import os
import tempfile

import pytest
import pytest_asyncio


# ── Test environment setup (must run before app modules are imported) ────────

_TMP_DB = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
os.environ.setdefault("DATABASE_URL", f"sqlite:///{_TMP_DB.name}")
os.environ.setdefault("SECRET_KEY", "test-secret-key-not-for-production")
os.environ.setdefault("ENVIRONMENT", "development")
os.environ.setdefault("SENTRY_DSN", "")
os.environ.setdefault("OTEL_ENDPOINT", "")
os.environ.setdefault("USE_REDIS_RATE_LIMIT", "false")  # in-memory limiter for tests


@pytest.fixture(scope="session", autouse=True)
def _create_test_schema():
    """Create all tables in the temp SQLite DB once per test session."""
    from app.models.database import Base, engine
    from app.models import user, survey  # noqa: F401 — register tables

    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)
    try:
        os.unlink(_TMP_DB.name)
    except OSError:
        pass


@pytest_asyncio.fixture
async def redis():
    """In-memory Redis substitute, shared with the app via the client fixture."""
    import fakeredis.aioredis as fake_aioredis

    r = await fake_aioredis.FakeRedis(decode_responses=True)
    yield r
    await r.aclose()


@pytest_asyncio.fixture
async def client(redis):
    """
    AsyncClient wired to a running app instance with app.state.redis set.

    Runs the app's lifespan via LifespanManager-equivalent manual setup:
    we bypass the real aioredis.from_url() call (which would try to connect
    to a real Redis server) and inject the fakeredis instance directly.
    """
    from httpx import AsyncClient, ASGITransport
    from app.main import app

    # Manually set what the lifespan would normally create, since we don't
    # want this test run depending on a live Redis server.
    app.state.redis = redis

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c
