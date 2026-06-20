import { Upload, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { extractImageFiles, filesToFileList, usePasteImages } from "@/lib/usePasteImages";

interface MoodboardGridProps {
  files: File[];
  onAddFiles: (files: FileList) => void;
  onRemoveFile: (index: number) => void;
}

export function MoodboardGrid({ files, onAddFiles, onRemoveFile }: MoodboardGridProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<string[]>([]);

  const addPastedFiles = useCallback(
    (pasted: File[]) => {
      if (pasted.length) onAddFiles(filesToFileList(pasted));
    },
    [onAddFiles],
  );

  usePasteImages(addPastedFiles);

  useEffect(() => {
    const urls = files.map((file) => URL.createObjectURL(file));
    setPreviews(urls);

    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [files]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onAddFiles(e.target.files);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = extractImageFiles(e.nativeEvent);
    if (pasted.length) {
      e.preventDefault();
      e.stopPropagation();
      addPastedFiles(pasted);
    }
  };

  return (
    <div
      tabIndex={0}
      onPaste={handlePaste}
      title="Click here, then paste an image (Ctrl+V)"
      className="glass mx-auto mt-6 flex flex-wrap justify-center gap-3 rounded-2xl p-4 max-w-[600px] outline-none focus-within:ring-1 focus-within:ring-foreground/20"
    >
      {previews.map((url, i) => (
        <div
          key={`${files[i]?.name || i}-${i}`}
          className="group relative h-[80px] w-[80px] overflow-hidden rounded-xl border border-white/25 bg-slate-950/40 shadow-sm"
        >
          <img
            src={url}
            alt={files[i]?.name || "Preview"}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
          <button
            type="button"
            onClick={() => onRemoveFile(i)}
            className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition duration-200 group-hover:opacity-100 text-white"
            aria-label="Remove image"
          >
            <X size={16} />
          </button>
        </div>
      ))}

      {files.length < 9 && (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex h-[80px] w-[80px] flex-col items-center justify-center rounded-xl border border-dashed border-foreground/15 bg-white/30 text-muted-foreground transition duration-200 hover:border-foreground/30 hover:bg-white/60 hover:text-foreground"
          aria-label="Upload reference image"
        >
          <Upload size={18} strokeWidth={1.8} />
          <span className="mt-1.5 text-[9px] font-bold uppercase tracking-wider font-sans">
            Attach
          </span>
          <span className="text-[8px] uppercase tracking-wider text-muted-foreground/70">
            paste anywhere
          </span>
        </button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
