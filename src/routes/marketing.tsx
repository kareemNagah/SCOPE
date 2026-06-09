import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MeshBackground } from "@/components/scope/MeshBackground";
import { TopNav } from "@/components/scope/TopNav";
import { Upload, Check, ChevronRight, Sparkles, AlertTriangle, RotateCcw } from "lucide-react";
import { api, type MarketingResult } from "@/lib/api";
import { toast } from "sonner";
import { AuroraButton } from "@/components/ui/aurora-button";

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
  { id: 1, name: "Asset & Context",        sub: "Prompt Whisperer" },
  { id: 2, name: "Visual & Market Analysis", sub: "Centrifuge AI lab" },
  { id: 3, name: "Market Blueprint",       sub: "Identity & behavior" },
  { id: 4, name: "Persona Cards",          sub: "Primary & secondary" },
  { id: 5, name: "Negative Hooks Game",    sub: "Stealth education" },
];

function MarketingPage() {
  const search = useSearch({ strict: false }) as { session?: string };
  const sessionId = search.session || "default_session";
  const [step, setStep] = useState(1);
  const [data, setData] = useState<MarketingResult | null>(null);

  useEffect(() => {
    if (search.session) {
      api.getMarketing(search.session).then((res) => {
        if (res) {
          setData(res);
          setStep(3); // Skip to blueprint if we already have data
        }
      });
    }
  }, [search.session]);

  const handleRunAnalysis = async (fields: any) => {
    setStep(2);
    try {
      const res = await api.analyzeMarketing({ session_id: sessionId, ...fields });
      setData(res);
      setStep(3);
    } catch (err) {
      console.error(err);
      toast.error("Analysis failed. Check the backend logs.");
      setStep(1);
    }
  };

  return (
    <div className="relative min-h-screen pb-32">
      <MeshBackground />
      <TopNav />
      
      <main className="px-6 pt-44">
        <header className="mx-auto max-w-[1200px] text-center">
          <p className="font-sans text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
            Module 2 · Marketing Engine
          </p>
          <h1 className="mt-2 font-display text-[clamp(2rem,4.5vw,3.75rem)] leading-[1.05] tracking-tight text-foreground">
            Spectral Analysis
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-[15px] text-muted-foreground">
            Refract a product brief and visual asset into a structured market blueprint, target consumer personas, and stress-tested ad concepts.
          </p>
        </header>

        <div className="mx-auto mt-10 max-w-[1200px] grid gap-6 lg:grid-cols-[260px_1fr]">
          {/* Sidebar Navigation */}
          <aside className="glass sticky top-44 h-fit rounded-2xl p-3">
            <ol className="space-y-1">
              {steps.map((s) => {
                const active = s.id === step;
                const done = s.id < step || (s.id >= 3 && data !== null);
                return (
                  <li key={s.id}>
                    <button
                      onClick={() => {
                        if (done || s.id === 1) setStep(s.id);
                      }}
                      className={`flex w-full items-start gap-3 rounded-xl p-2.5 text-left transition cursor-pointer ${
                        active ? "bg-foreground text-background" : done ? "text-foreground hover:bg-white/60" : "text-muted-foreground hover:bg-white/60"
                      }`}
                    >
                      <span className={`mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-full text-[10px] font-medium ${
                        active ? "bg-background text-foreground" : done ? "bg-foreground text-background" : "border border-border bg-white/70 text-muted-foreground"
                      }`}>
                        {done && !active ? <Check size={11} /> : s.id}
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

          {/* Active Step Panel */}
          <div className="min-h-[480px]">
            {step === 1 && <StepUploadAndContext onNext={handleRunAnalysis} />}
            {step === 2 && <StepAnalysis />}
            {step === 3 && data && <StepBlueprint data={data} onNext={() => setStep(4)} />}
            {step === 4 && data && <StepPersonas data={data} onNext={() => setStep(5)} />}
            {step === 5 && data && <StepHooks data={data} />}
          </div>
        </div>
      </main>
    </div>
  );
}

function NextBtn({ onClick, label = "Continue" }: { onClick: () => void; label?: string }) {
  return (
    <AuroraButton onClick={onClick} className="h-10 px-5 rounded-full text-xs font-semibold uppercase tracking-wider">
      {label} <ChevronRight size={15} />
    </AuroraButton>
  );
}

function StepUploadAndContext({ onNext }: { onNext: (fields: any) => void }) {
  const [name, setName] = useState<string | null>(null);
  const [fields, setFields] = useState({
    materials: "", pricing_tier: "", region: "", channels: "", category: "", stage: ""
  });
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const fieldConfigs = [
    { key: "materials", label: "Materials / Ingredients", placeholder: "Organic cotton, botanical oils…" },
    { key: "pricing_tier", label: "Pricing Tier", placeholder: "Mass · Premium · Luxury" },
    { key: "region", label: "Primary Region", placeholder: "Global · NA · EU · MENA…" },
    { key: "channels", label: "Sales Channels", placeholder: "DTC · Retail · Marketplace" },
    { key: "category", label: "Product Category", placeholder: "Skincare, activewear…" },
    { key: "stage", label: "Brand Stage", placeholder: "Zero-to-One · Relaunch · Scale" },
  ] as const;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      setName(file.name);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  return (
    <div className="glass rounded-3xl p-6">
      <div className="grid gap-6 md:grid-cols-[1fr_320px]">
        {/* Left column: upload */}
        <div className="flex flex-col justify-between">
          <div>
            <h2 className="font-display text-2xl text-foreground">1. Upload Product/Brand Asset</h2>
            <p className="mt-1 text-sm text-muted-foreground">Drop a hero shot, product packaging, or logo. Supports PNG, JPG, or WEBP.</p>
            
            {previewUrl ? (
              <div className="relative mt-5 flex h-[280px] items-center justify-center rounded-2xl border border-border bg-black/5 overflow-hidden">
                <img src={previewUrl} alt="Preview" className="h-full w-full object-contain" />
                <button 
                  onClick={() => { setPreviewUrl(null); setName(null); }} 
                  className="absolute top-2 right-2 bg-white/80 hover:bg-white p-1.5 rounded-full text-rose-500 shadow transition cursor-pointer"
                >
                  <RotateCcw size={14} />
                </button>
              </div>
            ) : (
              <label className="mt-5 flex h-[280px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-white/40 text-center hover:border-foreground/45 transition">
                <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                <Upload size={28} className="text-muted-foreground" />
                <p className="mt-3 text-sm text-foreground">{name ?? "Click to upload or drag & drop"}</p>
                <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">PNG · JPG · WEBP</p>
              </label>
            )}
          </div>
        </div>

        {/* Right column: prompt whisperer sidebar */}
        <div className="border-l border-white/20 pl-6 flex flex-col justify-between">
          <div>
            <h2 className="font-display text-2xl text-foreground">Context Sidebar</h2>
            <p className="mt-1 text-xs text-muted-foreground leading-normal">The Prompt Whisperer guides you to refine the AI's market calibration.</p>
            
            <div className="mt-4 space-y-3">
              {fieldConfigs.map((f) => (
                <div key={f.key}>
                  <label className="text-[9px] font-bold uppercase tracking-[0.16em] text-foreground/80">{f.label}</label>
                  <input 
                    placeholder={f.placeholder} 
                    value={fields[f.key]}
                    onChange={(e) => setFields({...fields, [f.key]: e.target.value})}
                    className="mt-1 w-full rounded-lg border border-border bg-white/80 px-2.5 py-1.5 text-xs outline-none focus:border-foreground/45" 
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-6 border-t border-white/10 pt-4 flex justify-end">
        <AuroraButton 
          onClick={() => onNext(fields)} 
          className="h-10 px-6 rounded-full text-xs font-semibold uppercase tracking-wider"
        >
          Run Centrifuge Analysis <ChevronRight size={15} />
        </AuroraButton>
      </div>
    </div>
  );
}

function StepAnalysis() {
  const phases = ["Extracting context…", "Aligning LLM weights…", "Synthesising market blueprint…", "Generating personas…"];
  const [phase, setPhase] = useState(0);
  
  useEffect(() => {
    const t = setInterval(() => setPhase((p) => Math.min(p + 1, phases.length - 1)), 1500);
    return () => clearInterval(t);
  }, []);

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
        {phases[phase]}
      </p>
      <div className="mt-4 flex gap-1.5">
        {phases.map((_, i) => (
          <span key={i} className={`h-1.5 w-8 rounded-full ${i <= phase ? "bg-foreground" : "bg-border transition-colors duration-500"}`} />
        ))}
      </div>
    </div>
  );
}

function StepBlueprint({ data, onNext }: { data: MarketingResult, onNext: () => void }) {
  const cards = [
    {
      title: "Product Identity",
      rows: [
        ["Category", data.blueprint.product_identity.category],
        ["Positioning", data.blueprint.product_identity.positioning],
        ["Signature", data.blueprint.product_identity.signature],
      ],
    },
    {
      title: "Buying Behavior",
      rows: [
        ["Trigger", data.blueprint.buying_behavior.trigger],
        ["Decision window", data.blueprint.buying_behavior.decision_window],
        ["Friction", data.blueprint.buying_behavior.friction],
      ],
    },
    {
      title: "Category Tension",
      rows: [
        ["Default", data.blueprint.category_tension.default],
        ["Whitespace", data.blueprint.category_tension.whitespace],
        ["Opportunity", data.blueprint.category_tension.opportunity],
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
      <div className="flex justify-end"><NextBtn onClick={onNext} label="View personas" /></div>
    </div>
  );
}

function StepPersonas({ data, onNext }: { data: MarketingResult, onNext: () => void }) {
  return (
    <div className="space-y-4">
      <div className="glass rounded-3xl p-6">
        <h2 className="font-display text-2xl text-foreground">Persona Cards</h2>
        <p className="mt-1 text-sm text-muted-foreground">Concrete people you're designing for. Reference them everywhere.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {data.personas.map((p) => (
          <div key={p.tier} className="glass rounded-2xl p-5">
            <div className="flex items-center gap-3">
              <div className="h-14 w-14 rounded-full" style={{ background: p.gradient || "var(--gradient-brand)" }} />
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

function StepHooks({ data }: { data: MarketingResult }) {
  const primaryName = data.personas.find(p => p.tier.toLowerCase() === "primary")?.name.split(" ")[0] || "your primary persona";
  
  const [pick, setPick] = useState<string | null>(null);
  const correct = pick ? data.hooks.find((c) => c.id === pick)?.alienates : null;

  return (
    <div className="space-y-4">
      <div className="glass rounded-3xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-2xl text-foreground">Stealth Ed: Negative Hooks Selection</h2>
            <p className="mt-1 text-sm text-muted-foreground">Choose the hook concept you believe would alienate {primaryName} based on their Persona Card.</p>
          </div>
          {pick && (
            <button onClick={() => setPick(null)} className="glass inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-foreground hover:bg-white cursor-pointer">
              <RotateCcw size={12} /> Reset
            </button>
          )}
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {data.hooks.map((c) => {
          const isPicked = pick === c.id;
          const wrong = isPicked && !c.alienates;
          const right = isPicked && c.alienates;
          return (
            <button
              key={c.id}
              onClick={() => setPick(c.id)}
              className={`glass rounded-2xl p-5 text-left transition cursor-pointer ${
                wrong ? "ring-2 ring-rose-400 animate-pulse" : right ? "ring-2 ring-emerald-400" : "hover:scale-[1.01]"
              }`}
            >
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
          {correct ? `Nailed it — that's the alienating one. Now you know what NOT to ship to ${primaryName}.` : `Not quite — that concept actually fits ${primaryName}. Try again to find the one that alienates them.`}
        </div>
      )}
    </div>
  );
}
