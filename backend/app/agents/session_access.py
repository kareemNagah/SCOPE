from __future__ import annotations

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import DBBrief


async def get_brief_record(session: AsyncSession, session_id: str) -> DBBrief | None:
    result = await session.execute(select(DBBrief).where(DBBrief.session_id == session_id))
    return result.scalar_one_or_none()


def ensure_session_access(
    db_brief: DBBrief | None,
    *,
    require_approved: bool = False,
    require_strategy: bool = False,
) -> DBBrief:
    if db_brief is None:
        raise HTTPException(status_code=404, detail="Brief not found for this session")
    if require_approved and not db_brief.approved:
        raise HTTPException(status_code=409, detail="Strategy is locked until the brief is approved")
    if require_strategy and not db_brief.strategy_confirmed:
        raise HTTPException(status_code=409, detail="This studio is locked until strategy is confirmed")
    return db_brief
