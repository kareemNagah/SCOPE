"""
SCOPE Studio - Brand Strategy LangGraph Agent.

Brief-first strategy copilot with explicit approved-brief context.
"""

from typing import Annotated, Any, Literal

from langchain_core.messages import BaseMessage, SystemMessage, ToolMessage
from langchain_core.tools import tool
from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import END, START, StateGraph
from langgraph.graph.message import add_messages
from typing_extensions import TypedDict

from app.agents.model_factory import create_langchain_chat_llm
from app.agents.prompts import BRAND_ARCHITECT_PROMPT


@tool
def create_brand_node(
    title: str,
    content: str,
    type: Literal["mission", "persona", "positioning", "values", "tone", "vision"],
) -> str:
    """Create or revise one strategy pillar for the canvas."""
    return "Node created."


@tool
def suggest_color_palette(
    rationale: str,
    palettes: list[dict],
    recommended: str,
) -> str:
    """Suggest brand color palettes derived from the strategy.
    Each palette dict must have: name (str), colors (list of 4 hex strings),
    mood (str), usage_note (str).
    Call this once, after the strategy has been refined and the user wants
    visual direction — not during initial pillar building.
    """
    return "Palettes suggested."


tools = [create_brand_node, suggest_color_palette]


class AgentState(TypedDict):
    session_id: str
    region: str
    conversation_mode: Literal["free", "guided"]
    focus_node_type: str | None
    focus_node_title: str | None
    focus_node_value: str | None
    brief_context: str
    messages: Annotated[list[BaseMessage], add_messages]
    proposed_nodes: list[dict[str, Any]]
    proposed_palettes: list[dict[str, Any]]


def _build_llm():
    return create_langchain_chat_llm().bind_tools(tools)


def _build_plain_llm():
    return create_langchain_chat_llm()


async def prepare_context(state: AgentState) -> dict[str, str]:
    focus_summary = (
        f"Focused pillar: {state['focus_node_title']}\n"
        f"Focused pillar type: {state['focus_node_type']}\n"
        f"Focused pillar text: {state['focus_node_value']}\n"
        if state.get("focus_node_title")
        else "Focused pillar: whole strategy\n"
    )
    return {
        "brief_context": (
            f"Session: {state['session_id']}\n"
            f"Region: {state['region']}\n"
            f"Conversation mode: {state['conversation_mode']}\n"
            f"{focus_summary}"
            f"Approved brief and standards:\n{state['brief_context']}"
        )
    }


async def chatbot(state: AgentState) -> dict[str, list[BaseMessage]]:
    llm = _build_llm()
    system_prompt = (
        BRAND_ARCHITECT_PROMPT
        + "\n\nBRIEF-FIRST RULES:\n"
        + "- The approved brief is the source of truth.\n"
        + "- Stay aligned with the selected region and marketing standards.\n"
        + "- Work only on the six strategy pillars.\n"
        + "- Default to collaborative brainstorming, not blind rewriting.\n"
        + "- Surface tradeoffs, tensions, and options before locking changes.\n"
        + "- Ask at most one clarifying question when truly blocked.\n"
        + "- If the user clearly asks for a rewrite, proposal, or refinement, return a concrete option.\n"
        + "- Only call tools when you are proposing a specific updated set of strategy nodes.\n"
        + "- If the user references the current brand imprecisely, infer the approved brand unless a second brand is explicitly introduced.\n"
        + "- In guided mode, act like a facilitator: diagnose, frame the decision, then give a concrete recommendation.\n"
        + "- In free mode, answer naturally and directly without forcing a workshop structure.\n"
        + "- Write in the customer's language with concrete specifics (audience, outcome, proof); avoid vague claims and banned buzzwords.\n"
        + "- Keep responses concise, useful, and strategy-focused.\n\n"
        + state["brief_context"]
    )
    response = await llm.ainvoke([SystemMessage(content=system_prompt)] + state["messages"])
    return {"messages": [response]}


async def tool_handler(state: AgentState) -> dict[str, Any]:
    last_message = state["messages"][-1]
    tool_messages: list[ToolMessage] = []
    proposed_nodes: list[dict[str, Any]] = []
    proposed_palettes: list[dict[str, Any]] = []

    if last_message.tool_calls:
        for tool_call in last_message.tool_calls:
            if tool_call["name"] == "create_brand_node":
                try:
                    args = tool_call["args"]
                    if not args.get("title") or not args.get("content") or not args.get("type"):
                        raise ValueError("Missing required arguments: title, content, or type")

                    proposed_nodes.append(
                        {
                            "type": args["type"],
                            "title": args["title"],
                            "content": args["content"],
                        }
                    )
                    tool_messages.append(
                        ToolMessage(
                            tool_call_id=tool_call["id"],
                            name=tool_call["name"],
                            content="Node created successfully.",
                        )
                    )
                except Exception as exc:
                    tool_messages.append(
                        ToolMessage(
                            tool_call_id=tool_call["id"],
                            name=tool_call["name"],
                            content=f"Error executing tool '{tool_call['name']}': {exc}",
                            is_error=True,
                        )
                    )
            elif tool_call["name"] == "suggest_color_palette":
                try:
                    args = tool_call["args"]
                    palettes_raw = args.get("palettes", [])
                    recommended = args.get("recommended", "")
                    for p in palettes_raw:
                        proposed_palettes.append(
                            {
                                "name": p.get("name", ""),
                                "colors": p.get("colors", []),
                                "mood": p.get("mood", ""),
                                "usage_note": p.get("usage_note", ""),
                                "recommended": (p.get("name", "") == recommended),
                            }
                        )
                    tool_messages.append(
                        ToolMessage(
                            tool_call_id=tool_call["id"],
                            name=tool_call["name"],
                            content="Palettes suggested successfully.",
                        )
                    )
                except Exception as exc:
                    tool_messages.append(
                        ToolMessage(
                            tool_call_id=tool_call["id"],
                            name=tool_call["name"],
                            content=f"Error executing tool '{tool_call['name']}': {exc}",
                            is_error=True,
                        )
                    )

    return {"messages": tool_messages, "proposed_nodes": proposed_nodes, "proposed_palettes": proposed_palettes}


def should_continue(state: AgentState) -> str:
    last_message = state["messages"][-1]
    if last_message.tool_calls:
        return "tool_handler"
    return END


def build_agent() -> StateGraph:
    workflow = StateGraph(AgentState)
    workflow.add_node("prepare_context", prepare_context)
    workflow.add_node("chatbot", chatbot)
    workflow.add_node("tool_handler", tool_handler)
    workflow.add_edge(START, "prepare_context")
    workflow.add_edge("prepare_context", "chatbot")
    workflow.add_conditional_edges("chatbot", should_continue)
    workflow.add_edge("tool_handler", "chatbot")
    return workflow.compile(checkpointer=MemorySaver())


agent = build_agent()
plain_llm = _build_plain_llm()
