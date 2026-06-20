/**
 * Clipboard image-paste helpers.
 *
 * `extractImageFiles` pulls image `File`s out of a paste event; `usePasteImages`
 * attaches a document-level listener for single-uploader pages.
 */

import { useEffect } from "react";

/** Pull image files from a clipboard paste event. */
export function extractImageFiles(e: ClipboardEvent): File[] {
  const dt = e.clipboardData;
  if (!dt) return [];
  const out: File[] = [];
  // Prefer items (covers screenshots pasted as image/png blobs).
  for (const item of Array.from(dt.items ?? [])) {
    if (item.kind === "file" && item.type.startsWith("image/")) {
      const f = item.getAsFile();
      if (f) out.push(f);
    }
  }
  // Fall back to files (some browsers populate only this).
  if (out.length === 0) {
    for (const f of Array.from(dt.files ?? [])) {
      if (f.type.startsWith("image/")) out.push(f);
    }
  }
  return out;
}

export function filesToFileList(files: File[]): FileList {
  const dt = new DataTransfer();
  files.forEach((file) => dt.items.add(file));
  return dt.files;
}

/**
 * Document-level paste listener. Use on pages with a single image uploader.
 * Calls `onFiles` with any pasted images and prevents default when images land.
 */
export function usePasteImages(onFiles: (files: File[]) => void, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    const handler = (e: ClipboardEvent) => {
      const files = extractImageFiles(e);
      if (files.length) {
        e.preventDefault();
        onFiles(files);
      }
    };
    document.addEventListener("paste", handler);
    return () => document.removeEventListener("paste", handler);
  }, [onFiles, enabled]);
}
