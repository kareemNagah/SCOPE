import { useEffect, useState } from "react";
import { Loader2, RotateCcw, Sparkles, Eye, Download, X } from "lucide-react";

interface BriefMoodboardProps {
  uploaded: File[];
  generated: string[];
  isLoading: boolean;
  onRegenerate: () => void;
  dir: "rtl" | "ltr";
  lang: "ar" | "en";
}

export function BriefMoodboard({
  uploaded,
  generated,
  isLoading,
  onRegenerate,
  dir,
  lang,
}: BriefMoodboardProps) {
  const [uploadedPreviews, setUploadedPreviews] = useState<string[]>([]);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  useEffect(() => {
    const urls = uploaded.map((file) => URL.createObjectURL(file));
    setUploadedPreviews(urls);

    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [uploaded]);

  const handleDownloadImage = async (url: string, index: number) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `moodboard-image-${index + 1}.png`;
      link.click();
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      // Fallback direct open/download for cross-origin URLs
      const link = document.createElement("a");
      link.href = url;
      link.target = "_blank";
      link.download = `moodboard-image-${index + 1}.png`;
      link.click();
    }
  };

  const empty = !isLoading && uploadedPreviews.length === 0 && generated.length === 0;

  return (
    <div
      dir={dir}
      lang={lang}
      className="rounded-2xl border border-violet-500/15 bg-slate-950/45 p-4 shadow-[0_24px_60px_-30px_rgba(139,92,246,0.45)]"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
            {lang === "ar" ? "لوحة الإلهام" : "Moodboard"}
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            {lang === "ar"
              ? "اجمع المراجع المرفوعة والصور المولدة في مساحة واحدة."
              : "Uploaded references and generated images live together here."}
          </p>
        </div>
        <button
          type="button"
          onClick={onRegenerate}
          disabled={isLoading}
          className="inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-white/5 px-3 py-2 text-[11px] font-semibold text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
          <Sparkles size={11} />
          {lang === "ar" ? "إعادة توليد" : "Regenerate"}
        </button>
      </div>

      <div className="mt-4">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="aspect-square animate-pulse rounded-2xl border border-white/10 bg-slate-900/80"
              />
            ))}
          </div>
        ) : empty ? (
          <div className="rounded-2xl border border-dashed border-violet-400/15 bg-slate-900/35 p-5 text-center">
            <p className="text-sm text-slate-200">
              {lang === "ar"
                ? "ولّد لوحة إلهام من اتجاهك البصري."
                : "Generate a moodboard from your visual direction."}
            </p>
            <button
              type="button"
              onClick={onRegenerate}
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-gradient-cta px-4 py-2 text-xs font-semibold text-white shadow-[0_8px_20px_rgba(255,90,120,0.35)] transition hover:brightness-105"
            >
              <Sparkles size={12} />
              {lang === "ar" ? "إعادة توليد" : "Regenerate"}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {uploadedPreviews.map((url, index) => (
              <div
                key={`uploaded-${uploaded[index]?.name || index}-${index}`}
                className="group relative aspect-square overflow-hidden rounded-2xl border border-white/10 bg-slate-950/50"
              >
                <img
                  src={url}
                  alt={uploaded[index]?.name || `uploaded-${index}`}
                  className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setLightboxImage(url)}
                    className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition backdrop-blur-sm border border-white/10 shadow-sm"
                    title={lang === "ar" ? "عرض الصورة" : "View Image"}
                  >
                    <Eye size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownloadImage(url, index)}
                    className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition backdrop-blur-sm border border-white/10 shadow-sm"
                    title={lang === "ar" ? "تحميل الصورة" : "Download Image"}
                  >
                    <Download size={16} />
                  </button>
                </div>
              </div>
            ))}
            {generated.map((url, index) => (
              <div
                key={`generated-${index}-${url.slice(0, 24)}`}
                className="group relative aspect-square overflow-hidden rounded-2xl border border-violet-400/15 bg-slate-950/50"
              >
                <img
                  src={url}
                  alt={lang === "ar" ? `صورة مولدة ${index + 1}` : `Generated image ${index + 1}`}
                  className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setLightboxImage(url)}
                    className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition backdrop-blur-sm border border-white/10 shadow-sm"
                    title={lang === "ar" ? "عرض الصورة" : "View Image"}
                  >
                    <Eye size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownloadImage(url, uploadedPreviews.length + index)}
                    className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition backdrop-blur-sm border border-white/10 shadow-sm"
                    title={lang === "ar" ? "تحميل الصورة" : "Download Image"}
                  >
                    <Download size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-md bg-black/85 transition-opacity duration-300 animate-in fade-in duration-200 cursor-pointer"
        >
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 z-20 text-white/70 hover:text-white p-2 rounded-full bg-white/5 hover:bg-white/15 transition border border-white/10 cursor-pointer"
            aria-label="Close"
          >
            <X size={20} />
          </button>
          
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-h-[85vh] max-w-[90vw] flex flex-col items-center gap-4 cursor-default"
          >
            <img
              src={lightboxImage}
              alt="Moodboard view"
              className="max-h-[75vh] max-w-full rounded-xl object-contain border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.8)] animate-in zoom-in-95 duration-200"
            />
            
            <button
              onClick={() => handleDownloadImage(lightboxImage, 99)}
              className="inline-flex items-center gap-2 rounded-full bg-white/10 hover:bg-white/20 px-5 py-2.5 text-xs font-semibold text-white transition border border-white/10 backdrop-blur-sm shadow-md cursor-pointer"
            >
              <Download size={13} />
              {lang === "ar" ? "تحميل الصورة" : "Download Image"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
