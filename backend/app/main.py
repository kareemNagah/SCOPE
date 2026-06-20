"""
SCOPE Studio — FastAPI Application Entry Point.

This file is an entry point ONLY. All logic lives in the respective modules.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.auth import router as auth_router
from app.api.brief import router as brief_router
from app.api.chat import router as chat_router
from app.api.health import router as health_router
from app.api.logo import router as logo_router
from app.api.marketing import router as marketing_router
from app.api.mockup import router as mockup_router
from app.core.config import get_settings
from app.core.database import create_tables, dispose_engine


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle for the application."""
    # Startup: create tables (dev convenience — use Alembic in production)
    await create_tables()
    print("✓ Database tables created/verified")
    yield
    # Shutdown: gracefully close the DB engine
    await dispose_engine()
    print("✓ Database engine disposed")


settings = get_settings()

app = FastAPI(
    title="SCOPE Studio API",
    version="2.0.0",
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=settings.cors_allow_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register all routers
app.include_router(health_router)
app.include_router(auth_router)
app.include_router(chat_router)
app.include_router(marketing_router)
app.include_router(logo_router)
app.include_router(mockup_router)
app.include_router(brief_router)
