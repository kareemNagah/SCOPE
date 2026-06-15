from __future__ import annotations

from typing import Any

import dspy
import httpx
from langchain_openai import ChatOpenAI

from app.core.config import get_settings


def get_openrouter_headers() -> dict[str, str]:
    settings = get_settings()
    return {
        "HTTP-Referer": settings.scope_site_url,
        "X-Title": settings.scope_site_name,
    }


def create_langchain_chat_llm(
    *,
    model: str | None = None,
    temperature: float | None = None,
) -> ChatOpenAI:
    settings = get_settings()
    resolved_model = model or settings.scope_text_model
    return ChatOpenAI(
        model=resolved_model,
        openai_api_key=settings.openrouter_api_key.get_secret_value(),
        openai_api_base=settings.openrouter_base_url,
        default_headers=get_openrouter_headers(),
        temperature=temperature,
    )


def create_dspy_lm(
    *,
    model: str | None = None,
    temperature: float = 0.2,
    max_tokens: int = 4000,
) -> dspy.LM:
    settings = get_settings()
    resolved_model = model or settings.scope_text_model
    # DSPy uses LiteLLM under the hood. Prefix with openai/ so the OpenRouter
    # base URL is treated as an OpenAI-compatible endpoint.
    return dspy.LM(
        model=f"openai/{resolved_model}",
        api_key=settings.openrouter_api_key.get_secret_value(),
        api_base=settings.openrouter_base_url,
        temperature=temperature,
        max_tokens=max_tokens,
        cache=False,
    )


async def openrouter_chat_completion(
    *,
    messages: list[dict[str, Any]],
    model: str,
    max_tokens: int = 4000,
    response_format: dict[str, Any] | None = None,
    modalities: list[str] | None = None,
) -> dict[str, Any]:
    settings = get_settings()
    payload: dict[str, Any] = {
        "model": model,
        "messages": messages,
        "max_tokens": max_tokens,
    }
    if response_format is not None:
        payload["response_format"] = response_format
    if modalities is not None:
        payload["modalities"] = modalities

    async with httpx.AsyncClient(timeout=90.0) as client:
        response = await client.post(
            f"{settings.openrouter_base_url.rstrip('/')}/chat/completions",
            headers={
                "Authorization": f"Bearer {settings.openrouter_api_key.get_secret_value()}",
                "Content-Type": "application/json",
                **get_openrouter_headers(),
            },
            json=payload,
        )
        response.raise_for_status()
        return response.json()
