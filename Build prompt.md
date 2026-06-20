# SCOPE Brand Studio — Build Brief for Claude Code (Opus 4.8 · XHigh)

> Paste this whole file as your task, or save it at the repo root and run:
> `claude` → "Read BUILD_PROMPT.md and execute it task by task, starting with Task 0."

---

## 0. OPERATING CONTRACT (read first, do not skip)

**Role split**
- **You (Claude / Opus 4.8 XHigh)** = architect, planner, reviewer, and prompt-author. You inspect the repo, design the change, write the precise spec, and review every diff.
- **Codex (MCP tool `codex`)** = implementer. You delegate the actual file-writing to it.

**How to work each task**
1. Enter Plan Mode and produce a short plan (files to touch, contracts, acceptance checks). Do NOT edit yet.
2. Once the plan is sound, call the **`codex`** MCP tool with a self-contained spec: the goal, exact files, function signatures, and the acceptance checks. One task per call.
3. When Codex returns, **review its diff yourself**. Fix only small glue/typing/imports by hand. If the change is wrong, send a correction via `codex-reply` rather than rewriting from scratch.
4. Run the project's lint/typecheck/tests. Report pass/fail. Move to the next task.

**Quota discipline:** you reason and review; Codex types. Never re-implement what Codex can. Batch related edits into one Codex spec.

**Skills to load before relevant tasks** (these are your skills, used while building UI and authoring generation prompts):
- `frontend-design` → before any React/UI work (Tasks 1–5).
- `brand-guidelines` + `theme-factory` → when building the palette/typography/identity UI and the design-token model (Task 4).
- `canvas-design` → when authoring the visual-direction and logo generation prompts (Tasks 1 and 5).
- There is **no marketing skill**; marketing/strategy logic lives in the LangGraph agent system prompts, not in a skill.

**Save this as `CLAUDE.md` at repo root** so the contract persists across sessions:
```md
# Orchestration rules
- Opus plans, reviews, and authors prompts. Codex (MCP tool `codex`) implements.
- Always Plan Mode first. Delegate implementation to `codex` with a full spec. Review the diff.
- Only hand-edit small glue. Use `codex-reply` to correct Codex instead of rewriting.
- Run lint + typecheck + tests after each task. Report results.
- Arabic-first product: every user-facing surface must support RTL and Arabic typography.
```

---

## TASK 0 — Repo inventory + ground truth (you do this directly, no Codex)

Before any change:
1. Map the repo: frontend framework + folder, the LangGraph backend (graphs, nodes, state schema, memory/checkpointer), API routes, env handling, and the image-generation client if one exists.
2. Write findings to `/docs/ARCHITECTURE.md` (create if missing): current step flow (Brief → Strategy → Identity → Logo → Export), where state is persisted between steps, and how the frontend calls the agent.
3. List every place the literal placeholder brand **"SCOPE"** and any demo/sample copy appears (grep). You will remove these in Task 0.5.

Output: a task plan referencing real file paths. Do not assume my stack — adapt all later tasks to what you actually find.

---

## TASK 0.5 — Strip all generic placeholders (blocks the real flow)

Delete the demo brand and any hard-coded sample content that leaks into the live pipeline.
- Remove every hard-coded `"SCOPE"` wordmark, the sample saved brand, and any seeded "example" strategy/identity/logo values that render when there is no real user data.
- Replace with empty/loading states driven by real agent output. The wordmark in the logo step must come from the user's actual brand name (Arabic and/or transliterated Latin), never a literal "SCOPE".
- Acceptance: a fresh session with no brand shows real empty states; nothing reads "SCOPE" unless the user named their brand that.

---

## TASK 1 — Brief step (Arabic-first), moodboard upload + reference image generation

**User story:** user types a brief, usually in Arabic (e.g. `عاوز براند برفيوم بطابع مصري فرعوني`). A LangGraph agent turns it into a structured, editable brief. The user may upload a moodboard/references; the agent can also generate reference images matching the intent.

**Backend (LangGraph)**
- Add/confirm a `brief` node whose system prompt: detects Arabic vs English, preserves Arabic brand names verbatim, and emits a typed brief: `{ brand_name_ar, brand_name_en, industry, region (USA|MENA|GCC), one_line_concept, persona, visual_direction[], competitive_context, market_lens }`.
- The node must accept dialectal/Egyptian-Arabic input and respond in the user's language. Persist the brief into graph state/memory so later nodes can read it.
- Reference-image generation: add a helper (see "Image generation helper" below) the brief node can call to produce 3–4 moodboard images from the brief's `visual_direction`. If the user uploaded references, pass them as reference images to the model for style-consistent results.

**Frontend (use `frontend-design` + `canvas-design`)**
- Redesign the **Brief card** UI: full RTL support, an Arabic display face for `brand_name_ar`, clear industry/region/persona chips, an editable visual-direction list, and a moodboard grid that shows uploaded refs + generated images together with a regenerate control.
- Keep the existing step rail (Brief → Strategy → Identity → Logo → Export) but make the Brief card the visual anchor: generous spacing, real loading skeletons (no fake data), and an obvious "Open Strategy" gate only enabled once the brief is confirmed.

**Acceptance:** Arabic brief in → structured brief out in Arabic; moodboard shows uploaded + generated images; card is fully RTL and editable; brief persists to memory.

---

## TASK 2 — Customization chat (dynamic questions, enhanced UI, real markdown)

**User story:** in chat mode the agent guides customization — e.g. tone, "make it more elegant" — but the **questions and the selectable options are generated by the LangGraph agent from the prior steps + its own reasoning**, not hard-coded.

**Backend**
- Add a `customize` node that reads brief (and any confirmed strategy) from memory and **emits structured turns**: `{ assistant_markdown, question, choices[] , focus }`. Choices are generated per-context (e.g. tone spectrum, elegance dial, heritage-vs-modern) — never a static list.
- Each user pick updates state and flags downstream steps (Identity/Logo) as "Needs Update" so edits propagate.
- The assistant text field must be **clean Markdown** (headings, lists, emphasis) — the agent writes Markdown, the UI renders it.

**Frontend (use `frontend-design`)**
- Rebuild the chat UI: message bubbles, the dynamic choice chips rendered from `choices[]`, a focus indicator, and an input that accepts free text or a chip pick.
- **Render Markdown properly** with `react-markdown` + `remark-gfm`. The bug to fix: literal `**text**` must render as bold, not show asterisks. Never display raw Markdown tokens. Sanitize output.
- RTL-aware: Arabic responses render right-to-left; mixed Arabic/Latin lines handled with `dir="auto"`.

**Acceptance:** questions/options visibly change based on prior steps; picking a choice updates state and flags downstream; no raw `**` ever appears; Arabic renders RTL.

---

## TASK 3 — Memory-driven Identity generation (palettes, fonts, concepts)

**User story:** the agent uses memory of all previous steps to generate the color palettes, font pairings, and logo concepts.

**Backend (you author the generation prompts using `brand-guidelines` + `theme-factory` + `canvas-design`)**
- Add an `identity` node that reads the full memory (brief + customization choices + strategy) and outputs:
  - **3 palettes** as named roles (e.g. Brand Foundation / Supporting Range / Accent), each a list of hex values with semantic labels, derived from the brief's visual cues and region.
  - **3 type pairings** (display + body) with a one-line rationale each, tagged by mood (e.g. Editorial·Premium, Luxury·Quiet, Heritage·Bold).
  - **4 logo concepts** with name + short structural description.
- Author the agent system prompts to encode real design reasoning (contrast, cultural fit for MENA/GCC heritage, print-readiness) — pull the heuristics from the `brand-guidelines` and `theme-factory` skills. Make the prompts robust and deterministic in structure (strict JSON schema out).

**Frontend (use `frontend-design`)**
- The Identity screen renders palettes, type pairings, and concepts from agent output (no hard-coded swatches). Selection state for one palette, one type pairing, and one concept carries forward to the Logo step.

**Acceptance:** identical brief but different customization choices produce different palettes/fonts/concepts; selections persist to memory.

---

## TASK 4 — AI Studio: logo generation with Nano Banana 2 (white background) + download

**User story:** user picks their palette + concept + font, generates logos on a **white background** via **Nano Banana 2**, and can download/install the result.

**Image model facts (verified):**
- Nano Banana 2 = Gemini 3.1 Flash Image. Model ID: **`gemini-3.1-flash-image-preview`** (alias `gemini-3.1-flash-image`).
- SDK: `@google/genai` (JS/TS) or `google-genai` (Python). REST: `generateContent` on the model endpoint; key via `x-goog-api-key`.
- Aspect ratio via the `image_config` param (use `1:1` for marks). Supports up to **14 reference images** — pass the user's moodboard for style consistency.
- There is no separate negative-prompt field; put exclusions in the prompt text. All outputs carry a SynthID watermark.

**Image generation helper (shared by Tasks 1 and 4)** — create one client module:
- `generateImages({ prompt, referenceImages?, aspectRatio, count })` calling `gemini-3.1-flash-image-preview`. Read `GEMINI_API_KEY` from env. Return image bytes/URLs. Handle errors + retries.

**Logo prompt template (you author this; parameterize, do NOT hard-code "SCOPE"):**
```
A professional, production-ready vector-style logo for "{brand_name_en}" (Arabic name: {brand_name_ar}),
a {industry} brand for the {region} market. Concept: {concept_name} — {concept_description}.
Visual mood: {strategy_descriptors}. Use ONLY these colors: {hex_list}.
Set the wordmark "{wordmark}" in a {font_style} typeface.
Composition: a single isolated mark, centered, generous even padding, perfectly flat,
crisp clean edges, high contrast. Background MUST be pure solid white (#FFFFFF), no off-white,
no texture, no gradient, no shadow, no mockup, no scene, no extra text, no UI, no border.
Print-ready, 1:1 square.
```
- Generate a small variations grid (Horizontal, Stacked, Icon-only, Monochrome) by varying the composition line of the template.
- If the user uploaded moodboard refs, pass them as `referenceImages` for palette/feel consistency — but keep the **white background** instruction dominant.

**Frontend (use `frontend-design` + `canvas-design`)**
- Studio uses the real selected palette/concept/font (remove the SCOPE demo wordmark and demo palettes entirely).
- "Generate Logo" → calls the helper → shows the live preview + variations grid.
- **Download/install:** a working download for the chosen variation (PNG at minimum; EPS/SVG export if a vectorizer is available). The button must save the actual generated asset, not a placeholder.

**Acceptance:** generated logos sit on pure white; wordmark = the user's real brand name; variations grid populated; download produces the real file; no "SCOPE" anywhere unless that's the user's brand.

---

## CROSS-CUTTING REQUIREMENTS (apply to every task)

1. **Arabic-first / RTL** across all surfaces: `dir="auto"` on text, a proper Arabic display face, logical CSS properties (`margin-inline`, `text-align: start`), mirrored layouts where appropriate.
2. **Markdown** is always rendered, never shown raw (no literal `**`). Use `react-markdown` + `remark-gfm`, sanitized.
3. **Memory continuity:** every node reads prior state from the graph's persistent memory/checkpointer; edits upstream flag downstream steps as "Needs Update."
4. **No placeholders in the live path:** empty/loading states only; demo data lives in fixtures used by tests, never rendered to a real user.
5. **Secrets:** `GEMINI_API_KEY` (and any others) from env only; never commit.

## DEFINITION OF DONE
- Lint + typecheck + tests pass.
- Fresh-session walkthrough: Arabic brief → structured brief card (RTL, moodboard) → dynamic customization chat (clean markdown) → memory-driven palettes/fonts/concepts → white-background logos via Nano Banana 2 → working download. Zero "SCOPE" placeholders remain.
- `/docs/ARCHITECTURE.md` updated to match the final flow.

**Skills:** Before each task, run `/skills` and review every installed skill's
description. Select the best-fit skills for the task at hand (UI/design, brand,
palette/typography, marketing, Arabic/RTL, image-prompting, etc.) and either let
them trigger or invoke explicitly with `/skill-name`. Do not assume a fixed set —
use whatever is installed. List which skills you chose and why before implementing.