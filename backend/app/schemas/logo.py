"""
SCOPE Studio — Logo Schemas.
"""

from pydantic import BaseModel


class LogoGenerateRequest(BaseModel):
    """Input for the logo concept generator."""

    session_id: str
    wordmark: str = "SCOPE"
    concept: str = "Refracted Prism"
    palette_name: str = "Dispersion Spectrum"
    font_name: str = "Space Grotesk"
    brand_context: str = ""
