"""
SCOPE Studio — Mockup Schemas.
"""

from pydantic import BaseModel

# Allowed mockup type keys (mirror MOCKUP_PROMPT_TEMPLATES keys).
MOCKUP_TYPES = ("business_card", "signage", "packaging", "social_apparel")


class MockupGenerateRequest(BaseModel):
    """Input for the brand mockup generator."""

    session_id: str
    logo_image: str = ""  # data/hosted URL of the chosen logo variation
    mockup_types: list[str] = []  # subset of MOCKUP_TYPES
    brand_context: str = ""
    reference_images: list[str] = []  # user-supplied reference image data/hosted URLs
