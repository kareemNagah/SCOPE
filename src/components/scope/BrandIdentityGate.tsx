import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check, ChevronLeft, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import { useCanvas, type SelectedPalette } from "./CanvasContext";

// ── Color derivation (mirrors identity.tsx) ──────────────────────────────────

const COLOR_MAP: Record<string, string> = {
  "midnight blue": "#1B2A4A",
  navy: "#1a2744",
  "deep blue": "#1e3a5f",
  cobalt: "#0047AB",
  teal: "#008080",
  emerald: "#059669",
  "forest green": "#166534",
  sage: "#8A9A5B",
  burgundy: "#800020",
  crimson: "#DC143C",
  rose: "#E11D48",
  coral: "#F97316",
  terracotta: "#C4622D",
  amber: "#D97706",
  gold: "#B45309",
  cream: "#FEF3C7",
  purple: "#7C3AED",
  violet: "#6D28D9",
  lavender: "#A78BFA",
  indigo: "#4338CA",
  charcoal: "#374151",
  slate: "#475569",
  silver: "#94A3B8",
  "rose gold": "#BE8A8A",
  black: "#0F172A",
};

function cueToHex(cue: string): string | null {
  const lower = cue.toLowerCase();
  for (const [key, val] of Object.entries(COLOR_MAP)) {
    if (lower.includes(key)) return val;
  }
  return null;
}

function deriveFallbackPalettes(cues: string[]): SelectedPalette[] {
  const raw: string[] = [];
  for (const cue of cues) {
    const hex = cueToHex(cue);
    if (hex && !raw.includes(hex)) raw.push(hex);
    if (raw.length >= 8) break;
  }
  if (raw.length < 3) raw.push("#1B2A4A", "#7C3AED", "#A78BFA", "#E11D48", "#F3E8D0");

  const ensure4 = (arr: string[], fb: string[]): string[] => {
    const out = [...arr];
    for (const f of fb) {
      if (out.length >= 4) break;
      if (!out.includes(f)) out.push(f);
    }
    return out.slice(0, 4);
  };

  return [
    {
      name: "Primary Voice",
      mood: "Brand Foundation",
      colors: ensure4([raw[0], raw[1], raw[2], raw[3] ?? "#F8FAFC"], ["#F8FAFC", "#0F172A"]),
    },
    {
      name: "Secondary Range",
      mood: "Supporting Cast",
      colors: ensure4(
        [raw[2] ?? raw[0], raw[4] ?? raw[1], raw[5] ?? raw[3], "#F8FAFC"],
        ["#F8FAFC", raw[0]],
      ),
    },
    {
      name: "Accent Edition",
      mood: "Campaign Moments",
      colors: ensure4(
        [raw[raw.length - 1] ?? raw[0], raw[1], raw[0], raw[3] ?? "#1E293B"],
        ["#1E293B", "#F8FAFC"],
      ),
    },
  ];
}

function isLightHex(hex: string): boolean {
  const h = hex.replace("#", "");
  if (h.length < 6) return false;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 160;
}

// ── Static options ────────────────────────────────────────────────────────────

const FONTS = [
  { id: "instrument", display: "Instrument Serif", body: "Space Grotesk" },
  { id: "space", display: "Space Grotesk", body: "Inter" },
  { id: "cormorant", display: "Cormorant", body: "Karla" },
];

const CONCEPTS = [
  { name: "Refracted Prism", desc: "Geometric mark referencing light through glass." },
  { name: "Soft Monogram", desc: "Lowercase wordmark with circular counters." },
  { name: "Brutal Stamp", desc: "Heavy serif badge, single-color compatible." },
  { name: "Linear Glyph", desc: "Thin line monogram, scales to favicon." },
];

// ── Types ─────────────────────────────────────────────────────────────────────

export type GatePayload = {
  brandName: string;
  palette: SelectedPalette;
  concept: string;
  fontName: string;
};

// ── Component ─────────────────────────────────────────────────────────────────

export function BrandIdentityGate({
  sessionId,
  onConfirm,
  onBack,
}: {
  sessionId: string;
  onConfirm: (payload: GatePayload) => Promise<void>;
  onBack: () => void;
}) {
  const { selectedPalette: chatPalette } = useCanvas();

  const [brandName, setBrandName] = React.useState("");
  const [palettes, setPalettes] = React.useState<SelectedPalette[]>([]);
  const [selectedPaletteIdx, setSelectedPaletteIdx] = React.useState<number | null>(null);
  const [selectedFontIdx, setSelectedFontIdx] = React.useState<number>(0);
  const [selectedConceptIdx, setSelectedConceptIdx] = React.useState<number>(0);
  const [nodeSummary, setNodeSummary] = React.useState<{ type: string; title: string; content: string }[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [confirming, setConfirming] = React.useState(false);

  React.useEffect(() => {
    api
      .identityPreview(sessionId)
      .then((data) => {
        setBrandName(data.brand_name ?? "");
        setNodeSummary(data.nodes_summary ?? []);

        // Build palette list: AI-selected from chat first, then fallbacks from visual_cues
        const fallbacks = deriveFallbackPalettes(data.visual_cues ?? []);
        if (chatPalette) {
          // Prepend the AI palette, deduplicating by name
          const rest = fallbacks.filter((p) => p.name !== chatPalette.name);
          setPalettes([chatPalette, ...rest].slice(0, 3));
          setSelectedPaletteIdx(0);
        } else {
          setPalettes(fallbacks);
          setSelectedPaletteIdx(0);
        }
      })
      .catch(() => {
        const fallbacks = deriveFallbackPalettes([]);
        setPalettes(fallbacks);
        setSelectedPaletteIdx(0);
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const canConfirm = brandName.trim() && selectedPaletteIdx !== null && !confirming;

  const handleConfirm = async () => {
    if (!canConfirm) return;
    const palette = palettes[selectedPaletteIdx!];
    const font = FONTS[selectedFontIdx];
    const concept = CONCEPTS[selectedConceptIdx];

    // Persist selections so logo.tsx can pre-populate regenerate UI
    try {
      localStorage.setItem("scope_last_palette", JSON.stringify(palette));
      localStorage.setItem("scope_last_concept", concept.name);
      localStorage.setItem("scope_last_font", font.display);
      localStorage.setItem("scope_last_wordmark", brandName.trim());
    } catch {
      // localStorage unavailable in some SSR contexts
    }

    setConfirming(true);
    try {
      await onConfirm({
        brandName: brandName.trim(),
        palette,
        concept: concept.name,
        fontName: font.display,
      });
    } finally {
      setConfirming(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onBack} />

      {/* Panel */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97 }}
        transition={{ type: "spring", stiffness: 280, damping: 28 }}
        className="relative z-10 w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-800/60 bg-[#0D0D1A]/95 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.8)] backdrop-blur-xl"
      >
        {/* Ambient glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-40"
          style={{
            background:
              "radial-gradient(120% 100% at 0% 0%, color-mix(in oklab, var(--scope-purple) 18%, transparent), transparent 70%)",
          }}
        />

        {/* Header */}
        <div className="relative flex items-center gap-3 border-b border-slate-800/50 px-6 py-4">
          <span
            className="flex h-8 w-8 flex-none items-center justify-center rounded-full"
            style={{ background: "var(--gradient-brand)" }}
          >
            <Sparkles size={13} className="text-white" />
          </span>
          <div>
            <p className="font-display text-[16px] leading-none tracking-tight text-slate-50">
              Brand Identity
            </p>
            <p className="mt-0.5 text-[10px] uppercase tracking-[0.14em] text-slate-500">
              Confirm before logo generation
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-3 px-6 py-16 text-sm text-slate-400">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-scope-purple border-t-transparent" />
            Loading brand data…
          </div>
        ) : (
          <div className="max-h-[70vh] overflow-y-auto px-6 py-5 space-y-6" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.06) transparent" }}>
            {/* Brand name */}
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 mb-2">
                Brand Name
              </label>
              <input
                type="text"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-2.5 text-[14px] text-slate-100 placeholder-slate-600 outline-none transition focus:border-scope-purple/60 focus:ring-1 focus:ring-scope-purple/30"
                placeholder="Your brand name"
              />
            </div>

            {/* Color palettes */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Color Palette
                </label>
                {chatPalette && selectedPaletteIdx === 0 && (
                  <span className="text-[9px] font-semibold uppercase tracking-widest text-scope-violet">
                    AI Selected
                  </span>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {palettes.map((palette, idx) => {
                  const isSelected = selectedPaletteIdx === idx;
                  return (
                    <button
                      key={palette.name}
                      type="button"
                      onClick={() => setSelectedPaletteIdx(idx)}
                      className={`group relative overflow-hidden rounded-xl border text-left transition-all duration-200 ${
                        isSelected
                          ? "border-scope-purple/60 bg-slate-900/80 shadow-[0_0_20px_-4px_var(--scope-purple)]"
                          : "border-slate-800/50 bg-slate-900/30 hover:border-slate-700/60"
                      }`}
                    >
                      <div className="grid grid-cols-2">
                        {palette.colors.slice(0, 4).map((c, i) => (
                          <span key={`${c}-${i}`} className="h-8" style={{ background: c }} />
                        ))}
                      </div>
                      <div className="p-2">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500">
                          {palette.mood}
                        </p>
                        <p className="mt-0.5 text-[11px] font-medium text-slate-300">{palette.name}</p>
                        <div className="mt-1 flex flex-wrap gap-0.5">
                          {palette.colors.slice(0, 4).map((c, i) => (
                            <span
                              key={`chip-${c}-${i}`}
                              className="rounded px-1 py-0.5 font-mono text-[7px]"
                              style={{ background: c, color: isLightHex(c) ? "#0F172A" : "#F8FAFC" }}
                            >
                              {c.toUpperCase()}
                            </span>
                          ))}
                        </div>
                      </div>
                      {isSelected && (
                        <span
                          className="pointer-events-none absolute inset-y-0 left-0 w-[2px] rounded-full"
                          style={{ background: "var(--gradient-brand)" }}
                          aria-hidden
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Strategy summary */}
            {nodeSummary.length > 0 && (
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 mb-2">
                  Strategy Summary
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {nodeSummary.map((node) => (
                    <div
                      key={node.type}
                      className="rounded-xl border border-slate-800/60 bg-slate-900/30 px-3 py-2"
                    >
                      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                        {node.title}
                      </p>
                      <p className="mt-0.5 text-[11px] leading-relaxed text-slate-300 line-clamp-2">
                        {node.content}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Typography */}
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 mb-2">
                Typography
              </label>
              <div className="flex gap-2">
                {FONTS.map((font, idx) => (
                  <button
                    key={font.id}
                    type="button"
                    onClick={() => setSelectedFontIdx(idx)}
                    className={`flex-1 rounded-xl border px-3 py-2.5 text-left transition-all duration-200 ${
                      selectedFontIdx === idx
                        ? "border-scope-purple/50 bg-slate-900/70"
                        : "border-slate-800/50 bg-slate-900/20 hover:border-slate-700/50"
                    }`}
                  >
                    <p className="text-[15px] font-medium text-slate-200 leading-none">{font.display}</p>
                    <p className="mt-1 text-[10px] text-slate-500">{font.body}</p>
                    {selectedFontIdx === idx && (
                      <Check size={10} className="mt-1 text-scope-violet" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Logo concept */}
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 mb-2">
                Logo Concept
              </label>
              <div className="grid grid-cols-2 gap-2">
                {CONCEPTS.map((concept, idx) => (
                  <button
                    key={concept.name}
                    type="button"
                    onClick={() => setSelectedConceptIdx(idx)}
                    className={`rounded-xl border px-3 py-2.5 text-left transition-all duration-200 ${
                      selectedConceptIdx === idx
                        ? "border-scope-purple/50 bg-slate-900/70"
                        : "border-slate-800/50 bg-slate-900/20 hover:border-slate-700/50"
                    }`}
                  >
                    <p className="text-[12px] font-semibold text-slate-200">{concept.name}</p>
                    <p className="mt-0.5 text-[10px] text-slate-500">{concept.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-800/50 px-6 py-4">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 rounded-full border border-slate-800 px-4 py-2 text-[12px] text-slate-400 transition hover:border-slate-700 hover:text-slate-200"
          >
            <ChevronLeft size={13} />
            Back to Canvas
          </button>

          <AnimatePresence>
            {canConfirm && (
              <motion.button
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                type="button"
                onClick={handleConfirm}
                disabled={confirming}
                className="flex items-center gap-2 rounded-full px-5 py-2.5 text-[13px] font-semibold text-white shadow-[0_8px_24px_-6px_rgba(255,90,120,0.45)] transition hover:brightness-110 disabled:opacity-60"
                style={{ background: "var(--gradient-cta)" }}
              >
                {confirming ? (
                  <>
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Generating…
                  </>
                ) : (
                  <>
                    Generate Logo
                    <ArrowRight size={14} />
                  </>
                )}
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}
