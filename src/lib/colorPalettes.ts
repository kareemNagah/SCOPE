export type DerivedPalette = {
  name: string;
  colors: string[];
  mood: string;
  usage_note?: string;
};

function ensureColors(colors: string[], fallbacks: string[], count = 4): string[] {
  const output: string[] = [];
  for (const color of [...colors, ...fallbacks]) {
    const normalized = normalizeHex(color);
    if (normalized && !output.includes(normalized)) output.push(normalized);
    if (output.length >= count) break;
  }
  return output;
}

export function buildImageInspiredPalettes(colors: string[]): DerivedPalette[] {
  if (colors.length < 3) return [];
  const fallback = ["#0F172A", "#F8FAFC", "#D4B483"];
  return [
    {
      name: "Reference Signal",
      mood: "Moodboard Derived",
      usage_note: "Sampled from uploaded references and generated moodboard imagery.",
      colors: ensureColors([colors[0], colors[1], colors[2], colors[3]], fallback),
    },
    {
      name: "Image Undertone",
      mood: "Reference Range",
      usage_note: "Secondary palette built from supporting image tones.",
      colors: ensureColors([colors[2], colors[4], colors[1], colors[5]], fallback),
    },
    {
      name: "Campaign Extract",
      mood: "Visual Accent",
      usage_note: "High-contrast accent set from the strongest reference colors.",
      colors: ensureColors([colors[colors.length - 1], colors[1], colors[0], colors[3]], fallback),
    },
  ];
}

export async function extractPaletteFromImageSources(
  sources: string[],
  maxColors = 8,
): Promise<string[]> {
  if (typeof window === "undefined" || sources.length === 0) return [];
  const buckets = new Map<string, { color: [number, number, number]; score: number }>();

  for (const source of sources.slice(0, 9)) {
    try {
      const colors = await sampleImage(source);
      for (const [r, g, b] of colors) {
        const [h, s, l] = rgbToHsl(r, g, b);
        if (l < 0.08 || l > 0.94 || s < 0.08) continue;
        const key = `${Math.round(h / 18)}-${Math.round(s * 5)}-${Math.round(l * 5)}`;
        const score = 1 + s * 3 + (1 - Math.abs(l - 0.52)) * 1.5;
        const existing = buckets.get(key);
        if (existing) existing.score += score;
        else buckets.set(key, { color: [r, g, b], score });
      }
    } catch {
      // Canvas extraction can fail for cross-origin images; ignore that source.
    }
  }

  const ranked = Array.from(buckets.values())
    .sort((a, b) => b.score - a.score)
    .map((entry) => rgbToHex(entry.color));

  const distinct: string[] = [];
  for (const hex of ranked) {
    if (distinct.every((existing) => colorDistance(hex, existing) > 72)) distinct.push(hex);
    if (distinct.length >= maxColors) break;
  }
  return distinct;
}

async function sampleImage(source: string): Promise<Array<[number, number, number]>> {
  const img = await loadImage(source);
  const canvas = document.createElement("canvas");
  const size = 72;
  const scale = Math.min(1, size / Math.max(img.naturalWidth, img.naturalHeight));
  canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return [];
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  const pixels: Array<[number, number, number]> = [];
  for (let i = 0; i < data.length; i += 16) {
    if (data[i + 3] < 180) continue;
    pixels.push([data[i], data[i + 1], data[i + 2]]);
  }
  return pixels;
}

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (!source.startsWith("data:") && !source.startsWith("blob:")) img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = source;
  });
}

function normalizeHex(color: string | undefined): string | null {
  if (!color) return null;
  const match = color.match(/^#?[0-9a-f]{6}$/i);
  if (!match) return null;
  return color.startsWith("#") ? color.toUpperCase() : `#${color.toUpperCase()}`;
}

function rgbToHex([r, g, b]: [number, number, number]): string {
  return `#${[r, g, b].map((value) => value.toString(16).padStart(2, "0")).join("")}`.toUpperCase();
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const nr = r / 255;
  const ng = g / 255;
  const nb = b / 255;
  const max = Math.max(nr, ng, nb);
  const min = Math.min(nr, ng, nb);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === nr) h = (ng - nb) / d + (ng < nb ? 6 : 0);
  else if (max === ng) h = (nb - nr) / d + 2;
  else h = (nr - ng) / d + 4;
  return [(h / 6) * 360, s, l];
}

function colorDistance(a: string, b: string): number {
  const ar = parseInt(a.slice(1, 3), 16);
  const ag = parseInt(a.slice(3, 5), 16);
  const ab = parseInt(a.slice(5, 7), 16);
  const br = parseInt(b.slice(1, 3), 16);
  const bg = parseInt(b.slice(3, 5), 16);
  const bb = parseInt(b.slice(5, 7), 16);
  return Math.hypot(ar - br, ag - bg, ab - bb);
}
