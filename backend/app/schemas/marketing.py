"""
SCOPE Studio — Marketing Schemas.
"""

from pydantic import BaseModel, Field


class MarketingAnalyzeRequest(BaseModel):
    """Input for the marketing analysis engine."""

    session_id: str
    materials: str = ""
    pricing_tier: str = ""
    region: str = ""
    channels: str = ""
    category: str = ""
    stage: str = ""
