# AGENTS.md

Guidance for Codex and other coding agents working in this repository. The canonical project context
lives in **[CLAUDE.md](./CLAUDE.md)** — read it first; this file mirrors the essentials and the
non-negotiable guardrails so any agent can run code safely.

## Run / build

- **Frontend** (bun): `bun run dev` (Vite), `bun run build` (build + typecheck gate), `bun run lint`,
  `bun run format`. Path alias `@/` → `src/`. Frontend calls the backend at `http://localhost:8000`.
- **Backend** (Docker inside WSL 2): `docker compose up` runs the api container on `:8000` and db container
  on `:5432`. Direct Python is still available from `backend/` with `pip install -r requirements.txt` then
  `uvicorn app.main:app --reload --port 8000`. Needs `backend/.env` with `OPENROUTER_API_KEY`.
  LLMs go through **OpenRouter**, not the Anthropic API.
- No test suite exists; validate frontend changes with `bun run build` and backend imports with
  `python -c "import app.main"` (run inside `backend/`).

## Architecture (one paragraph)

Brief → strategy pipeline keyed by `session_id`: brief intake (DSPy chain in
`backend/app/agents/prompt_pipeline.py`) → approve → 6-pillar canvas (`src/routes/canvas.tsx`,
radial orbital timeline + three.js) → copilot chat (LangGraph agent in
`backend/app/agents/brand_agent.py`, tool `create_brand_node`) → marketing/logo/export. Backend is
conventional FastAPI: `api/` routers, `agents/` LLM logic, `schemas/` Pydantic, `db/models.py`, `core/`.

## Guardrails — do not break these

1. **Prompts are an API contract.** System prompts live in `backend/app/agents/prompts/__init__.py`.
   Preserve every `{placeholder}`, keep "respond ONLY with raw JSON" rules verbatim, and never rename the
   JSON keys — they mirror the TypeScript types in `src/lib/api.ts` and the routes parse them directly.
2. **Don't weaken** the anti-slop banned-buzzword list in `BRAND_ARCHITECT_PROMPT`; keep the six-fold
   `create_brand_node` call behavior and the `[AUTO-GENERATE]` shortcut.
3. **Bilingual UI.** `CopilotChat.tsx` is en/ar with RTL; keep the `T`/`CHOICES` tables in sync and the
   `dir="rtl"` path intact.
4. **Generated files:** never hand-edit `src/routeTree.gen.ts`.
5. Keep public component/API contracts stable (`CopilotChat({ sessionId })`, `useCanvas`, the
   `api.chat` payload shape).
