"""
SCOPE Studio — Health Check Router.
"""

from fastapi import APIRouter

from app.core.config import get_settings
from app.core.database import engine

router = APIRouter(tags=["health"])


@router.get("/api/health")
async def health_check():
    """Basic health check endpoint."""
    settings = get_settings()
    return {
        "status": "ok",
        "db": engine.dialect.name,
        "checkpointer": "memory",
        "env": settings.app_env,
    }
