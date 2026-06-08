import { useEffect, useRef, useState } from "react";
import { Send, Sparkles } from "lucide-react";

type Msg = { id: string; role: "user" | "assistant"; text: string };

const seed: Msg[] = [
  { id: "1", role: "assistant", text: "Hi — I'm your Brand Copilot. Ask me to tighten any pillar, or click a node in the graph to inspect it." },
  { id: "2", role: "assistant", text: "Try: \"Make the voice more playful\" or \"Sharpen the mission to one sentence.\"" },
];

const quick = [
  "Tighten the mission",
  "Sharpen the voice",
  "Reframe the persona",
  "Stress-test the promise",
];

export function CopilotChat({ activeNodeTitle }: { activeNodeTitle?: string | null }) {
  const [msgs, setMsgs] = useState<Msg[]>(seed);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs]);

  const send = (text: string) => {
    const t = text.trim();
    if (!t) return;
    const user: Msg = { id: crypto.randomUUID(), role: "user", text: t };
    const reply: Msg = {
      id: crypto.randomUUID(),
      role: "assistant",
      text: `Got it — I'd refine "${activeNodeTitle ?? "this pillar"}" along that direction. (Connect Lovable AI to apply live edits to the graph.)`,
    };
    setMsgs((m) => [...m, user, reply]);
    setInput("");
  };

  return (
    <div className="glass flex h-[600px] flex-col rounded-3xl">
      <div className="flex items-center justify-between border-b border-white/40 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full" style={{ background: "var(--gradient-brand)" }}>
            <Sparkles size={13} className="text-white" />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-foreground leading-tight">Brand Copilot</p>
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              {activeNodeTitle ? `Editing · ${activeNodeTitle}` : "Live sync · ready"}
            </p>
          </div>
        </div>
        <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {msgs.map((m) => (
          <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-3 py-2 text-[13px] leading-snug ${
                m.role === "user"
                  ? "bg-foreground text-background"
                  : "bg-white/75 text-foreground border border-white/60"
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-white/40 px-3 pt-2">
        <div className="flex flex-wrap gap-1.5 pb-2">
          {quick.map((q) => (
            <button
              key={q}
              onClick={() => send(q)}
              className="rounded-full border border-border bg-white/70 px-2.5 py-1 text-[11px] text-muted-foreground hover:bg-white hover:text-foreground transition"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); send(input); }}
        className="flex items-center gap-2 border-t border-white/40 p-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask the copilot…"
          className="flex-1 rounded-full border border-border bg-white/80 px-4 py-2 text-sm outline-none focus:border-foreground/40"
        />
        <button
          type="submit"
          className="bg-gradient-cta flex h-9 w-9 items-center justify-center rounded-full text-white shadow-[0_8px_24px_-6px_rgba(255,90,120,0.55)] transition hover:brightness-105"
          aria-label="Send"
        >
          <Send size={14} />
        </button>
      </form>
    </div>
  );
}
