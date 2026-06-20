"""
SCOPE Studio - Logo Generation Router.

Generates professional, object-free logo marks using the Gemini image model.
Builds rich context from brief, visual DNA, and brand strategy.
Produces multiple variation images in parallel.
"""

import asyncio
import json
import traceback

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.image_gen import generate_brand_images
from app.agents.model_factory import openrouter_chat_completion
from app.agents.prompts import LOGO_SYSTEM_PROMPT
from app.agents.session_access import ensure_session_access, get_brief_record
from app.core.config import get_settings
from app.core.database import get_session
from app.db.models import DBBrandNode, DBLogoResult
from app.schemas.logo import LogoGenerateRequest

router = APIRouter(prefix="/api/logo", tags=["logo"])


def _load_reference_images(db_brief: object) -> list[dict]:
    """Load the brief's stored moodboard/reference images as image_gen reference dicts."""
    raw = getattr(db_brief, "moodboard_images", None)
    try:
        images = json.loads(raw) if isinstance(raw, str) else (raw or [])
    except (json.JSONDecodeError, TypeError):
        images = []
    return [{"url": url} for url in images if isinstance(url, str) and url]


def _blend_concepts(concepts: list, fallback: str) -> str:
    """Synthesize one combined concept direction from the selected concepts.

    Falls back to the single legacy `concept` string when no list is provided.
    """
    pieces = []
    for c in concepts or []:
        name = (getattr(c, "name", "") or "").strip()
        desc = (getattr(c, "desc", "") or "").strip()
        if name and desc:
            pieces.append(f"{name} — {desc}")
        elif name:
            pieces.append(name)
    if not pieces:
        return fallback
    if len(pieces) == 1:
        return pieces[0]
    return "Synthesize these directions into one coherent mark: " + "; ".join(pieces)


def _build_rich_context(
    *,
    db_brief: object,
    wordmark: str,
    concept: str,
    palette_name: str,
    font_name: str,
    brand_context: str,
    active_nodes: list,
) -> str:
    """Build a rich context string from the brief, visual DNA, and strategy nodes."""
    parts: list[str] = []

    # Core identity
    parts.append(f"Brand name: {db_brief.brand_name}")
    parts.append(f"Industry: {db_brief.industry}")
    parts.append(f"Wordmark text: {wordmark}")
    parts.append(f"Visual concept direction: {concept}")
    parts.append(f"Color palette: {palette_name}")
    parts.append(f"Typography: {font_name}")

    # Brief summary and concept
    if db_brief.summary:
        parts.append(f"Brand overview: {db_brief.summary}")
    one_line = getattr(db_brief, "one_line_concept", "")
    if one_line:
        parts.append(f"One-line concept: {one_line}")

    # Strategic pillars
    try:
        pillars = json.loads(db_brief.pillars) if isinstance(db_brief.pillars, str) else db_brief.pillars
        if isinstance(pillars, dict):
            for key, value in pillars.items():
                if value:
                    parts.append(f"Pillar — {key.title()}: {value}")
    except (json.JSONDecodeError, TypeError):
        pass

    # Visual direction cues
    try:
        vis_dir = json.loads(db_brief.visual_direction) if isinstance(db_brief.visual_direction, str) else []
        if vis_dir:
            parts.append(f"Visual direction cues: {'; '.join(vis_dir)}")
    except (json.JSONDecodeError, TypeError):
        pass

    # Visual cues
    try:
        vis_cues = json.loads(db_brief.visual_cues) if isinstance(db_brief.visual_cues, str) else []
        if vis_cues:
            parts.append(f"Visual motifs: {', '.join(vis_cues)}")
    except (json.JSONDecodeError, TypeError):
        pass

    # Region and marketing standards
    if db_brief.region:
        parts.append(f"Target region: {db_brief.region}")

    # Extra brand context from the user
    if brand_context:
        parts.append(f"Additional brand context: {brand_context}")

    # Active strategy nodes
    if active_nodes:
        strategy_lines = [
            f"  - {node.node_type.title()}: {node.title} — {node.content}"
            for node in active_nodes
        ]
        parts.append("EXISTING BRAND STRATEGY:\n" + "\n".join(strategy_lines))

    return "\n".join(parts)


def _build_variation_prompts(
    *,
    wordmark: str,
    concept: str,
    palette_name: str,
    font_name: str,
    concept_description: str,
    brief_summary: str,
    brand_context: str,
) -> list[str]:
    """Build 4 distinct image generation prompts for logo variations."""
    base_rules = (
        "CRITICAL RULES: "
        "NO realistic objects, NO clip-art, NO stock icons, NO photographic elements, NO 3D effects. "
        "Only abstract geometric marks, monograms, custom glyphs, or typographic wordmarks. "
        "Use 2-3 colors maximum from the supplied palette. "
        "Use consistent stroke weights, clean silhouettes, high contrast, and no tiny interior details. "
        "The mark must be recognizable at 16x16px and 32x32px, and must work in black and white. "
        "Flat design on a pure white background. No gradients unless the concept explicitly requires a simple two-stop refraction."
    )

    framework = (
        "Follow this 7-step logo framework: "
        "1 brand personality, 2 one main element, 3 clear style direction, 4 restrained colors, "
        "5 symbolic meaning integrated into geometry, 6 technical scalability, 7 explicit layout."
    )

    brand_ctx = (
        f"Brand: '{wordmark}'. Concept: {concept}. "
        f"Palette: {palette_name}. Font: {font_name}. "
        f"Brief: {brief_summary[:200]}. "
        f"Logo concept: {concept_description[:200]}. "
        f"Additional context: {brand_context[:300]}."
    )

    return [
        # Horizontal
        (
            f"Generate a logo: professional HORIZONTAL layout for the brand '{wordmark}'. "
            f"Abstract geometric mark on the left, wordmark text on the right. "
            f"{brand_ctx} "
            f"Clean proportional spacing, left-to-right reading, exact wordmark spelling, no fake letters. "
            f"{framework} White background, high-resolution. "
            f"{base_rules}"
        ),
        # Stacked
        (
            f"Generate a logo: professional STACKED layout for the brand '{wordmark}'. "
            f"Abstract geometric mark centered above the wordmark text. "
            f"{brand_ctx} "
            f"Centered vertical alignment with a tight, realistic gap between symbol and name. "
            f"Perfect for square formats and social avatars. {framework} White background. "
            f"{base_rules}"
        ),
        # Icon Only
        (
            f"Generate a logo: professional ICON-ONLY abstract mark for the brand '{wordmark}'. "
            f"A single, bold, geometric symbol — no text. "
            f"{brand_ctx} "
            f"Must work as a favicon, watermark, or app icon at tiny sizes; remove anything that disappears below 24px. "
            f"{framework} Isolated on white background. "
            f"{base_rules}"
        ),
        # Monochrome
        (
            f"Generate a logo: professional MONOCHROME logo for the brand '{wordmark}'. "
            f"Abstract mark + wordmark in a single solid color (black). "
            f"{brand_ctx} "
            f"Suitable for stamping, embossing, screen-printing, and one-color embroidery. "
            f"{framework} Pure black on white background. No gradients. "
            f"{base_rules}"
        ),
    ]


@router.post("/generate")
async def logo_generate(
    request: LogoGenerateRequest,
    session: AsyncSession = Depends(get_session),
):
    response_text = ""
    try:
        db_brief = ensure_session_access(
            await get_brief_record(session, request.session_id),
            require_approved=True,
            require_strategy=True,
        )
        settings = get_settings()

        # Fetch active strategy nodes
        active_nodes_result = await session.execute(
            select(DBBrandNode).where(
                DBBrandNode.session_id == request.session_id,
                DBBrandNode.is_active == True,  # noqa: E712
            )
        )
        active_nodes = active_nodes_result.scalars().all()

        # Blend selected concepts into a single coherent direction (falls back to legacy `concept`)
        blended_concept = _blend_concepts(request.concepts, request.concept)

        # Build rich context from brief + DNA + strategy
        rich_context = _build_rich_context(
            db_brief=db_brief,
            wordmark=request.wordmark,
            concept=blended_concept,
            palette_name=request.palette_name,
            font_name=request.font_name,
            brand_context=request.brand_context,
            active_nodes=active_nodes,
        )

        # Step 1: Generate the concept brief JSON via text model
        system_content = (
            LOGO_SYSTEM_PROMPT
            + "\n\nCRITICAL: Output strictly valid JSON matching the schema."
        )
        if db_brief.language == "ar":
            system_content += (
                "\n\nCRITICAL LANGUAGE RULE:\n"
                "- The working language is Arabic.\n"
                "- You MUST write all fields (concept_description, tagline, variations description) in Modern Standard Arabic only.\n"
                "- Do NOT use English for any text fields."
            )

        response_json = await openrouter_chat_completion(
            messages=[
                {"role": "system", "content": system_content},
                {"role": "user", "content": f"Generate a logo concept and mark for:\n\n{rich_context}"},
            ],
            model=settings.scope_text_model,
            max_tokens=4000,
        )

        message = response_json["choices"][0]["message"]
        response_text = str(message.get("content", "")).strip()

        if response_text.startswith("```"):
            if response_text.startswith("```json"):
                response_text = response_text[7:]
            else:
                response_text = response_text[3:]
            if response_text.endswith("```"):
                response_text = response_text[:-3]
            response_text = response_text.strip()

        parsed_result = json.loads(response_text)

        # Step 2: Generate logo variation images in parallel
        variation_prompts = _build_variation_prompts(
            wordmark=request.wordmark,
            concept=blended_concept,
            palette_name=request.palette_name,
            font_name=request.font_name,
            concept_description=parsed_result.get("concept_description", ""),
            brief_summary=db_brief.summary or "",
            brand_context=request.brand_context,
        )

        # Limit to requested count
        variation_prompts = variation_prompts[: request.variations_count]

        # Feed the brief's stored reference/moodboard images plus any user-pasted
        # reference images as visual style guidance.
        reference_images = _load_reference_images(db_brief)
        reference_images += [{"url": u} for u in request.reference_images if u]

        generated_images = await generate_brand_images(
            prompts=variation_prompts,
            reference_images=reference_images or None,
            model=settings.scope_image_model,
        )

        # Save generated logo images to .skill-archive
        try:
            import datetime
            import os
            import re
            import httpx
            import base64

            today = datetime.date.today().strftime("%Y-%m-%d")
            summary_name = request.wordmark or "unnamed-brand"
            summary_name = re.sub(r'[^a-zA-Z0-9\s-]', '', summary_name).strip().lower()
            summary_name = re.sub(r'[\s-]+', '-', summary_name)
            if not summary_name:
                summary_name = "logo"

            archive_dir_name = f"{today}-{summary_name}"
            project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
            archive_dir = os.path.join(project_root, ".skill-archive", "logo-creator", archive_dir_name)

            os.makedirs(archive_dir, exist_ok=True)
            print(f"[logo] Archiving logos to: {archive_dir}")

            async with httpx.AsyncClient() as client:
                for idx, img_data in enumerate(generated_images):
                    img_idx = idx + 1
                    file_name = f"logo-{img_idx:02d}.png"
                    file_path = os.path.join(archive_dir, file_name)

                    try:
                        if img_data.startswith("data:"):
                            header, base64_data = img_data.split(",", 1)
                            img_bytes = base64.b64decode(base64_data)
                            with open(file_path, "wb") as f:
                                f.write(img_bytes)
                        else:
                            resp = await client.get(img_data, timeout=10.0)
                            if resp.status_code == 200:
                                with open(file_path, "wb") as f:
                                    f.write(resp.content)
                            else:
                                print(f"[logo] Failed to download {img_data}: status {resp.status_code}")
                    except Exception as e:
                        print(f"[logo] Failed to archive logo variation {img_idx}: {e}")
        except Exception as e:
            print(f"[logo] Error setting up .skill-archive generation: {e}")

        # Use the first successful image as the primary (backwards compat)
        primary_image = generated_images[0] if generated_images else None

        # Persist
        session.add(
            DBLogoResult(
                session_id=request.session_id,
                concept_description=parsed_result.get("concept_description", ""),
                tagline=parsed_result.get("tagline", ""),
                variations=json.dumps(parsed_result.get("variations", [])),
                settings=json.dumps(
                    {
                        "wordmark": request.wordmark,
                        "concept": request.concept or blended_concept,
                        "concepts": [c.name for c in request.concepts if c.name],
                        "palette_name": request.palette_name,
                        "font_name": request.font_name,
                    }
                ),
                generated_image=primary_image,
                generated_images=json.dumps(generated_images),
            )
        )
        await session.commit()

        parsed_result["generated_image"] = primary_image
        parsed_result["generated_images"] = generated_images
        return parsed_result
    except HTTPException:
        raise
    except json.JSONDecodeError as exc:
        print(f"JSON parse error in logo generate: {exc}")
        print(f"Raw response: {response_text}")
        raise HTTPException(status_code=500, detail=f"AI returned invalid JSON: {exc}")
    except Exception as exc:
        print(f"Error in /api/logo/generate: {exc}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/{session_id}")
async def get_logo_result(
    session_id: str,
    session: AsyncSession = Depends(get_session),
):
    """Get the latest logo result for a session."""
    ensure_session_access(await get_brief_record(session, session_id), require_approved=True, require_strategy=True)
    result = await session.execute(
        select(DBLogoResult)
        .where(DBLogoResult.session_id == session_id)
        .order_by(DBLogoResult.created_at.desc())
        .limit(1)
    )
    row = result.scalar_one_or_none()
    if not row:
        return None
    return {
        "concept_description": row.concept_description,
        "tagline": row.tagline,
        "variations": json.loads(row.variations) if row.variations else [],
        "generated_image": row.generated_image,
        "generated_images": json.loads(row.generated_images) if row.generated_images else [],
        "settings": json.loads(row.settings) if row.settings else {},
    }


@router.get("/{session_id}/all")
async def get_all_logo_results(
    session_id: str,
    session: AsyncSession = Depends(get_session),
):
    """Get all logo generation results for a session (gallery history)."""
    ensure_session_access(await get_brief_record(session, session_id), require_approved=True, require_strategy=True)
    result = await session.execute(
        select(DBLogoResult)
        .where(DBLogoResult.session_id == session_id)
        .order_by(DBLogoResult.created_at.desc())
    )
    rows = result.scalars().all()
    return [
        {
            "id": row.id,
            "concept_description": row.concept_description,
            "tagline": row.tagline,
            "variations": json.loads(row.variations) if row.variations else [],
            "generated_image": row.generated_image,
            "generated_images": json.loads(row.generated_images) if row.generated_images else [],
            "settings": json.loads(row.settings) if row.settings else {},
            "created_at": row.created_at.isoformat() if row.created_at else None,
        }
        for row in rows
    ]
