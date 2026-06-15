"""
SCOPE Studio — Application Settings.

All configuration is loaded from environment variables via Pydantic BaseSettings.
Use `get_settings()` as a FastAPI dependency for injection.
"""

from functools import lru_cache
from typing import Literal

from pydantic import AliasChoices, Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Central configuration loaded from .env / environment variables."""

    # --- Database ---
    database_url: str = "postgresql+asyncpg://scope_user:scope_pass@localhost:5432/scope_db"

    # --- JWT Auth ---
    jwt_secret: str = "dev-secret-change-me-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expire_hours: int = 24

    # --- OpenRouter / OpenAI ---
    openrouter_api_key: SecretStr = Field(
        default=SecretStr(""),
        validation_alias=AliasChoices("OPENROUTER_API_KEY", "OPENAI_API_KEY"),
    )
    openrouter_base_url: str = Field(
        default="https://openrouter.ai/api/v1",
        validation_alias=AliasChoices("OPENROUTER_BASE_URL", "OPENAI_API_BASE"),
    )
    scope_text_model: str = Field(default="google/gemini-2.5-flash")
    scope_multimodal_model: str = Field(default="google/gemini-3.1-flash-image-preview")
    scope_image_model: str = Field(default="google/gemini-3.1-flash-image-preview")
    scope_site_url: str = Field(default="http://localhost:8080")
    scope_site_name: str = Field(default="SCOPE Studio")

    # --- App ---
    app_env: Literal["development", "staging", "production"] = "development"
    cors_allow_origin_regex: str = r"https?://.*"

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore",
        case_sensitive=False,
    )

    @property
    def openai_api_key(self) -> SecretStr:
        return self.openrouter_api_key

    @property
    def openai_api_base(self) -> str:
        return self.openrouter_base_url


@lru_cache
def get_settings() -> Settings:
    """Cached singleton — returns the same Settings instance across the app."""
    return Settings()
