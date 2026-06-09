import { useEffect, useRef, useState } from "react";
import { Send, Sparkles, Image, BarChart2, MoreHorizontal } from "lucide-react";
import { api, type BrandNode } from "@/lib/api";

type Msg = { id: string; role: "user" | "assistant"; text: string };

const seed: Msg[] = [
  { id: "1", role: "assistant", text: "Hi — I'm your Brand Copilot. Ask me to tighten any pillar, or click a node in the graph to inspect it." },
  { id: "2", role: "assistant", text: "Try: \"Make the voice more playful\" or \"Sharpen the mission to one sentence.\"" },
];

const quickTags = [
  "Tighten the mission",
  "Sharpen the voice",
  "Reframe the persona",
  "Stress-test the promise",
];

export function CopilotChat({ 
  activeNodeTitle,
  sessionId,
  onNodesUpdate
}: { 
  activeNodeTitle?: string | null;
  sessionId: string;
  onNodesUpdate: (nodes: BrandNode[]) => void;
}) {
  const [msgs, setMsgs] = useState<Msg[]>(seed);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, isLoading]);

  const send = async (text: string) => {
    const t = text.trim();
    if (!t || isLoading) return;
    
    const user: Msg = { id: crypto.randomUUID(), role: "user", text: t };
    setMsgs((m) => [...m, user]);
    setInput("");
    setIsLoading(true);

    try {
      const chatHistory = [...msgs, user]
        .filter(m => m.id !== "1" && m.id !== "2")
        .map(m => ({ role: m.role, content: m.text }));
        
      if (chatHistory.length === 0) {
          chatHistory.push({ role: "user", content: t });
      }

      const res = await api.chat(chatHistory, sessionId);
      
      const reply: Msg = {
        id: crypto.randomUUID(),
        role: "assistant",
        text: res.response || "Done.",
      };
      
      setMsgs((m) => [...m, reply]);
      
      if (res.nodes && res.nodes.length > 0) {
        onNodesUpdate(res.nodes);
      }
    } catch (err) {
      console.error(err);
      const errorMsg: Msg = {
        id: crypto.randomUUID(),
        role: "assistant",
        text: "Sorry, I ran into an issue connecting to the backend. Is it running?",
      };
      setMsgs((m) => [...m, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-[600px] flex-col rounded-3xl bg-white/95 border border-slate-200/80 shadow-[0_8px_40px_-12px_rgba(80,40,200,0.18)]">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full" style={{ background: "var(--gradient-brand)" }}>
            <Sparkles size={14} className="text-white" />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-slate-900 leading-tight">Brand Copilot</p>
            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
              {activeNodeTitle ? `Editing · ${activeNodeTitle}` : "Live sync · ready"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
          <button className="text-slate-400 hover:text-slate-600 transition p-1 rounded-lg hover:bg-slate-50">
            <MoreHorizontal size={16} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {msgs.map((m) => (
          <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-[13px] leading-snug ${
                m.role === "user"
                  ? "bg-slate-900 text-white"
                  : "bg-slate-50 text-slate-800 border border-slate-100"
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-slate-50 text-slate-800 border border-slate-100 max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-snug flex items-center gap-1.5">
               <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" />
               <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0.15s" }} />
               <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0.3s" }} />
            </div>
          </div>
        )}
      </div>

      {/* Quick tags */}
      <div className="px-4 pt-2 pb-1">
        <div className="flex flex-wrap gap-1.5">
          {quickTags.map((q) => (
            <button
              key={q}
              onClick={() => send(q)}
              disabled={isLoading}
              className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700 hover:border-slate-300 transition disabled:opacity-50"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Input area - creative card style */}
      <div className="p-3 border-t border-slate-100">
        <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50/80 px-3 py-2 focus-within:border-slate-300 focus-within:bg-white transition-all">
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              title="Attach image"
            >
              <Image size={15} />
            </button>
            <button
              type="button"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              title="Chart analysis"
            >
              <BarChart2 size={15} />
            </button>
          </div>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); send(input); } }}
            disabled={isLoading}
            placeholder="Ask the copilot…"
            className="flex-1 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 outline-none disabled:opacity-50"
          />
          <button
            onClick={() => send(input)}
            disabled={isLoading || !input.trim()}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-white shadow-sm transition hover:brightness-110 disabled:opacity-40"
            style={{ background: "var(--gradient-cta)" }}
            aria-label="Send"
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
