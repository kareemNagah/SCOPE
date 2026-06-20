"""
SCOPE Studio — Marketing Schemas.
"""

from pydantic import BaseModel


class MarketingAnalyzeRequest(BaseModel):
    """Legacy single-shot analysis input (kept for backward compatibility)."""

    session_id: str
    materials: str = ""
    pricing_tier: str = ""
    region: str = ""
    channels: str = ""
    category: str = ""
    stage: str = ""


# --- Ideas Factory step requests (JSON; image steps use multipart Form) ---


class SocialPlanRequest(BaseModel):
    """Step 5 — Social Media Plan."""

    session_id: str
    reference_session_id: str = ""  # optional historical brand to draw context from
    timeframe: str = "Monthly"
    platforms: str = "Instagram, TikTok"
    content_mix: str = "40% educational / 30% promotional / 20% entertainment / 10% UGC"


class HooksRequest(BaseModel):
    """Step 6 — Hook Generator."""

    session_id: str
    reference_session_id: str = ""
    platform: str = "Instagram"
    hook_type: str = "Both"  # Visual / Copy / Both
    quantity: int = 3


class AdCopyRequest(BaseModel):
    """Step 7 — Ad Copy A/B + creative."""

    session_id: str
    reference_session_id: str = ""
    selected_hook_ids: list[str] = []
    objective: str = "Conversions"
    format: str = "Social"
    language: str = ""
    variants: int = 2


class MarketingStepUpdate(BaseModel):
    """Save a user edit to one engine step's JSON."""

    data: dict
