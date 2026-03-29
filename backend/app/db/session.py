from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from app.core.config import settings
from typing import AsyncGenerator

# For SQLite/PostgreSQL (Async)
database_url = settings.DATABASE_URL
if database_url.startswith("sqlite"):
    # Convert sqlite:// to sqlite+aiosqlite:// for async support
    database_url = database_url.replace("sqlite://", "sqlite+aiosqlite://")
elif database_url.startswith("postgresql://"):
    database_url = database_url.replace("postgresql://", "postgresql+asyncpg://")

engine = create_async_engine(
    database_url,
    connect_args={"check_same_thread": False} if "sqlite" in database_url else {}
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    autocommit=False,
    autoflush=False
)

Base = declarative_base()

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as db:
        try:
            yield db
        finally:
            await db.close()
