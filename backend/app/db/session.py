import logging
import os
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from sqlalchemy import text
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import declarative_base
from sqlalchemy.pool import AsyncAdaptedQueuePool, NullPool

from app.core.config import settings

log = logging.getLogger(__name__)

IS_TESTING = os.getenv("TESTING", "false").lower() == "true"
_IS_SQLITE  = settings.DATABASE_URL.startswith("sqlite")

# ── Normalise DATABASE_URL ──────────────────────────────────────────────────
def _resolve_url(url: str) -> str:
    if url.startswith("sqlite://") and "+aiosqlite" not in url:
        return url.replace("sqlite://", "sqlite+aiosqlite://", 1)
    if url.startswith("postgresql://") and "+asyncpg" not in url:
        return url.replace("postgresql://", "postgresql+asyncpg://", 1)
    return url


DATABASE_URL = _resolve_url(settings.DATABASE_URL)


# ── Engine ───────────────────────────────────────────────────────────────────
def _create_engine() -> AsyncEngine:
    if IS_TESTING or _IS_SQLITE:
        # SQLite / test: no pool, no keepalive
        return create_async_engine(
            DATABASE_URL,
            poolclass=NullPool,
            echo=False,
            connect_args={"check_same_thread": False} if _IS_SQLITE else {},
        )

    return create_async_engine(
        DATABASE_URL,
        poolclass=AsyncAdaptedQueuePool,
        pool_size=int(os.getenv("DB_POOL_SIZE", 10)),
        max_overflow=int(os.getenv("DB_MAX_OVERFLOW", 20)),
        pool_timeout=int(os.getenv("DB_POOL_TIMEOUT", 30)),
        pool_recycle=int(os.getenv("DB_POOL_RECYCLE", 1800)),
        pool_pre_ping=True,
        echo=os.getenv("DB_ECHO", "false").lower() == "true",
        connect_args={
            # PgBouncer transaction-mode compatibility
            "prepared_statement_cache_size": 0,
            "statement_cache_size": 0,
            "server_settings": {
                "application_name": "adzy-api",
                "jit": "off",
            },
            "command_timeout": 60,
        },
    )


engine = _create_engine()

async_session_factory = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    autocommit=False,
    autoflush=False,
    # Critical for async: don't expire ORM objects after commit so attributes
    # remain accessible without triggering implicit lazy-loads (MissingGreenlet).
    expire_on_commit=False,
)

Base = declarative_base()


# ── FastAPI dependency ───────────────────────────────────────────────────────
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


# ── Context manager for non-request code (Celery tasks, scripts) ─────────────
@asynccontextmanager
async def get_db_context() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


# ── Health check ─────────────────────────────────────────────────────────────
async def check_db_connection() -> bool:
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        return True
    except Exception as exc:
        log.error("Database health check failed: %s", exc)
        return False
