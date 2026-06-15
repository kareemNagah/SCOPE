"""
SCOPE Studio — SQLAlchemy ORM Models.

All domain entities for the SCOPE Studio application.
"""

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class DBUser(Base):
    """Registered user account."""

    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, default=uuid.uuid4
    )
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), onupdate=func.now())


class DBBrandNode(Base):
    """A single brand strategy pillar node on the canvas."""

    __tablename__ = "brand_nodes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    session_id: Mapped[str] = mapped_column(String(255), index=True)
    user_id: Mapped[uuid.UUID | None] = mapped_column(nullable=True)
    version: Mapped[int] = mapped_column(Integer, default=1)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    node_type: Mapped[str] = mapped_column(String(100))
    title: Mapped[str] = mapped_column(String(500))
    content: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())


class DBMarketingResult(Base):
    """Persisted output from the marketing analysis engine."""

    __tablename__ = "marketing_results"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    session_id: Mapped[str] = mapped_column(String(255), index=True)
    blueprint: Mapped[str] = mapped_column(Text)   # JSON string
    personas: Mapped[str] = mapped_column(Text)     # JSON string
    hooks: Mapped[str] = mapped_column(Text)        # JSON string
    context_data: Mapped[str] = mapped_column(Text)  # JSON string — the input fields
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())


class DBLogoResult(Base):
    """Persisted output from the logo concept generator."""

    __tablename__ = "logo_results"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    session_id: Mapped[str] = mapped_column(String(255), index=True)
    concept_description: Mapped[str] = mapped_column(Text)
    tagline: Mapped[str] = mapped_column(String(500))
    variations: Mapped[str] = mapped_column(Text)  # JSON string
    settings: Mapped[str] = mapped_column(Text)    # JSON string
    generated_image: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())


class DBBrief(Base):
    """Persisted generated starter brief and stage progress."""

    __tablename__ = "briefs"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    session_id: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    brand_name: Mapped[str] = mapped_column(String(500))
    industry: Mapped[str] = mapped_column(String(500))
    summary: Mapped[str] = mapped_column(Text)
    pillars: Mapped[str] = mapped_column(Text)              # JSON string of pillars
    visual_cues: Mapped[str] = mapped_column(Text)          # JSON string list
    competitive_signals: Mapped[str] = mapped_column(Text)  # JSON string list
    recommended_next: Mapped[str] = mapped_column(Text)
    region: Mapped[str] = mapped_column(String(50), default="usa")
    marketing_standards: Mapped[str] = mapped_column(Text, default="{}")
    approved: Mapped[bool] = mapped_column(Boolean, default=False)
    strategy_confirmed: Mapped[bool] = mapped_column(Boolean, default=False)
    user_id: Mapped[uuid.UUID | None] = mapped_column(nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())


class DBChatMessage(Base):
    """Persisted chat thread history for the copilot conversation."""

    __tablename__ = "chat_messages"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    session_id: Mapped[str] = mapped_column(String(255), index=True)
    role: Mapped[str] = mapped_column(String(50))           # 'user', 'assistant', or 'system'
    content: Mapped[str] = mapped_column(Text)
    user_id: Mapped[uuid.UUID | None] = mapped_column(nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())
