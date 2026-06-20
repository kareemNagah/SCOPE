import * as React from "react";
import { createFileRoute, useSearch, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronRight, Palette, Sparkles, Type } from "lucide-react";
import { StudioShell } from "@/components/scope/StudioShell";
import { api } from "@/lib/api";
import { buildImageInspiredPalettes, extractPaletteFromImageSources } from "@/lib/colorPalettes";

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
// The LLM in identity_generator.py is the primary palette authority.
// Image-based extraction is kept as a secondary source.
// The old COLOR_MAP keyword-matching code has been removed.

type Palette = { name: string; colors: string[]; mood: string; usage_note?: string };
type IdentityFontPairing = { display: string; body: string; mood?: string; rationale?: string };
type IdentityLogoConcept = { name: string; desc?: string; icon?: string };

// Default fallback palettes — only used when LLM + images both fail
const FALLBACK_PALETTES: Palette[] = [
  {
    name: "Midnight Foundation",
    mood: "Brand Foundation",
    colors: ["#1B2A4A", "#7C3AED", "#A78BFA", "#F3E8D0"],
  },
  {
    name: "Warm Signal",
    mood: "Campaign Accent",
    colors: ["#E11D48", "#D97706", "#F3E8D0", "#0F172A"],
  },
  {
    name: "Slate Range",
    mood: "Supporting Cast",
    colors: ["#374151", "#475569", "#94A3B8", "#F8FAFC"],
  },
];

// ── Static font pairings ──────────────────────────────────────────────────────

const FONTS = [
  {
    display: "Instrument Serif",
    body: "Space Grotesk",
    mood: "Editorial · Premium",
    sample: "Aa Bb",
    rationale: "Classic serif with clean modern geometric support.",
  },
  {
    display: "Cormorant",
    body: "Karla",
    mood: "Luxury · Quiet",
    sample: "Aa Bb",
    rationale: "Delicate serif paired with high-contrast humanistic sans.",
  },
  {
    display: "Playfair Display",
    body: "Inter",
    mood: "Heritage · Bold",
    sample: "Aa Bb",
    rationale: "Timeless display weight with high-readability body text.",
  },
];

const CONCEPTS = [
  { name: "Refracted Prism", desc: "Geometric mark referencing light through glass.", icon: "◈" },
  { name: "Soft Monogram", desc: "Lowercase wordmark with circular counters.", icon: "○" },
  { name: "Brutal Stamp", desc: "Heavy serif badge, single-color compatible.", icon: "▪" },
  { name: "Linear Glyph", desc: "Thin line monogram, scales to favicon.", icon: "⬡" },
];

function injectGoogleFont(fontName: string) {
  if (typeof window === "undefined" || !fontName) return;
  const linkId = `google-font-${fontName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  if (document.getElementById(linkId)) return;
  const link = document.createElement("link");
  link.id = linkId;
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontName)}:wght@400;500;600;700&display=swap`;
  document.head.appendChild(link);
}

// ── Identity page ─────────────────────────────────────────────────────────────

function IdentityPage() {
  const search = useSearch({ strict: false }) as { session?: string };
  const navigate = useNavigate();
  const [palettes, setPalettes] = React.useState<Palette[]>([]);
  const [fontPairs, setFontPairs] =
    React.useState<((typeof FONTS)[number] & { rationale: string })[]>(FONTS);
  const [concepts, setConcepts] = React.useState<typeof CONCEPTS>(CONCEPTS);
  const [isLoadingBrief, setIsLoadingBrief] = React.useState(false);
  const [selectedPalette, setSelectedPalette] = React.useState<number | null>(null);
  const [selectedFont, setSelectedFont] = React.useState<number | null>(null);
  const [selectedConcept, setSelectedConcept] = React.useState<number | null>(null);

  React.useEffect(() => {
    fontPairs.forEach((f) => {
      injectGoogleFont(f.display);
      injectGoogleFont(f.body);
    });
  }, [fontPairs]);

  React.useEffect(() => {
    if (!search.session) {
      setPalettes(FALLBACK_PALETTES);
      return;
    }
    let cancelled = false;
    setSelectedPalette(null);
    setIsLoadingBrief(true);
    api
      .identityPreview(search.session)
      .then(async (preview) => {
        const brief = await api.getBrief(search.session!).catch(() => null);
        if (cancelled) return;

        const imageColors = await extractPaletteFromImageSources(brief?.moodboard_images ?? []);
        if (cancelled) return;

        const imagePalettes = buildImageInspiredPalettes(imageColors) as Palette[];
        if (preview.visual_identity && Object.keys(preview.visual_identity).length > 0) {
          const generatedPalettes = preview.visual_identity.palettes || [];
          const generatedFonts = (preview.visual_identity.font_pairings || []).map(
            (f: IdentityFontPairing) => ({
              display: f.display,
              body: f.body,
              mood: f.mood,
              sample: "Aa Bb",
              rationale: f.rationale || "",
            }),
          );
          const generatedConcepts = (preview.visual_identity.logo_concepts || []).map(
            (c: IdentityLogoConcept) => ({
              name: c.name,
              desc: c.desc,
              icon: c.icon || "◈",
            }),
          );

          const basePalettes = imagePalettes.length
            ? imagePalettes
            : generatedPalettes.length
              ? generatedPalettes
              : FALLBACK_PALETTES;
          setPalettes(basePalettes.slice(0, 3));
          if (generatedFonts.length) setFontPairs(generatedFonts);
          if (generatedConcepts.length) setConcepts(generatedConcepts);
        } else {
          setPalettes(imagePalettes.length ? imagePalettes : FALLBACK_PALETTES);
        }
      })
      .catch(() => {
        setPalettes(FALLBACK_PALETTES);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingBrief(false);
      });

    return () => {
      cancelled = true;
    };
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
            note={
              search.session
                ? "Sampled from moodboard, references, and brief cues"
                : "Select a palette"
            }
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
            {fontPairs.map((f, idx) => (
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
            {concepts.map((c, idx) => (
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
      </div>
      {/* end dark bento container */}

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
              onClick={() => {
                if (selectedPalette === null || selectedFont === null || selectedConcept === null)
                  return;
                const palette = palettes[selectedPalette];
                const font = fontPairs[selectedFont];
                const concept = concepts[selectedConcept];
                navigate({
                  to: "/logo",
                  search: {
                    ...(search.session ? { session: search.session } : {}),
                    paletteName: palette.name,
                    paletteColors: palette.colors.join(","),
                    fontName: font.display,
                    conceptName: concept.name,
                  },
                });
              }}
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
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">{label}</p>
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
        style={{
          background: "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, transparent 60%)",
        }}
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
  font: { display: string; body: string; mood: string; sample: string; rationale?: string };
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
        style={{
          background: "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, transparent 60%)",
        }}
        aria-hidden
      />
      <p
        className="font-display text-5xl leading-tight text-slate-100"
        style={{ fontFamily: font.display }}
      >
        Aa
      </p>
      <p className="mt-3 text-sm text-slate-300" style={{ fontFamily: font.display }}>
        {font.display}
      </p>
      <p
        className="mt-1 text-[12px] text-slate-400 font-normal leading-normal"
        style={{ fontFamily: font.body }}
      >
        {font.rationale || "Build the mark that lasts."}
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
        style={{
          background: "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, transparent 60%)",
        }}
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
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
        Concept
      </p>
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
