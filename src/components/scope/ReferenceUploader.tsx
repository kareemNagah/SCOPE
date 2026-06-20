import { Upload, X } from "lucide-react";
import { useCallback } from "react";
import { extractImageFiles, usePasteImages } from "@/lib/usePasteImages";

/**
 * Compact reference-image uploader used by the Logo and Mockups studios.
 * Holds images as data URLs (lifted to the parent) so they can be sent straight
 * into the generation request's `reference_images`. Supports click-to-upload and
 * Ctrl+V paste.
 */
export function ReferenceUploader({
  images,
  onChange,
  label = "Reference images",
  hint = "click or paste (Ctrl+V)",
}: {
  images: string[];
  onChange: (images: string[]) => void;
  label?: string;
  hint?: string;
}) {
  const addFiles = useCallback(
    (files: File[]) => {
      const imageFiles = files.filter((f) => f.type.startsWith("image/"));
      if (!imageFiles.length) return;
      Promise.all(
        imageFiles.map(
          (f) =>
            new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onload = () => resolve(String(reader.result));
              reader.readAsDataURL(f);
            }),
        ),
      ).then((urls) => onChange([...images, ...urls]));
    },
    [images, onChange],
  );

  usePasteImages(addFiles);

  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-foreground/80">
        {label}{" "}
        <span className="normal-case tracking-normal text-muted-foreground/70">· {hint}</span>
      </p>
      <div
        tabIndex={0}
        onPaste={(e) => {
          const pasted = extractImageFiles(e.nativeEvent);
          if (pasted.length) {
            e.preventDefault();
            e.stopPropagation();
            addFiles(pasted);
          }
        }}
        title="Click here, then paste an image (Ctrl+V)"
        className="mt-2 flex flex-wrap gap-2 rounded-xl border border-dashed border-border bg-white/40 p-2 outline-none focus-within:ring-1 focus-within:ring-foreground/20"
      >
        {images.map((src, i) => (
          <div
            key={i}
            className="group relative h-14 w-14 overflow-hidden rounded-lg border border-border bg-white"
          >
            <img src={src} alt="reference" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => onChange(images.filter((_, idx) => idx !== i))}
              className="absolute inset-0 flex items-center justify-center bg-black/50 text-white opacity-0 transition group-hover:opacity-100"
              aria-label="Remove reference"
            >
              <X size={14} />
            </button>
          </div>
        ))}
        <label className="flex h-14 w-14 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-foreground/20 text-muted-foreground transition hover:border-foreground/40 hover:text-foreground">
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => addFiles(Array.from(e.target.files ?? []))}
          />
          <Upload size={16} />
        </label>
      </div>
    </div>
  );
}
