import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useState, useEffect, useCallback, useRef } from "react";
import { StudioShell } from "@/components/scope/StudioShell";
import {
  Download,
  Check,
  Loader2,
  X,
  ZoomIn,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Clock,
} from "lucide-react";
import { api, type LogoResult, type LogoHistoryItem } from "@/lib/api";
import { buildImageInspiredPalettes, extractPaletteFromImageSources } from "@/lib/colorPalettes";
import { ReferenceUploader } from "@/components/scope/ReferenceUploader";
import { toast } from "sonner";

export const Route = createFileRoute("/logo")({
  head: () => ({
    meta: [
      { title: "SCOPE — Logo Generation Studio" },
      {
        name: "description",
        content: "Choose palette, concept and typography. Generate your final logo and export SVG.",
      },
    ],
  }),
  component: LogoPage,
});

type PaletteOption = { id: string; name: string; colors: string[] };
type FontOption = { id: string; display: string; body: string; mood?: string; stack: string };
type ConceptOption = { id: string; name: string; desc: string };
type LogoSearch = {
  session?: string;
  paletteName?: string;
  paletteColors?: string;
  fontName?: string;
  conceptName?: string;
  wordmark?: string;
};

const basePalettes: PaletteOption[] = [
  {
    id: "dispersion",
    name: "Dispersion Spectrum",
    colors: ["#1a1233", "#5a3fc1", "#b48ef0", "#f1c5f5"],
  },
  { id: "moss", name: "Moss & Brutal", colors: ["#1c2018", "#3e4a36", "#a8b89a", "#e8e6dd"] },
  { id: "solar", name: "Solar Atelier", colors: ["#180f0a", "#7a3a1f", "#f08a4a", "#fbe4c2"] },
];

const fontPairs: FontOption[] = [
  {
    id: "instrument",
    display: "Instrument Serif",
    body: "Inter",
    mood: "Editorial · Premium",
    stack: "'Instrument Serif', Georgia, serif",
  },
  {
    id: "space",
    display: "Space Grotesk",
    body: "Inter",
    mood: "Engineering · Modern",
    stack: "'Space Grotesk', system-ui, sans-serif",
  },
  {
    id: "cormorant",
    display: "Cormorant",
    body: "Karla",
    mood: "Luxury · Quiet",
    stack: "'Cormorant', Georgia, serif",
  },
];

const concepts: ConceptOption[] = [
  { id: "prism", name: "Refracted Prism", desc: "Geometric mark referencing light through glass." },
  { id: "mono", name: "Soft Monogram", desc: "Lowercase wordmark with circular counters." },
  { id: "stamp", name: "Brutal Stamp", desc: "Heavy serif badge, single-color compatible." },
  { id: "linear", name: "Linear Glyph", desc: "Thin line monogram, scales to favicon." },
];

const VARIATION_LABELS = ["Horizontal", "Stacked", "Icon Only", "Monochrome"] as const;

/** Backend visual-identity shape returned by api.identityPreview. */
type VisualIdentity = {
  palettes?: { name: string; colors: string[] }[];
  font_pairings?: { display: string; body: string; mood?: string }[];
  logo_concepts?: { name: string; desc?: string; description?: string }[];
};

const slugId = (s: string) => `gen-${s.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

function LogoMark({ size = 40, colors }: { size?: number; colors: string[] }) {
  const id = `lg-${colors.join("-").replace(/#/g, "")}-${size}`;
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={colors[1] ?? colors[0]} />
          <stop offset=".5" stopColor={colors[2] ?? colors[1]} />
          <stop offset="1" stopColor={colors[3] ?? colors[2]} />
        </linearGradient>
      </defs>
      <path
        d="M34 6H14C10 6 7 9 7 12.5C7 16 10 18 14 18.5L26 20.5C30 21 33 23 33 27C33 31 30 34 26 34H6"
        stroke={`url(#${id})`}
        strokeWidth="6"
        strokeLinecap="square"
        fill="none"
      />
    </svg>
  );
}

function firstPaletteOption(
  items: Array<{ name: string; colors: string[] } | undefined>,
): PaletteOption | null {
  const item = items.find((palette) => palette?.name && palette.colors?.length);
  return item ? { id: slugId(item.name), name: item.name, colors: item.colors.slice(0, 4) } : null;
}

function paletteFromSearch(search: LogoSearch): PaletteOption | null {
  if (!search.paletteName || !search.paletteColors) return null;
  const colors = search.paletteColors
    .split(",")
    .map((color) => color.trim())
    .filter(Boolean)
    .slice(0, 4);
  if (!colors.length) return null;
  return { id: slugId(search.paletteName), name: search.paletteName, colors };
}

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

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function downloadSvg({
  wordmark,
  palette,
  font,
  concept,
}: {
  wordmark: string;
  palette: PaletteOption;
  font: FontOption;
  concept: ConceptOption;
}) {
  const safeName = (wordmark || "scope-logo")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const colors = [...palette.colors, "#0F172A", "#F8FAFC"];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="2400" height="1200" viewBox="0 0 2400 1200">
  <defs>
    <linearGradient id="markGradient" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${escapeXml(colors[1] ?? colors[0])}"/>
      <stop offset="0.5" stop-color="${escapeXml(colors[2] ?? colors[1])}"/>
      <stop offset="1" stop-color="${escapeXml(colors[3] ?? colors[2])}"/>
    </linearGradient>
  </defs>
  <rect width="2400" height="1200" fill="#FFFFFF"/>
  <g transform="translate(520 448) scale(7.6)">
    <path d="M34 6H14C10 6 7 9 7 12.5C7 16 10 18 14 18.5L26 20.5C30 21 33 23 33 27C33 31 30 34 26 34H6" stroke="url(#markGradient)" stroke-width="6" stroke-linecap="square" fill="none"/>
  </g>
  <text x="880" y="645" fill="#0F172A" font-family="${escapeXml(font.stack)}" font-size="156" font-weight="650" letter-spacing="-6">${escapeXml(wordmark || "Wordmark")}</text>
  <text x="880" y="725" fill="#64748B" font-family="Space Grotesk, Arial, sans-serif" font-size="32" letter-spacing="8">${escapeXml(concept.name.toUpperCase())} / ${escapeXml(palette.name.toUpperCase())}</text>
</svg>`;
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${safeName || "scope-logo"}.svg`;
  link.click();
  URL.revokeObjectURL(url);
}

/** Convert a base64 data URL to a downloadable PNG blob. */
function downloadPng(dataUrl: string, filename: string) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  link.click();
}

/* ────────────────────────────────────────────── */
/*  Lightbox Component                            */
/* ────────────────────────────────────────────── */

function Lightbox({
  images,
  initialIndex,
  labels,
  onClose,
}: {
  images: string[];
  initialIndex: number;
  labels: string[];
  onClose: () => void;
}) {
  const [index, setIndex] = useState(initialIndex);
  const backdropRef = useRef<HTMLDivElement>(null);

  const prev = useCallback(
    () => setIndex((i) => (i > 0 ? i - 1 : images.length - 1)),
    [images.length],
  );
  const next = useCallback(
    () => setIndex((i) => (i < images.length - 1 ? i + 1 : 0)),
    [images.length],
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, prev, next]);

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md"
      onClick={(e) => e.target === backdropRef.current && onClose()}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-6 right-6 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition hover:bg-white/20"
      >
        <X size={20} />
      </button>

      {/* Navigation arrows */}
      {images.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-6 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition hover:bg-white/20"
          >
            <ChevronLeft size={24} />
          </button>
          <button
            onClick={next}
            className="absolute right-6 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition hover:bg-white/20"
          >
            <ChevronRight size={24} />
          </button>
        </>
      )}

      {/* Image + label */}
      <div className="flex flex-col items-center gap-4">
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white shadow-2xl">
          <img
            src={images[index]}
            alt={labels[index] || `Logo variation ${index + 1}`}
            className="max-h-[70vh] max-w-[85vw] object-contain"
            style={{ animation: "fadeIn 0.25s ease" }}
          />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-white/90">
            {labels[index] || `Variation ${index + 1}`}
          </span>
          <span className="text-xs text-white/50">
            {index + 1} / {images.length}
          </span>
          <button
            onClick={() =>
              downloadPng(
                images[index],
                `logo-${(labels[index] || "variation").toLowerCase().replace(/\s+/g, "-")}.png`,
              )
            }
            className="ml-2 flex items-center gap-1.5 rounded-lg bg-white/15 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm transition hover:bg-white/25"
          >
            <Download size={13} /> Download PNG
          </button>
        </div>

        {/* Thumbnail strip */}
        {images.length > 1 && (
          <div className="flex gap-2 mt-1">
            {images.map((img, i) => (
              <button
                key={i}
                onClick={() => setIndex(i)}
                className={`h-14 w-14 overflow-hidden rounded-lg border-2 transition ${
                  i === index
                    ? "border-white/80 ring-2 ring-white/30"
                    : "border-white/10 opacity-50 hover:opacity-80"
                }`}
              >
                <img src={img} alt="" className="h-full w-full object-cover bg-white" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────── */
/*  Gallery Card                                  */
/* ────────────────────────────────────────────── */

function GalleryCard({
  image,
  label,
  description,
  index,
  onClick,
}: {
  image: string;
  label: string;
  description?: string;
  index: number;
  onClick: () => void;
}) {
  return (
    <div
      className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-all duration-300 hover:shadow-lg hover:shadow-slate-200/60 hover:-translate-y-0.5 cursor-pointer"
      onClick={onClick}
      style={{ animationDelay: `${index * 80}ms`, animation: "fadeSlideUp 0.5s ease both" }}
    >
      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-slate-50 to-white p-4">
        <img
          src={image}
          alt={label}
          className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-105"
        />
        {/* Overlay on hover */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-all duration-300 group-hover:bg-black/5">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow-lg opacity-0 transition-all duration-300 group-hover:opacity-100 group-hover:scale-100 scale-75">
            <ZoomIn size={18} className="text-slate-700" />
          </div>
        </div>
      </div>

      {/* Label + Download */}
      <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-slate-900 truncate">{label}</p>
          {description && (
            <p className="mt-0.5 text-[11px] text-slate-500 leading-snug line-clamp-2">
              {description}
            </p>
          )}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            downloadPng(image, `logo-${label.toLowerCase().replace(/\s+/g, "-")}.png`);
          }}
          className="ml-2 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          title="Download PNG"
        >
          <Download size={15} />
        </button>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────── */
/*  Main Page Component                           */
/* ────────────────────────────────────────────── */

function LogoPage() {
  const search = useSearch({ strict: false }) as LogoSearch;
  const {
    conceptName,
    fontName,
    paletteColors,
    paletteName,
    session,
    wordmark: routeWordmark,
  } = search;
  const sessionId = session || "default_session";
  const [paletteOptions, setPaletteOptions] = useState<PaletteOption[]>([basePalettes[0]]);
  const [fontPairsState, setFontPairsState] = useState<typeof fontPairs>(fontPairs);
  const [conceptsState, setConceptsState] = useState<typeof concepts>(concepts);

  const [paletteId, setPaletteId] = useState(basePalettes[0].id);
  const [fontId, setFontId] = useState(fontPairs[1].id);
  const [selectedConceptIds, setSelectedConceptIds] = useState<string[]>([concepts[0].id]);
  const [wordmark, setWordmark] = useState("");
  const [refImages, setRefImages] = useState<string[]>([]);

  const toggleConcept = (id: string) =>
    setSelectedConceptIds((prev) =>
      prev.includes(id)
        ? prev.length > 1
          ? prev.filter((c) => c !== id) // keep at least one selected
          : prev
        : [...prev, id],
    );

  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [result, setResult] = useState<LogoResult | null>(null);
  const [history, setHistory] = useState<LogoHistoryItem[]>([]);
  const [lightbox, setLightbox] = useState<{
    images: string[];
    index: number;
    labels: string[];
  } | null>(null);

  useEffect(() => {
    fontPairsState.forEach((f) => {
      injectGoogleFont(f.display);
      injectGoogleFont(f.body);
    });
  }, [fontPairsState]);

  useEffect(() => {
    const routePalette = paletteFromSearch({ paletteName, paletteColors });
    if (routePalette) {
      setPaletteOptions([routePalette]);
      setPaletteId(routePalette.id);
    }
    if (routeWordmark) setWordmark(routeWordmark);
  }, [paletteColors, paletteName, routeWordmark]);

  // Authoritative source: the brand's freshly generated visual identity. Route
  // search values from the Identity step win for the current handoff.
  useEffect(() => {
    if (!session) return;
    api
      .identityPreview(session)
      .then((res) => {
        const vi = (res?.visual_identity ?? undefined) as VisualIdentity | undefined;
        if (!vi) return;

        const palettes = (vi.palettes ?? [])
          .filter((p) => p?.name && p?.colors?.length)
          .map((p) => ({ id: slugId(p.name), name: p.name, colors: p.colors }));
        const fonts = (vi.font_pairings ?? [])
          .filter((f) => f?.display)
          .map((f) => ({
            id: slugId(f.display),
            display: f.display,
            body: f.body,
            mood: f.mood ?? "",
            stack: `'${f.display}', sans-serif`,
          }));
        const conceptOpts = (vi.logo_concepts ?? [])
          .filter((c) => c?.name)
          .map((c) => ({ id: slugId(c.name), name: c.name, desc: c.desc || c.description || "" }));

        const activePalette =
          paletteFromSearch({ paletteName, paletteColors }) ?? firstPaletteOption(palettes);

        if (activePalette) {
          setPaletteOptions([activePalette]);
          setPaletteId(activePalette.id);
        }

        if (fonts.length) {
          setFontPairsState(fonts);
          setFontId((fonts.find((f) => f.display === fontName) ?? fonts[0]).id);
        }

        if (conceptOpts.length) {
          setConceptsState(conceptOpts);
          const ids = [conceptName]
            .map((name) => conceptOpts.find((c) => c.name === name)?.id)
            .filter((id): id is string => Boolean(id));
          setSelectedConceptIds(ids.length ? ids : [conceptOpts[0].id]);
        }
      })
      .catch(() => {
        /* keep route/default options applied above */
      });
  }, [conceptName, fontName, paletteColors, paletteName, session]);

  useEffect(() => {
    if (session) {
      // Load latest result
      api.getLogo(session).then((res) => {
        if (res) setResult(res);
      });
      // Load full history
      api
        .getAllLogos(session)
        .then((items) => {
          setHistory(items ?? []);
        })
        .catch(() => {
          /* no history yet */
        });
      // Derive the wordmark from the user's real brand name
      api
        .getBrief(session)
        .then((brief) => {
          const realName = brief?.brand_name || brief?.brand_name_en || brief?.brand_name_ar || "";
          if (realName) setWordmark((prev) => prev || realName);
        })
        .catch(() => {});
    }
  }, [session]);

  useEffect(() => {
    let cancelled = false;
    if (!refImages.length) return;

    extractPaletteFromImageSources(refImages)
      .then((colors) => {
        if (cancelled) return;
        const imagePalette = buildImageInspiredPalettes(colors)[0];
        if (!imagePalette) return;

        const referencePalette = {
          id: slugId(`reference-${imagePalette.name}`),
          name: imagePalette.name,
          colors: imagePalette.colors,
        };

        setPaletteOptions([referencePalette]);
        setPaletteId(referencePalette.id);
      })
      .catch(() => {
        /* reference images can be cross-origin or partial; keep the existing palettes */
      });

    return () => {
      cancelled = true;
    };
  }, [refImages]);

  const handleGenerate = async () => {
    const palette = paletteOptions.find((p) => p.id === paletteId) ?? paletteOptions[0];
    const font = fontPairsState.find((f) => f.id === fontId) ?? fontPairsState[0];
    const selectedConcepts = conceptsState.filter((c) => selectedConceptIds.includes(c.id));
    const concepts = selectedConcepts.length ? selectedConcepts : [conceptsState[0]];
    const concept = concepts[0];

    setIsLoading(true);
    setLoadingProgress(0);

    // Simulate progress while waiting for the API
    const progressInterval = setInterval(() => {
      setLoadingProgress((prev) => {
        if (prev >= 90) return prev;
        return prev + Math.random() * 8;
      });
    }, 800);

    try {
      const res = await api.generateLogo({
        session_id: sessionId,
        wordmark,
        concept: concept.name,
        concepts: concepts.map((c) => ({ name: c.name, desc: c.desc })),
        palette_name: palette.name,
        font_name: font.display,
        reference_images: refImages,
        brand_context: `Palette colors: ${palette.colors.join(", ")}. Concept directions: ${concepts
          .map((c) => `${c.name} — ${c.desc}`)
          .join("; ")}`,
      });
      setResult(res);
      setLoadingProgress(100);
      toast.success("Logo variations generated!");
      // Refresh history
      api
        .getAllLogos(sessionId)
        .then((items) => setHistory(items ?? []))
        .catch(() => {});
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate logo concept.");
    } finally {
      clearInterval(progressInterval);
      setTimeout(() => {
        setIsLoading(false);
        setLoadingProgress(0);
      }, 400);
    }
  };

  const palette = paletteOptions.find((p) => p.id === paletteId) ?? paletteOptions[0];
  const font = fontPairsState.find((f) => f.id === fontId) ?? fontPairsState[0];
  const concept = conceptsState.find((c) => selectedConceptIds.includes(c.id)) ?? conceptsState[0];

  const generatedImages =
    result?.generated_images ?? (result?.generated_image ? [result.generated_image] : []);
  const hasImages = generatedImages.length > 0;

  return (
    <StudioShell
      stepId="logo"
      eyebrow="Step 5 · Logo Generation Studio"
      title="Generate your mark"
      intro="Pick a direction, a palette, and a typography pairing. AI generates professional, object-free logo variations — then view, compare, and download."
    >
      {/* Inject keyframe animations */}
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        {/* Tool panel */}
        <aside className="glass space-y-6 rounded-2xl p-5">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-foreground/80">
              Wordmark
            </p>
            <input
              value={wordmark}
              onChange={(e) => setWordmark(e.target.value.slice(0, 24))}
              className="mt-1.5 w-full rounded-lg border border-border bg-white/80 px-3 py-2 text-sm outline-none focus:border-foreground/40 transition"
            />
          </div>

          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-foreground/80">
              Concept{" "}
              <span className="text-muted-foreground/70 normal-case tracking-normal">
                · select one or more
              </span>
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {conceptsState.map((c) => {
                const active = selectedConceptIds.includes(c.id);
                return (
                  <button
                    key={c.id}
                    onClick={() => toggleConcept(c.id)}
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
                    <p
                      className={`mt-0.5 text-[10px] leading-snug ${active ? "text-background/70" : "text-muted-foreground"}`}
                    >
                      {c.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-foreground/80">
              Palette
            </p>
            <div className="mt-2 space-y-2">
              {paletteOptions.map((p) => {
                const active = p.id === paletteId;
                return (
                  <button
                    key={p.id}
                    onClick={() => setPaletteId(p.id)}
                    className={`flex w-full items-center gap-2 rounded-lg border p-2 transition ${
                      active
                        ? "border-foreground/60 ring-2 ring-foreground/20"
                        : "border-border hover:border-foreground/30"
                    } bg-white/70`}
                  >
                    <div className="flex flex-1 gap-1">
                      {p.colors.map((c) => (
                        <span key={c} className="h-6 flex-1 rounded" style={{ background: c }} />
                      ))}
                    </div>
                    <span className="w-[110px] text-left text-[11px] font-medium text-foreground">
                      {p.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-foreground/80">
              Typography
            </p>
            <div className="mt-2 space-y-2">
              {fontPairsState.map((f) => {
                const active = f.id === fontId;
                return (
                  <button
                    key={f.id}
                    onClick={() => setFontId(f.id)}
                    className={`block w-full rounded-lg border p-2 text-left transition ${
                      active
                        ? "border-foreground/60 ring-2 ring-foreground/20"
                        : "border-border hover:border-foreground/30"
                    } bg-white/70`}
                  >
                    <p
                      className="text-base text-foreground leading-tight"
                      style={{ fontFamily: f.stack }}
                    >
                      {f.display}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{f.mood}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <ReferenceUploader images={refImages} onChange={setRefImages} />
        </aside>

        {/* Preview + Gallery */}
        <div className="space-y-6">
          {/* Loading state */}
          {isLoading && (
            <div
              className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm"
              style={{ animation: "fadeIn 0.3s ease" }}
            >
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <Sparkles size={32} className="text-scope-purple animate-pulse" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Generating logo variations…
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Creating 4 professional marks with your brand DNA
                  </p>
                </div>
                <div className="mt-2 h-1.5 w-64 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full transition-all duration-500 ease-out"
                    style={{
                      width: `${loadingProgress}%`,
                      background:
                        "linear-gradient(90deg, var(--scope-purple), var(--scope-violet), var(--scope-blue))",
                      backgroundSize: "200% 100%",
                      animation: "shimmer 2s linear infinite",
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Generated images gallery */}
          {!isLoading && hasImages && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    Generated Variations
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {generatedImages.length} logo marks generated · click to expand
                  </p>
                </div>
                <button
                  onClick={() => {
                    generatedImages.forEach((img, i) => {
                      setTimeout(
                        () =>
                          downloadPng(
                            img,
                            `logo-${VARIATION_LABELS[i]?.toLowerCase().replace(/\s+/g, "-") || `v${i + 1}`}.png`,
                          ),
                        i * 200,
                      );
                    });
                    toast.success("Downloading all variations…");
                  }}
                  className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-slate-800"
                >
                  <Download size={13} /> Download All
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {generatedImages.map((img, i) => {
                  const label = VARIATION_LABELS[i] || `Variation ${i + 1}`;
                  const variationDesc = result?.variations?.[i]?.description;
                  return (
                    <GalleryCard
                      key={i}
                      image={img}
                      label={label}
                      description={variationDesc}
                      index={i}
                      onClick={() =>
                        setLightbox({
                          images: generatedImages,
                          index: i,
                          labels: VARIATION_LABELS.map(String),
                        })
                      }
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Fallback preview (no images yet) */}
          {!isLoading && !hasImages && (
            <div
              className="relative flex h-[360px] items-center justify-center overflow-hidden rounded-2xl border border-slate-200 shadow-sm"
              style={{
                background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 45%, #eef2ff 100%)",
              }}
            >
              <div className="flex items-center gap-5">
                <LogoMark size={88} colors={palette.colors} />
                <span
                  className="text-6xl font-semibold tracking-tight text-slate-950"
                  style={{ fontFamily: font.stack }}
                >
                  {wordmark}
                </span>
              </div>
              <span className="absolute bottom-3 left-4 text-[10px] uppercase tracking-[0.18em] text-slate-500">
                {concept.name} · {palette.name} · {font.display}
              </span>
              <span className="absolute bottom-3 right-4 text-[10px] uppercase tracking-[0.18em] text-slate-500">
                Preview · Generate to create AI logos
              </span>
            </div>
          )}

          {/* Concept description card */}
          {result && (
            <div
              className="rounded-2xl p-5 bg-white border border-slate-200 shadow-sm"
              style={{ animation: "fadeSlideUp 0.4s ease" }}
            >
              <h3 className="font-display text-lg text-foreground">"{result.tagline}"</h3>
              <p className="mt-2 text-[13px] text-foreground/80 leading-relaxed">
                {result.concept_description}
              </p>
            </div>
          )}

          {/* Action buttons */}
          <div className="grid grid-cols-[1fr_auto] gap-3">
            <button
              onClick={handleGenerate}
              disabled={isLoading}
              className="bg-gradient-cta inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-white shadow-[0_8px_24px_-6px_rgba(255,90,120,0.55)] transition hover:brightness-105 disabled:opacity-50"
            >
              {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              {isLoading ? "Generating…" : hasImages ? "Regenerate Logos" : "Generate Logos"}
            </button>
            <button
              type="button"
              onClick={() => downloadSvg({ wordmark, palette, font, concept })}
              className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-foreground bg-white border border-slate-200 shadow-sm transition hover:bg-slate-50"
            >
              <Download size={15} /> Download SVG
            </button>
          </div>

          {/* Static variations grid (always shows the layout previews) */}
          <div>
            <p className="mb-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Layout Previews
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {(["row", "col", "icon", "mono"] as const).map((layout) => (
                <div
                  key={layout}
                  className="rounded-xl p-4 text-center bg-white border border-slate-200 shadow-sm"
                >
                  <div className="flex h-16 items-center justify-center gap-2">
                    {layout === "row" && (
                      <>
                        <LogoMark colors={palette.colors} />{" "}
                        <span
                          className="font-semibold tracking-tight"
                          style={{ fontFamily: font.stack }}
                        >
                          {wordmark}
                        </span>
                      </>
                    )}
                    {layout === "col" && (
                      <div className="flex flex-col items-center">
                        <LogoMark size={28} colors={palette.colors} />
                        <span
                          className="mt-1 text-xs font-semibold tracking-tight"
                          style={{ fontFamily: font.stack }}
                        >
                          {wordmark}
                        </span>
                      </div>
                    )}
                    {layout === "icon" && <LogoMark size={36} colors={palette.colors} />}
                    {layout === "mono" && (
                      <>
                        <span style={{ filter: "grayscale(1) brightness(0.2)" }}>
                          <LogoMark colors={palette.colors} />
                        </span>
                        <span
                          className="font-semibold tracking-tight"
                          style={{ fontFamily: font.stack }}
                        >
                          {wordmark}
                        </span>
                      </>
                    )}
                  </div>
                  <p className="mt-2 text-[11px] text-muted-foreground capitalize">
                    {layout === "row"
                      ? "Horizontal"
                      : layout === "col"
                        ? "Stacked"
                        : layout === "icon"
                          ? "Icon Only"
                          : "Monochrome"}
                  </p>
                  {result && (
                    <p className="mt-1 text-[10px] text-foreground/70">
                      {
                        result.variations.find(
                          (v) =>
                            v.name.toLowerCase() ===
                            (layout === "row"
                              ? "horizontal"
                              : layout === "col"
                                ? "stacked"
                                : layout === "icon"
                                  ? "icon only"
                                  : "monochrome"),
                        )?.description
                      }
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* History section */}
          {history.length > 1 && (
            <div className="mt-4">
              <div className="flex items-center gap-2 mb-3">
                <Clock size={14} className="text-slate-400" />
                <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  Previous Generations
                </p>
              </div>
              <div className="space-y-3">
                {history.slice(1).map((item) => {
                  const imgs =
                    item.generated_images ?? (item.generated_image ? [item.generated_image] : []);
                  if (!imgs.length) return null;
                  return (
                    <div
                      key={item.id}
                      className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="text-[12px] font-semibold text-slate-800">
                            "{item.tagline}"
                          </p>
                          <p className="text-[10px] text-slate-500">
                            {item.settings?.concept} · {item.settings?.palette_name} ·{" "}
                            {item.created_at ? new Date(item.created_at).toLocaleString() : ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2 overflow-x-auto pb-1">
                        {imgs.map((img, i) => (
                          <button
                            key={i}
                            onClick={() =>
                              setLightbox({
                                images: imgs,
                                index: i,
                                labels: VARIATION_LABELS.map(String),
                              })
                            }
                            className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-white transition hover:border-slate-400 hover:shadow-md"
                          >
                            <img
                              src={img}
                              alt={`Variation ${i + 1}`}
                              className="h-full w-full object-contain p-1"
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Lightbox overlay */}
      {lightbox && (
        <Lightbox
          images={lightbox.images}
          initialIndex={lightbox.index}
          labels={lightbox.labels}
          onClose={() => setLightbox(null)}
        />
      )}
    </StudioShell>
  );
}
