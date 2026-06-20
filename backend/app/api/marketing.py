"""
SCOPE Studio - Marketing Engine + Ideas Factory ("Refraction Engine").

A 7-step engine, one upsert row per session (DBMarketingEngine):
  1 Brand Identity Analysis   (image upload)
  2 Product Analysis          (image upload)
  3 Audience Profiler         (auto)
  4 Visual DNA Extractor      (moodboard upload)
  5 Social Media Plan         (auto)
  6 Hook Generator            (auto)
  7 Ad Copy A/B + creatives   (auto + image generation)

Step endpoints stream Server-Sent Events (text/event-stream) so the frontend
"Centrifuge" can show live progress. `flags` is a needs_update map powering the
live-sync "Needs Update" badges.
"""

import base64
import json
import traceback
from collections.abc import AsyncGenerator

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from langchain_core.messages import HumanMessage, SystemMessage
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.image_gen import generate_brand_images
from app.agents.model_factory import create_langchain_chat_llm
from app.agents.prompts import (
    AD_COPY_PROMPT,
    AUDIENCE_PROFILER_PROMPT,
    BRAND_IDENTITY_PROMPT,
    HOOK_GENERATOR_PROMPT,
    PRODUCT_ANALYSIS_PROMPT,
    SOCIAL_MEDIA_PLAN_PROMPT,
    VISUAL_DNA_PROMPT,
)
from app.agents.session_access import ensure_session_access, get_brief_record
from app.core.config import get_settings
from app.core.database import get_session
from app.core.security import get_current_user_optional
from app.db.models import DBBrandNode, DBLogoResult, DBMarketingEngine
from app.schemas.marketing import AdCopyRequest, HooksRequest, MarketingStepUpdate, SocialPlanRequest

router = APIRouter(prefix="/api/marketing", tags=["marketing"])

# Step JSON columns on DBMarketingEngine.
STEP_COLUMNS = (
    "brand_identity",
    "product_blueprint",
    "audience",
    "visual_dna",
    "social_plan",
    "hooks",
    "ad_copy",
)

# When a step (re)generates or is edited, these downstream steps go stale.
DOWNSTREAM = {
    "brand_identity": ["audience", "visual_dna", "social_plan", "hooks", "ad_copy"],
    "product_blueprint": ["audience", "visual_dna", "social_plan", "hooks", "ad_copy"],
    "audience": ["social_plan", "hooks", "ad_copy"],
    "visual_dna": ["social_plan", "ad_copy"],
    "social_plan": ["hooks", "ad_copy"],
    "hooks": ["ad_copy"],
    "ad_copy": [],
}


# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #


def _sse(payload: dict) -> str:
    return f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"


_SSE_HEADERS = {"Cache-Control": "no-cache", "X-Accel-Buffering": "no", "Connection": "keep-alive"}


def _parse_json(text: str) -> dict:
    text = (text or "").strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1] if "\n" in text else text[3:]
        if text.endswith("```"):
            text = text[:-3]
    return json.loads(text.strip())


def _arabic_directive(db_brief: object) -> str:
    if getattr(db_brief, "language", "") == "ar":
        return (
            "\n\nCRITICAL LANGUAGE RULE:\n"
            "- The working language is Arabic.\n"
            "- You MUST write every human-readable string value in Modern Standard Arabic only.\n"
            "- Keep JSON keys, hex codes, and CSS gradients in English/Latin."
        )
    return ""


async def _run_json(system: str, user_content, db_brief: object, *, multimodal: bool = False) -> dict:
    """Single LLM call returning parsed JSON."""
    settings = get_settings()
    model = settings.scope_multimodal_model if multimodal else settings.scope_text_model
    llm = create_langchain_chat_llm(model=model)
    response = await llm.ainvoke(
        [
            SystemMessage(content=system + _arabic_directive(db_brief)),
            HumanMessage(content=user_content),
        ]
    )
    return _parse_json(str(response.content))


async def _brand_context(session: AsyncSession, session_id: str, db_brief: object) -> str:
    nodes = (
        await session.execute(
            select(DBBrandNode).where(
                DBBrandNode.session_id == session_id,
                DBBrandNode.is_active == True,  # noqa: E712
            )
        )
    ).scalars().all()
    parts: list[str] = []
    if nodes:
        parts.append(
            "EXISTING BRAND STRATEGY:\n"
            + "\n".join(f"- {n.node_type.title()}: {n.title} - {n.content}" for n in nodes)
        )
    if getattr(db_brief, "marketing_standards", ""):
        parts.append(f"BRIEF MARKETING STANDARDS:\n{db_brief.marketing_standards}")
    return "\n\n".join(parts)


def _image_parts(images: list[tuple[str, bytes]]) -> list[dict]:
    parts: list[dict] = []
    for mime, content in images:
        if not content:
            continue
        encoded = base64.b64encode(content).decode("utf-8")
        parts.append(
            {"type": "image_url", "image_url": {"url": f"data:{mime};base64,{encoded}", "detail": "auto"}}
        )
    return parts


async def _read_uploads(images: list[UploadFile]) -> list[tuple[str, bytes]]:
    return [((f.content_type or "image/png"), await f.read()) for f in images]


async def _get_or_create_engine(session: AsyncSession, session_id: str) -> DBMarketingEngine:
    row = (
        await session.execute(select(DBMarketingEngine).where(DBMarketingEngine.session_id == session_id))
    ).scalar_one_or_none()
    if row is None:
        row = DBMarketingEngine(session_id=session_id)
        session.add(row)
        await session.flush()
    return row


def _load(row: DBMarketingEngine, column: str) -> dict:
    raw = getattr(row, column, None)
    try:
        return json.loads(raw) if raw else {}
    except (json.JSONDecodeError, TypeError):
        return {}


def _mark_downstream(flags: dict, step: str) -> dict:
    flags[step] = False
    for d in DOWNSTREAM.get(step, []):
        flags[d] = True
    return flags


async def _latest_logo(session: AsyncSession, session_id: str) -> str | None:
    row = (
        await session.execute(
            select(DBLogoResult)
            .where(DBLogoResult.session_id == session_id)
            .order_by(DBLogoResult.created_at.desc())
            .limit(1)
        )
    ).scalar_one_or_none()
    return row.generated_image if row else None


async def _resolve_context(
    session: AsyncSession,
    *,
    session_id: str,
    reference_session_id: str,
    current_user: dict | None,
) -> tuple[str, object]:
    """Resolve which brand the engine draws context from.

    Returns (context_session, db_brief). When `reference_session_id` is set, the
    brand DNA (brief, strategy, visual identity, logo) is loaded from that
    historical session instead of the current one — gating on the *reference*
    brief and verifying it belongs to the caller.
    """
    context_session = reference_session_id or session_id
    db_brief = ensure_session_access(
        await get_brief_record(session, context_session),
        require_approved=True,
        require_strategy=True,
    )
    if reference_session_id and current_user is not None:
        owner = getattr(db_brief, "user_id", None)
        if owner is not None and str(owner) != current_user.get("sub"):
            raise HTTPException(status_code=403, detail="You don't have access to that brand")
    return context_session, db_brief


# --------------------------------------------------------------------------- #
# Marketing Engine — Steps 1→2→3 (multipart, SSE)
# --------------------------------------------------------------------------- #


@router.post("/analyze")
async def marketing_analyze(
    session_id: str = Form(...),
    reference_session_id: str = Form(""),
    materials: str = Form(""),
    pricing_tier: str = Form(""),
    region: str = Form(""),
    channels: str = Form(""),
    category: str = Form(""),
    stage: str = Form(""),
    brand_images: list[UploadFile] = File(default=[]),
    product_images: list[UploadFile] = File(default=[]),
    session: AsyncSession = Depends(get_session),
    current_user: dict | None = Depends(get_current_user_optional),
):
    context_session, db_brief = await _resolve_context(
        session,
        session_id=session_id,
        reference_session_id=reference_session_id,
        current_user=current_user,
    )
    brand_bytes = await _read_uploads(brand_images)
    product_bytes = await _read_uploads(product_images)
    brand_ctx = await _brand_context(session, context_session, db_brief)
    context_fields = "\n".join(
        f"{label}: {value}"
        for label, value in [
            ("Materials", materials),
            ("Pricing tier", pricing_tier),
            ("Primary region", region or db_brief.region),
            ("Channels", channels),
            ("Category", category),
            ("Stage", stage),
        ]
        if value
    )
    row = await _get_or_create_engine(session, session_id)

    async def gen() -> AsyncGenerator[str, None]:
        try:
            flags = _load(row, "flags")

            yield _sse({"stage": "brand_identity", "status": "running", "message": "Isolating Brand Archetype..."})
            brand_identity = await _run_json(
                BRAND_IDENTITY_PROMPT,
                [
                    {"type": "text", "text": f"BRAND STRATEGY CONTEXT:\n{brand_ctx}\n\nCONTEXT FIELDS:\n{context_fields}"},
                    *_image_parts(brand_bytes),
                ],
                db_brief,
                multimodal=True,
            )
            row.brand_identity = json.dumps(brand_identity, ensure_ascii=False)
            yield _sse({"stage": "brand_identity", "status": "done", "result": brand_identity})

            yield _sse({"stage": "product_blueprint", "status": "running", "message": "Refracting Product Signal..."})
            product = await _run_json(
                PRODUCT_ANALYSIS_PROMPT,
                [
                    {"type": "text", "text": f"BRAND IDENTITY:\n{json.dumps(brand_identity)}\n\nCONTEXT FIELDS:\n{context_fields}"},
                    *_image_parts(product_bytes),
                ],
                db_brief,
                multimodal=True,
            )
            row.product_blueprint = json.dumps(product, ensure_ascii=False)
            yield _sse({"stage": "product_blueprint", "status": "done", "result": product})

            yield _sse({"stage": "audience", "status": "running", "message": "Profiling Audience Segments..."})
            audience = await _run_json(
                AUDIENCE_PROFILER_PROMPT,
                (
                    f"BRAND IDENTITY:\n{json.dumps(brand_identity)}\n\n"
                    f"MARKET BLUEPRINT:\n{json.dumps(product)}\n\n"
                    f"PLATFORM FOCUS: {channels or 'Instagram, TikTok'}\nNUMBER OF SEGMENTS: 2"
                ),
                db_brief,
            )
            row.audience = json.dumps(audience, ensure_ascii=False)
            row.context_data = json.dumps(
                {
                    "materials": materials,
                    "pricing_tier": pricing_tier,
                    "region": region or db_brief.region,
                    "channels": channels,
                    "category": category,
                    "stage": stage,
                }
            )

            # Re-running the engine front (1-3) makes every downstream step stale.
            for d in ("audience", "visual_dna", "social_plan", "hooks", "ad_copy"):
                flags[d] = True
            for d in ("brand_identity", "product_blueprint", "audience"):
                flags[d] = False
            row.flags = json.dumps(flags)
            await session.commit()

            yield _sse({"stage": "audience", "status": "done", "result": audience})
            yield _sse({"stage": "all", "status": "done", "flags": flags})
        except Exception as exc:  # noqa: BLE001
            traceback.print_exc()
            yield _sse({"stage": "error", "status": "error", "message": str(exc)})

    return StreamingResponse(gen(), media_type="text/event-stream", headers=_SSE_HEADERS)


# --------------------------------------------------------------------------- #
# Ideas Factory — Steps 4..7
# --------------------------------------------------------------------------- #


@router.post("/ideas/visual-dna")
async def visual_dna(
    session_id: str = Form(...),
    reference_session_id: str = Form(""),
    moodboard_images: list[UploadFile] = File(default=[]),
    session: AsyncSession = Depends(get_session),
    current_user: dict | None = Depends(get_current_user_optional),
):
    _, db_brief = await _resolve_context(
        session,
        session_id=session_id,
        reference_session_id=reference_session_id,
        current_user=current_user,
    )
    moodboard_bytes = (await _read_uploads(moodboard_images))[:9]
    row = await _get_or_create_engine(session, session_id)
    product = _load(row, "product_blueprint")

    async def gen() -> AsyncGenerator[str, None]:
        try:
            yield _sse({"stage": "visual_dna", "status": "running", "message": "Extracting Visual DNA..."})
            dna = await _run_json(
                VISUAL_DNA_PROMPT,
                [
                    {"type": "text", "text": f"MARKET ANALYSIS:\n{json.dumps(product)}"},
                    *_image_parts(moodboard_bytes),
                ],
                db_brief,
                multimodal=True,
            )
            row.visual_dna = json.dumps(dna, ensure_ascii=False)
            flags = _mark_downstream(_load(row, "flags"), "visual_dna")
            row.flags = json.dumps(flags)
            await session.commit()
            yield _sse({"stage": "visual_dna", "status": "done", "result": dna, "flags": flags})
        except Exception as exc:  # noqa: BLE001
            traceback.print_exc()
            yield _sse({"stage": "error", "status": "error", "message": str(exc)})

    return StreamingResponse(gen(), media_type="text/event-stream", headers=_SSE_HEADERS)


@router.post("/ideas/social-plan")
async def social_plan(
    request: SocialPlanRequest,
    session: AsyncSession = Depends(get_session),
    current_user: dict | None = Depends(get_current_user_optional),
):
    _, db_brief = await _resolve_context(
        session,
        session_id=request.session_id,
        reference_session_id=request.reference_session_id,
        current_user=current_user,
    )
    row = await _get_or_create_engine(session, request.session_id)
    brand_identity, audience, dna = _load(row, "brand_identity"), _load(row, "audience"), _load(row, "visual_dna")

    async def gen() -> AsyncGenerator[str, None]:
        try:
            yield _sse({"stage": "social_plan", "status": "running", "message": "Mapping Content Pillars..."})
            plan = await _run_json(
                SOCIAL_MEDIA_PLAN_PROMPT,
                (
                    f"BRAND IDENTITY:\n{json.dumps(brand_identity)}\n\n"
                    f"AUDIENCE:\n{json.dumps(audience)}\n\n"
                    f"VISUAL DNA:\n{json.dumps(dna)}\n\n"
                    f"TIMEFRAME: {request.timeframe}\nPLATFORMS: {request.platforms}\n"
                    f"CONTENT MIX RATIO: {request.content_mix}"
                ),
                db_brief,
            )
            row.social_plan = json.dumps(plan, ensure_ascii=False)
            flags = _mark_downstream(_load(row, "flags"), "social_plan")
            row.flags = json.dumps(flags)
            await session.commit()
            yield _sse({"stage": "social_plan", "status": "done", "result": plan, "flags": flags})
        except Exception as exc:  # noqa: BLE001
            traceback.print_exc()
            yield _sse({"stage": "error", "status": "error", "message": str(exc)})

    return StreamingResponse(gen(), media_type="text/event-stream", headers=_SSE_HEADERS)


@router.post("/ideas/hooks")
async def hooks(
    request: HooksRequest,
    session: AsyncSession = Depends(get_session),
    current_user: dict | None = Depends(get_current_user_optional),
):
    _, db_brief = await _resolve_context(
        session,
        session_id=request.session_id,
        reference_session_id=request.reference_session_id,
        current_user=current_user,
    )
    row = await _get_or_create_engine(session, request.session_id)
    brand_identity, audience, plan = _load(row, "brand_identity"), _load(row, "audience"), _load(row, "social_plan")

    async def gen() -> AsyncGenerator[str, None]:
        try:
            yield _sse({"stage": "hooks", "status": "running", "message": "Generating Scroll-Stoppers..."})
            result = await _run_json(
                HOOK_GENERATOR_PROMPT,
                (
                    f"AUDIENCE:\n{json.dumps(audience)}\n\n"
                    f"BRAND IDENTITY:\n{json.dumps(brand_identity)}\n\n"
                    f"SOCIAL MEDIA PLAN:\n{json.dumps(plan)}\n\n"
                    f"PLATFORM: {request.platform}\nHOOK TYPE: {request.hook_type}\nQUANTITY: {request.quantity}"
                ),
                db_brief,
            )
            row.hooks = json.dumps(result, ensure_ascii=False)
            flags = _mark_downstream(_load(row, "flags"), "hooks")
            row.flags = json.dumps(flags)
            await session.commit()
            yield _sse({"stage": "hooks", "status": "done", "result": result, "flags": flags})
        except Exception as exc:  # noqa: BLE001
            traceback.print_exc()
            yield _sse({"stage": "error", "status": "error", "message": str(exc)})

    return StreamingResponse(gen(), media_type="text/event-stream", headers=_SSE_HEADERS)


@router.post("/ideas/ad-copy")
async def ad_copy(
    request: AdCopyRequest,
    session: AsyncSession = Depends(get_session),
    current_user: dict | None = Depends(get_current_user_optional),
):
    context_session, db_brief = await _resolve_context(
        session,
        session_id=request.session_id,
        reference_session_id=request.reference_session_id,
        current_user=current_user,
    )
    row = await _get_or_create_engine(session, request.session_id)
    blueprint = _load(row, "product_blueprint")
    brand_identity, audience, dna = _load(row, "brand_identity"), _load(row, "audience"), _load(row, "visual_dna")
    all_hooks = _load(row, "hooks").get("hooks", [])
    selected = [h for h in all_hooks if h.get("id") in request.selected_hook_ids] or all_hooks
    # Use the referenced brand's logo (if any) as the ad-creative reference image.
    logo = await _latest_logo(session, context_session)

    async def gen() -> AsyncGenerator[str, None]:
        try:
            yield _sse({"stage": "ad_copy", "status": "running", "message": "Colliding Copy Variants..."})
            ad = await _run_json(
                AD_COPY_PROMPT,
                (
                    f"MARKET BLUEPRINT:\n{json.dumps(blueprint)}\n\n"
                    f"BRAND IDENTITY:\n{json.dumps(brand_identity)}\n\n"
                    f"AUDIENCE:\n{json.dumps(audience)}\n\n"
                    f"VISUAL DNA:\n{json.dumps(dna)}\n\n"
                    f"SELECTED HOOKS:\n{json.dumps(selected)}\n\n"
                    f"AD OBJECTIVE: {request.objective}\nFORMAT: {request.format}\n"
                    f"LANGUAGE: {request.language or db_brief.language}\nNUMBER OF VARIANTS: {request.variants}"
                ),
                db_brief,
            )
            row.ad_copy = json.dumps(ad, ensure_ascii=False)

            yield _sse({"stage": "ad_creatives", "status": "running", "message": "Rendering Ad Creatives..."})
            variants = ad.get("variants", []) if isinstance(ad, dict) else []
            prompts = [v.get("image_prompt") or v.get("headline", "") for v in variants if (v.get("image_prompt") or v.get("headline"))]
            references = [{"url": logo}] if logo else None
            creatives = await generate_brand_images(prompts=prompts, reference_images=references) if prompts else []
            row.ad_creatives = json.dumps(creatives, ensure_ascii=False)

            flags = _load(row, "flags")
            flags["ad_copy"] = False
            row.flags = json.dumps(flags)
            await session.commit()
            yield _sse(
                {"stage": "ad_copy", "status": "done", "result": ad, "ad_creatives": creatives, "flags": flags}
            )
        except Exception as exc:  # noqa: BLE001
            traceback.print_exc()
            yield _sse({"stage": "error", "status": "error", "message": str(exc)})

    return StreamingResponse(gen(), media_type="text/event-stream", headers=_SSE_HEADERS)


# --------------------------------------------------------------------------- #
# Read + manual edit
# --------------------------------------------------------------------------- #


def _serialize(row: DBMarketingEngine) -> dict:
    product = _load(row, "product_blueprint")
    audience = _load(row, "audience")
    hooks_data = _load(row, "hooks")
    return {
        "brand_identity": _load(row, "brand_identity"),
        "product_blueprint": product,
        "audience": audience,
        "visual_dna": _load(row, "visual_dna"),
        "social_plan": _load(row, "social_plan"),
        "hooks": hooks_data,
        "ad_copy": _load(row, "ad_copy"),
        "ad_creatives": _load(row, "ad_creatives") if isinstance(_load(row, "ad_creatives"), list) else json.loads(row.ad_creatives or "[]"),
        "context_data": _load(row, "context_data"),
        "flags": _load(row, "flags"),
        # Legacy convenience for existing dashboard cards.
        "blueprint": product.get("blueprint", {}),
        "personas": audience.get("personas", []),
    }


@router.get("/{session_id}")
async def get_marketing_result(session_id: str, session: AsyncSession = Depends(get_session)):
    ensure_session_access(
        await get_brief_record(session, session_id), require_approved=True, require_strategy=True
    )
    row = (
        await session.execute(select(DBMarketingEngine).where(DBMarketingEngine.session_id == session_id))
    ).scalar_one_or_none()
    if not row:
        return None
    return _serialize(row)


@router.put("/{session_id}/step/{name}")
async def update_step(
    session_id: str,
    name: str,
    payload: MarketingStepUpdate,
    session: AsyncSession = Depends(get_session),
):
    ensure_session_access(
        await get_brief_record(session, session_id), require_approved=True, require_strategy=True
    )
    if name not in STEP_COLUMNS:
        raise HTTPException(status_code=400, detail=f"Unknown step '{name}'")
    row = await _get_or_create_engine(session, session_id)
    setattr(row, name, json.dumps(payload.data, ensure_ascii=False))
    flags = _mark_downstream(_load(row, "flags"), name)
    row.flags = json.dumps(flags)
    await session.commit()
    return {"status": "ok", "flags": flags}
