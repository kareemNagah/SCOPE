import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  Compass,
  FileText,
  FolderOpen,
  Globe,
  Layers,
  Megaphone,
  Milestone,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import { MoodboardGrid } from "@/components/scope/MoodboardGrid";
import { BriefMoodboard } from "@/components/scope/BriefMoodboard";
import { MeshBackground } from "@/components/scope/MeshBackground";
import { PromptBar } from "@/components/scope/PromptBar";
import { JourneyStepper } from "@/components/scope/Journey";
import { TopNav } from "@/components/scope/TopNav";
import { WaveBorder } from "@/components/ui/wave-border";
import { api, type BriefResult } from "@/lib/api";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SCOPE - What brand will we build today?" },
      {
        name: "description",
        content:
          "SCOPE is an ethereal brand studio for founders and marketers. Generate brand strategy, visual identity, and campaign direction from a single prompt.",
      },
      { property: "og:title", content: "SCOPE - Ethereal brand studio" },
      {
        property: "og:description",
        content: "Brand architect, marketing engine, and ideas factory in one canvas.",
      },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=El+Messiri:wght@400;500;600;700&family=Tajawal:wght@400;500;700&family=Noto+Naskh+Arabic:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  component: StudioLanding,
});

type SavedBrief = {
  session_id: string;
  brand_name: string;
  industry: string;
  region: "usa" | "mena" | "gcc";
  approved: boolean;
  strategy_confirmed: boolean;
  created_at: string;
};

type LoadedBrief = BriefResult & {
  approved: boolean;
  strategy_confirmed: boolean;
};

type BriefPreview = {
  summary: string;
  persona: string;
  audience: string;
  positioning: string;
  valueProposition: string;
  competitiveContext: string;
  visualCues: string[];
  competitiveSignals: string[];
  reasonsToBelieve: string[];
  recommendedChannels: string[];
  complianceNotes: string[];
};

// ── Color palette derivation ──────────────────────────────────────────────────

const COLOR_TERM_MAP: Record<string, string> = {
  "midnight blue": "#1B2A4A",
  navy: "#1a2744",
  "deep blue": "#1e3a5f",
  "royal blue": "#2054b5",
  cobalt: "#0047AB",
  "sky blue": "#7CB9E8",
  teal: "#008080",
  cyan: "#0891b2",
  sapphire: "#0F52BA",
  emerald: "#059669",
  "forest green": "#166534",
  sage: "#9DAA8B",
  olive: "#6B7239",
  mint: "#6EE7B7",
  jade: "#00A86B",
  burgundy: "#800020",
  wine: "#722F37",
  crimson: "#DC143C",
  rose: "#E11D48",
  blush: "#FB7185",
  coral: "#F97316",
  terracotta: "#C4622D",
  "burnt orange": "#CC5500",
  amber: "#D97706",
  gold: "#B45309",
  mustard: "#CA8A04",
  saffron: "#F59E0B",
  cream: "#FEF3C7",
  ivory: "#FFFBEB",
  champagne: "#F3E8D0",
  purple: "#7C3AED",
  violet: "#6D28D9",
  lavender: "#A78BFA",
  plum: "#86198F",
  indigo: "#4338CA",
  mauve: "#C084FC",
  charcoal: "#374151",
  slate: "#475569",
  silver: "#94A3B8",
  "warm white": "#F8FAFC",
  "off-white": "#F8FAFC",
  white: "#F1F5F9",
  black: "#0F172A",
  ink: "#1E293B",
  ebony: "#334155",
  sand: "#D4B483",
  beige: "#E9DFD0",
  linen: "#FEF9F0",
  taupe: "#92807A",
  copper: "#B87333",
  bronze: "#CD7F32",
  "rose gold": "#BE8A8A",
  gold2: "#F59E0B",
  metallic: "#9CA3AF",
};

function visualCuesToPalette(cues: string[]): string[] {
  const colors: string[] = [];
  for (const cue of cues.slice(0, 12)) {
    const lower = cue.toLowerCase();
    for (const [key, val] of Object.entries(COLOR_TERM_MAP)) {
      if (lower.includes(key)) {
        if (!colors.includes(val) && colors.length < 6) colors.push(val);
        break;
      }
    }
  }
  if (colors.length < 3) {
    const fallbacks = ["#1B2A4A", "#7C3AED", "#A78BFA", "#E11D48"];
    for (const f of fallbacks) {
      if (!colors.includes(f) && colors.length < 4) colors.push(f);
    }
  }
  return colors.slice(0, 5);
}

// ── Name suggestion pools ─────────────────────────────────────────────────────

const NAME_POOLS = {
  ar: [
    "خيال",
    "وهج",
    "أصيل",
    "سَنا",
    "نبض",
    "ضياء",
    "فَجر",
    "أُفق",
    "لَحْن",
    "رُوح",
    "نجمة",
    "زهرة",
  ],
  en: [
    "Arc",
    "Veil",
    "Lune",
    "Cael",
    "Fern",
    "Sable",
    "Crest",
    "Mira",
    "Dusk",
    "Halo",
    "Vale",
    "Aura",
  ],
} as const;

// ─────────────────────────────────────────────────────────────────────────────

function StudioLanding() {
  const [prompt, setPrompt] = useState("");
  const [brandNameInput, setBrandNameInput] = useState("");
  const [region, setRegion] = useState<"usa" | "mena" | "gcc">("usa");
  const [files, setFiles] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [briefResult, setBriefResult] = useState<LoadedBrief | null>(null);
  const [directions, setDirections] = useState<string[]>([]);
  const [moodboard, setMoodboard] = useState<string[]>([]);
  const [moodboardLoading, setMoodboardLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>(() => crypto.randomUUID());
  const [savedBriefs, setSavedBriefs] = useState<SavedBrief[]>([]);
  const navigate = useNavigate();

  const detectedLang = /[؀-ۿ]/.test(prompt) ? "ar" : "en";

  const search = useSearch({ strict: false }) as { session?: string };
  const sessionParam = search.session;

  useEffect(() => {
    if (sessionParam) {
      setBriefResult(null);
      setDirections([]);
      setMoodboard([]);
      setMoodboardLoading(false);
      setSessionId(sessionParam);
      setIsLoading(true);
      api
        .getBrief(sessionParam)
        .then((res) => {
          if (res && res.brand_name) {
            setBriefResult(res);
            setRegion(res.region);
          } else {
            setBriefResult(null);
          }
        })
        .catch((err) => {
          console.error("Failed to load brief for session:", err);
          toast.error("Could not load brief details");
        })
        .finally(() => {
          setIsLoading(false);
        });
      return;
    }

    setBriefResult(null);
    setDirections([]);
    setMoodboard([]);
    setMoodboardLoading(false);
    setSessionId(crypto.randomUUID());
  }, [sessionParam]);

  useEffect(() => {
    if (!api.isAuthenticated()) return;
    api
      .getMyBriefs()
      .then((res) => {
        setSavedBriefs(res);
      })
      .catch((err) => {
        console.error("Failed to load user briefs:", err);
      });
  }, []);

  const briefPreview = useMemo(
    () => (briefResult ? buildBriefPreview(briefResult) : null),
    [briefResult],
  );
  const briefLang: "ar" | "en" =
    briefResult?.language ??
    (/[؀-ۿ]/.test(briefResult?.brand_name ?? "") ? "ar" : "en");
  const briefDir = briefLang === "ar" ? "rtl" : "ltr";

  useEffect(() => {
    if (!briefResult) return;
    const seed =
      (briefResult.visual_direction?.length ? briefResult.visual_direction : briefResult.visual_cues) ??
      [];
    setDirections(seed);
  }, [briefResult]);

  useEffect(() => {
    setMoodboard(briefResult?.moodboard_images ?? []);
  }, [briefResult]);

  const handleAddFiles = (newFiles: FileList) => {
    setFiles((prev) => {
      const all = [...prev, ...Array.from(newFiles)];
      return all.slice(0, 9);
    });
  };

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || isLoading) return;

    setIsLoading(true);
    toast.message(files.length ? "Analyzing Reference Material..." : "Generating from Written Brief...", {
      description: files.length
        ? "Extracting brand attributes and visual cues."
        : "No reference image attached. Building the brand brief from your text.",
    });

    const effectivePrompt = brandNameInput.trim()
      ? `Brand name preference: "${brandNameInput.trim()}". Brief: ${prompt}`
      : prompt;

    const formData = new FormData();
    formData.append("session_id", sessionId);
    formData.append("prompt", effectivePrompt);
    formData.append("region", region);
    files.forEach((file) => {
      formData.append("images", file);
    });

    try {
      const res = await api.analyzeBrief(formData);
      setBriefResult({ ...res, approved: false, strategy_confirmed: false });
      toast.success("Starter Brief Generated");
    } catch (error) {
      console.error("Failed to generate brief:", error);
      const message = error instanceof Error ? error.message : "Verify the backend is running.";
      toast.error("Generation failed.", { description: message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!briefResult) return;
    setIsLoading(true);

    try {
      await api.approveBrief(sessionId);
      toast.success("Brief approved. Opening strategy...");
      setTimeout(() => {
        navigate({
          to: "/canvas",
          search: { session: sessionId },
        });
      }, 800);
    } catch (error) {
      console.error("Failed to approve brief:", error);
      toast.error("Could not approve brief. Try again.");
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setPrompt("");
    setBrandNameInput("");
    setRegion("usa");
    setFiles([]);
    setBriefResult(null);
    setDirections([]);
    setMoodboard([]);
    setMoodboardLoading(false);
    const nextSessionId = crypto.randomUUID();
    setSessionId(nextSessionId);
    navigate({
      to: "/",
      search: {},
    });
  };

  const handleRegenerateMoodboard = async () => {
    if (!briefResult || moodboardLoading) return;
    setMoodboardLoading(true);
    try {
      const res = await api.generateMoodboard(sessionId, {
        visualDirection: directions.filter((d) => d.trim()),
        count: 4,
        files,
      });
      setMoodboard(res.images);
      if (res.images.length === 0) toast.message(briefLang === "ar" ? "تعذّر توليد الصور" : "No images generated");
    } catch (e) {
      console.error(e);
      toast.error(briefLang === "ar" ? "فشل توليد اللوحة" : "Moodboard generation failed");
    } finally {
      setMoodboardLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen pb-32">
      <MeshBackground />
      <TopNav />
      <JourneyStepper />

      <main className="px-6 pt-44">
        <section className="mx-auto max-w-[1200px] text-center">
          <h1 className="font-display text-[clamp(2.75rem,7vw,6rem)] leading-[1.02] tracking-tight text-foreground">
            What brand will
            <br />
            we build today?
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-[15px] text-muted-foreground">
            Move from a single prompt and visual reference to a full brand system - strategy,
            identity, and campaigns - without leaving the canvas.
          </p>

          <AnimatePresence mode="wait">
            {isLoading && !briefResult ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="mx-auto mt-12 max-w-[960px]"
              >
                <div className="rounded-3xl border border-slate-800/80 bg-slate-950/85 p-6 shadow-[0_30px_70px_-20px_rgba(139,92,246,0.25)] md:p-8">
                  <div className="animate-pulse space-y-4">
                    <div className="h-4 w-40 rounded-full bg-slate-800/90" />
                    <div className="h-14 w-2/3 rounded-2xl bg-slate-800/80" />
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="h-10 rounded-full bg-slate-800/75" />
                      <div className="h-10 rounded-full bg-slate-800/75" />
                      <div className="h-10 rounded-full bg-slate-800/75" />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="aspect-square rounded-2xl bg-slate-800/75" />
                      <div className="aspect-square rounded-2xl bg-slate-800/75" />
                    </div>
                    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                      <div className="h-44 rounded-2xl bg-slate-800/75" />
                      <div className="space-y-4">
                        <div className="h-32 rounded-2xl bg-slate-800/75" />
                        <div className="h-32 rounded-2xl bg-slate-800/75" />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : !briefResult ? (
              <motion.div
                key="builder"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.4 }}
                className="mt-12"
              >
                <PromptBar
                  value={prompt}
                  onChange={setPrompt}
                  isLoading={isLoading}
                  onGenerate={handleGenerate}
                  onAttachClick={() => {
                    const fileInput = document.querySelector(
                      'input[type="file"]',
                    ) as HTMLInputElement | null;
                    fileInput?.click();
                  }}
                />
                <BrandNameInput
                  value={brandNameInput}
                  onChange={setBrandNameInput}
                  lang={detectedLang}
                  isLoading={isLoading}
                />
                <RegionSelector value={region} onChange={setRegion} />
                <MoodboardGrid
                  files={files}
                  onAddFiles={handleAddFiles}
                  onRemoveFile={handleRemoveFile}
                />
              </motion.div>
            ) : (
              <motion.div
                key="preview"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ type: "spring", stiffness: 200, damping: 25 }}
                dir={briefDir}
                lang={briefLang}
                className="mx-auto mt-12 max-w-[960px] text-start"
              >
                <WaveBorder
                  tone="violet"
                  opacity={0.6}
                  className="rounded-3xl border border-slate-800/80 bg-slate-950/95 p-6 shadow-[0_30px_70px_-20px_rgba(139,92,246,0.35)] md:p-8"
                >
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/60 pb-6">
                    <div>
                      <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-scope-purple">
                        <Sparkles size={11} />
                        {briefLang === "ar" ? "تم إنشاء الموجز" : "Starter Brief Generated"}
                      </span>
                      {briefResult.brand_name_ar ? (
                        <>
                          <h2 className="mt-1 font-arabic-display text-5xl leading-none text-white md:text-6xl">
                            {briefResult.brand_name_ar}
                          </h2>
                          <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                            {briefResult.brand_name_en || briefResult.brand_name}
                          </p>
                        </>
                      ) : (
                        <h2 className="mt-1 font-display text-4xl text-white">
                          {briefResult.brand_name}
                        </h2>
                      )}
                      {briefResult.one_line_concept ? (
                        <p className="mt-2 max-w-2xl text-sm italic leading-6 text-slate-300">
                          {briefResult.one_line_concept}
                        </p>
                      ) : null}
                      <p className="mt-1 text-xs font-medium tracking-wide text-slate-400">
                        {briefResult.industry} | {briefResult.region.toUpperCase()}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <PreviewMeta
                          label={briefLang === "ar" ? "الصناعة" : "Industry"}
                          value={briefResult.industry}
                        />
                        <PreviewMeta
                          label={briefLang === "ar" ? "المنطقة" : "Region"}
                          value={briefResult.region.toUpperCase()}
                        />
                        <PreviewMeta
                          label={briefLang === "ar" ? "الشخصية" : "Persona"}
                          value={compactText(briefResult.pillars.persona, 1, 40)}
                        />
                      </div>
                      {/* Generated color palette from visual_cues */}
                      {briefResult.visual_cues?.length > 0 && (
                        <div className="mt-3 flex items-center gap-2">
                          <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-600">
                            {briefLang === "ar" ? "لوحة الألوان" : "Palette"}
                          </span>
                          <div className="flex gap-1">
                            {visualCuesToPalette(briefResult.visual_cues).map((hex, i) => (
                              <motion.span
                                key={hex}
                                initial={{ opacity: 0, scale: 0.7 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: i * 0.07, type: "spring", stiffness: 300 }}
                                className="h-5 w-5 rounded-full border-2 border-white/10 shadow-[0_2px_8px_rgba(0,0,0,0.4)]"
                                style={{ background: hex }}
                                title={hex}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleReset}
                        disabled={isLoading}
                        className="flex items-center gap-1.5 rounded-full border border-slate-800 bg-slate-900/60 px-4 py-2 text-xs font-semibold text-slate-300 transition duration-200 hover:bg-slate-900"
                      >
                        <RotateCcw size={12} /> Reset
                      </button>
                      <button
                        onClick={
                          briefResult.approved
                            ? () => {
                                navigate({
                                  to: "/canvas",
                                  search: { session: sessionId },
                                });
                              }
                            : handleApprove
                        }
                        disabled={isLoading}
                        className="bg-gradient-cta flex items-center gap-1.5 rounded-full px-5 py-2 text-xs font-semibold text-white shadow-[0_8px_20px_rgba(255,90,120,0.4)] transition duration-200 hover:brightness-105"
                      >
                        <Check size={13} />{" "}
                        {briefResult.approved ? "Open Strategy" : "Approve & Construct Canvas"}
                      </button>
                    </div>
                  </div>

                  <div className="mt-6">
                    <BriefMoodboard
                      uploaded={files}
                      generated={moodboard}
                      isLoading={moodboardLoading}
                      onRegenerate={handleRegenerateMoodboard}
                      dir={briefDir}
                      lang={briefLang}
                    />
                  </div>

                  <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                    <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-5 transition-all duration-300 hover:border-white/15">
                      <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-300">
                        <FileText size={13} className="text-scope-purple" /> {briefLang === "ar" ? "ملخص الموجز" : "Brief Snapshot"}
                      </h3>
                      <p className="mt-3 text-[14px] leading-relaxed text-slate-200">
                        {briefPreview?.summary ?? briefResult.summary}
                      </p>
                    </div>

                    <div className="grid gap-4">
                      <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-5 transition-all duration-300 hover:border-white/15">
                        <div className="flex items-center justify-between gap-3">
                          <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            {briefLang === "ar" ? "الاتجاه البصري" : "Visual Direction"}
                          </h4>
                          <button
                            type="button"
                            onClick={() => setDirections((prev) => [...prev, ""])}
                            className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-slate-200 transition hover:bg-white/10 active:scale-95"
                          >
                            {briefLang === "ar" ? "إضافة اتجاه" : "Add direction"}
                          </button>
                        </div>
                        <div className="mt-3.5 space-y-2">
                          {directions.length > 0 ? (
                            directions.map((direction, index) => (
                              <div
                                key={`direction-${index}`}
                                className="flex items-center gap-2 rounded-xl border border-white/5 bg-slate-950/70 px-3.5 py-2 shadow-inner"
                              >
                                <input
                                  value={direction}
                                  onChange={(e) => {
                                    const next = [...directions];
                                    next[index] = e.target.value;
                                    setDirections(next);
                                  }}
                                  dir="auto"
                                  className="min-w-0 flex-1 bg-transparent text-[13px] text-slate-100 outline-none placeholder:text-slate-500"
                                  placeholder={briefLang === "ar" ? "اكتب الاتجاه هنا" : "Write a direction"}
                                />
                                <button
                                  type="button"
                                  onClick={() => setDirections((prev) => prev.filter((_, i) => i !== index))}
                                  className="rounded-full p-1 text-slate-500 transition hover:bg-white/10 hover:text-white"
                                  aria-label={briefLang === "ar" ? "حذف الاتجاه" : "Remove direction"}
                                >
                                  ✕
                                </button>
                              </div>
                            ))
                          ) : (
                            <p className="rounded-xl border border-dashed border-white/5 bg-slate-950/35 px-3 py-4 text-xs text-slate-500 italic">
                              {briefLang === "ar"
                                ? "لا يوجد اتجاه بصري بعد."
                                : "No visual direction yet."}
                            </p>
                          )}
                        </div>
                      </div>
                      <CompactInsightList
                        title={briefLang === "ar" ? "تنبيهات السوق" : "Market Watchouts"}
                        items={briefPreview?.competitiveSignals ?? []}
                        tone="slate"
                        emptyLabel={briefLang === "ar" ? "لا توجد تنبيهات بعد." : "No market watchouts yet."}
                      />
                    </div>
                  </div>

                  <div className="mt-8 border-t border-slate-800/60 pt-6">
                    <h3 className="mb-4 flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-slate-400">
                      <Layers size={12} /> Canvas Strategy Architecture
                    </h3>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      <PillarCard
                        icon={Compass}
                        title="Mission"
                        desc={briefResult.pillars.mission}
                      />
                      <PillarCard
                        icon={Milestone}
                        title="Vision"
                        desc={briefResult.pillars.vision}
                      />
                      <PillarCard
                        icon={Users}
                        title="Target Persona"
                        desc={briefResult.pillars.persona}
                      />
                      <PillarCard
                        icon={ShieldCheck}
                        title="Core Values"
                        desc={briefResult.pillars.values}
                      />
                      <PillarCard
                        icon={Megaphone}
                        title="Voice & Tone"
                        desc={briefResult.pillars.voice}
                      />
                      <PillarCard
                        icon={Sparkles}
                        title="Brand Promise"
                        desc={briefResult.pillars.promise}
                      />
                    </div>
                  </div>

                  <div className="mt-8 border-t border-slate-800/60 pt-6">
                    <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-400">
                      Marketing Standards
                    </h3>
                    <div className="grid gap-4 md:grid-cols-2">
                      <PillarCard
                        icon={Users}
                        title="Audience"
                        desc={briefPreview?.audience ?? briefResult.marketing_standards.audience}
                      />
                      <PillarCard
                        icon={Compass}
                        title="Positioning"
                        desc={
                          briefPreview?.positioning ?? briefResult.marketing_standards.positioning
                        }
                      />
                      <PillarCard
                        icon={ShieldCheck}
                        title="Value Proposition"
                        desc={
                          briefPreview?.valueProposition ??
                          briefResult.marketing_standards.value_proposition
                        }
                      />
                      <PillarCard
                        icon={Megaphone}
                        title="Competitive Context"
                        desc={
                          briefPreview?.competitiveContext ??
                          briefResult.marketing_standards.competitive_context
                        }
                      />
                    </div>
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <TagStack
                        title="Reasons to believe"
                        tags={
                          briefPreview?.reasonsToBelieve ??
                          briefResult.marketing_standards.reasons_to_believe
                        }
                        tone="violet"
                      />
                      <TagStack
                        title="Recommended channels"
                        tags={
                          briefPreview?.recommendedChannels ??
                          briefResult.marketing_standards.recommended_channels
                        }
                        tone="slate"
                      />
                    </div>
                    <div className="mt-4">
                      <TagStack
                        title="Compliance and cultural notes"
                        tags={
                          briefPreview?.complianceNotes ??
                          briefResult.marketing_standards.compliance_cultural_notes
                        }
                        tone="amber"
                      />
                    </div>
                  </div>
                </WaveBorder>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {savedBriefs.length > 0 ? (
          <section className="mx-auto mt-28 max-w-[1200px] px-6">
            <div className="mb-6 flex items-center gap-2">
              <FolderOpen className="text-scope-purple" size={18} />
              <h2 className="font-display text-2xl text-foreground">Your Saved Brands</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {savedBriefs.map((brief) => (
                <button
                  key={brief.session_id}
                  onClick={() => {
                    navigate({
                      to: "/",
                      search: { session: brief.session_id },
                    });
                  }}
                  className="group rounded-2xl border border-white/60 bg-white/40 p-5 text-left backdrop-blur-md transition duration-300 hover:scale-[1.01] hover:shadow-[var(--shadow-prism)]"
                >
                  <span className="rounded-full bg-scope-purple/10 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-scope-purple">
                    {brief.approved ? "Active Canvas" : "Draft Brief"}
                  </span>
                  <h3 className="mt-3 font-display text-xl text-slate-900 transition group-hover:text-scope-purple">
                    {brief.brand_name}
                  </h3>
                  <p className="mt-1 text-xs font-medium text-slate-500">{brief.industry}</p>
                  <p className="mt-4 text-[10px] font-mono text-slate-400">
                    Created: {new Date(brief.created_at).toLocaleDateString()}
                  </p>
                </button>
              ))}
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}

function buildBriefPreview(brief: LoadedBrief): BriefPreview {
  return {
    summary: compactText(brief.summary, 2, 220),
    persona: compactText(brief.pillars.persona, 1, 56),
    audience: compactText(brief.marketing_standards.audience, 2, 150),
    positioning: compactText(brief.marketing_standards.positioning, 2, 150),
    valueProposition: compactText(brief.marketing_standards.value_proposition, 2, 150),
    competitiveContext: compactText(brief.marketing_standards.competitive_context, 2, 150),
    visualCues: compactItems(brief.visual_cues, 4, 72),
    competitiveSignals: compactItems(brief.competitive_signals, 3, 96),
    reasonsToBelieve: compactItems(brief.marketing_standards.reasons_to_believe, 4, 56),
    recommendedChannels: compactItems(brief.marketing_standards.recommended_channels, 4, 40),
    complianceNotes: compactItems(brief.marketing_standards.compliance_cultural_notes, 3, 88),
  };
}

function normalizeCopy(value: string) {
  return value
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .trim();
}

function compactText(value: string, maxSentences = 2, maxChars = 180) {
  const normalized = normalizeCopy(value);
  if (!normalized) return "";

  const sentences = normalized
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  let result = sentences.length > 0 ? sentences.slice(0, maxSentences).join(" ") : normalized;

  if (result.length > maxChars) {
    result = `${result
      .slice(0, maxChars)
      .replace(/\s+[^\s]*$/, "")
      .trim()}...`;
  }

  return result;
}

function compactItems(items: string[], limit: number, maxChars: number) {
  const seen = new Set<string>();
  const normalized = items
    .map((item) => compactText(item, 1, maxChars))
    .map((item) => item.replace(/[.]+$/, "").trim())
    .filter((item) => {
      if (!item) return false;
      const key = item.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  return normalized.slice(0, limit);
}

function PillarCard({
  icon: Icon,
  title,
  desc,
}: {
  icon: LucideIcon;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4 transition-all duration-300 hover:border-scope-purple/30 hover:bg-slate-900/80 hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
      <div className="flex items-center gap-2 text-scope-purple">
        <Icon size={14} className="opacity-90" />
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">{title}</h4>
      </div>
      <p className="mt-2 line-clamp-4 text-[13px] leading-relaxed text-slate-300" title={desc}>
        {desc}
      </p>
    </div>
  );
}

function PreviewMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-full border border-white/10 bg-slate-950/70 px-3.5 py-1.5 shadow-inner">
      <span className="text-[10px] uppercase tracking-[0.16em] text-slate-400">{label}</span>
      <span className="ms-2 text-[11px] font-medium text-slate-200">{value}</span>
    </div>
  );
}

function CompactInsightList({
  title,
  items,
  tone,
  emptyLabel,
}: {
  title: string;
  items: string[];
  tone: "violet" | "slate";
  emptyLabel: string;
}) {
  const toneClass =
    tone === "violet"
      ? "border-scope-purple/20 bg-scope-purple/10 text-slate-200"
      : "border-white/10 bg-slate-900/60 text-slate-200 hover:border-white/20";

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-5 shadow-sm transition-all duration-300 hover:border-white/15">
      <h4 className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">{title}</h4>
      {items.length > 0 ? (
        <ul className="mt-3 space-y-2.5">
          {items.map((item, index) => (
            <li
              key={`${title}-${item}`}
              className={`flex items-start gap-3 rounded-xl border px-3.5 py-2.5 shadow-sm transition-all duration-300 ${toneClass}`}
            >
              <span className="mt-0.5 inline-flex h-5 w-5 flex-none items-center justify-center rounded-full bg-white/10 text-[10px] font-bold text-slate-200">
                {index + 1}
              </span>
              <p className="min-w-0 text-[13px] leading-relaxed">{item}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-xs text-slate-500 italic">{emptyLabel}</p>
      )}
    </div>
  );
}

function RegionSelector({
  value,
  onChange,
}: {
  value: "usa" | "mena" | "gcc";
  onChange: (value: "usa" | "mena" | "gcc") => void;
}) {
  const options = [
    { id: "usa" as const, label: "USA" },
    { id: "mena" as const, label: "MENA" },
    { id: "gcc" as const, label: "GCC" },
  ];

  return (
    <div className="mx-auto mt-4 flex max-w-[920px] items-center justify-between gap-3 rounded-2xl border border-white/55 bg-white/40 px-4 py-3 backdrop-blur-md">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600">
          Market region
        </p>
        <p className="mt-1 text-sm text-slate-500">
          Choose the market lens before generating the brief.
        </p>
      </div>
      <div className="flex rounded-full border border-white/60 bg-white/70 p-1">
        {options.map((option) => {
          const selected = value === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onChange(option.id)}
              className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition ${
                selected ? "bg-slate-950 text-white" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Brand Name Input ──────────────────────────────────────────────────────────

function BrandNameInput({
  value,
  onChange,
  lang,
  isLoading,
}: {
  value: string;
  onChange: (v: string) => void;
  lang: "en" | "ar";
  isLoading: boolean;
}) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const isAr = lang === "ar";

  const handleSuggest = () => {
    const pool = NAME_POOLS[lang];
    const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, 5);
    setSuggestions(shuffled);
  };

  return (
    <div className="mx-auto mt-3 max-w-[920px]">
      <div
        dir={isAr ? "rtl" : "ltr"}
        className="glass flex items-center gap-3 rounded-2xl px-5 py-3"
      >
        <Globe size={13} className="flex-none text-muted-foreground/60" />
        <span className="flex-none text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">
          {isAr ? "اسم العلامة" : "Brand name"}
        </span>
        <div className="mx-2 h-4 w-px bg-border" />
        <input
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setSuggestions([]);
          }}
          dir={isAr ? "rtl" : "ltr"}
          disabled={isLoading}
          placeholder={
            isAr ? "اكتب اسماً أو احصل على اقتراحات..." : "Enter a name or get suggestions..."
          }
          className="min-w-0 flex-1 bg-transparent text-[14px] text-foreground outline-none placeholder:text-muted-foreground/50 disabled:opacity-50"
        />
        {value && (
          <button
            type="button"
            onClick={() => {
              onChange("");
              setSuggestions([]);
            }}
            className="flex-none text-[10px] text-muted-foreground transition hover:text-foreground"
          >
            ✕
          </button>
        )}
        <button
          type="button"
          onClick={handleSuggest}
          disabled={isLoading}
          className="flex flex-none items-center gap-1.5 rounded-full border border-border bg-background/60 px-3 py-1.5 text-[11px] font-medium text-foreground/70 transition hover:bg-background hover:text-foreground disabled:opacity-50"
        >
          <Sparkles size={11} />
          {isAr ? "اقتراح" : "Suggest"}
        </button>
      </div>
      <AnimatePresence>
        {suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            dir={isAr ? "rtl" : "ltr"}
            className="mt-2 flex flex-wrap gap-2 px-2"
          >
            {suggestions.map((name) => (
              <motion.button
                key={name}
                type="button"
                initial={{ opacity: 0, scale: 0.88 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 320, damping: 28 }}
                onClick={() => {
                  onChange(name);
                  setSuggestions([]);
                }}
                className="rounded-full border border-slate-300/60 bg-white/80 px-4 py-1.5 text-[13px] font-medium text-slate-700 shadow-sm transition hover:bg-white hover:shadow-md active:scale-95"
              >
                {name}
              </motion.button>
            ))}
            <button
              type="button"
              onClick={() => setSuggestions([])}
              className="rounded-full px-3 py-1.5 text-[11px] text-muted-foreground transition hover:text-foreground"
            >
              {isAr ? "إغلاق" : "dismiss"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function TagStack({
  title,
  tags,
  tone,
}: {
  title: string;
  tags: string[];
  tone: "violet" | "slate" | "amber";
}) {
  const styles = {
    violet: "border-scope-purple/30 bg-scope-purple/15 text-scope-purple brightness-110",
    slate: "border-white/10 bg-slate-900/60 text-slate-200",
    amber: "border-amber-500/30 bg-amber-500/15 text-amber-300 brightness-110",
  } as const;

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-4 transition-all duration-300 hover:border-white/15">
      <h4 className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">{title}</h4>
      <div className="mt-2.5 flex flex-wrap gap-2">
        {tags.map((tag) => (
          <span
            key={`${title}-${tag}`}
            className={`rounded-full border px-3 py-1 text-[11px] font-medium transition-all duration-200 hover:scale-[1.02] ${styles[tone]}`}
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}
