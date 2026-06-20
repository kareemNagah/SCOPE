"""
SCOPE Studio - Chat & Brand Nodes Router.

Brief-first strategy chat, node history, and restoration.
"""

import hashlib
import json
import traceback
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.brand_agent import agent, plain_llm
from app.agents.session_access import ensure_session_access, get_brief_record
from app.core.database import get_session
from app.core.security import get_current_user_optional
from app.db.models import DBBrandNode, DBChatMessage
from app.schemas.chat import BrandNodeSchema, ChatRequest, ChatResponse, ChatSuggestion, PaletteSchema

router = APIRouter(tags=["chat"])

CANONICAL_NODE_TITLES = {
    "mission": "Mission",
    "vision": "Vision",
    "persona": "Target Persona",
    "values": "Core Values",
    "tone": "Voice & Tone",
    "positioning": "Brand Promise",
}


def canonical_node_title(node_type: str, fallback: str) -> str:
    return CANONICAL_NODE_TITLES.get(node_type, (fallback or "").strip() or node_type.title())


async def load_active_nodes(
    session: AsyncSession,
    session_id: str,
) -> tuple[list[DBBrandNode], list[dict[str, str]], bool]:
    result = await session.execute(
        select(DBBrandNode)
        .where(
            DBBrandNode.session_id == session_id,
            DBBrandNode.is_active == True,  # noqa: E712
        )
        .order_by(DBBrandNode.id.asc())
    )
    records = result.scalars().all()
    changed = False
    normalized_nodes: list[dict[str, str]] = []
    for node in records:
        title = canonical_node_title(node.node_type, node.title)
        if node.title != title:
            node.title = title
            changed = True
        normalized_nodes.append(
            {
                "type": node.node_type,
                "title": title,
                "content": node.content,
            }
        )
    return records, normalized_nodes, changed


def build_brief_context(
    brief_payload: dict,
    marketing_payload: dict,
    active_nodes: list[dict[str, str]],
) -> str:
    return (
        f"Brand: {brief_payload.get('brand_name', '')}\n"
        f"Language: {brief_payload.get('language', 'en')}\n"
        f"Industry: {brief_payload.get('industry', '')}\n"
        f"Summary: {brief_payload.get('summary', '')}\n"
        f"Pillars: {json.dumps(brief_payload.get('pillars', {}), ensure_ascii=True)}\n"
        f"Current strategy nodes: {json.dumps(active_nodes, ensure_ascii=True)}\n"
        f"Marketing standards: {json.dumps(marketing_payload, ensure_ascii=True)}\n"
        f"Recommended next: {brief_payload.get('recommended_next', '')}"
    )


def build_thread_id(session_id: str, db_brief) -> str:
    fingerprint = hashlib.md5(
        "|".join(
            [
                db_brief.brand_name or "",
                db_brief.region or "",
                db_brief.summary or "",
                db_brief.pillars or "",
                db_brief.marketing_standards or "",
            ]
        ).encode("utf-8")
    ).hexdigest()[:12]
    return f"{session_id}:{fingerprint}"


def normalize_nodes(nodes: list[dict[str, str]]) -> list[dict[str, str]]:
    return [
        {
            "type": node["type"],
            "title": node["title"].strip(),
            "content": node["content"].strip(),
        }
        for node in nodes
    ]


def extract_json_block(text: str) -> dict:
    cleaned = text.strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass

    first_brace = cleaned.find("{")
    last_brace = cleaned.rfind("}")
    if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
        return json.loads(cleaned[first_brace : last_brace + 1])

    raise json.JSONDecodeError("Could not extract valid JSON from LLM response", text, 0)


def fallback_suggestions(
    mode: str,
    focus_node_title: str | None,
    focus_node_type: str | None,
) -> list[ChatSuggestion]:
    if mode != "guided":
        return []

    generic = [
        ChatSuggestion(
            label="Find the gap",
            prompt="Show me the biggest strategic gap and why it matters.",
            rationale="Starts with diagnosis before rewriting.",
        ),
        ChatSuggestion(
            label="Give me 3 options",
            prompt="Give me three sharper strategic options with tradeoffs.",
            rationale="Creates choices instead of a single answer.",
        ),
        ChatSuggestion(
            label="Recommend one move",
            prompt="Recommend one move and defend it against the approved brief.",
            rationale="Pushes the agent to take a position.",
        ),
    ]
    if not focus_node_title:
        return generic

    focus = focus_node_title
    if focus_node_type == "positioning":
        return [
            ChatSuggestion(
                label="Tighten promise",
                prompt=f"Rewrite the {focus} so it is sharper, more specific, and easier to prove.",
                rationale="Improves clarity and credibility.",
            ),
            ChatSuggestion(
                label="Find the proof gap",
                prompt=f"What proof is missing from this {focus}, and how should we address it?",
                rationale="Separates claim from evidence.",
            ),
            ChatSuggestion(
                label="Offer 3 directions",
                prompt=f"Give me three distinct directions for the {focus} with tradeoffs.",
                rationale="Lets the user choose a strategic lane.",
            ),
        ]
    return [
        ChatSuggestion(
            label="Sharpen it",
            prompt=f"Rewrite the {focus} so it is tighter and more defensible.",
            rationale="Moves from broad language to a stronger claim.",
        ),
        ChatSuggestion(
            label="Challenge it",
            prompt=f"Stress-test the current {focus} against the approved brief and show the weakest point first.",
            rationale="Finds the main vulnerability before editing.",
        ),
        ChatSuggestion(
            label="Explore options",
            prompt=f"Give me three better options for the {focus} and explain the tradeoffs.",
            rationale="Keeps the user in control of the direction.",
        ),
    ]


async def generate_suggestions(
    *,
    mode: str,
    focus_node_title: str | None,
    focus_node_type: str | None,
    brief_payload: dict,
    active_nodes: list[dict[str, str]],
    user_text: str,
    response_text: str,
) -> list[ChatSuggestion]:
    if mode != "guided":
        return []

    try:
        prompt = (
            "Return strict JSON only with shape "
            '{"suggestions":[{"label":"...","prompt":"...","rationale":"..."}]}. '
            "Produce exactly 3 suggestions. Each label must be 2 to 4 words. "
            "Each prompt must be a concrete next user move. "
            "Each rationale must be one short sentence. "
            "Do not repeat the assistant response.\n\n"
            f"Brand: {brief_payload.get('brand_name', '')}\n"
            f"Focus node title: {focus_node_title or 'whole strategy'}\n"
            f"Focus node type: {focus_node_type or 'whole-strategy'}\n"
            f"Approved brief summary: {brief_payload.get('summary', '')}\n"
            f"Current active nodes: {json.dumps(active_nodes, ensure_ascii=True)}\n"
            f"User message: {user_text}\n"
            f"Assistant response: {response_text}"
        )
        llm_response = await plain_llm.ainvoke(
            [
                SystemMessage(
                    content=(
                        "You produce compact, strategy-specific follow-up recommendations for a collaborative "
                        "brand copilot. Output JSON only."
                    )
                ),
                HumanMessage(content=prompt),
            ]
        )
        parsed = extract_json_block(str(llm_response.content))
        suggestions = []
        for item in parsed.get("suggestions", [])[:3]:
            label = str(item.get("label", "")).strip()
            prompt_text = str(item.get("prompt", "")).strip()
            rationale = str(item.get("rationale", "")).strip()
            if label and prompt_text and rationale:
                suggestions.append(
                    ChatSuggestion(label=label[:48], prompt=prompt_text[:240], rationale=rationale[:180])
                )
        if suggestions:
            return suggestions
    except Exception:
        pass

    return fallback_suggestions(mode, focus_node_title, focus_node_type)


@router.post("/api/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    session: AsyncSession = Depends(get_session),
    current_user: Optional[dict] = Depends(get_current_user_optional),
) -> ChatResponse:
    try:
        last_user_msg = request.messages[-1]
        if last_user_msg["role"] != "user":
            raise HTTPException(status_code=400, detail="Last message must be from user")

        db_brief = ensure_session_access(
            await get_brief_record(session, request.session_id),
            require_approved=True,
        )
        brief_payload = {
            "brand_name": db_brief.brand_name,
            "language": db_brief.language,
            "industry": db_brief.industry,
            "summary": db_brief.summary,
            "pillars": json.loads(db_brief.pillars or "{}"),
            "recommended_next": db_brief.recommended_next,
        }
        marketing_payload = json.loads(db_brief.marketing_standards or "{}")
        _, active_nodes, active_nodes_changed = await load_active_nodes(session, request.session_id)
        brief_context = build_brief_context(brief_payload, marketing_payload, active_nodes)

        user_uuid = uuid.UUID(current_user["sub"]) if current_user else None
        db_user_msg = DBChatMessage(
            session_id=request.session_id,
            role="user",
            content=last_user_msg["content"],
            user_id=user_uuid,
        )
        session.add(db_user_msg)

        thread_id = build_thread_id(request.session_id, db_brief)
        config = {"configurable": {"thread_id": thread_id}}
        state = await agent.aget_state(config)
        if not state.values:
            history_result = await session.execute(
                select(DBChatMessage)
                .where(DBChatMessage.session_id == request.session_id)
                .order_by(DBChatMessage.created_at.asc())
            )
            history_messages = []
            for msg in history_result.scalars().all():
                if msg.id == db_user_msg.id:
                    continue
                if msg.role == "user":
                    history_messages.append(HumanMessage(content=msg.content))
                elif msg.role == "assistant":
                    history_messages.append(AIMessage(content=msg.content))
            await agent.aupdate_state(
                config,
                {
                    "session_id": request.session_id,
                    "region": db_brief.region,
                    "conversation_mode": request.mode,
                    "focus_node_type": request.focus_node_type,
                    "focus_node_title": request.focus_node_title,
                    "focus_node_value": request.focus_node_value,
                    "brief_context": brief_context,
                    "messages": history_messages,
                    "proposed_nodes": [],
                    "proposed_palettes": [],
                },
            )

        final_state = await agent.ainvoke(
            {
                "session_id": request.session_id,
                "region": db_brief.region,
                "conversation_mode": request.mode,
                "focus_node_type": request.focus_node_type,
                "focus_node_title": request.focus_node_title,
                "focus_node_value": request.focus_node_value,
                "brief_context": brief_context,
                "messages": [HumanMessage(content=last_user_msg["content"])],
                "proposed_nodes": [],
                "proposed_palettes": [],
            },
            config=config,
        )

        response_text = "Done."
        for message in reversed(final_state["messages"]):
            if isinstance(message, AIMessage) and message.content:
                response_text = str(message.content)
                break

        session.add(
            DBChatMessage(
                session_id=request.session_id,
                role="assistant",
                content=response_text,
                user_id=user_uuid,
            )
        )

        proposed_palettes_raw = list(final_state.get("proposed_palettes", []))
        proposed_palettes = [
            PaletteSchema(
                name=p.get("name", ""),
                colors=p.get("colors", []),
                mood=p.get("mood", ""),
                usage_note=p.get("usage_note", ""),
                recommended=p.get("recommended", False),
            )
            for p in proposed_palettes_raw
            if p.get("name") and p.get("colors")
        ]

        proposed_nodes = list(final_state.get("proposed_nodes", []))
        if proposed_nodes:
            normalized_proposed = normalize_nodes(proposed_nodes)
            normalized_active = normalize_nodes(active_nodes)
            if normalized_proposed != normalized_active:
                result = await session.execute(
                    select(func.max(DBBrandNode.version)).where(DBBrandNode.session_id == request.session_id)
                )
                new_version = (result.scalar() or 0) + 1
                await session.execute(
                    update(DBBrandNode)
                    .where(DBBrandNode.session_id == request.session_id, DBBrandNode.is_active == True)  # noqa: E712
                    .values(is_active=False)
                )
                for node_data in normalized_proposed:
                    session.add(
                        DBBrandNode(
                            session_id=request.session_id,
                            version=new_version,
                            is_active=True,
                            node_type=node_data["type"],
                            title=node_data["title"],
                            content=node_data["content"],
                        )
                    )

        if active_nodes_changed:
            await session.flush()

        await session.commit()

        active_records, _, _ = await load_active_nodes(session, request.session_id)
        suggestions = await generate_suggestions(
            mode=request.mode,
            focus_node_title=request.focus_node_title,
            focus_node_type=request.focus_node_type,
            brief_payload=brief_payload,
            active_nodes=[
                {"type": node.node_type, "title": node.title, "content": node.content}
                for node in active_records
            ],
            user_text=last_user_msg["content"],
            response_text=response_text,
        )
        final_nodes = [
            BrandNodeSchema(type=node.node_type, title=node.title, content=node.content)
            for node in active_records
        ]
        return ChatResponse(
            response=response_text,
            mode=request.mode,
            suggestions=suggestions,
            nodes=final_nodes,
            proposed_palettes=proposed_palettes,
        )
    except HTTPException:
        raise
    except Exception as exc:
        print(f"Error in /api/chat: {exc}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/api/nodes/{session_id}")
async def get_nodes(
    session_id: str,
    session: AsyncSession = Depends(get_session),
):
    ensure_session_access(await get_brief_record(session, session_id), require_approved=True)
    records, nodes, changed = await load_active_nodes(session, session_id)
    if changed:
        await session.commit()
        return nodes
    return [{"type": node.node_type, "title": node.title, "content": node.content} for node in records]


@router.get("/api/history/{session_id}")
async def get_history(
    session_id: str,
    session: AsyncSession = Depends(get_session),
):
    ensure_session_access(await get_brief_record(session, session_id), require_approved=True)
    result = await session.execute(
        select(DBBrandNode)
        .where(DBBrandNode.session_id == session_id)
        .order_by(DBBrandNode.version.desc(), DBBrandNode.created_at.desc())
    )
    all_nodes = result.scalars().all()

    history: dict[int, dict] = {}
    for node in all_nodes:
        entry = history.setdefault(
            node.version,
            {
                "version": node.version,
                "is_active": node.is_active,
                "timestamp": node.created_at.isoformat() if node.created_at else None,
                "brand_name": "Strategy Snapshot",
                "nodes": [],
            },
        )
        entry["nodes"].append(
            {"type": node.node_type, "title": node.title, "content": node.content}
        )
    return list(history.values())


@router.post("/api/restore/{session_id}/{version}")
async def restore_version(
    session_id: str,
    version: int,
    session: AsyncSession = Depends(get_session),
):
    ensure_session_access(await get_brief_record(session, session_id), require_approved=True)
    result = await session.execute(
        select(DBBrandNode).where(
            DBBrandNode.session_id == session_id,
            DBBrandNode.version == version,
        )
    )
    if result.scalar_one_or_none() is None:
        raise HTTPException(status_code=404, detail="Version not found")

    await session.execute(
        update(DBBrandNode).where(DBBrandNode.session_id == session_id).values(is_active=False)
    )
    await session.execute(
        update(DBBrandNode)
        .where(DBBrandNode.session_id == session_id, DBBrandNode.version == version)
        .values(is_active=True)
    )
    await session.commit()

    active_nodes_result = await session.execute(
        select(DBBrandNode).where(
            DBBrandNode.session_id == session_id,
            DBBrandNode.is_active == True,  # noqa: E712
        )
    )
    return [
        {"type": node.node_type, "title": node.title, "content": node.content}
        for node in active_nodes_result.scalars().all()
    ]


@router.get("/api/chat/history/{session_id}")
async def get_chat_history(
    session_id: str,
    session: AsyncSession = Depends(get_session),
):
    ensure_session_access(await get_brief_record(session, session_id), require_approved=True)
    result = await session.execute(
        select(DBChatMessage)
        .where(DBChatMessage.session_id == session_id)
        .order_by(DBChatMessage.created_at.asc())
    )
    return [
        {
            "id": str(msg.id),
            "role": msg.role,
            "text": msg.content,
            "at": int(msg.created_at.timestamp() * 1000) if msg.created_at else 0,
        }
        for msg in result.scalars().all()
    ]
