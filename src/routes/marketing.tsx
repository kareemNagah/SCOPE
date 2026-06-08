import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { StudioShell } from "@/components/scope/StudioShell";
import { Upload, Check, ChevronRight, Sparkles, AlertTriangle, RotateCcw } from "lucide-react";

export const Route = createFileRoute("/marketing")({
  head: () => ({
    meta: [
      { title: "SCOPE — Marketing Engine" },
      { name: "description", content: "Spectral Analysis: blueprint, personas, and the negative-hooks game." },
    ],
  }),
  component: MarketingPage,
});

const steps = [
  { id: 1, name: "Asset Upload",           sub: "Drop product / brand" },
  { id: 2, name: "Context Sidebar",        sub: "Prompt Whisperer" },
  { id: 3, name: "Visual & Market Analysis", sub: "Centrifuge AI lab" },
  { id: 4, name: "Market Blueprint",       sub: "Identity & behavior" },
  { id: 5, name: "Persona Cards",          sub: "Primary & secondary" },
  { id: 6, name: "Negative Hooks Game",    sub: "Stealth education" },
];

function MarketingPage() {
  const [step, setStep] = useState(1);

  return (
    <StudioShell
      stepId="marketing"
      eyebrow="Step 4 · Marketing Engine"
      title="Spectral analysis"
      intro="Refract a product into a market blueprint, audience personas, and ad concepts you can stress-test."
    >
      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        {/* Vertical stepper */}
        <aside className="glass sticky top-44 h-fit rounded-2xl p-3">
          <ol className="space-y-1">
            {steps.map((s) => {
              const active = s.id === step;
              const done = s.id < step;
              return (
                <li key={s.id}>
                  <button
                    onClick={() => setStep(s.id)}
                    className={`flex w-full items-start gap-3 rounded-xl p-2.5 text-left transition ${
                      active ? "bg-foreground text-background" : done ? "text-foreground hover:bg-white/60" : "text-muted-foreground hover:bg-white/60"
                    }`}
                  >
                    <span className={`mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-full text-[10px] font-medium ${
                      active ? "bg-background text-foreground" : done ? "bg-foreground text-background" : "border border-border bg-white/70 text-muted-foreground"
                    }`}>
                      {done ? <Check size={11} /> : s.id}
                    </span>
                    <span>
                      <span className="block text-[13px] font-medium">{s.name}</span>
                      <span className={`block text-[10px] uppercase tracking-[0.16em] ${active ? "text-background/70" : "text-muted-foreground"}`}>{s.sub}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </aside>

        {/* Active step */}
        <div className="min-h-[480px]">
          {step === 1 && <StepUpload onNext={() => setStep(2)} />}
          {step === 2 && <StepContext onNext={() => setStep(3)} />}
          {step === 3 && <StepAnalysis onDone={() => setStep(4)} />}
          {step === 4 && <StepBlueprint onNext={() => setStep(5)} />}
          {step === 5 && <StepPersonas onNext={() => setStep(6)} />}
          {step === 6 && <StepHooks />}
        </div>
      </div>
    </StudioShell>
  );
}

function NextBtn({ onClick, label = "Continue" }: { onClick: () => void; label?: string }) {
  return (
    <button onClick={onClick} className="bg-gradient-cta inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-medium text-white shadow-[0_8px_24px_-6px_rgba(255,90,120,0.55)] hover:brightness-105 transition">
      {label} <ChevronRight size={15} />
    </button>
  );
}

/* ───────── Step 1 ───────── */
function StepUpload({ onNext }: { onNext: () => void }) {
  const [name, setName] = useState<string | null>(null);
  return (
    <div className="glass rounded-3xl p-6">
      <h2 className="font-display text-2xl text-foreground">Drop your product or brand asset</h2>
      <p className="mt-1 text-sm text-muted-foreground">Hero shot, packaging, or brand mark. PNG / JPG, up to 20MB.</p>
      <label className="mt-5 flex h-[260px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-white/40 text-center hover:border-foreground/40 transition">
        <input type="file" accept="image/*" className="hidden" onChange={(e) => setName(e.target.files?.[0]?.name ?? null)} />
        <Upload size={28} className="text-muted-foreground" />
        <p className="mt-3 text-sm text-foreground">{name ?? "Click to upload or drag & drop"}</p>
        <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">PNG · JPG · WEBP</p>
      </label>
      <div className="mt-5 flex justify-end"><NextBtn onClick={onNext} label="Add context" /></div>
    </div>
  );
}

/* ───────── Step 2 ───────── */
function StepContext({ onNext }: { onNext: () => void }) {
  const fields = [
    { label: "Materials",      placeholder: "Recycled poly, merino blend…" },
    { label: "Pricing tier",   placeholder: "Mass · Premium · Luxury" },
    { label: "Primary region", placeholder: "EU · MENA · NA…" },
    { label: "Channels",       placeholder: "DTC · Wholesale · Retail" },
    { label: "Category",       placeholder: "Performance wear" },
    { label: "Stage",          placeholder: "Zero-to-One · Relaunch · Scale" },
  ];
  return (
    <div className="glass rounded-3xl p-6">
      <h2 className="font-display text-2xl text-foreground">Prompt Whisperer</h2>
      <p className="mt-1 text-sm text-muted-foreground">Add the context that turns a flat brief into a sharp blueprint.</p>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {fields.map((f) => (
          <div key={f.label}>
            <label className="text-[11px] font-medium uppercase tracking-[0.16em] text-foreground/80">{f.label}</label>
            <input placeholder={f.placeholder} className="mt-1 w-full rounded-lg border border-border bg-white/80 px-3 py-2 text-sm outline-none focus:border-foreground/40" />
          </div>
        ))}
      </div>
      <div className="mt-5 flex justify-end"><NextBtn onClick={onNext} label="Run analysis" /></div>
    </div>
  );
}

/* ───────── Step 3 ───────── */
function StepAnalysis({ onDone }: { onDone: () => void }) {
  const phases = ["Extracting hex palette…", "Locking grid structure…", "Mapping competitor density…", "Synthesising market blueprint…"];
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setPhase((p) => p + 1), 900);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (phase >= phases.length) {
      const t = setTimeout(onDone, 400);
      return () => clearTimeout(t);
    }
  }, [phase, onDone, phases.length]);

  return (
    <div className="glass flex min-h-[480px] flex-col items-center justify-center rounded-3xl p-6 text-center">
      <div className="relative h-40 w-40">
        <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent" style={{ borderTopColor: "var(--scope-purple)", borderRightColor: "var(--scope-pink)", animationDuration: "2s" }} />
        <div className="absolute inset-3 animate-spin rounded-full border-2 border-transparent" style={{ borderTopColor: "var(--scope-blue)", animationDuration: "3s", animationDirection: "reverse" }} />
        <div className="absolute inset-6 animate-spin rounded-full border-2 border-transparent" style={{ borderTopColor: "var(--scope-orange)", animationDuration: "4s" }} />
        <div className="absolute inset-0 flex items-center justify-center">
          <Sparkles size={22} className="text-foreground/70" />
        </div>
      </div>
      <p className="mt-6 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Centrifuge · spectral analysis</p>
      <p className="mt-2 font-display text-xl text-foreground">
        {phases[Math.min(phase, phases.length - 1)]}
      </p>
      <div className="mt-4 flex gap-1.5">
        {phases.map((_, i) => (
          <span key={i} className={`h-1.5 w-8 rounded-full ${i <= phase ? "bg-foreground" : "bg-border"}`} />
        ))}
      </div>
    </div>
  );
}

/* ───────── Step 4 ───────── */
function StepBlueprint({ onNext }: { onNext: () => void }) {
  const cards = [
    {
      title: "Product Identity",
      rows: [
        ["Category", "Performance wear · Regenerative"],
        ["Positioning", "Quiet technical · Premium DTC"],
        ["Signature", "Honesty · Craft · Longevity"],
      ],
    },
    {
      title: "Buying Behavior",
      rows: [
        ["Trigger", "Post-workout commute · burnout reset"],
        ["Decision window", "3–7 days · cross-device research"],
        ["Friction", "Sustainability proof · returns"],
      ],
    },
    {
      title: "Category Tension",
      rows: [
        ["Default", "Loud, performative athleisure"],
        ["Whitespace", "Calm authority · regenerative proof"],
        ["Opportunity", "Editorial corporate-athlete narrative"],
      ],
    },
  ];
  return (
    <div className="space-y-4">
      <div className="glass rounded-3xl p-6">
        <h2 className="font-display text-2xl text-foreground">Market Blueprint</h2>
        <p className="mt-1 text-sm text-muted-foreground">A JSON-shaped snapshot of how the product lives in its market.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {cards.map((c) => (
          <div key={c.title} className="glass rounded-2xl p-5">
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{c.title}</p>
            <dl className="mt-3 space-y-2">
              {c.rows.map(([k, v]) => (
                <div key={k} className="text-[12.5px]">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="text-foreground">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
      <div className="flex justify-end"><NextBtn onClick={onNext} label="Generate personas" /></div>
    </div>
  );
}

/* ───────── Step 5 ───────── */
function StepPersonas({ onNext }: { onNext: () => void }) {
  const personas = [
    {
      tier: "Primary", name: "Maya · 29", role: "Strategy lead, Berlin",
      grad: "linear-gradient(135deg,#9F7AEA,#4299E1)",
      jobs: ["Move from desk to studio without changing", "Signal taste without logos", "Buy fewer, better pieces"],
      channels: ["Instagram", "Substack", "Spotify"],
    },
    {
      tier: "Secondary", name: "Lena · 34", role: "Architect, Milan",
      grad: "linear-gradient(135deg,#ED64A6,#ED8936)",
      jobs: ["Layer technical fabrics under tailoring", "Trust origin & repair story", "Avoid throwaway trend cycles"],
      channels: ["Pinterest", "RA / Boiler Room", "Newsletters"],
    },
  ];
  return (
    <div className="space-y-4">
      <div className="glass rounded-3xl p-6">
        <h2 className="font-display text-2xl text-foreground">Persona Cards</h2>
        <p className="mt-1 text-sm text-muted-foreground">Two concrete people you're designing for. Reference them everywhere.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {personas.map((p) => (
          <div key={p.tier} className="glass rounded-2xl p-5">
            <div className="flex items-center gap-3">
              <div className="h-14 w-14 rounded-full" style={{ background: p.grad }} />
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{p.tier} persona</p>
                <p className="text-base font-semibold text-foreground">{p.name}</p>
                <p className="text-[12px] text-muted-foreground">{p.role}</p>
              </div>
            </div>
            <p className="mt-4 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Jobs to be done</p>
            <ul className="mt-1.5 space-y-1 text-[13px] text-foreground">
              {p.jobs.map((j) => <li key={j} className="flex gap-2"><span className="text-muted-foreground">·</span>{j}</li>)}
            </ul>
            <p className="mt-4 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Channels</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {p.channels.map((c) => <span key={c} className="rounded-full border border-border bg-white/70 px-2.5 py-0.5 text-[11px] text-foreground">{c}</span>)}
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-end"><NextBtn onClick={onNext} label="Play Negative Hooks" /></div>
    </div>
  );
}

/* ───────── Step 6 ───────── */
function StepHooks() {
  const concepts = [
    { id: "a", title: "“Crush your morning. Out-pace everyone.”", body: "Hyper-competitive performance copy, neon ad creative.",  alienates: true,  why: "Maya is anti-performative — loud bro-energy reads as opposite of her quiet-authority taste." },
    { id: "b", title: "“Built to disappear into your day.”",       body: "Editorial photo, single sentence, brand mark bottom-left.", alienates: false, why: "Confident, quiet, on-strategy." },
    { id: "c", title: "“Repairable. Returnable. Regenerative.”",   body: "Receipt-style typographic poster.",                       alienates: false, why: "Proof-led, fits the sustainability JTBD." },
  ];
  const [pick, setPick] = useState<string | null>(null);
  const correct = pick ? concepts.find((c) => c.id === pick)!.alienates : null;

  return (
    <div className="space-y-4">
      <div className="glass rounded-3xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-2xl text-foreground">Negative Hooks — which one alienates Maya?</h2>
            <p className="mt-1 text-sm text-muted-foreground">Pick the concept you think would push the primary persona away.</p>
          </div>
          {pick && (
            <button onClick={() => setPick(null)} className="glass inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-foreground hover:bg-white">
              <RotateCcw size={12} /> Reset
            </button>
          )}
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {concepts.map((c) => {
          const isPicked = pick === c.id;
          const wrong = isPicked && !c.alienates;
          const right = isPicked && c.alienates;
          return (
            <button
              key={c.id}
              onClick={() => setPick(c.id)}
              className={`glass rounded-2xl p-5 text-left transition ${
                wrong ? "ring-2 ring-rose-400 animate-pulse" : right ? "ring-2 ring-emerald-400" : "hover:scale-[1.01]"
              }`}
            >
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Concept {c.id.toUpperCase()}</p>
              <p className="mt-2 font-display text-lg text-foreground leading-snug">{c.title}</p>
              <p className="mt-2 text-[12.5px] text-muted-foreground">{c.body}</p>
              {isPicked && (
                <div className={`mt-3 flex items-start gap-2 rounded-lg p-2 text-[12px] ${c.alienates ? "bg-emerald-50 text-emerald-900" : "bg-rose-50 text-rose-900"}`}>
                  {c.alienates ? <Check size={13} className="mt-0.5 flex-none" /> : <AlertTriangle size={13} className="mt-0.5 flex-none" />}
                  <span>{c.why}</span>
                </div>
              )}
            </button>
          );
        })}
      </div>
      {pick && (
        <div className={`glass rounded-2xl p-4 text-sm ${correct ? "text-emerald-900" : "text-rose-900"}`}>
          {correct ? "Nailed it — that's the alienating one. Now you know what NOT to ship." : "Not quite — that concept actually fits Maya. Try again to find the one that alienates her."}
        </div>
      )}
    </div>
  );
}
