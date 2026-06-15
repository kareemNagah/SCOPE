"""
SCOPE Studio - Logo Generation Router.
"""

import json
import traceback

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.model_factory import openrouter_chat_completion
from app.agents.prompts import LOGO_SYSTEM_PROMPT
from app.agents.session_access import ensure_session_access, get_brief_record
from app.core.config import get_settings
from app.core.database import get_session
from app.db.models import DBBrandNode, DBLogoResult
from app.schemas.logo import LogoGenerateRequest

router = APIRouter(prefix="/api/logo", tags=["logo"])


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

        context_parts = [
            f"Wordmark: {request.wordmark}",
            f"Visual concept: {request.concept}",
            f"Color palette: {request.palette_name}",
            f"Typography: {request.font_name}",
            f"Region: {db_brief.region}",
            f"Marketing standards: {db_brief.marketing_standards}",
        ]
        if request.brand_context:
            context_parts.append(f"Brand context: {request.brand_context}")

        active_nodes_result = await session.execute(
            select(DBBrandNode).where(
                DBBrandNode.session_id == request.session_id,
                DBBrandNode.is_active == True,  # noqa: E712
            )
        )
        active_nodes = active_nodes_result.scalars().all()
        if active_nodes:
            context_parts.append(
                "EXISTING BRAND STRATEGY:\n"
                + "\n".join(f"- {node.node_type.title()}: {node.title} - {node.content}" for node in active_nodes)
            )
        joined_context = "\n".join(context_parts)

        response_json = await openrouter_chat_completion(
            messages=[
                {
                    "role": "system",
                    "content": (
                        LOGO_SYSTEM_PROMPT
                        + "\n\nCRITICAL: Output strictly valid JSON matching the schema. "
                        + "Also generate a professional logo mark image aligned to the concept."
                    ),
                },
                {
                    "role": "user",
                    "content": f"Generate a logo concept and mark for:\n\n{joined_context}",
                },
            ],
            model=settings.scope_image_model,
            modalities=["image", "text"],
            max_tokens=4000,
        )

        generated_image = None
        message = response_json["choices"][0]["message"]
        response_text = str(message.get("content", "")).strip()
        if message.get("images"):
            generated_image = message["images"][0]["image_url"]["url"]

        if response_text.startswith("```"):
            if response_text.startswith("```json"):
                response_text = response_text[7:]
            else:
                response_text = response_text[3:]
            if response_text.endswith("```"):
                response_text = response_text[:-3]
            response_text = response_text.strip()

        parsed_result = json.loads(response_text)
        session.add(
            DBLogoResult(
                session_id=request.session_id,
                concept_description=parsed_result.get("concept_description", ""),
                tagline=parsed_result.get("tagline", ""),
                variations=json.dumps(parsed_result.get("variations", [])),
                settings=json.dumps(
                    {
                        "wordmark": request.wordmark,
                        "concept": request.concept,
                        "palette_name": request.palette_name,
                        "font_name": request.font_name,
                    }
                ),
                generated_image=generated_image,
            )
        )
        await session.commit()
        parsed_result["generated_image"] = generated_image
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
    }
