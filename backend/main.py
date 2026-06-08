from fastapi import FastAPI, HTTPException, Request, UploadFile, File, Form
from pydantic import BaseModel
from typing import List, Annotated, Literal, Dict, Any, Optional
import os
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware
import json
import uuid

# Database imports
from sqlalchemy import create_engine, Column, Integer, String, JSON, DateTime, Text, Boolean
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from datetime import datetime

# LangGraph & LangChain imports
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langgraph.checkpoint.memory import MemorySaver
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, AIMessage, BaseMessage, SystemMessage, ToolMessage
from langchain_core.tools import tool
from typing_extensions import TypedDict

load_dotenv()

# --- Database Setup (SQLite) ---
DATABASE_PATH = os.path.join(os.path.dirname(__file__), "scope.db")
DATABASE_URL = f"sqlite:///{DATABASE_PATH}"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class DBBrandNode(Base):
    __tablename__ = "brand_nodes"
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, index=True)
    version = Column(Integer, default=1)
    is_active = Column(Boolean, default=True)
    node_type = Column(String)
    title = Column(String)
    content = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)


class DBMarketingResult(Base):
    __tablename__ = "marketing_results"
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, index=True)
    blueprint = Column(Text)  # JSON string
    personas = Column(Text)   # JSON string
    hooks = Column(Text)      # JSON string
    context_data = Column(Text)  # JSON string — the input fields
    created_at = Column(DateTime, default=datetime.utcnow)


class DBLogoResult(Base):
    __tablename__ = "logo_results"
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, index=True)
    concept_description = Column(Text)
    tagline = Column(String)
    variations = Column(Text)  # JSON string
    settings = Column(Text)    # JSON string — wordmark, palette, font, concept
    created_at = Column(DateTime, default=datetime.utcnow)


Base.metadata.create_all(bind=engine)

# --- OpenRouter/AI Setup ---
api_key = os.getenv("OPENAI_API_KEY")
base_url = "https://openrouter.ai/api/v1"

# --- Tools Definition ---

@tool
def create_brand_node(
    title: str,
    content: str,
    type: Literal["mission", "persona", "positioning", "values", "tone", "vision"]
):
    """
    Creates a visual node on the Brand Strategy Canvas.
    Use this when the user has provided enough information to define one of the brand aspects.
    """
    return "Node created."

tools = [create_brand_node]

llm = ChatOpenAI(
    model="openai/gpt-4o-mini",
    openai_api_key=api_key,
    openai_api_base=base_url,
    default_headers={
        "HTTP-Referer": "http://localhost:8080",
        "X-Title": "SCOPE Studio",
    }
).bind_tools(tools)

# Separate LLM instance without tools for marketing/logo endpoints
llm_plain = ChatOpenAI(
    model="openai/gpt-4o-mini",
    openai_api_key=api_key,
    openai_api_base=base_url,
    default_headers={
        "HTTP-Referer": "http://localhost:8080",
        "X-Title": "SCOPE Studio",
    }
)

# --- LangGraph Setup ---

class AgentState(TypedDict):
    messages: Annotated[List[BaseMessage], add_messages]

SYSTEM_PROMPT = """You are the Lead Brand Architect at PRISMA, a high-end strategic consultancy.
Your goal is to transform minimal Brand Briefs (often a mix of Arabic and English) into a world-class, comprehensive 6-pillar Brand Strategy.

WORKFLOW:
1. **STRATEGIC PROPOSAL**: When you receive a brief, do NOT just repeat it. EXPAND each point into a professional, deep strategic narrative. 
   - **Core Mission**: Define the 'Why' and the deeper purpose.
   - **Ideal Customer (Persona)**: Move beyond demographics into psychographics, lifestyle, and pain points.
   - **Unique Positioning**: Clearly articulate the 'Edge' and market category.
   - **Brand Values**: Explain the philosophy behind each value.
   - **Brand Personality (Tone)**: Describe the voice, vocabulary, and 'vibe'.
   - **Vision**: Paint a picture of the brand's long-term impact on the world.
   
   Show this proposal in formatted Markdown and ASK: "Shall I finalize this strategy and generate your visual canvas?"

2. **REFINEMENT**: Adjust based on feedback until the user is satisfied.

3. **BATCH COMMITTING (CRITICAL)**: ONLY after explicit approval, call the `create_brand_node` tool SIX TIMES.
   - **IMPORTANT**: The 'content' sent to the tool should be the COMPREHENSIVE, expanded version (max 400 chars), not the brief.

STYLE RULES:
- If the brief is in Arabic, respond in the user's preferred language (Arabic/English mix if appropriate).
- **DESCRIPTIVE TITLES**: When calling `create_brand_node`, use a brand-specific title, NOT the generic type.
  * *Incorrect*: title="Mission"
  * *Correct*: title="Saudi Legacy Mission" or "Future Oud Positioning"
- Be sophisticated, creative, and strategically rigorous. 
- You are not a chatbot; you are a Brand Architect.

IMPORTANT SHORTCUT: If the user's message starts with "[AUTO-GENERATE]", skip the proposal and refinement steps. 
Immediately call `create_brand_node` SIX TIMES with your best strategic interpretation of the brief.
Then reply with a brief summary of what you created.
"""

async def chatbot(state: AgentState):
    """Execution node for the chatbot."""
    messages = [SystemMessage(content=SYSTEM_PROMPT)] + state["messages"]
    response = await llm.ainvoke(messages)
    return {"messages": [response]}

async def tool_handler(state: AgentState):
    """Node to handle tool calls."""
    last_message = state["messages"][-1]
    tool_messages = []
    
    if last_message.tool_calls:
        print(f"--- Tool Calls Detected: {len(last_message.tool_calls)} ---")
        for tool_call in last_message.tool_calls:
            print(f"Tool: {tool_call['name']} Args: {tool_call['args']}")
            if tool_call["name"] == "create_brand_node":
                tool_messages.append(ToolMessage(
                    tool_call_id=tool_call["id"],
                    name=tool_call["name"],
                    content="Node created successfully."
                ))
    
    return {"messages": tool_messages}

def should_continue(state: AgentState):
    last_message = state["messages"][-1]
    if last_message.tool_calls:
        return "tool_handler"
    return END

# Build the Graph
workflow = StateGraph(AgentState)
workflow.add_node("chatbot", chatbot)
workflow.add_node("tool_handler", tool_handler)

workflow.add_edge(START, "chatbot")
workflow.add_conditional_edges("chatbot", should_continue)
workflow.add_edge("tool_handler", "chatbot")

# Compile with in-memory checkpointer (no Postgres needed)
memory = MemorySaver()
agent = workflow.compile(checkpointer=memory)

# --- FastAPI App ---
app = FastAPI(title="SCOPE Studio API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Pydantic Models ---

class ChatRequest(BaseModel):
    messages: List[Dict[str, str]]
    session_id: str = "default_session"

class MarketingAnalyzeRequest(BaseModel):
    session_id: str
    materials: str = ""
    pricing_tier: str = ""
    region: str = ""
    channels: str = ""
    category: str = ""
    stage: str = ""

class LogoGenerateRequest(BaseModel):
    session_id: str
    wordmark: str = "SCOPE"
    concept: str = "Refracted Prism"
    palette_name: str = "Dispersion Spectrum"
    font_name: str = "Space Grotesk"
    brand_context: str = ""

# --- API Endpoints ---

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "db": "sqlite", "checkpointer": "memory"}

@app.post("/api/chat")
async def chat(request: ChatRequest):
    try:
        last_user_msg = request.messages[-1]
        if last_user_msg["role"] != "user":
            raise HTTPException(status_code=400, detail="Last message must be from user")

        input_message = HumanMessage(content=last_user_msg["content"])
        config = {"configurable": {"thread_id": request.session_id}}
        
        final_state = await agent.ainvoke({"messages": [input_message]}, config=config)
        
        messages = final_state["messages"]
        response_text = "..."
        for m in reversed(messages):
            if isinstance(m, AIMessage) and m.content:
                response_text = m.content
                break
        
        # Find the VERY LAST AI message that contains tool calls
        last_ai_with_tools = None
        for m in reversed(messages):
            if isinstance(m, AIMessage) and m.tool_calls:
                if any(tc["name"] == "create_brand_node" for tc in m.tool_calls):
                    last_ai_with_tools = m
                    break
        
        db = SessionLocal()
        try:
            if last_ai_with_tools:
                from sqlalchemy import func
                highest_v = db.query(func.max(DBBrandNode.version)).filter(
                    DBBrandNode.session_id == request.session_id
                ).scalar() or 0
                
                new_v = highest_v + 1
                
                # Mark ALL previous nodes for this session as inactive
                db.query(DBBrandNode).filter(
                    DBBrandNode.session_id == request.session_id,
                    DBBrandNode.is_active == True
                ).update({"is_active": False})
                
                # Save ONLY the nodes from the last AI message
                for tc in last_ai_with_tools.tool_calls:
                    if tc["name"] == "create_brand_node":
                        node_data = tc["args"]
                        db_node = DBBrandNode(
                            session_id=request.session_id,
                            version=new_v,
                            is_active=True,
                            node_type=node_data.get("type"),
                            title=node_data.get("title"),
                            content=node_data.get("content")
                        )
                        db.add(db_node)
                db.commit()
            
            # Return ONLY the active nodes
            active_db_nodes = db.query(DBBrandNode).filter(
                DBBrandNode.session_id == request.session_id,
                DBBrandNode.is_active == True
            ).all()
            
            final_nodes = [
                {"type": n.node_type, "title": n.title, "content": n.content} 
                for n in active_db_nodes
            ]
            print(f"Returning {len(final_nodes)} active nodes to frontend.")
            
        finally:
            db.close()

        return {
            "response": response_text,
            "nodes": final_nodes
        }
        
    except Exception as e:
        print(f"Error in /api/chat: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/nodes/{session_id}")
async def get_nodes(session_id: str):
    db = SessionLocal()
    try:
        nodes = db.query(DBBrandNode).filter(
            DBBrandNode.session_id == session_id,
            DBBrandNode.is_active == True
        ).all()
        return [{"type": n.node_type, "title": n.title, "content": n.content} for n in nodes]
    finally:
        db.close()

@app.get("/api/history/{session_id}")
async def get_history(session_id: str):
    db = SessionLocal()
    try:
        all_nodes = db.query(DBBrandNode).filter(
            DBBrandNode.session_id == session_id
        ).order_by(DBBrandNode.version.desc(), DBBrandNode.created_at.desc()).all()
        
        history = {}
        for n in all_nodes:
            if n.version not in history:
                history[n.version] = {
                    "version": n.version,
                    "is_active": n.is_active,
                    "timestamp": n.created_at.isoformat() if n.created_at else None,
                    "brand_name": "New Venture",
                    "nodes": []
                }
            
            generic_types = ["mission", "vision", "values", "persona", "tone", "positioning", "brand", "identity"]
            is_generic = n.title.lower() in generic_types
            
            if n.node_type == "mission" and not is_generic:
                history[n.version]["brand_name"] = n.title
            elif (history[n.version]["brand_name"] == "New Venture" or history[n.version]["brand_name"].lower() in generic_types) and not is_generic:
                history[n.version]["brand_name"] = n.title
            elif n.node_type == "mission" and history[n.version]["brand_name"] == "New Venture":
                history[n.version]["brand_name"] = n.title

            history[n.version]["nodes"].append({
                "type": n.node_type,
                "title": n.title,
                "content": n.content
            })
        
        return list(history.values())
    finally:
        db.close()

@app.post("/api/restore/{session_id}/{version}")
async def restore_version(session_id: str, version: int):
    db = SessionLocal()
    try:
        exists = db.query(DBBrandNode).filter(
            DBBrandNode.session_id == session_id,
            DBBrandNode.version == version
        ).first()
        
        if not exists:
            raise HTTPException(status_code=404, detail="Version not found")
        
        db.query(DBBrandNode).filter(
            DBBrandNode.session_id == session_id
        ).update({"is_active": False})
        
        db.query(DBBrandNode).filter(
            DBBrandNode.session_id == session_id,
            DBBrandNode.version == version
        ).update({"is_active": True})
        
        db.commit()
        
        active_nodes = db.query(DBBrandNode).filter(
            DBBrandNode.session_id == session_id,
            DBBrandNode.is_active == True
        ).all()
        
        return [{"type": n.node_type, "title": n.title, "content": n.content} for n in active_nodes]
        
    finally:
        db.close()


# --- Marketing Engine Endpoint ---

MARKETING_SYSTEM_PROMPT = """You are a senior marketing strategist at PRISMA, a high-end brand consultancy.

Given product/brand context, produce a comprehensive marketing analysis as a JSON object with exactly this structure:

{
  "blueprint": {
    "product_identity": {
      "category": "...",
      "positioning": "...",
      "signature": "..."
    },
    "buying_behavior": {
      "trigger": "...",
      "decision_window": "...",
      "friction": "..."
    },
    "category_tension": {
      "default": "...",
      "whitespace": "...",
      "opportunity": "..."
    }
  },
  "personas": [
    {
      "tier": "Primary",
      "name": "...",
      "role": "...",
      "gradient": "linear-gradient(135deg,#9F7AEA,#4299E1)",
      "jobs": ["...", "...", "..."],
      "channels": ["...", "...", "..."]
    },
    {
      "tier": "Secondary",
      "name": "...",
      "role": "...",
      "gradient": "linear-gradient(135deg,#ED64A6,#ED8936)",
      "jobs": ["...", "...", "..."],
      "channels": ["...", "...", "..."]
    }
  ],
  "hooks": [
    {
      "id": "a",
      "title": "...",
      "body": "...",
      "alienates": true,
      "why": "..."
    },
    {
      "id": "b",
      "title": "...",
      "body": "...",
      "alienates": false,
      "why": "..."
    },
    {
      "id": "c",
      "title": "...",
      "body": "...",
      "alienates": false,
      "why": "..."
    }
  ]
}

RULES:
- Make personas vivid with real-sounding names, ages, cities, and specific jobs-to-be-done.
- The "hooks" must have EXACTLY ONE that alienates the primary persona (alienates: true) and two that don't.
- Put the alienating hook in a RANDOM position (not always first).
- Each hook title should be a realistic ad headline in quotes.
- Be strategic, creative, and grounded in the provided context.
- Respond ONLY with the JSON, no markdown fences, no explanation."""

@app.post("/api/marketing/analyze")
async def marketing_analyze(request: MarketingAnalyzeRequest):
    try:
        context_parts = []
        if request.materials:
            context_parts.append(f"Materials: {request.materials}")
        if request.pricing_tier:
            context_parts.append(f"Pricing tier: {request.pricing_tier}")
        if request.region:
            context_parts.append(f"Primary region: {request.region}")
        if request.channels:
            context_parts.append(f"Channels: {request.channels}")
        if request.category:
            context_parts.append(f"Category: {request.category}")
        if request.stage:
            context_parts.append(f"Stage: {request.stage}")
        
        # Try to get brand context from existing nodes
        db = SessionLocal()
        try:
            active_nodes = db.query(DBBrandNode).filter(
                DBBrandNode.session_id == request.session_id,
                DBBrandNode.is_active == True
            ).all()
            
            if active_nodes:
                brand_context = "\n".join([
                    f"- {n.node_type.title()}: {n.title} — {n.content}" 
                    for n in active_nodes
                ])
                context_parts.insert(0, f"EXISTING BRAND STRATEGY:\n{brand_context}")
        finally:
            db.close()
        
        user_input = "\n".join(context_parts) if context_parts else "A generic consumer product"
        
        response = await llm_plain.ainvoke([
            SystemMessage(content=MARKETING_SYSTEM_PROMPT),
            HumanMessage(content=f"Analyze this product/brand:\n\n{user_input}")
        ])
        
        # Parse the JSON response
        response_text = response.content.strip()
        # Remove markdown fences if present
        if response_text.startswith("```"):
            response_text = response_text.split("\n", 1)[1]
            if response_text.endswith("```"):
                response_text = response_text[:-3].strip()
        
        result = json.loads(response_text)
        
        # Persist to DB
        db = SessionLocal()
        try:
            db_result = DBMarketingResult(
                session_id=request.session_id,
                blueprint=json.dumps(result.get("blueprint", {})),
                personas=json.dumps(result.get("personas", [])),
                hooks=json.dumps(result.get("hooks", [])),
                context_data=json.dumps({
                    "materials": request.materials,
                    "pricing_tier": request.pricing_tier,
                    "region": request.region,
                    "channels": request.channels,
                    "category": request.category,
                    "stage": request.stage,
                })
            )
            db.add(db_result)
            db.commit()
        finally:
            db.close()
        
        return result
        
    except json.JSONDecodeError as e:
        print(f"JSON parse error in marketing analyze: {e}")
        print(f"Raw response: {response_text}")
        raise HTTPException(status_code=500, detail=f"AI returned invalid JSON: {str(e)}")
    except Exception as e:
        print(f"Error in /api/marketing/analyze: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/marketing/{session_id}")
async def get_marketing_result(session_id: str):
    """Get the most recent marketing analysis for a session."""
    db = SessionLocal()
    try:
        result = db.query(DBMarketingResult).filter(
            DBMarketingResult.session_id == session_id
        ).order_by(DBMarketingResult.created_at.desc()).first()
        
        if not result:
            return None
        
        return {
            "blueprint": json.loads(result.blueprint) if result.blueprint else {},
            "personas": json.loads(result.personas) if result.personas else [],
            "hooks": json.loads(result.hooks) if result.hooks else [],
        }
    finally:
        db.close()


# --- Logo Generation Endpoint ---

LOGO_SYSTEM_PROMPT = """You are a senior brand identity designer at PRISMA, a high-end brand consultancy.

Given a brand's wordmark, visual concept direction, color palette, and typography, produce a creative logo concept brief as a JSON object with exactly this structure:

{
  "concept_description": "A 2-3 sentence description of the logo concept, explaining the visual metaphor and how it connects to the brand's identity.",
  "tagline": "A short memorable tagline (4-8 words) that encapsulates the brand.",
  "variations": [
    {
      "name": "Horizontal",
      "description": "Brief description of this layout variation"
    },
    {
      "name": "Stacked",
      "description": "Brief description of this layout variation"
    },
    {
      "name": "Icon Only",
      "description": "Brief description of this layout variation"
    },
    {
      "name": "Monochrome",
      "description": "Brief description of this layout variation"
    }
  ]
}

RULES:
- Be evocative and specific in the concept_description — reference the visual concept, colors, and typography.
- The tagline should be punchy and memorable.
- Each variation description should explain how the logo adapts to that format.
- Respond ONLY with the JSON, no markdown fences, no explanation."""

@app.post("/api/logo/generate")
async def logo_generate(request: LogoGenerateRequest):
    try:
        context_parts = [
            f"Wordmark: {request.wordmark}",
            f"Visual concept: {request.concept}",
            f"Color palette: {request.palette_name}",
            f"Typography: {request.font_name}",
        ]
        
        if request.brand_context:
            context_parts.append(f"Brand context: {request.brand_context}")
        
        # Try to get brand context from existing nodes
        db = SessionLocal()
        try:
            active_nodes = db.query(DBBrandNode).filter(
                DBBrandNode.session_id == request.session_id,
                DBBrandNode.is_active == True
            ).all()
            
            if active_nodes:
                brand_context = "\n".join([
                    f"- {n.node_type.title()}: {n.title} — {n.content}" 
                    for n in active_nodes
                ])
                context_parts.append(f"EXISTING BRAND STRATEGY:\n{brand_context}")
        finally:
            db.close()
        
        user_input = "\n".join(context_parts)
        
        response = await llm_plain.ainvoke([
            SystemMessage(content=LOGO_SYSTEM_PROMPT),
            HumanMessage(content=f"Generate a logo concept for:\n\n{user_input}")
        ])
        
        response_text = response.content.strip()
        if response_text.startswith("```"):
            response_text = response_text.split("\n", 1)[1]
            if response_text.endswith("```"):
                response_text = response_text[:-3].strip()
        
        result = json.loads(response_text)
        
        # Persist to DB
        db = SessionLocal()
        try:
            db_result = DBLogoResult(
                session_id=request.session_id,
                concept_description=result.get("concept_description", ""),
                tagline=result.get("tagline", ""),
                variations=json.dumps(result.get("variations", [])),
                settings=json.dumps({
                    "wordmark": request.wordmark,
                    "concept": request.concept,
                    "palette_name": request.palette_name,
                    "font_name": request.font_name,
                })
            )
            db.add(db_result)
            db.commit()
        finally:
            db.close()
        
        return result
        
    except json.JSONDecodeError as e:
        print(f"JSON parse error in logo generate: {e}")
        print(f"Raw response: {response_text}")
        raise HTTPException(status_code=500, detail=f"AI returned invalid JSON: {str(e)}")
    except Exception as e:
        print(f"Error in /api/logo/generate: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/logo/{session_id}")
async def get_logo_result(session_id: str):
    """Get the most recent logo generation for a session."""
    db = SessionLocal()
    try:
        result = db.query(DBLogoResult).filter(
            DBLogoResult.session_id == session_id
        ).order_by(DBLogoResult.created_at.desc()).first()
        
        if not result:
            return None
        
        return {
            "concept_description": result.concept_description,
            "tagline": result.tagline,
            "variations": json.loads(result.variations) if result.variations else [],
        }
    finally:
        db.close()
