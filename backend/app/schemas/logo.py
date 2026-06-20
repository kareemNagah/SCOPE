"""
SCOPE Studio — Logo Schemas.
"""

from pydantic import BaseModel


class ConceptInput(BaseModel):
    """A single logo concept direction the user selected."""

    name: str = ""
    desc: str = ""


class LogoGenerateRequest(BaseModel):
    """Input for the logo concept generator."""

    session_id: str
    wordmark: str = ""
    concept: str = ""
    concepts: list[ConceptInput] = []
    palette_name: str = ""
    font_name: str = ""
    brand_context: str = ""
    reference_images: list[str] = []  # user-supplied reference image data/hosted URLs
    variations_count: int = 4
