import { createFileRoute, useSearch, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Languages,
  Loader2,
  Sparkles,
  X,
  ZoomIn,
} from "lucide-react";

import { StudioShell } from "@/components/scope/StudioShell";
import { ReferenceUploader } from "@/components/scope/ReferenceUploader";
import { api, type LogoResult, type MockupHistoryItem, type MockupResult } from "@/lib/api";
import { toast } from "sonner";

export const Route = createFileRoute("/mockups")({
  head: () => ({
    meta: [
      { title: "SCOPE — Brand Mockups Studio" },
      {
        name: "description",
        content:
          "Apply your generated logo onto real-world brand mockups — business cards, signage, packaging, social & apparel.",
      },
    ],
  }),
  component: MockupsPage,
});

/* ────────────────────────────────────────────── */
/*  Static config                                 */
/* ────────────────────────────────────────────── */

type Lang = "en" | "ar";

const LOGO_LABELS = ["Horizontal", "Stacked", "Icon Only", "Monochrome"];

const MOCKUP_TYPES = [
  { key: "business_card", en: "Business Card", ar: "بطاقة عمل", icon: "▭" },
  { key: "signage", en: "Signage / Storefront", ar: "لافتة / واجهة", icon: "◫" },
  { key: "packaging", en: "Packaging", ar: "تغليف", icon: "◰" },
  { key: "social_apparel", en: "Social & Apparel", ar: "سوشيال وملابس", icon: "◍" },
] as const;

const T = {
  eyebrow: { en: "Step 6 · Brand Mockups Studio", ar: "الخطوة 6 · استوديو نماذج العلامة" },
  title: { en: "See your brand in the world", ar: "شاهد علامتك في العالم" },
  intro: {
    en: "Apply your generated logo onto realistic mockups — business cards, signage, packaging, social & apparel — styled by your brand references.",
    ar: "طبّق شعارك على نماذج واقعية — بطاقات العمل، اللافتات، التغليف، السوشيال والملابس — بأسلوب مستوحى من مراجع علامتك.",
  },
  pickLogo: { en: "Logo to apply", ar: "الشعار المراد تطبيقه" },
  mockupTypes: { en: "Mockup types", ar: "أنواع النماذج" },
  selectMany: { en: "select one or more", ar: "اختر واحدًا أو أكثر" },
  generate: { en: "Generate Mockups", ar: "إنشاء النماذج" },
  regenerate: { en: "Regenerate Mockups", ar: "إعادة إنشاء النماذج" },
  generating: { en: "Generating mockups…", ar: "جارٍ إنشاء النماذج…" },
  results: { en: "Generated Mockups", ar: "النماذج المُنشأة" },
  previous: { en: "Previous Generations", ar: "الإصدارات السابقة" },
  noLogoTitle: { en: "Generate a logo first", ar: "أنشئ شعارًا أولًا" },
  noLogoBody: {
    en: "Mockups are built from your logo. Head to the Logo step to generate one, then come back here.",
    ar: "تُبنى النماذج من شعارك. انتقل إلى خطوة الشعار لإنشائه ثم عُد إلى هنا.",
  },
  goToLogo: { en: "Go to Logo Studio", ar: "اذهب إلى استوديو الشعار" },
  download: { en: "Download PNG", ar: "تنزيل PNG" },
  success: { en: "Mockups generated!", ar: "تم إنشاء النماذج!" },
  failure: { en: "Failed to generate mockups.", ar: "تعذّر إنشاء النماذج." },
  langLabel: { en: "العربية", ar: "English" },
} as const;

/* ────────────────────────────────────────────── */
/*  Helpers                                        */
/* ────────────────────────────────────────────── */

function downloadPng(dataUrl: string, filename: string) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  link.click();
}

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
      <button
        onClick={onClose}
        className="absolute top-6 right-6 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition hover:bg-white/20"
      >
        <X size={20} />
      </button>

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

      <div className="flex flex-col items-center gap-4">
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white shadow-2xl">
          <img
            src={images[index]}
            alt={labels[index] || `Mockup ${index + 1}`}
            className="max-h-[70vh] max-w-[85vw] object-contain"
            style={{ animation: "fadeIn 0.25s ease" }}
          />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-white/90">
            {labels[index] || `Mockup ${index + 1}`}
          </span>
          <span className="text-xs text-white/50">
            {index + 1} / {images.length}
          </span>
          <button
            onClick={() =>
              downloadPng(
                images[index],
                `mockup-${(labels[index] || "mockup").toLowerCase().replace(/\s+/g, "-")}.png`,
              )
            }
            className="ml-2 flex items-center gap-1.5 rounded-lg bg-white/15 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm transition hover:bg-white/25"
          >
            <Download size={13} /> PNG
          </button>
        </div>
      </div>
    </div>
  );
}

function MockupCard({
  image,
  label,
  index,
  onClick,
}: {
  image: string;
  label: string;
  index: number;
  onClick: () => void;
}) {
  return (
    <div
      className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-all duration-300 hover:shadow-lg hover:shadow-slate-200/60 hover:-translate-y-0.5 cursor-pointer"
      onClick={onClick}
      style={{ animationDelay: `${index * 80}ms`, animation: "fadeSlideUp 0.5s ease both" }}
    >
      <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-slate-50 to-white">
        <img
          src={image}
          alt={label}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-all duration-300 group-hover:bg-black/5">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow-lg opacity-0 transition-all duration-300 group-hover:opacity-100">
            <ZoomIn size={18} className="text-slate-700" />
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
        <p className="text-[13px] font-semibold text-slate-900 truncate">{label}</p>
        <button
          onClick={(e) => {
            e.stopPropagation();
            downloadPng(image, `mockup-${label.toLowerCase().replace(/\s+/g, "-")}.png`);
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
/*  Page                                          */
/* ────────────────────────────────────────────── */

function MockupsPage() {
  const search = useSearch({ strict: false }) as { session?: string };
  const sessionId = search.session || "default_session";

  const [lang, setLang] = useState<Lang>("en");
  const dir = lang === "ar" ? "rtl" : "ltr";
  const t = (key: keyof typeof T) => T[key][lang];

  const [logo, setLogo] = useState<LogoResult | null>(null);
  const [selectedLogoIdx, setSelectedLogoIdx] = useState(0);
  const [selectedTypes, setSelectedTypes] = useState<string[]>(MOCKUP_TYPES.map((m) => m.key));
  const [brandContext, setBrandContext] = useState("");
  const [refImages, setRefImages] = useState<string[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [result, setResult] = useState<MockupResult | null>(null);
  const [history, setHistory] = useState<MockupHistoryItem[]>([]);
  const [lightbox, setLightbox] = useState<{
    images: string[];
    index: number;
    labels: string[];
  } | null>(null);

  const logoImages =
    logo?.generated_images ?? (logo?.generated_image ? [logo.generated_image] : []);
  const hasLogo = logoImages.length > 0;

  useEffect(() => {
    if (!search.session) return;
    api
      .getLogo(search.session)
      .then((res) => {
        if (!res) return;
        setLogo(res);
        if (res.settings?.palette_name) {
          setBrandContext(`Palette: ${res.settings.palette_name}`);
        }
      })
      .catch(() => {});
    api
      .getMockup(search.session)
      .then((res) => res && setResult(res))
      .catch(() => {});
    api
      .getAllMockups(search.session)
      .then((items) => setHistory(items ?? []))
      .catch(() => {});
    api
      .getBrief(search.session)
      .then((brief) => {
        if (brief?.language === "ar") setLang("ar");
      })
      .catch(() => {});
  }, [search.session]);

  const toggleType = (key: string) =>
    setSelectedTypes((prev) =>
      prev.includes(key)
        ? prev.length > 1
          ? prev.filter((k) => k !== key)
          : prev
        : [...prev, key],
    );

  const handleGenerate = async () => {
    if (!hasLogo) return;
    setIsLoading(true);
    setLoadingProgress(0);

    const progressInterval = setInterval(() => {
      setLoadingProgress((prev) => (prev >= 90 ? prev : prev + Math.random() * 8));
    }, 800);

    try {
      const res = await api.generateMockups({
        session_id: sessionId,
        logo_image: logoImages[selectedLogoIdx] ?? logoImages[0],
        mockup_types: selectedTypes,
        brand_context: brandContext,
        reference_images: refImages,
      });
      setResult(res);
      setLoadingProgress(100);
      toast.success(t("success"));
      api
        .getAllMockups(sessionId)
        .then((items) => setHistory(items ?? []))
        .catch(() => {});
    } catch (err) {
      console.error(err);
      toast.error(t("failure"));
    } finally {
      clearInterval(progressInterval);
      setTimeout(() => {
        setIsLoading(false);
        setLoadingProgress(0);
      }, 400);
    }
  };

  const resultImages = result?.generated_images ?? [];
  const resultLabels = (result?.mockup_types ?? selectedTypes).map(
    (key) => MOCKUP_TYPES.find((m) => m.key === key)?.[lang] ?? key,
  );

  return (
    <StudioShell stepId="mockups" eyebrow={t("eyebrow")} title={t("title")} intro={t("intro")}>
      <style>{`
        @keyframes fadeSlideUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>

      <div dir={dir} className="space-y-6">
        {/* Language toggle */}
        <div className="flex justify-end">
          <button
            onClick={() => setLang((l) => (l === "en" ? "ar" : "en"))}
            className="flex items-center gap-1.5 rounded-full border border-border bg-white/70 px-3 py-1.5 text-[11px] font-medium text-foreground/70 transition hover:bg-white"
          >
            <Languages size={13} /> {T.langLabel[lang]}
          </button>
        </div>

        {!hasLogo ? (
          <div className="glass mx-auto max-w-[640px] rounded-2xl p-10 text-center">
            <Sparkles className="mx-auto text-muted-foreground" size={28} />
            <h2 className="mt-4 font-display text-2xl text-foreground">{t("noLogoTitle")}</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{t("noLogoBody")}</p>
            <Link
              to="/logo"
              search={search.session ? { session: search.session } : undefined}
              className="bg-gradient-cta mt-6 inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-medium text-white shadow-[0_8px_24px_-6px_rgba(255,90,120,0.55)] transition hover:brightness-105"
            >
              {t("goToLogo")} {dir === "rtl" ? "←" : "→"}
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
            {/* Tool panel */}
            <aside className="glass space-y-6 rounded-2xl p-5">
              {/* Logo picker */}
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-foreground/80">
                  {t("pickLogo")}
                </p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {logoImages.map((img, i) => {
                    const active = i === selectedLogoIdx;
                    return (
                      <button
                        key={i}
                        onClick={() => setSelectedLogoIdx(i)}
                        className={`relative overflow-hidden rounded-lg border bg-white p-1 transition ${
                          active
                            ? "border-foreground ring-2 ring-foreground/20"
                            : "border-border hover:border-foreground/40"
                        }`}
                        title={LOGO_LABELS[i] ?? `Logo ${i + 1}`}
                      >
                        <img
                          src={img}
                          alt={LOGO_LABELS[i] ?? `Logo ${i + 1}`}
                          className="aspect-square w-full object-contain"
                        />
                        {active && (
                          <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-foreground text-background">
                            <Check size={10} />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Mockup type multi-select */}
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-foreground/80">
                  {t("mockupTypes")}{" "}
                  <span className="normal-case tracking-normal text-muted-foreground/70">
                    · {t("selectMany")}
                  </span>
                </p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {MOCKUP_TYPES.map((m) => {
                    const active = selectedTypes.includes(m.key);
                    return (
                      <button
                        key={m.key}
                        onClick={() => toggleType(m.key)}
                        className={`rounded-lg border p-2.5 text-start text-[11px] transition ${
                          active
                            ? "border-transparent bg-foreground text-background shadow-[var(--shadow-prism)]"
                            : "border-border bg-white/70 text-foreground hover:bg-white"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{m[lang]}</span>
                          {active ? (
                            <Check size={11} />
                          ) : (
                            <span className="opacity-50">{m.icon}</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Generate */}
              <button
                onClick={handleGenerate}
                disabled={isLoading}
                className="bg-gradient-cta flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold uppercase tracking-wider text-white shadow-[0_8px_24px_-6px_rgba(255,90,120,0.55)] transition hover:brightness-105 disabled:opacity-60"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={15} className="animate-spin" /> {t("generating")}
                  </>
                ) : (
                  <>
                    <Sparkles size={15} /> {result ? t("regenerate") : t("generate")}
                  </>
                )}
              </button>
              {isLoading && (
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-foreground/10">
                  <div
                    className="bg-gradient-cta h-full rounded-full transition-all duration-500"
                    style={{ width: `${loadingProgress}%` }}
                  />
                </div>
              )}

              <ReferenceUploader images={refImages} onChange={setRefImages} />
            </aside>

            {/* Results */}
            <div className="space-y-8">
              {resultImages.length > 0 ? (
                <section>
                  <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.18em] text-foreground/70">
                    {t("results")}
                  </p>
                  <div className="grid grid-cols-2 gap-4 lg:grid-cols-2 xl:grid-cols-4">
                    {resultImages.map((img, i) => (
                      <MockupCard
                        key={i}
                        image={img}
                        label={resultLabels[i] ?? `Mockup ${i + 1}`}
                        index={i}
                        onClick={() =>
                          setLightbox({ images: resultImages, index: i, labels: resultLabels })
                        }
                      />
                    ))}
                  </div>
                </section>
              ) : (
                <div className="glass flex min-h-[260px] items-center justify-center rounded-2xl p-10 text-center text-sm text-muted-foreground">
                  {t("intro")}
                </div>
              )}

              {/* Previous generations */}
              {history.length > 1 && (
                <section>
                  <p className="mb-3 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-foreground/70">
                    <Clock size={12} /> {t("previous")}
                  </p>
                  <div className="space-y-4">
                    {history.slice(1).map((item) => {
                      const imgs = item.generated_images ?? [];
                      const labels = (item.mockup_types ?? []).map(
                        (key) => MOCKUP_TYPES.find((m) => m.key === key)?.[lang] ?? key,
                      );
                      return (
                        <div key={item.id} className="glass rounded-2xl p-4">
                          <p className="mb-2 text-[11px] text-muted-foreground">
                            {item.created_at ? new Date(item.created_at).toLocaleString() : ""}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {imgs.map((img, i) => (
                              <button
                                key={i}
                                onClick={() => setLightbox({ images: imgs, index: i, labels })}
                                className="h-20 w-20 overflow-hidden rounded-lg border border-border bg-white transition hover:opacity-80"
                              >
                                <img src={img} alt="" className="h-full w-full object-cover" />
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}
            </div>
          </div>
        )}
      </div>

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
