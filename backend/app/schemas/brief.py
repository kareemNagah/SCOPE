"""
SCOPE Studio — Brief Schemas.
"""

from typing import List

from pydantic import BaseModel


class MarketingStandards(BaseModel):
    audience: str
    positioning: str
    value_proposition: str
    reasons_to_believe: List[str]
    recommended_channels: List[str]
    compliance_cultural_notes: List[str]
    competitive_context: str


class BriefPillars(BaseModel):
    """Six brand pillars extracted from brief analysis."""

    mission: str
    vision: str
    persona: str
    values: str
    voice: str
    promise: str


class BriefResult(BaseModel):
    """Structured output from the brief analysis endpoint."""

    brand_name: str
    brand_name_ar: str = ""
    brand_name_en: str = ""
    language: str = "en"
    industry: str
    one_line_concept: str = ""
    summary: str
    market_lens: str = ""
    region: str
    pillars: BriefPillars
    marketing_standards: MarketingStandards
    visual_direction: List[str] = []
    visual_cues: List[str]
    competitive_signals: List[str]
    recommended_next: str
    moodboard_images: List[str] = []
