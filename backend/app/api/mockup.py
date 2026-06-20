"""
SCOPE Studio - Brand Mockup Router.

Applies a generated logo onto real-world surfaces (business card, signage,
packaging, social & apparel) using the Gemini image model, conditioned on the
logo image plus the brief's reference/moodboard images.
"""

import json
import traceback

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.image_gen import generate_brand_images
from app.agents.prompts import MOCKUP_PROMPT_TEMPLATES, MOCKUP_SYSTEM_PROMPT
from app.agents.session_access import ensure_session_access, get_brief_record
from app.core.config import get_settings
from app.core.database import get_session
from app.db.models import DBLogoResult, DBMockupResult
from app.schemas.mockup import MOCKUP_TYPES, MockupGenerateRequest

router = APIRouter(prefix="/api/mockup", tags=["mockup"])


def _load_reference_images(db_brief: object) -> list[dict]:
    """Load the brief's stored moodboard/reference images as image_gen reference dicts."""
    raw = getattr(db_brief, "moodboard_images", None)
    try:
        images = json.loads(raw) if isinstance(raw, str) else (raw or [])
    except (json.JSONDecodeError, TypeError):
        images = []
    return [{"url": url} for url in images if isinstance(url, str) and url]


def _brand_mood(db_brief: object) -> str:
    """A short mood phrase derived from the brief for styling the scene."""
    one_line = (getattr(db_brief, "one_line_concept", "") or "").strip()
    summary = (getattr(db_brief, "summary", "") or "").strip()
    mood = one_line or summary
    return mood[:200]


def _build_mockup_prompts(
    *,
    mockup_types: list[str],
    wordmark: str,
    palette_name: str,
    brand_context: str,
    brand_mood: str,
) -> list[tuple[str, str]]:
    """Return a list of (mockup_type, prompt) for each requested, valid mockup type."""
    prompts: list[tuple[str, str]] = []
    for mtype in mockup_types:
        template = MOCKUP_PROMPT_TEMPLATES.get(mtype)
        if not template:
            continue
        scene_prompt = template.format(
            wordmark=wordmark or "the brand",
            palette_name=palette_name or "brand palette",
            palette_colors=brand_context or "brand colors",
            brand_mood=brand_mood or "premium and cohesive",
        )
        prompt = f"{MOCKUP_SYSTEM_PROMPT}\n\nSCENE:\n{scene_prompt}"
        prompts.append((mtype, prompt))
    return prompts


@router.post("/generate")
async def mockup_generate(
    request: MockupGenerateRequest,
    session: AsyncSession = Depends(get_session),
):
    try:
        db_brief = ensure_session_access(
            await get_brief_record(session, request.session_id),
            require_approved=True,
            require_strategy=True,
        )
        settings = get_settings()

        # Load the latest logo result for the source logo + palette/wordmark context
        logo_row = (
            await session.execute(
                select(DBLogoResult)
                .where(DBLogoResult.session_id == request.session_id)
                .order_by(DBLogoResult.created_at.desc())
                .limit(1)
            )
        ).scalar_one_or_none()

        if logo_row is None and not request.logo_image:
            raise HTTPException(
                status_code=400,
                detail="Generate a logo first before creating mockups.",
            )

        logo_settings = {}
        if logo_row and logo_row.settings:
            try:
                logo_settings = json.loads(logo_row.settings)
            except (json.JSONDecodeError, TypeError):
                logo_settings = {}

        # Resolve the logo image to apply (explicit request wins, else logo primary)
        logo_image = request.logo_image or (logo_row.generated_image if logo_row else "")

        wordmark = logo_settings.get("wordmark") or db_brief.brand_name
        palette_name = logo_settings.get("palette_name", "")

        # Validate / default the requested mockup types
        requested = [m for m in request.mockup_types if m in MOCKUP_TYPES]
        if not requested:
            requested = list(MOCKUP_TYPES)

        prompt_pairs = _build_mockup_prompts(
            mockup_types=requested,
            wordmark=wordmark,
            palette_name=palette_name,
            brand_context=request.brand_context,
            brand_mood=_brand_mood(db_brief),
        )

        # References: the logo image (applied onto the surface) + brief moodboard
        # images (style) + any user-pasted reference images.
        reference_images: list[dict] = []
        if logo_image:
            reference_images.append({"url": logo_image})
        reference_images.extend(_load_reference_images(db_brief))
        reference_images.extend({"url": u} for u in request.reference_images if u)

        generated_images = await generate_brand_images(
            prompts=[p for _, p in prompt_pairs],
            reference_images=reference_images or None,
            model=settings.scope_image_model,
        )

        # Archive generated mockups to .skill-archive
        try:
            import base64
            import datetime
            import os
            import re

            import httpx

            today = datetime.date.today().strftime("%Y-%m-%d")
            summary_name = wordmark or "unnamed-brand"
            summary_name = re.sub(r"[^a-zA-Z0-9\s-]", "", summary_name).strip().lower()
            summary_name = re.sub(r"[\s-]+", "-", summary_name) or "mockup"

            project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
            archive_dir = os.path.join(
                project_root, ".skill-archive", "mockup-creator", f"{today}-{summary_name}"
            )
            os.makedirs(archive_dir, exist_ok=True)
            print(f"[mockup] Archiving mockups to: {archive_dir}")

            async with httpx.AsyncClient() as client:
                for idx, img_data in enumerate(generated_images):
                    file_path = os.path.join(archive_dir, f"mockup-{idx + 1:02d}.png")
                    try:
                        if img_data.startswith("data:"):
                            _, base64_data = img_data.split(",", 1)
                            with open(file_path, "wb") as f:
                                f.write(base64.b64decode(base64_data))
                        else:
                            resp = await client.get(img_data, timeout=10.0)
                            if resp.status_code == 200:
                                with open(file_path, "wb") as f:
                                    f.write(resp.content)
                    except Exception as e:
                        print(f"[mockup] Failed to archive mockup {idx + 1}: {e}")
        except Exception as e:
            print(f"[mockup] Error setting up .skill-archive generation: {e}")

        # Persist
        used_types = [m for m, _ in prompt_pairs]
        session.add(
            DBMockupResult(
                session_id=request.session_id,
                mockup_types=json.dumps(used_types),
                settings=json.dumps(
                    {
                        "wordmark": wordmark,
                        "palette_name": palette_name,
                        "mockup_types": used_types,
                    }
                ),
                source_logo=logo_image or None,
                generated_images=json.dumps(generated_images),
            )
        )
        await session.commit()

        return {
            "mockup_types": used_types,
            "source_logo": logo_image or None,
            "generated_images": generated_images,
            "settings": {"wordmark": wordmark, "palette_name": palette_name},
        }
    except HTTPException:
        raise
    except Exception as exc:
        print(f"Error in /api/mockup/generate: {exc}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/{session_id}")
async def get_mockup_result(
    session_id: str,
    session: AsyncSession = Depends(get_session),
):
    """Get the latest mockup result for a session."""
    ensure_session_access(
        await get_brief_record(session, session_id),
        require_approved=True,
        require_strategy=True,
    )
    row = (
        await session.execute(
            select(DBMockupResult)
            .where(DBMockupResult.session_id == session_id)
            .order_by(DBMockupResult.created_at.desc())
            .limit(1)
        )
    ).scalar_one_or_none()
    if not row:
        return None
    return {
        "mockup_types": json.loads(row.mockup_types) if row.mockup_types else [],
        "source_logo": row.source_logo,
        "generated_images": json.loads(row.generated_images) if row.generated_images else [],
        "settings": json.loads(row.settings) if row.settings else {},
    }


@router.get("/{session_id}/all")
async def get_all_mockup_results(
    session_id: str,
    session: AsyncSession = Depends(get_session),
):
    """Get all mockup generation results for a session (gallery history)."""
    ensure_session_access(
        await get_brief_record(session, session_id),
        require_approved=True,
        require_strategy=True,
    )
    rows = (
        await session.execute(
            select(DBMockupResult)
            .where(DBMockupResult.session_id == session_id)
            .order_by(DBMockupResult.created_at.desc())
        )
    ).scalars().all()
    return [
        {
            "id": row.id,
            "mockup_types": json.loads(row.mockup_types) if row.mockup_types else [],
            "source_logo": row.source_logo,
            "generated_images": json.loads(row.generated_images) if row.generated_images else [],
            "settings": json.loads(row.settings) if row.settings else {},
            "created_at": row.created_at.isoformat() if row.created_at else None,
        }
        for row in rows
    ]
