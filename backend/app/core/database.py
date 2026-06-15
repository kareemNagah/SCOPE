"""
SCOPE Studio — Async Database Engine & Session.

Uses SQLAlchemy 2.x async with asyncpg driver.
Provides `get_session` dependency for injection into routes.
"""

from collections.abc import AsyncGenerator

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.core.config import get_settings


settings = get_settings()

engine = create_async_engine(
    settings.database_url,
    echo=(settings.app_env == "development"),
    pool_size=5,
    max_overflow=10,
)

async_session_factory = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    """Declarative base for all ORM models."""
    pass


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency — yields an async session, auto-closes on exit."""
    async with async_session_factory() as session:
        yield session


async def create_tables() -> None:
    """Create all tables (dev convenience — use Alembic in production)."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # Add user_id column if not exists to migrate database seamlessly in development
        await conn.execute(
            text("ALTER TABLE briefs ADD COLUMN IF NOT EXISTS user_id UUID;")
        )
        await conn.execute(
            text("ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS user_id UUID;")
        )
        await conn.execute(
            text("ALTER TABLE logo_results ADD COLUMN IF NOT EXISTS generated_image TEXT;")
        )
        await conn.execute(
            text("ALTER TABLE briefs ADD COLUMN IF NOT EXISTS region VARCHAR(50) DEFAULT 'usa';")
        )
        await conn.execute(
            text("ALTER TABLE briefs ADD COLUMN IF NOT EXISTS marketing_standards TEXT DEFAULT '{}';")
        )


async def dispose_engine() -> None:
    """Gracefully close the engine pool on shutdown."""
    await engine.dispose()
