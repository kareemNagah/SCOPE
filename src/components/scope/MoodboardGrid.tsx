import { Upload } from "lucide-react";

export function MoodboardGrid() {
  return (
    <div className="glass mx-auto mt-6 grid w-fit grid-cols-3 gap-2.5 rounded-2xl p-3">
      {Array.from({ length: 9 }).map((_, i) => (
        <button
          key={i}
          className="flex h-[72px] w-[72px] items-center justify-center rounded-xl border border-dashed border-foreground/15 bg-white/40 text-muted-foreground transition hover:border-foreground/30 hover:bg-white/70 hover:text-foreground"
          aria-label={`Upload moodboard image ${i + 1}`}
        >
          <Upload size={16} strokeWidth={1.6} />
        </button>
      ))}
    </div>
  );
}
