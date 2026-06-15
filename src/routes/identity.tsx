import * as React from "react";
import { createFileRoute, useSearch, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronRight, Palette, Sparkles, Type } from "lucide-react";
import { StudioShell } from "@/components/scope/StudioShell";
import { api } from "@/lib/api";

export const Route = createFileRoute("/identity")({
  head: () => ({
    meta: [
      { title: "SCOPE — Visual Identity" },
      { name: "description", content: "Pick your color palette, type pairing, and logo concept." },
    ],
  }),
  component: IdentityPage,
});

// ── Color derivation from visual_cues ────────────────────────────────────────

const COLOR_MAP: Record<string, string> = {
  "midnight blue": "#1B2A4A",
  navy: "#1a2744",
  "deep blue": "#1e3a5f",
  "royal blue": "#2054b5",
  cobalt: "#0047AB",
  "sky blue": "#7CB9E8",
  teal: "#008080",
  sapphire: "#0F52BA",
  emerald: "#059669",
  "forest green": "#166534",
  sage: "#8A9A5B",
  olive: "#6B7239",
  burgundy: "#800020",
  wine: "#722F37",
  crimson: "#DC143C",
  rose: "#E11D48",
  coral: "#F97316",
  terracotta: "#C4622D",
  "burnt orange": "#CC5500",
  amber: "#D97706",
  gold: "#B45309",
  cream: "#FEF3C7",
  ivory: "#FFFBEB",
  champagne: "#F3E8D0",
  purple: "#7C3AED",
  violet: "#6D28D9",
  lavender: "#A78BFA",
  plum: "#86198F",
  indigo: "#4338CA",
  charcoal: "#374151",
  slate: "#475569",
  silver: "#94A3B8",
  sand: "#D4B483",
  beige: "#E9DFD0",
  copper: "#B87333",
  bronze: "#CD7F32",
  "rose gold": "#BE8A8A",
  black: "#0F172A",
  ink: "#1E293B",
};

function cueToHex(cue: string): string | null {
  const lower = cue.toLowerCase();
  for (const [key, val] of Object.entries(COLOR_MAP)) {
    if (lower.includes(key)) return val;
  }
  return null;
}

type Palette = { name: string; colors: string[]; mood: string };

function derivePalettes(cues: string[]): Palette[] {
  const raw: string[] = [];
  for (const cue of cues) {
    const hex = cueToHex(cue);
    if (hex && !raw.includes(hex)) raw.push(hex);
    if (raw.length >= 8) break;
  }

  if (raw.length < 3) {
    raw.push("#1B2A4A", "#7C3AED", "#A78BFA", "#E11D48", "#F3E8D0");
  }

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

// ── Static font pairings ──────────────────────────────────────────────────────

const FONTS = [
  {
    display: "Instrument Serif",
    body: "Space Grotesk",
    mood: "Editorial · Premium",
    sample: "Aa Bb",
  },
  { display: "Cormorant", body: "Karla", mood: "Luxury · Quiet", sample: "Aa Bb" },
  { display: "Playfair Display", body: "Inter", mood: "Heritage · Bold", sample: "Aa Bb" },
];

const CONCEPTS = [
  { name: "Refracted Prism", desc: "Geometric mark referencing light through glass.", icon: "◈" },
  { name: "Soft Monogram", desc: "Lowercase wordmark with circular counters.", icon: "○" },
  { name: "Brutal Stamp", desc: "Heavy serif badge, single-color compatible.", icon: "▪" },
  { name: "Linear Glyph", desc: "Thin line monogram, scales to favicon.", icon: "⬡" },
];

// ── Identity page ─────────────────────────────────────────────────────────────

function IdentityPage() {
  const search = useSearch({ strict: false }) as { session?: string };
  const navigate = useNavigate();
  const [palettes, setPalettes] = React.useState<Palette[]>([]);
  const [isLoadingBrief, setIsLoadingBrief] = React.useState(false);
  const [selectedPalette, setSelectedPalette] = React.useState<number | null>(null);
  const [selectedFont, setSelectedFont] = React.useState<number | null>(null);
  const [selectedConcept, setSelectedConcept] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (!search.session) {
      setPalettes(derivePalettes([]));
      return;
    }
    setIsLoadingBrief(true);
    api
      .getBrief(search.session)
      .then((brief) => {
        if (brief?.visual_cues?.length) {
          setPalettes(derivePalettes(brief.visual_cues));
        } else {
          setPalettes(derivePalettes([]));
        }
      })
      .catch(() => setPalettes(derivePalettes([])))
      .finally(() => setIsLoadingBrief(false));
  }, [search.session]);

  const allSelected = selectedPalette !== null && selectedFont !== null && selectedConcept !== null;

  return (
    <StudioShell
      stepId="identity"
      eyebrow="Step 3 · Visual Identity"
      title="Pick your visual DNA"
      intro="Choose one palette, one type pairing, and one concept. The Logo Studio uses them next."
    >
      {/* ── Dark bento container ──────────────────────────── */}
      <div className="mt-2 rounded-3xl border border-slate-800/50 bg-[#0D0D1A]/90 p-6 backdrop-blur-xl shadow-[0_24px_80px_-20px_rgba(0,0,0,0.5)]">

      {/* ── Palettes ──────────────────────────────────────── */}
      <section>
        <SectionHeader
          icon={<Palette size={14} />}
          label={isLoadingBrief ? "Generating from your brief…" : "Color palette"}
          note={search.session ? "Derived from your brief's visual cues" : "Select a palette"}
        />
        {isLoadingBrief ? (
          <div className="flex items-center gap-3 text-sm text-slate-400">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-scope-purple border-t-transparent" />
            Analysing visual DNA…
          </div>
        ) : (
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {palettes.map((p, idx) => (
              <PaletteCard
                key={p.name}
                palette={p}
                selected={selectedPalette === idx}
                onSelect={() => setSelectedPalette(idx === selectedPalette ? null : idx)}
                index={idx}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── Type pairings ─────────────────────────────────── */}
      <section className="mt-10">
        <SectionHeader
          icon={<Type size={14} />}
          label="Type pairing"
          note="Choose your voice in text"
        />
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {FONTS.map((f, idx) => (
            <FontCard
              key={f.display}
              font={f}
              selected={selectedFont === idx}
              onSelect={() => setSelectedFont(idx === selectedFont ? null : idx)}
              index={idx}
            />
          ))}
        </div>
      </section>

      {/* ── Logo concepts ─────────────────────────────────── */}
      <section className="mt-10">
        <SectionHeader
          icon={<Sparkles size={14} />}
          label="Logo concept"
          note="The structural feel of your mark"
        />
        <div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-4">
          {CONCEPTS.map((c, idx) => (
            <ConceptCard
              key={c.name}
              concept={c}
              selected={selectedConcept === idx}
              onSelect={() => setSelectedConcept(idx === selectedConcept ? null : idx)}
              index={idx}
            />
          ))}
        </div>
      </section>

      </div>{/* end dark bento container */}

      {/* ── Confirm CTA ───────────────────────────────────── */}
      <AnimatePresence>
        {allSelected && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ type: "spring", stiffness: 260, damping: 28 }}
            className="mt-10 flex items-center justify-center"
          >
            <button
              type="button"
              onClick={() =>
                navigate({ to: "/logo", search: search.session ? { session: search.session } : {} })
              }
              className="bg-gradient-cta flex items-center gap-2 rounded-full px-8 py-3.5 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(255,90,120,0.35)] transition hover:brightness-105 active:scale-[0.98]"
            >
              <ChevronRight size={15} />
              Proceed to Logo Studio
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </StudioShell>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionHeader({
  icon,
  label,
  note,
}: {
  icon: React.ReactNode;
  label: string;
  note?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-700/60 bg-slate-800/60 text-slate-400 shadow-sm">
        {icon}
      </span>
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
          {label}
        </p>
        {note && <p className="text-[11px] text-slate-500">{note}</p>}
      </div>
    </div>
  );
}

function PaletteCard({
  palette,
  selected,
  onSelect,
  index,
}: {
  palette: Palette;
  selected: boolean;
  onSelect: () => void;
  index: number;
}) {
  return (
    <motion.button
      type="button"
      onClick={onSelect}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, type: "spring", stiffness: 240, damping: 26 }}
      className={`group relative overflow-hidden rounded-2xl border p-1 text-left transition-all duration-200 ${
        selected
          ? "border-scope-purple/50 bg-slate-900/80 shadow-[0_0_30px_-6px_var(--scope-purple)]"
          : "border-slate-800/60 bg-slate-900/40 hover:border-slate-700/60 hover:bg-slate-900/70"
      }`}
    >
      {/* Hover shimmer */}
      <span
        className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, transparent 60%)" }}
        aria-hidden
      />

      {/* 2×2 swatch grid */}
      <div className="grid grid-cols-2 overflow-hidden rounded-xl">
        {palette.colors.map((c, i) => (
          <span
            key={`${c}-${i}`}
            className="h-14 transition-all duration-300 group-hover:scale-[1.02] origin-center"
            style={{ background: c }}
          />
        ))}
      </div>

      <div className="mt-2.5 px-2 pb-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              {palette.mood}
            </p>
            <p className="mt-0.5 text-[13px] font-medium text-slate-100">{palette.name}</p>
          </div>
          <AnimatePresence>
            {selected && (
              <motion.span
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                className="flex h-6 w-6 items-center justify-center rounded-full text-white"
                style={{ background: "var(--gradient-brand)" }}
              >
                <Check size={11} />
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Hex preview chips */}
        <div className="mt-2 flex gap-1 flex-wrap">
          {palette.colors.map((c, i) => (
            <span
              key={`chip-${c}-${i}`}
              className="rounded px-1.5 py-0.5 text-[9px] font-mono font-medium"
              style={{ background: c, color: isLight(c) ? "#0F172A" : "#F8FAFC" }}
            >
              {c.toUpperCase()}
            </span>
          ))}
        </div>
      </div>
    </motion.button>
  );
}

function FontCard({
  font,
  selected,
  onSelect,
  index,
}: {
  font: { display: string; body: string; mood: string; sample: string };
  selected: boolean;
  onSelect: () => void;
  index: number;
}) {
  return (
    <motion.button
      type="button"
      onClick={onSelect}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, type: "spring", stiffness: 240, damping: 26 }}
      className={`group relative overflow-hidden rounded-2xl border p-5 text-left transition-all duration-200 ${
        selected
          ? "border-scope-purple/50 bg-slate-900/80 shadow-[0_0_30px_-6px_var(--scope-purple)]"
          : "border-slate-800/60 bg-slate-900/40 hover:border-slate-700/60 hover:bg-slate-900/70"
      }`}
    >
      <span
        className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, transparent 60%)" }}
        aria-hidden
      />
      <p className="font-display text-5xl leading-tight text-slate-100" style={{ fontFamily: font.display }}>
        Aa
      </p>
      <p className="mt-3 text-sm text-slate-300" style={{ fontFamily: font.display }}>
        {font.display}
      </p>
      <p className="mt-1 text-[12px] text-slate-400" style={{ fontFamily: font.body }}>
        Build the mark that lasts.
      </p>
      <div className="mt-3 flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
          {font.mood}
        </p>
        <AnimatePresence>
          {selected && (
            <motion.span
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="flex h-5 w-5 items-center justify-center rounded-full text-white"
              style={{ background: "var(--gradient-brand)" }}
            >
              <Check size={9} />
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </motion.button>
  );
}

function ConceptCard({
  concept,
  selected,
  onSelect,
  index,
}: {
  concept: { name: string; desc: string; icon: string };
  selected: boolean;
  onSelect: () => void;
  index: number;
}) {
  return (
    <motion.button
      type="button"
      onClick={onSelect}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, type: "spring", stiffness: 240, damping: 26 }}
      className={`group relative overflow-hidden rounded-2xl border p-4 text-left transition-all duration-200 ${
        selected
          ? "border-scope-purple/50 bg-slate-900/80 shadow-[0_0_30px_-6px_var(--scope-purple)]"
          : "border-slate-800/60 bg-slate-900/40 hover:border-slate-700/60 hover:bg-slate-900/70"
      }`}
    >
      <span
        className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, transparent 60%)" }}
        aria-hidden
      />
      <div
        className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl border text-xl transition-colors ${
          selected
            ? "border-scope-purple/30 text-white"
            : "border-slate-700/60 bg-slate-800/40 text-slate-400 group-hover:border-slate-600"
        }`}
        style={selected ? { background: "var(--gradient-brand)" } : {}}
      >
        {concept.icon}
      </div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Concept</p>
      <p className="mt-0.5 text-[13px] font-medium text-slate-100">{concept.name}</p>
      <p className="mt-1 text-[11.5px] leading-snug text-slate-400">{concept.desc}</p>
      <AnimatePresence>
        {selected && (
          <motion.span
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full text-white"
            style={{ background: "var(--gradient-brand)" }}
          >
            <Check size={9} />
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

function isLight(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 160;
}
