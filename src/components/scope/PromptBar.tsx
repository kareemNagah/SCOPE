import { useState } from "react";
import { Plus, Sparkles } from "lucide-react";

export function PromptBar() {
  const [guided, setGuided] = useState(false);
  const [value, setValue] = useState("");

  return (
    <div className="glass mx-auto flex w-full max-w-[920px] items-center gap-2 rounded-full p-2 pl-5">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Describe your brand, audience, or paste a Skill.md…"
        className="min-w-0 flex-1 bg-transparent py-2 text-[15px] text-foreground placeholder:text-muted-foreground/80 outline-none"
      />

      <button
        type="button"
        onClick={() => setGuided((g) => !g)}
        className="hidden sm:flex items-center gap-2.5 rounded-full px-3 py-1.5 hover:bg-white/50 transition"
        aria-pressed={guided}
      >
        <span
          className={`relative h-5 w-9 rounded-full transition-colors ${
            guided ? "bg-foreground" : "bg-foreground/15"
          }`}
        >
          <span
            className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${
              guided ? "left-[18px]" : "left-0.5"
            }`}
          />
        </span>
        <span className="text-left text-[11px] leading-tight">
          <span className="block font-medium text-foreground">Guided</span>
          <span className="block text-muted-foreground">Mad-Liks Mode</span>
        </span>
      </button>

      <div className="hidden sm:block h-8 w-px bg-border" />

      <button
        type="button"
        className="hidden sm:flex items-center gap-2 rounded-full px-3 py-1.5 hover:bg-white/50 transition"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-white/70">
          <Plus size={14} />
        </span>
        <span className="text-left text-[11px] leading-tight">
          <span className="block font-medium text-foreground">Attach</span>
          <span className="block text-muted-foreground">Moodboard</span>
        </span>
      </button>

      <button
        type="button"
        className="bg-gradient-cta inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-medium text-white shadow-[0_8px_24px_-6px_rgba(255,90,120,0.55)] transition hover:brightness-105 active:scale-[0.98]"
      >
        <Sparkles size={15} />
        Generate
      </button>
    </div>
  );
}
