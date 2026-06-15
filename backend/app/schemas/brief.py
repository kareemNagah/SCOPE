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
    industry: str
    summary: str
    region: str
    pillars: BriefPillars
    marketing_standards: MarketingStandards
    visual_cues: List[str]
    competitive_signals: List[str]
    recommended_next: str
