"""
SCOPE Studio - Marketing Engine Router.
"""

import json
import traceback

from fastapi import APIRouter, Depends, HTTPException
from langchain_core.messages import HumanMessage, SystemMessage
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.model_factory import create_langchain_chat_llm
from app.agents.prompts import MARKETING_SYSTEM_PROMPT
from app.agents.session_access import ensure_session_access, get_brief_record
from app.core.database import get_session
from app.db.models import DBBrandNode, DBMarketingResult
from app.schemas.marketing import MarketingAnalyzeRequest

router = APIRouter(prefix="/api/marketing", tags=["marketing"])


@router.post("/analyze")
async def marketing_analyze(
    request: MarketingAnalyzeRequest,
    session: AsyncSession = Depends(get_session),
):
    response_text = ""
    try:
        db_brief = ensure_session_access(
            await get_brief_record(session, request.session_id),
            require_approved=True,
            require_strategy=True,
        )
        llm = create_langchain_chat_llm()

        context_parts: list[str] = []
        if request.materials:
            context_parts.append(f"Materials: {request.materials}")
        if request.pricing_tier:
            context_parts.append(f"Pricing tier: {request.pricing_tier}")
        context_parts.append(f"Primary region: {request.region or db_brief.region}")
        if request.channels:
            context_parts.append(f"Channels: {request.channels}")
        if request.category:
            context_parts.append(f"Category: {request.category}")
        if request.stage:
            context_parts.append(f"Stage: {request.stage}")

        active_nodes_result = await session.execute(
            select(DBBrandNode).where(
                DBBrandNode.session_id == request.session_id,
                DBBrandNode.is_active == True,  # noqa: E712
            )
        )
        active_nodes = active_nodes_result.scalars().all()
        if active_nodes:
            brand_context = "\n".join(
                f"- {node.node_type.title()}: {node.title} - {node.content}" for node in active_nodes
            )
            context_parts.insert(0, f"EXISTING BRAND STRATEGY:\n{brand_context}")

        context_parts.insert(
            1,
            f"BRIEF MARKETING STANDARDS:\n{db_brief.marketing_standards}",
        )
        joined_context = "\n".join(context_parts)

        response = await llm.ainvoke(
            [
                SystemMessage(content=MARKETING_SYSTEM_PROMPT),
                HumanMessage(content=f"Analyze this product/brand:\n\n{joined_context}"),
            ]
        )
        response_text = str(response.content).strip()
        if response_text.startswith("```"):
            response_text = response_text.split("\n", 1)[1]
            if response_text.endswith("```"):
                response_text = response_text[:-3].strip()
        parsed_result = json.loads(response_text)

        session.add(
            DBMarketingResult(
                session_id=request.session_id,
                blueprint=json.dumps(parsed_result.get("blueprint", {})),
                personas=json.dumps(parsed_result.get("personas", [])),
                hooks=json.dumps(parsed_result.get("hooks", [])),
                context_data=json.dumps(
                    {
                        "materials": request.materials,
                        "pricing_tier": request.pricing_tier,
                        "region": request.region or db_brief.region,
                        "channels": request.channels,
                        "category": request.category,
                        "stage": request.stage,
                    }
                ),
            )
        )
        await session.commit()
        return parsed_result
    except HTTPException:
        raise
    except json.JSONDecodeError as exc:
        print(f"JSON parse error in marketing analyze: {exc}")
        print(f"Raw response: {response_text}")
        raise HTTPException(status_code=500, detail=f"AI returned invalid JSON: {exc}")
    except Exception as exc:
        print(f"Error in /api/marketing/analyze: {exc}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/{session_id}")
async def get_marketing_result(
    session_id: str,
    session: AsyncSession = Depends(get_session),
):
    ensure_session_access(await get_brief_record(session, session_id), require_approved=True, require_strategy=True)
    result = await session.execute(
        select(DBMarketingResult)
        .where(DBMarketingResult.session_id == session_id)
        .order_by(DBMarketingResult.created_at.desc())
        .limit(1)
    )
    row = result.scalar_one_or_none()
    if not row:
        return None
    return {
        "blueprint": json.loads(row.blueprint) if row.blueprint else {},
        "personas": json.loads(row.personas) if row.personas else [],
        "hooks": json.loads(row.hooks) if row.hooks else [],
    }
