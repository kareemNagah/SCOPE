import { createFileRoute } from "@tanstack/react-router";
import { StudioShell } from "@/components/scope/StudioShell";

export const Route = createFileRoute("/identity")({
  head: () => ({
    meta: [
      { title: "SCOPE — Visual Identity" },
      { name: "description", content: "Three palettes, three type pairings, four logo concepts." },
    ],
  }),
  component: IdentityPage,
});

const palettes = [
  { name: "Dispersion Spectrum", colors: ["#1a1233", "#5a3fc1", "#b48ef0", "#f1c5f5"] },
  { name: "Moss & Brutal",        colors: ["#1c2018", "#3e4a36", "#a8b89a", "#e8e6dd"] },
  { name: "Solar Atelier",        colors: ["#180f0a", "#7a3a1f", "#f08a4a", "#fbe4c2"] },
];

const fonts = [
  { display: "Instrument Serif", body: "Inter", mood: "Editorial · Premium" },
  { display: "Space Grotesk",    body: "Inter", mood: "Engineering · Modern" },
  { display: "Cormorant",        body: "Karla", mood: "Luxury · Quiet" },
];

const concepts = [
  { name: "Refracted Prism", desc: "Geometric mark referencing light through glass." },
  { name: "Soft Monogram",   desc: "Lowercase wordmark with circular counters." },
  { name: "Brutal Stamp",    desc: "Heavy serif badge, single-color compatible." },
  { name: "Linear Glyph",    desc: "Thin line monogram, scales to favicon." },
];

function IdentityPage() {
  return (
    <StudioShell
      stepId="identity"
      eyebrow="Step 3 · Brand Architect"
      title="Pick your visual DNA"
      intro="Choose one palette, one type pairing, and one concept. The Logo Studio will use them next."
    >
      <div className="grid gap-6 md:grid-cols-3">
        {palettes.map((p) => (
          <button key={p.name} className="glass rounded-2xl p-4 text-left transition hover:scale-[1.01] hover:shadow-[var(--shadow-prism)]">
            <div className="flex gap-1.5">
              {p.colors.map((c) => (
                <span key={c} className="h-16 flex-1 rounded-md" style={{ background: c }} />
              ))}
            </div>
            <p className="mt-3 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Palette</p>
            <p className="text-sm font-medium text-foreground">{p.name}</p>
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-3">
        {fonts.map((f) => (
          <button key={f.display} className="glass rounded-2xl p-5 text-left transition hover:scale-[1.01] hover:shadow-[var(--shadow-prism)]">
            <p className="font-display text-3xl text-foreground" style={{ fontFamily: f.display }}>
              {f.display}
            </p>
            <p className="mt-1 text-sm text-muted-foreground" style={{ fontFamily: f.body }}>
              Body in {f.body} — quiet, technical, readable.
            </p>
            <p className="mt-3 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{f.mood}</p>
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        {concepts.map((c) => (
          <button key={c.name} className="glass rounded-2xl p-4 text-left transition hover:scale-[1.01]">
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Concept</p>
            <p className="mt-1 text-sm font-medium text-foreground">{c.name}</p>
            <p className="mt-1 text-[12px] text-muted-foreground">{c.desc}</p>
          </button>
        ))}
      </div>
    </StudioShell>
  );
}
