import { useState } from "react";
import { Loader2, Plus, Sparkles } from "lucide-react";

import { AuroraButton } from "@/components/ui/aurora-button";

interface PromptBarProps {
  value: string;
  onChange: (val: string) => void;
  isLoading: boolean;
  onGenerate: () => void;
  onAttachClick: () => void;
}

export function PromptBar({
  value,
  onChange,
  isLoading,
  onGenerate,
  onAttachClick,
}: PromptBarProps) {
  const [guided, setGuided] = useState(false);

  return (
    <div
      className="glass mx-auto flex w-full max-w-[920px] items-center gap-2 rounded-full p-2 pl-5"
      style={{ backdropFilter: 'url("#container-glass")' }}
    >
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onGenerate();
          }
        }}
        disabled={isLoading}
        placeholder="Describe your brand, audience, or reference styling..."
        className="min-w-0 flex-1 bg-transparent py-2 text-[15px] text-foreground outline-none placeholder:text-muted-foreground/80 disabled:opacity-50"
      />

      <button
        type="button"
        onClick={() => setGuided((g) => !g)}
        disabled={isLoading}
        className="hidden items-center gap-2.5 rounded-full px-3 py-1.5 transition hover:bg-white/50 disabled:opacity-50 sm:flex"
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
          <span className="block text-muted-foreground">Mad-Libs Mode</span>
        </span>
      </button>

      <div className="hidden h-8 w-px bg-border sm:block" />

      <button
        type="button"
        disabled={isLoading}
        onClick={onAttachClick}
        className="hidden items-center gap-2 rounded-full px-3 py-1.5 transition hover:bg-white/50 disabled:opacity-50 sm:flex"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-white/70">
          <Plus size={14} />
        </span>
        <span className="text-left text-[11px] leading-tight">
          <span className="block font-medium text-foreground">Attach</span>
          <span className="block text-muted-foreground">Moodboard</span>
        </span>
      </button>

      <AuroraButton
        onClick={onGenerate}
        disabled={isLoading || !value.trim()}
        className="h-10 rounded-full px-5 text-xs font-semibold uppercase tracking-wider disabled:opacity-50"
      >
        {isLoading ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
        Generate
      </AuroraButton>
    </div>
  );
}
