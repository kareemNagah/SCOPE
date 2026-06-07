import { createFileRoute } from "@tanstack/react-router";
import { StudioShell } from "@/components/scope/StudioShell";
import { Download, ChevronDown } from "lucide-react";

export const Route = createFileRoute("/logo")({
  head: () => ({
    meta: [
      { title: "SCOPE — Logo Generation Studio" },
      { name: "description", content: "Generate your final logo and export EPS." },
    ],
  }),
  component: LogoPage,
});

const fields = [
  { label: "Direction",   sub: "1 of 3 Concept Briefs",       value: "Refracted Prism" },
  { label: "Color Palette", sub: "",                          value: "Dispersion Spectrum" },
  { label: "Typography",  sub: "",                            value: "Creator Grotesque" },
  { label: "Body Text",   sub: "",                            value: "Ghost White" },
];

const variations = [
  { name: "Horizontal Lockup", layout: "row" },
  { name: "Stacked",           layout: "col" },
  { name: "Icon Only",         layout: "icon" },
  { name: "Monochrome",        layout: "mono" },
];

function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden>
      <defs>
        <linearGradient id="logo-grad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="var(--scope-purple)" />
          <stop offset=".5" stopColor="var(--scope-pink)" />
          <stop offset="1" stopColor="var(--scope-blue)" />
        </linearGradient>
      </defs>
      <path
        d="M34 6H14C10 6 7 9 7 12.5C7 16 10 18 14 18.5L26 20.5C30 21 33 23 33 27C33 31 30 34 26 34H6"
        stroke="url(#logo-grad)" strokeWidth="6" strokeLinecap="square" fill="none"
      />
    </svg>
  );
}

function LogoPage() {
  return (
    <StudioShell
      stepId="logo"
      eyebrow="Step 4 · Logo Generation Studio"
      title="Generate your mark"
      intro="Tune direction, palette and type. Generate, then export as EPS."
    >
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        {/* Left tool panel */}
        <aside className="glass rounded-2xl p-5">
          <p className="font-sans text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
            Studio
          </p>
          <h3 className="mt-1 font-display text-xl text-foreground">Logo Generation</h3>

          <div className="mt-5 space-y-4">
            {fields.map((f) => (
              <div key={f.label}>
                <label className="block text-[11px] font-medium uppercase tracking-[0.14em] text-foreground/80">
                  {f.label}
                </label>
                {f.sub && <p className="text-[10px] text-muted-foreground">{f.sub}</p>}
                <button className="mt-1.5 flex w-full items-center justify-between rounded-lg border border-border bg-white/70 px-3 py-2 text-left text-sm text-foreground hover:bg-white">
                  {f.value}
                  <ChevronDown size={14} className="text-muted-foreground" />
                </button>
              </div>
            ))}
          </div>
        </aside>

        {/* Center canvas */}
        <div>
          <div
            className="relative flex h-[360px] items-center justify-center overflow-hidden rounded-2xl"
            style={{ background: "radial-gradient(ellipse at 30% 30%, var(--scope-violet), var(--ink-void) 70%)" }}
          >
            <div className="flex items-center gap-5">
              <LogoMark size={88} />
              <span className="font-sans text-6xl font-semibold tracking-tight text-white">
                SCOPE
              </span>
            </div>
            <span className="absolute bottom-3 left-4 text-[10px] uppercase tracking-[0.18em] text-white/60">
              Preview · 2400 × 1200
            </span>
          </div>

          <div className="mt-4 grid grid-cols-[1fr_auto] gap-3">
            <button className="bg-gradient-cta inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-white shadow-[0_8px_24px_-6px_rgba(255,90,120,0.55)] transition hover:brightness-105">
              Generate Logo.
            </button>
            <button className="glass inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-foreground transition hover:bg-white">
              <Download size={15} />
              Download EPS
            </button>
          </div>

          <div className="mt-6">
            <p className="mb-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Variations Grid
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {variations.map((v) => (
                <div key={v.name} className="glass rounded-xl p-4 text-center">
                  <div className="flex h-16 items-center justify-center gap-2">
                    {v.layout === "row" && (<><LogoMark /> <span className="font-sans font-semibold tracking-tight">SCOPE</span></>)}
                    {v.layout === "col" && (<div className="flex flex-col items-center"><LogoMark size={28} /><span className="text-xs font-semibold tracking-tight mt-1">SCOPE</span></div>)}
                    {v.layout === "icon" && <LogoMark size={36} />}
                    {v.layout === "mono" && (<><span style={{ filter: "grayscale(1) brightness(0.2)" }}><LogoMark /></span><span className="font-sans font-semibold tracking-tight">SCOPE</span></>)}
                  </div>
                  <p className="mt-2 text-[11px] text-muted-foreground">{v.name}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </StudioShell>
  );
}
