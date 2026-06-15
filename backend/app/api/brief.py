"""
SCOPE Studio - Brand Brief Router.

Brief-first analysis, approval, and progress retrieval.
"""

import base64
import json
import traceback
import uuid
from typing import Any, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from langchain_core.messages import HumanMessage, SystemMessage
from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.model_factory import create_langchain_chat_llm
from app.agents.prompt_pipeline import run_brief_pipeline
from app.agents.prompts import BRIEF_SYSTEM_PROMPT
from app.core.config import get_settings
from app.core.database import get_session
from app.core.security import get_current_user, get_current_user_optional
from app.db.models import DBBrandNode, DBBrief, DBChatMessage, DBLogoResult, DBMarketingResult
from app.schemas.brief import BriefPillars, BriefResult, MarketingStandards

router = APIRouter(tags=["brief"])

PILLAR_NODE_CONFIG = [
    ("mission", "Mission", "mission"),
    ("vision", "Vision", "vision"),
    ("persona", "Target Persona", "persona"),
    ("values", "Core Values", "values"),
    ("tone", "Voice & Tone", "voice"),
    ("positioning", "Brand Promise", "promise"),
]


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


async def build_vision_notes(prompt: str, images: list[UploadFile]) -> dict[str, Any]:
    if not images:
        return {
            "vision_notes": "No reference images were supplied. Rely on the written brief only.",
            "visual_cues": [],
            "competitive_signals": [],
        }

    settings = get_settings()
    multimodal_llm = create_langchain_chat_llm(
        model=settings.scope_multimodal_model,
        temperature=0.1,
    )

    content_parts: list[dict[str, Any]] = [
        {
            "type": "text",
            "text": (
                "Analyze these reference images only for brand-relevant visual direction.\n"
                "Return strict JSON with keys `vision_notes`, `visual_cues`, and `competitive_signals`.\n"
                "Ignore people identity. Focus on color, material, composition, typography, lighting, and market cues.\n"
                f"User brief: {prompt}"
            ),
        }
    ]

    for img_file in images:
        content = await img_file.read()
        if not content:
            continue
        encoded = base64.b64encode(content).decode("utf-8")
        mime = img_file.content_type or "image/png"
        content_parts.append(
            {
                "type": "image_url",
                "image_url": {"url": f"data:{mime};base64,{encoded}", "detail": "auto"},
            }
        )

    try:
        response = await multimodal_llm.ainvoke(
            [
                SystemMessage(
                    content=(
                        BRIEF_SYSTEM_PROMPT
                        + "\n\nVISUAL ANALYSIS MODE:\n"
                        + "- Return strict JSON only.\n"
                        + "- Use `vision_notes` for a concise design-direction summary.\n"
                        + "- Use `visual_cues` for style, typography, layout, material, and color cues.\n"
                        + "- Use `competitive_signals` for market/category patterns inferred from the references.\n"
                    )
                ),
                HumanMessage(content=content_parts),
            ]
        )
        parsed = extract_json_block(str(response.content))
        return {
            "vision_notes": parsed.get("vision_notes", ""),
            "visual_cues": parsed.get("visual_cues", []),
            "competitive_signals": parsed.get("competitive_signals", []),
        }
    except Exception:
        return {
            "vision_notes": "Reference images were provided, but the model could not extract reliable visual notes. Continue from the written brief.",
            "visual_cues": [],
            "competitive_signals": [],
        }


async def reset_downstream_state(session: AsyncSession, session_id: str) -> None:
    await session.execute(
        update(DBBrandNode)
        .where(DBBrandNode.session_id == session_id, DBBrandNode.is_active == True)  # noqa: E712
        .values(is_active=False)
    )
    await session.execute(delete(DBChatMessage).where(DBChatMessage.session_id == session_id))
    await session.execute(delete(DBMarketingResult).where(DBMarketingResult.session_id == session_id))
    await session.execute(delete(DBLogoResult).where(DBLogoResult.session_id == session_id))


async def sync_strategy_nodes(
    session: AsyncSession,
    *,
    session_id: str,
    user_id: uuid.UUID | None,
    pillars_dict: dict[str, str],
) -> bool:
    target_nodes = [
        {
            "type": node_type,
            "title": title,
            "content": (pillars_dict.get(pillar_key, "") or "").strip(),
        }
        for node_type, title, pillar_key in PILLAR_NODE_CONFIG
    ]

    active_result = await session.execute(
        select(DBBrandNode)
        .where(
            DBBrandNode.session_id == session_id,
            DBBrandNode.is_active == True,  # noqa: E712
        )
        .order_by(DBBrandNode.id.asc())
    )
    active_nodes = active_result.scalars().all()
    current_nodes = [
        {
            "type": node.node_type,
            "title": node.title,
            "content": (node.content or "").strip(),
        }
        for node in active_nodes
    ]

    if current_nodes == target_nodes:
        return False

    version_result = await session.execute(
        select(DBBrandNode.version)
        .where(DBBrandNode.session_id == session_id)
        .order_by(DBBrandNode.version.desc())
        .limit(1)
    )
    next_version = (version_result.scalar_one_or_none() or 0) + 1

    if active_nodes:
        await session.execute(
            update(DBBrandNode)
            .where(DBBrandNode.session_id == session_id, DBBrandNode.is_active == True)  # noqa: E712
            .values(is_active=False)
        )

    for node in target_nodes:
        session.add(
            DBBrandNode(
                session_id=session_id,
                user_id=user_id,
                version=next_version,
                is_active=True,
                node_type=node["type"],
                title=node["title"],
                content=node["content"],
            )
        )

    return True


@router.post("/api/brief/analyze", response_model=BriefResult)
async def brief_analyze(
    session_id: str = Form(...),
    prompt: str = Form(...),
    region: str = Form(...),
    images: list[UploadFile] = File(default=[]),
    session: AsyncSession = Depends(get_session),
    current_user: Optional[dict] = Depends(get_current_user_optional),
) -> BriefResult:
    try:
        vision = await build_vision_notes(prompt, images)
        pipeline = run_brief_pipeline(
            user_prompt=prompt,
            region=region,
            vision_notes=vision["vision_notes"],
        )

        if not pipeline.evaluation["passed"]:
            raise HTTPException(
                status_code=502,
                detail=f"Brief quality gate failed: {', '.join(pipeline.evaluation['issues'])}",
            )

        pillars_data = pipeline.generated["pillars"]
        marketing_data = pipeline.generated["marketing_standards"]

        brief_result = BriefResult(
            brand_name=pipeline.generated["brand_name"],
            industry=pipeline.generated["industry"],
            summary=pipeline.generated["summary"],
            region=pipeline.region,
            pillars=BriefPillars(
                mission=pillars_data.get("mission", ""),
                vision=pillars_data.get("vision", ""),
                persona=pillars_data.get("persona", ""),
                values=pillars_data.get("values", ""),
                voice=pillars_data.get("voice", ""),
                promise=pillars_data.get("promise", ""),
            ),
            marketing_standards=MarketingStandards(
                audience=marketing_data.get("audience", ""),
                positioning=marketing_data.get("positioning", ""),
                value_proposition=marketing_data.get("value_proposition", ""),
                reasons_to_believe=list(marketing_data.get("reasons_to_believe", [])),
                recommended_channels=list(marketing_data.get("recommended_channels", [])),
                compliance_cultural_notes=list(marketing_data.get("compliance_cultural_notes", [])),
                competitive_context=marketing_data.get("competitive_context", ""),
            ),
            visual_cues=list(
                dict.fromkeys(
                    list(vision.get("visual_cues", [])) + list(pipeline.generated.get("visual_cues", []))
                )
            ),
            competitive_signals=list(
                dict.fromkeys(
                    list(vision.get("competitive_signals", []))
                    + list(pipeline.generated.get("competitive_signals", []))
                )
            ),
            recommended_next=pipeline.generated["recommended_next"],
        )

        user_uuid = uuid.UUID(current_user["sub"]) if current_user else None
        stmt = select(DBBrief).where(DBBrief.session_id == session_id)
        res = await session.execute(stmt)
        db_brief = res.scalar_one_or_none()

        payload = {
            "brand_name": brief_result.brand_name,
            "industry": brief_result.industry,
            "summary": brief_result.summary,
            "pillars": json.dumps(brief_result.pillars.model_dump()),
            "marketing_standards": json.dumps(brief_result.marketing_standards.model_dump()),
            "visual_cues": json.dumps(brief_result.visual_cues),
            "competitive_signals": json.dumps(brief_result.competitive_signals),
            "recommended_next": brief_result.recommended_next,
            "region": brief_result.region,
            "approved": False,
            "strategy_confirmed": False,
            "user_id": user_uuid,
        }

        if db_brief:
            for key, value in payload.items():
                setattr(db_brief, key, value)
        else:
            db_brief = DBBrief(session_id=session_id, **payload)
            session.add(db_brief)

        await reset_downstream_state(session, session_id)
        await session.commit()
        return brief_result
    except HTTPException:
        raise
    except Exception as exc:
        print(f"Error in /api/brief/analyze: {exc}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/api/brief/approve/{session_id}")
async def brief_approve(
    session_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: Optional[dict] = Depends(get_current_user_optional),
):
    try:
        result = await session.execute(select(DBBrief).where(DBBrief.session_id == session_id))
        db_brief = result.scalar_one_or_none()
        if not db_brief:
            raise HTTPException(status_code=404, detail="Brief not found for this session")

        user_uuid = uuid.UUID(current_user["sub"]) if current_user else None
        pillars_dict = json.loads(db_brief.pillars or "{}")
        nodes_changed = await sync_strategy_nodes(
            session,
            session_id=session_id,
            user_id=user_uuid,
            pillars_dict=pillars_dict,
        )
        await session.execute(delete(DBChatMessage).where(DBChatMessage.session_id == session_id))
        db_brief.approved = True
        db_brief.strategy_confirmed = False

        await session.commit()
        return {
            "status": "success",
            "message": "Brief approved and strategy synced",
            "nodes_changed": nodes_changed,
        }
    except HTTPException:
        raise
    except Exception as exc:
        print(f"Error in /api/brief/approve: {exc}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/api/brief/confirm-strategy/{session_id}")
async def brief_confirm_strategy(
    session_id: str,
    session: AsyncSession = Depends(get_session),
):
    try:
        result = await session.execute(select(DBBrief).where(DBBrief.session_id == session_id))
        db_brief = result.scalar_one_or_none()
        if not db_brief:
            raise HTTPException(status_code=404, detail="Brief not found")
        if not db_brief.approved:
            raise HTTPException(status_code=409, detail="Approve the brief before confirming strategy")
        if db_brief.strategy_confirmed:
            return {"status": "success", "message": "Strategy already confirmed"}
        db_brief.strategy_confirmed = True
        await session.commit()
        return {"status": "success", "message": "Strategy confirmed, studios unlocked"}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/api/brief/{session_id}")
async def get_brief(
    session_id: str,
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(select(DBBrief).where(DBBrief.session_id == session_id))
    db_brief = result.scalar_one_or_none()

    if not db_brief:
        return {
            "approved": False,
            "strategy_confirmed": False,
            "brand_name": "",
            "industry": "",
            "summary": "",
            "region": "usa",
            "pillars": None,
            "marketing_standards": {
                "audience": "",
                "positioning": "",
                "value_proposition": "",
                "reasons_to_believe": [],
                "recommended_channels": [],
                "compliance_cultural_notes": [],
                "competitive_context": "",
            },
            "visual_cues": [],
            "competitive_signals": [],
            "recommended_next": "",
        }

    return {
        "approved": db_brief.approved,
        "strategy_confirmed": db_brief.strategy_confirmed,
        "brand_name": db_brief.brand_name,
        "industry": db_brief.industry,
        "summary": db_brief.summary,
        "region": db_brief.region,
        "pillars": json.loads(db_brief.pillars) if db_brief.pillars else None,
        "marketing_standards": json.loads(db_brief.marketing_standards) if db_brief.marketing_standards else {},
        "visual_cues": json.loads(db_brief.visual_cues) if db_brief.visual_cues else [],
        "competitive_signals": json.loads(db_brief.competitive_signals) if db_brief.competitive_signals else [],
        "recommended_next": db_brief.recommended_next,
    }


@router.get("/api/briefs")
async def get_my_briefs(
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user),
):
    try:
        user_uuid = uuid.UUID(current_user["sub"])
        result = await session.execute(
            select(DBBrief).where(DBBrief.user_id == user_uuid).order_by(DBBrief.created_at.desc())
        )
        briefs = result.scalars().all()
        return [
            {
                "session_id": brief.session_id,
                "brand_name": brief.brand_name,
                "industry": brief.industry,
                "region": brief.region,
                "approved": brief.approved,
                "strategy_confirmed": brief.strategy_confirmed,
                "created_at": brief.created_at.isoformat() if brief.created_at else None,
            }
            for brief in briefs
        ]
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/api/brief/identity-preview/{session_id}")
async def get_identity_preview(
    session_id: str,
    session: AsyncSession = Depends(get_session),
):
    """Returns the minimal data needed for BrandIdentityGate without re-running the agent."""
    result = await session.execute(select(DBBrief).where(DBBrief.session_id == session_id))
    db_brief = result.scalar_one_or_none()
    if not db_brief or not db_brief.approved:
        raise HTTPException(status_code=404, detail="Brief not found or not approved")

    active_nodes_result = await session.execute(
        select(DBBrandNode).where(
            DBBrandNode.session_id == session_id,
            DBBrandNode.is_active == True,  # noqa: E712
        )
    )
    active_nodes = active_nodes_result.scalars().all()

    return {
        "brand_name": db_brief.brand_name,
        "visual_cues": json.loads(db_brief.visual_cues) if db_brief.visual_cues else [],
        "nodes_summary": [
            {"type": n.node_type, "title": n.title, "content": n.content[:120]}
            for n in active_nodes
        ],
        "strategy_confirmed": db_brief.strategy_confirmed,
    }
