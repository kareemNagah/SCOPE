"""
SCOPE Studio - Chat & Brand Node Schemas.
"""

from typing import Dict, List, Literal

from pydantic import BaseModel, Field


class BrandNodeSchema(BaseModel):
    """A single brand strategy pillar."""

    type: str
    title: str
    content: str


class ChatRequest(BaseModel):
    """Chat message payload sent to the LangGraph agent."""

    messages: List[Dict[str, str]]
    session_id: str = Field(default="default_session")
    mode: Literal["free", "guided"] = Field(default="guided")
    focus_node_type: str | None = None
    focus_node_title: str | None = None
    focus_node_value: str | None = None


class ChatSuggestion(BaseModel):
    """A suggested next move the user can trigger directly."""

    label: str
    prompt: str
    rationale: str


class PaletteSchema(BaseModel):
    """A single AI-suggested brand color palette."""

    name: str
    colors: List[str]
    mood: str
    usage_note: str = ""
    recommended: bool = False


class ChatResponse(BaseModel):
    """AI response + updated brand nodes."""

    response: str
    mode: Literal["free", "guided"]
    suggestions: List[ChatSuggestion] = Field(default_factory=list)
    nodes: List[BrandNodeSchema]
    proposed_palettes: List[PaletteSchema] = Field(default_factory=list)


class HistoryVersion(BaseModel):
    """A versioned snapshot of brand nodes."""

    version: int
    is_active: bool
    timestamp: str | None
    brand_name: str
    nodes: List[BrandNodeSchema]
