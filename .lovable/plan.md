
## Goal

Extend the SCOPE Studio with: a true 3D dynamic brand graph + side chatbot, a richer Logo Studio (palette/concept/typography pickers), the full 6-step Marketing Engine from the BRD, and mock sign in / sign up screens.

## 1. Canvas → 3D Brand Graph + Chat (`/canvas`)

Convert `src/routes/canvas.tsx` into a two-column layout:

```text
┌─────────────────────────────────────┬──────────────────────┐
│  3D Brand Graph (R3F canvas)        │  Brand Copilot chat  │
│  - Brand DNA core sphere (center)   │  (glass panel)       │
│  - 6 orbiting node spheres          │  - message list      │
│    (Mission/Vision/Persona/...)     │  - quick prompts     │
│  - Animated dashed lines between    │  - composer          │
│    each node and the core           │  - "Apply to canvas" │
│  - Drag a node to reposition in 3D  │    placeholder btn   │
│  - OrbitControls (rotate camera)    │                      │
│  - Click node → opens edit popover  │                      │
└─────────────────────────────────────┴──────────────────────┘
```

Tech:
- Add deps via bun: `three`, `@react-three/fiber`, `@react-three/drei`.
- New `src/components/scope/BrandGraph3D.tsx` — `<Canvas>` with `OrbitControls`, instanced spheres with HTML labels via drei's `<Html>`, soft glow via emissive material, gradient background plane behind.
- Each node holds `{ id, title, value, position: [x,y,z] }`. Dragging uses a custom pointer drag on a plane facing the camera.
- Selecting a node opens a glass popover (HTML overlay) with the same edit/save flow currently in `canvas.tsx`.
- Keep `StudioShell` wrapper and Reset button.

Chat UI shell (no AI wired):
- New `src/components/scope/CopilotChat.tsx` — glass panel, header "Brand Copilot", scrollable message list, suggested prompts ("Tighten the mission", "Make voice more playful"), composer textarea + Send button.
- Local state only; pre-seeded with 2 sample messages. Sending appends a stub assistant reply ("(Connect Lovable AI to enable live edits)"). No backend.

## 2. Logo Studio upgrades (`/logo`)

Make the left tool panel actually selectable instead of static buttons:

- **Direction**: 4 concept cards (Refracted Prism / Soft Monogram / Brutal Stamp / Linear Glyph) — click to select, selected card glows with brand gradient ring.
- **Color Palette**: 3 swatches strips (Dispersion Spectrum / Moss & Brutal / Solar Atelier) — selectable. Selected palette drives the preview canvas background gradient.
- **Typography**: 3 type pairings (Instrument Serif / Space Grotesk / Cormorant) — selectable. Selected pairing drives the SCOPE wordmark font in the preview + variations grid.
- **Body Text**: text input for the wordmark (default "SCOPE").

State held in `LogoPage` via `useState`. Preview canvas + 4 variation cards re-render live from the selected palette/type/concept/text. Generate + Download buttons stay as visual CTAs.

## 3. Marketing Engine (`/marketing`)

New route + nav step. Implements full BRD Module 2 (6 steps) as a single page with a sticky vertical stepper on the left and active step content on the right.

Steps (all UI, mocked data):
1. **Asset Upload** — dashed dropzone for product/brand image.
2. **Context Sidebar (Prompt Whisperer)** — guided fields: materials, pricing tier, region, channel.
3. **Visual & Market Analysis** — "Centrifuge" loading animation (rotating gradient rings) cycling through labels: "Extracting hex palette…", "Locking grid…", "Mapping competitors…". Auto-advances after ~3s of fake compute.
4. **Market Blueprint** — JSON-style cards: Product Identity, Buying Behavior, Category Tension.
5. **Persona Cards** — 2 cards (Primary / Secondary) with avatar gradient, demographics, jobs-to-be-done, channels.
6. **Negative Hooks Game** — 3 ad-concept cards; user picks the one that would alienate the persona. Wrong picks shake + show inline explanation; correct pick reveals "Why this alienates them" copy.

Files:
- `src/routes/marketing.tsx`
- `src/components/scope/marketing/StepUpload.tsx`
- `src/components/scope/marketing/StepContext.tsx`
- `src/components/scope/marketing/StepAnalysis.tsx` (centrifuge)
- `src/components/scope/marketing/StepBlueprint.tsx`
- `src/components/scope/marketing/StepPersonas.tsx`
- `src/components/scope/marketing/StepHooks.tsx`

Wire into `Journey` so the stepper shows Marketing as a step between Identity and Logo (per BRD module order: Brand Architect → Marketing Engine → Ideas Factory; we'll add it after Identity).

## 4. Mock Auth screens (UI only)

- `src/routes/signin.tsx` — split layout: left = mesh-gradient panel with SCOPE logo + tagline "Refract your brand."; right = glass card with Email, Password, "Continue with Google" button, "Forgot password?" link, link to /signup. Submit is a no-op that toasts "Auth coming soon" via sonner.
- `src/routes/signup.tsx` — mirror with Name/Email/Password and "Create account" CTA, link to /signin.
- TopNav: change current "Sign in" button to a `<Link to="/signin">`.

No backend, no Lovable Cloud, no protected routes — purely visual per user choice.

## 5. Nav + Journey updates

- `Journey.tsx`: add `marketing` step between `identity` and `logo`, with eyebrow "Step 4 · Marketing Engine".
- Update existing step numbers in `StudioShell` props across routes.
- `TopNav.tsx`: add "Marketing" tab; convert Sign in button to link.

## Technical notes

- Three.js bundle size: lazy-load `BrandGraph3D` via `React.lazy` + Suspense fallback (centrifuge spinner) so the homepage stays light.
- Keep all new colors/gradients in `src/styles.css` tokens; no inline hex outside the palette presets data.
- All new components use existing `glass`, `bg-gradient-cta`, `text-gradient-brand` utilities.
- No new dependencies beyond `three`, `@react-three/fiber`, `@react-three/drei`.

## Out of scope (this pass)

- Real AI in chatbot (UI shell only).
- Real auth / Lovable Cloud (mock screens only).
- Ideas Factory module + Apify scraping (P3 in BRD).
- vTracer / Nano Banana backend.
