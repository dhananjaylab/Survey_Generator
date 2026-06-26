"""
Alembic environment configuration.

Generates migrations from SQLAlchemy models using the app's settings.
Supports both online (live DB) and offline (SQL script) modes.
"""
from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context

# ── Import all models so Alembic sees them in metadata ───────────────────────
from app.models.database import Base
from app.models import user, survey   # noqa: F401 — side-effect imports register tables
from app.core.config import settings

config = context.config

# Override sqlalchemy.url with the app's runtime setting
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Generate SQL script without a live DB connection."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,           # detect column type changes
        compare_server_default=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations against a live DB connection."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,    # one connection, no pooling during migration
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
            compare_server_default=True,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
