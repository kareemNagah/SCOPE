"""
SCOPE Studio — Visual Identity Generation Service.
Generates palettes, type pairings, and logo concepts dynamically using OpenRouter and gpt-4o.
"""

import base64
import io
import json
import struct
import traceback
import zlib
from collections import Counter
from typing import Any

from app.agents.model_factory import openrouter_chat_completion
from app.agents.prompts import IDENTITY_SYSTEM_PROMPT
from app.core.config import get_settings
from app.db.models import DBBrief, DBBrandNode


# ---------------------------------------------------------------------------
# Zero-dependency moodboard color extraction
# ---------------------------------------------------------------------------


def _rgb_to_hsl(r: int, g: int, b: int) -> tuple[float, float, float]:
    """Convert RGB (0-255) to HSL (h: 0-360, s/l: 0-1)."""
    nr, ng, nb = r / 255, g / 255, b / 255
    mx, mn = max(nr, ng, nb), min(nr, ng, nb)
    lightness = (mx + mn) / 2
    if mx == mn:
        return (0.0, 0.0, lightness)
    d = mx - mn
    saturation = d / (2 - mx - mn) if lightness > 0.5 else d / (mx + mn)
    if mx == nr:
        hue = (ng - nb) / d + (6 if ng < nb else 0)
    elif mx == ng:
        hue = (nb - nr) / d + 2
    else:
        hue = (nr - ng) / d + 4
    return (hue / 6 * 360, saturation, lightness)


def _rgb_to_hex(r: int, g: int, b: int) -> str:
    return f"#{r:02X}{g:02X}{b:02X}"


def _decode_png_pixels(raw_bytes: bytes) -> list[tuple[int, int, int]]:
    """Minimal PNG pixel reader — handles 8-bit RGB/RGBA, no dependencies."""
    if raw_bytes[:8] != b"\x89PNG\r\n\x1a\n":
        return []
    pos = 8
    width = height = bit_depth = color_type = 0
    idat_chunks: list[bytes] = []
    while pos < len(raw_bytes) - 4:
        length = struct.unpack(">I", raw_bytes[pos : pos + 4])[0]
        chunk_type = raw_bytes[pos + 4 : pos + 8]
        chunk_data = raw_bytes[pos + 8 : pos + 8 + length]
        if chunk_type == b"IHDR":
            width = struct.unpack(">I", chunk_data[0:4])[0]
            height = struct.unpack(">I", chunk_data[4:8])[0]
            bit_depth = chunk_data[8]
            color_type = chunk_data[9]
        elif chunk_type == b"IDAT":
            idat_chunks.append(chunk_data)
        elif chunk_type == b"IEND":
            break
        pos += 12 + length
    if not idat_chunks or bit_depth != 8 or color_type not in (2, 6):
        return []
    try:
        decompressed = zlib.decompress(b"".join(idat_chunks))
    except zlib.error:
        return []
    bpp = 3 if color_type == 2 else 4
    stride = 1 + width * bpp
    pixels: list[tuple[int, int, int]] = []
    step = max(1, height * width // 400)  # sample ~400 pixels
    idx = 0
    for y in range(height):
        row_start = y * stride + 1  # skip filter byte
        for x in range(width):
            offset = row_start + x * bpp
            if offset + 2 >= len(decompressed):
                continue
            idx += 1
            if idx % step != 0:
                continue
            r, g, b_val = decompressed[offset], decompressed[offset + 1], decompressed[offset + 2]
            pixels.append((r, g, b_val))
    return pixels


def _decode_jpeg_pixels(raw_bytes: bytes) -> list[tuple[int, int, int]]:
    """Very rough JPEG pixel reader — uses Python's built-in base64 + struct only.
    Falls back to empty if format is too complex. This is intentionally minimal."""
    # JPEG is too complex for struct-level parsing without a library.
    # We'll skip JPEG pixel-level extraction and return empty.
    # The caller will still pass visual_cues/visual_direction text to the LLM.
    return []


def extract_dominant_colors_from_data_uris(
    data_uris: list[str],
    max_colors: int = 8,
) -> list[str]:
    """Extract dominant hex colors from a list of base64 data-URI images.

    Uses zero external dependencies. Supports PNG natively; other formats
    are skipped (the LLM still receives visual_cues and visual_direction
    as textual context).
    """
    buckets: dict[str, dict[str, Any]] = {}

    for uri in data_uris[:6]:
        try:
            if "," not in uri:
                continue
            header, encoded = uri.split(",", 1)
            raw_bytes = base64.b64decode(encoded)
            if raw_bytes[:8] == b"\x89PNG\r\n\x1a\n":
                pixels = _decode_png_pixels(raw_bytes)
            else:
                pixels = _decode_jpeg_pixels(raw_bytes)

            for r, g, b_val in pixels:
                h, s, lightness = _rgb_to_hsl(r, g, b_val)
                # Skip near-black, near-white, and desaturated pixels
                if lightness < 0.08 or lightness > 0.94 or s < 0.08:
                    continue
                bucket_key = f"{round(h / 18)}-{round(s * 5)}-{round(lightness * 5)}"
                score = 1 + s * 3 + (1 - abs(lightness - 0.52)) * 1.5
                if bucket_key in buckets:
                    buckets[bucket_key]["score"] += score
                else:
                    buckets[bucket_key] = {"color": (r, g, b_val), "score": score}
        except Exception:
            continue

    ranked = sorted(buckets.values(), key=lambda x: x["score"], reverse=True)
    result: list[str] = []
    for entry in ranked:
        hex_color = _rgb_to_hex(*entry["color"])
        # Ensure minimum perceptual distance between selected colors
        if all(_color_distance(hex_color, existing) > 72 for existing in result):
            result.append(hex_color)
        if len(result) >= max_colors:
            break
    return result


def _color_distance(a: str, b: str) -> float:
    ar, ag, ab = int(a[1:3], 16), int(a[3:5], 16), int(a[5:7], 16)
    br, bg, bb = int(b[1:3], 16), int(b[3:5], 16), int(b[5:7], 16)
    return ((ar - br) ** 2 + (ag - bg) ** 2 + (ab - bb) ** 2) ** 0.5


# ---------------------------------------------------------------------------
# JSON extraction helper
# ---------------------------------------------------------------------------


def extract_json_block(text: str) -> dict[str, Any]:
    cleaned = text.strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass

    first_brace = cleaned.find("{")
    last_brace = cleaned.rfind("}")
    if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
        try:
            return json.loads(cleaned[first_brace : last_brace + 1])
        except json.JSONDecodeError:
            pass

    if "```json" in cleaned:
        try:
            return json.loads(cleaned.split("```json", 1)[1].split("```", 1)[0].strip())
        except json.JSONDecodeError:
            pass

    raise json.JSONDecodeError("Could not extract valid JSON from LLM response", text, 0)


# ---------------------------------------------------------------------------
# Main identity generation
# ---------------------------------------------------------------------------


async def generate_visual_identity(
    brief: DBBrief,
    active_nodes: list[DBBrandNode],
    moodboard_colors: list[str] | None = None,
) -> dict[str, Any]:
    """
    Generate 3 palettes, 3 font pairings, and 4 logo concepts dynamically
    based on the brand's approved brief, strategy pillars, and moodboard colors.
    """
    settings = get_settings()

    # Build context from the brief and strategy
    strategy_summary = ""
    if active_nodes:
        strategy_summary = "Current Active Strategy Pillars:\n" + "\n".join(
            f"- {node.node_type.title()}: {node.title} — {node.content}"
            for node in active_nodes
        )
    else:
        # Fall back to brief pillars if no strategy nodes are active yet
        pillars = json.loads(brief.pillars or "{}")
        strategy_summary = "Initial Strategy Pillars:\n" + "\n".join(
            f"- {k.title()}: {v}" for k, v in pillars.items()
        )

    # Build moodboard color context
    moodboard_context = ""
    if moodboard_colors:
        moodboard_context = (
            f"\n\nMOODBOARD REFERENCE COLORS (extracted from uploaded references):\n"
            f"{', '.join(moodboard_colors)}\n"
            f"Use these colors as a starting reference for your palette design. "
            f"Adapt and refine them into cohesive brand palettes — "
            f"don't copy them verbatim, but let them anchor your color decisions."
        )

    brief_context = (
        f"Brand Name: {brief.brand_name}\n"
        f"Arabic Brand Name: {brief.brand_name_ar or 'None'}\n"
        f"English Brand Name: {brief.brand_name_en or 'None'}\n"
        f"Industry/Category: {brief.industry}\n"
        f"Region: {brief.region.upper()}\n"
        f"Brand Summary: {brief.summary}\n"
        f"Visual Cues: {brief.visual_cues}\n"
        f"Visual Direction: {brief.visual_direction}\n\n"
        f"{strategy_summary}"
        f"{moodboard_context}"
    )

    try:
        system_content = IDENTITY_SYSTEM_PROMPT
        if brief.language == "ar":
            system_content += (
                "\n\nCRITICAL LANGUAGE RULE:\n"
                "- The working language is Arabic.\n"
                "- You MUST write all generated text fields (palette names, palette mood roles, usage notes, font pairing rationales, logo concept names, and logo concept descriptions) in Modern Standard Arabic only.\n"
                "- Do NOT use English for any text fields. The only exception is the Google Font family names (e.g. 'El Messiri', 'Space Grotesk') which must remain in English so they can be loaded by the browser.\n"
                "- Ensure all generated strategy/design descriptions read naturally in standard Arabic."
            )

        response_json = await openrouter_chat_completion(
            messages=[
                {
                    "role": "system",
                    "content": system_content,
                },
                {
                    "role": "user",
                    "content": f"Generate a Visual Identity System for this brand:\n\n{brief_context}",
                },
            ],
            model=settings.scope_text_model,
            max_tokens=4000,
            response_format={"type": "json_object"},
        )

        message = response_json["choices"][0]["message"]
        response_text = str(message.get("content", "")).strip()

        parsed_result = extract_json_block(response_text)

        # Basic schema validation/normalization
        palettes = parsed_result.get("palettes", [])
        font_pairings = parsed_result.get("font_pairings", [])
        logo_concepts = parsed_result.get("logo_concepts", [])

        # Ensure we have some structure in case of partial results
        return {
            "palettes": palettes[:3],
            "font_pairings": font_pairings[:3],
            "logo_concepts": logo_concepts[:4],
        }

    except Exception as exc:
        print(f"Error in generate_visual_identity: {exc}")
        traceback.print_exc()
        # Fallback empty list structure if generation completely fails
        return {
            "palettes": [],
            "font_pairings": [],
            "logo_concepts": [],
        }
