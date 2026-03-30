"""
Async-compatible Alembic migration environment.

Run migrations:
    alembic upgrade head
    alembic revision --autogenerate -m "describe change"
    alembic downgrade -1
"""
import asyncio
import os
import sys
from logging.config import fileConfig

from sqlalchemy import pool
from sqlalchemy.ext.asyncio import create_async_engine

from alembic import context
from dotenv import load_dotenv

# Make sure app package is importable when alembic runs from /backend/
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
load_dotenv()

# Import Base and all models so autogenerate sees every table
from app.db.session import Base          # noqa: E402
import app.models.models                  # noqa: E402, F401 — registers all ORM classes

config          = context.config
target_metadata = Base.metadata

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Async DATABASE_URL — normalise just like session.py does
_raw_url = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./adzy.db")
if _raw_url.startswith("postgresql://") and "+asyncpg" not in _raw_url:
    _ASYNC_URL = _raw_url.replace("postgresql://", "postgresql+asyncpg://", 1)
elif _raw_url.startswith("sqlite://") and "+aiosqlite" not in _raw_url:
    _ASYNC_URL = _raw_url.replace("sqlite://", "sqlite+aiosqlite://", 1)
else:
    _ASYNC_URL = _raw_url

# Sync URL for offline mode (psycopg2 or plain sqlite)
_SYNC_URL = (
    _ASYNC_URL
    .replace("postgresql+asyncpg://", "postgresql://")
    .replace("sqlite+aiosqlite://", "sqlite://")
)


# ── Offline mode ─────────────────────────────────────────────────────────────
def run_migrations_offline() -> None:
    context.configure(
        url=_SYNC_URL,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
        compare_server_default=True,
    )
    with context.begin_transaction():
        context.run_migrations()


# ── Online (async) mode ───────────────────────────────────────────────────────
def do_run_migrations(connection) -> None:
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        compare_type=True,
        compare_server_default=True,
    )
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    engine = create_async_engine(_ASYNC_URL, poolclass=pool.NullPool)
    async with engine.begin() as conn:
        await conn.run_sync(do_run_migrations)
    await engine.dispose()


def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
