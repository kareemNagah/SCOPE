from __future__ import annotations

import asyncio
from typing import Any

from app.agents.model_factory import openrouter_chat_completion
from app.core.config import get_settings


def _reference_parts(reference_images: list[dict[str, Any]] | None) -> list[dict[str, Any]]:
    parts: list[dict[str, Any]] = []
    for ref in reference_images or []:
        url = ref.get("url") or f"data:{ref.get('mime', 'image/png')};base64,{ref['data']}"
        parts.append({"type": "image_url", "image_url": {"url": url}})
    return parts


async def _one_image(prompt: str, reference_images: list[dict[str, Any]] | None, model: str) -> str | None:
    content: list[dict[str, Any]] = [{"type": "text", "text": prompt}, *_reference_parts(reference_images)]
    try:
        response = await openrouter_chat_completion(
            messages=[{"role": "user", "content": content}],
            model=model,
            modalities=["image", "text"],
            max_tokens=4000,
        )
        message = response["choices"][0]["message"]
        images = message.get("images")
        if images:
            return images[0]["image_url"]["url"]
    except Exception as exc:  # pragma: no cover - network/runtime guard
        print(f"[image_gen] generation failed: {exc}")
    return None


async def generate_brand_images(
    *,
    prompts: list[str],
    reference_images: list[dict[str, Any]] | None = None,
    model: str | None = None,
) -> list[str]:
    """Generate one image per prompt via OpenRouter (gemini image model). Returns the URLs/data-URLs
    that succeeded, preserving order; failed generations are dropped."""
    settings = get_settings()
    resolved_model = model or settings.scope_image_model
    results = await asyncio.gather(*[_one_image(p, reference_images, resolved_model) for p in prompts])
    return [r for r in results if r]
