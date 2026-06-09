import { useState } from "react";
import { Plus, Sparkles, Loader2 } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { AuroraButton } from "@/components/ui/aurora-button";

export function PromptBar() {
  const [guided, setGuided] = useState(false);
  const [value, setValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleGenerate = async () => {
    if (!value.trim() || isLoading) return;
    
    setIsLoading(true);
    const sessionId = crypto.randomUUID();
    
    try {
      // Use the [AUTO-GENERATE] shortcut so the AI skips the proposal phase
      // and immediately generates the 6 nodes.
      await api.chat([{ role: "user", content: `[AUTO-GENERATE] ${value}` }], sessionId);
      
      // Navigate to canvas with the session ID
      navigate({ to: "/canvas", search: { session: sessionId } });
    } catch (error) {
      console.error("Failed to generate:", error);
      toast.error("Failed to generate brand strategy. Is the backend running?");
      setIsLoading(false);
    }
  };

  return (
    <div
      className="glass mx-auto flex w-full max-w-[920px] items-center gap-2 rounded-full p-2 pl-5"
      style={{ backdropFilter: 'url("#container-glass")' }}
    >
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            handleGenerate();
          }
        }}
        disabled={isLoading}
        placeholder="Describe your brand, audience, or paste a Skill.md…"
        className="min-w-0 flex-1 bg-transparent py-2 text-[15px] text-foreground placeholder:text-muted-foreground/80 outline-none disabled:opacity-50"
      />

      <button
        type="button"
        onClick={() => setGuided((g) => !g)}
        disabled={isLoading}
        className="hidden sm:flex items-center gap-2.5 rounded-full px-3 py-1.5 hover:bg-white/50 transition disabled:opacity-50"
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
        disabled={isLoading}
        className="hidden sm:flex items-center gap-2 rounded-full px-3 py-1.5 hover:bg-white/50 transition disabled:opacity-50"
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
        onClick={handleGenerate}
        disabled={isLoading || !value.trim()}
        className="h-10 px-5 rounded-full text-xs font-semibold uppercase tracking-wider disabled:opacity-50"
      >
        {isLoading ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
        Generate
      </AuroraButton>
    </div>
  );
}
