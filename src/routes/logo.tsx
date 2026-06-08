import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { StudioShell } from "@/components/scope/StudioShell";
import { Download, Check, Loader2 } from "lucide-react";
import { api, type LogoResult } from "@/lib/api";
import { toast } from "sonner";

export const Route = createFileRoute("/logo")({
  head: () => ({
    meta: [
      { title: "SCOPE — Logo Generation Studio" },
      { name: "description", content: "Choose palette, concept and typography. Generate your final logo and export EPS." },
    ],
  }),
  component: LogoPage,
});

const palettes = [
  { id: "dispersion", name: "Dispersion Spectrum", colors: ["#1a1233", "#5a3fc1", "#b48ef0", "#f1c5f5"] },
  { id: "moss",       name: "Moss & Brutal",       colors: ["#1c2018", "#3e4a36", "#a8b89a", "#e8e6dd"] },
  { id: "solar",      name: "Solar Atelier",       colors: ["#180f0a", "#7a3a1f", "#f08a4a", "#fbe4c2"] },
];

const fontPairs = [
  { id: "instrument", display: "Instrument Serif", body: "Inter",  mood: "Editorial · Premium",   stack: "'Instrument Serif', Georgia, serif" },
  { id: "space",      display: "Space Grotesk",    body: "Inter",  mood: "Engineering · Modern",  stack: "'Space Grotesk', system-ui, sans-serif" },
  { id: "cormorant",  display: "Cormorant",        body: "Karla",  mood: "Luxury · Quiet",        stack: "'Cormorant', Georgia, serif" },
];

const concepts = [
  { id: "prism",    name: "Refracted Prism", desc: "Geometric mark referencing light through glass." },
  { id: "mono",     name: "Soft Monogram",   desc: "Lowercase wordmark with circular counters." },
  { id: "stamp",    name: "Brutal Stamp",    desc: "Heavy serif badge, single-color compatible." },
  { id: "linear",   name: "Linear Glyph",    desc: "Thin line monogram, scales to favicon." },
];

function LogoMark({ size = 40, colors }: { size?: number; colors: string[] }) {
  const id = `lg-${colors.join("-").replace(/#/g, "")}-${size}`;
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0"  stopColor={colors[1] ?? colors[0]} />
          <stop offset=".5" stopColor={colors[2] ?? colors[1]} />
          <stop offset="1"  stopColor={colors[3] ?? colors[2]} />
        </linearGradient>
      </defs>
      <path
        d="M34 6H14C10 6 7 9 7 12.5C7 16 10 18 14 18.5L26 20.5C30 21 33 23 33 27C33 31 30 34 26 34H6"
        stroke={`url(#${id})`} strokeWidth="6" strokeLinecap="square" fill="none"
      />
    </svg>
  );
}

function LogoPage() {
  const search = useSearch({ strict: false }) as { session?: string };
  const sessionId = search.session || "default_session";
  
  const [paletteId, setPaletteId] = useState(palettes[0].id);
  const [fontId, setFontId] = useState(fontPairs[1].id);
  const [conceptId, setConceptId] = useState(concepts[0].id);
  const [wordmark, setWordmark] = useState("SCOPE");
  
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<LogoResult | null>(null);

  useEffect(() => {
    if (search.session) {
      api.getLogo(search.session).then((res) => {
        if (res) {
          setResult(res);
        }
      });
    }
  }, [search.session]);

  const handleGenerate = async () => {
    const palette = palettes.find((p) => p.id === paletteId)!;
    const font = fontPairs.find((f) => f.id === fontId)!;
    const concept = concepts.find((c) => c.id === conceptId)!;
    
    setIsLoading(true);
    try {
      const res = await api.generateLogo({
        session_id: sessionId,
        wordmark,
        concept: concept.name,
        palette_name: palette.name,
        font_name: font.display
      });
      setResult(res);
      toast.success("Logo concept generated!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate logo concept.");
    } finally {
      setIsLoading(false);
    }
  };

  const palette = palettes.find((p) => p.id === paletteId)!;
  const font = fontPairs.find((f) => f.id === fontId)!;
  const concept = concepts.find((c) => c.id === conceptId)!;

  const previewBg = `radial-gradient(ellipse at 30% 30%, ${palette.colors[2]}, ${palette.colors[0]} 70%)`;

  return (
    <StudioShell
      stepId="logo"
      eyebrow="Step 5 · Logo Generation Studio"
      title="Generate your mark"
      intro="Pick a direction, a palette, and a typography pairing. Preview live, then export EPS."
    >
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        {/* Tool panel */}
        <aside className="glass space-y-6 rounded-2xl p-5">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-foreground/80">Wordmark</p>
            <input
              value={wordmark}
              onChange={(e) => setWordmark(e.target.value.slice(0, 24))}
              className="mt-1.5 w-full rounded-lg border border-border bg-white/80 px-3 py-2 text-sm outline-none focus:border-foreground/40"
            />
          </div>

          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-foreground/80">Concept</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {concepts.map((c) => {
                const active = c.id === conceptId;
                return (
                  <button
                    key={c.id}
                    onClick={() => setConceptId(c.id)}
                    className={`rounded-lg border p-2 text-left text-[11px] transition ${
                      active
                        ? "border-transparent bg-foreground text-background shadow-[var(--shadow-prism)]"
                        : "border-border bg-white/70 text-foreground hover:bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{c.name}</span>
                      {active && <Check size={11} />}
                    </div>
                    <p className={`mt-0.5 text-[10px] leading-snug ${active ? "text-background/70" : "text-muted-foreground"}`}>
                      {c.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-foreground/80">Palette</p>
            <div className="mt-2 space-y-2">
              {palettes.map((p) => {
                const active = p.id === paletteId;
                return (
                  <button
                    key={p.id}
                    onClick={() => setPaletteId(p.id)}
                    className={`flex w-full items-center gap-2 rounded-lg border p-2 transition ${
                      active ? "border-foreground/60 ring-2 ring-foreground/20" : "border-border hover:border-foreground/30"
                    } bg-white/70`}
                  >
                    <div className="flex flex-1 gap-1">
                      {p.colors.map((c) => (
                        <span key={c} className="h-6 flex-1 rounded" style={{ background: c }} />
                      ))}
                    </div>
                    <span className="w-[110px] text-left text-[11px] font-medium text-foreground">{p.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-foreground/80">Typography</p>
            <div className="mt-2 space-y-2">
              {fontPairs.map((f) => {
                const active = f.id === fontId;
                return (
                  <button
                    key={f.id}
                    onClick={() => setFontId(f.id)}
                    className={`block w-full rounded-lg border p-2 text-left transition ${
                      active ? "border-foreground/60 ring-2 ring-foreground/20" : "border-border hover:border-foreground/30"
                    } bg-white/70`}
                  >
                    <p className="text-base text-foreground leading-tight" style={{ fontFamily: f.stack }}>
                      {f.display}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{f.mood}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Preview + variations */}
        <div>
          <div
            className="relative flex h-[360px] items-center justify-center overflow-hidden rounded-2xl"
            style={{ background: previewBg }}
          >
            <div className="flex items-center gap-5">
              <LogoMark size={88} colors={palette.colors} />
              <span
                className="text-6xl font-semibold tracking-tight text-white"
                style={{ fontFamily: font.stack }}
              >
                {wordmark}
              </span>
            </div>
            <span className="absolute bottom-3 left-4 text-[10px] uppercase tracking-[0.18em] text-white/60">
              {concept.name} · {palette.name} · {font.display}
            </span>
            <span className="absolute bottom-3 right-4 text-[10px] uppercase tracking-[0.18em] text-white/60">
              Preview · 2400 × 1200
            </span>
          </div>

          <div className="mt-4 grid grid-cols-[1fr_auto] gap-3">
            <button 
              onClick={handleGenerate}
              disabled={isLoading}
              className="bg-gradient-cta inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-white shadow-[0_8px_24px_-6px_rgba(255,90,120,0.55)] transition hover:brightness-105 disabled:opacity-50"
            >
              {isLoading ? <Loader2 size={16} className="animate-spin" /> : "Generate Logo."}
            </button>
            <button className="glass inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-foreground transition hover:bg-white">
              <Download size={15} /> Download EPS
            </button>
          </div>
          
          {result && (
            <div className="mt-4 glass rounded-xl p-4">
              <h3 className="font-display text-lg text-foreground">"{result.tagline}"</h3>
              <p className="mt-2 text-[13px] text-foreground leading-relaxed">{result.concept_description}</p>
            </div>
          )}

          <div className="mt-6">
            <p className="mb-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Variations grid</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {(["row", "col", "icon", "mono"] as const).map((layout) => (
                <div key={layout} className="glass rounded-xl p-4 text-center">
                  <div className="flex h-16 items-center justify-center gap-2">
                    {layout === "row" && (<><LogoMark colors={palette.colors} /> <span className="font-semibold tracking-tight" style={{ fontFamily: font.stack }}>{wordmark}</span></>)}
                    {layout === "col" && (<div className="flex flex-col items-center"><LogoMark size={28} colors={palette.colors} /><span className="mt-1 text-xs font-semibold tracking-tight" style={{ fontFamily: font.stack }}>{wordmark}</span></div>)}
                    {layout === "icon" && <LogoMark size={36} colors={palette.colors} />}
                    {layout === "mono" && (<><span style={{ filter: "grayscale(1) brightness(0.2)" }}><LogoMark colors={palette.colors} /></span><span className="font-semibold tracking-tight" style={{ fontFamily: font.stack }}>{wordmark}</span></>)}
                  </div>
                  <p className="mt-2 text-[11px] text-muted-foreground capitalize">
                    {layout === "row" ? "Horizontal" : layout === "col" ? "Stacked" : layout === "icon" ? "Icon Only" : "Monochrome"}
                  </p>
                  {result && (
                    <p className="mt-1 text-[10px] text-foreground/70">
                      {result.variations.find(v => v.name.toLowerCase() === (layout === "row" ? "horizontal" : layout === "col" ? "stacked" : layout === "icon" ? "icon only" : "monochrome"))?.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </StudioShell>
  );
}
