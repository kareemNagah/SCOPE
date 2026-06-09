import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, MoreHorizontal, History, Undo2, PenLine } from "lucide-react";
import { api } from "@/lib/api";
import { CreativeCard, type CreativeCardAction } from "@/components/ui/creative-card";
import { WaveBorder } from "@/components/ui/wave-border";
import { WavePath } from "@/components/ui/wave-path";
import { useCanvas, type EditEvent } from "./CanvasContext";
import { toast } from "sonner";

type Role = "user" | "assistant" | "system";

type ChatMessage = {
  id: string;
  role: Role;
  text: string;
  at: number;
  /** When set, renders an inline "edit event" pill bound to the canvas. */
  edit?: EditEvent;
};

const seedMessages: ChatMessage[] = [
  {
    id: "seed-1",
    role: "assistant",
    text: "I'm your Brand Copilot. Pick any pillar in the timeline and I'll start working against it.",
    at: Date.now(),
  },
  {
    id: "seed-2",
    role: "assistant",
    text: "Try a quick action: tighten the mission, sharpen the voice, or ask me to stress-test the promise.",
    at: Date.now(),
  },
];

const BASE_TAGS = [
  "Tighten the mission",
  "Sharpen the voice",
  "Reframe the persona",
  "Stress-test the promise",
];

const NODE_TAGS: Record<string, string[]> = {
  mission: ["Compress to one sentence", "Add the cost of inaction", "Swap for a verb"],
  vision: ["Make it time-boxed", "Pair with a measurable", "Name who gets there first"],
  persona: ["Add a daily friction", "Name the trade-off they reject", "Surface the unserved job"],
  voice: ["Give me three tweets", "Add a do-and-do-not", "Write a sample headline"],
  values: ["Rank by behaviour", "Cut the lowest", "Convert each to a habit"],
  promise: ["Add a measurable guarantee", "Make it undeniable", "Pair with a refund clause"],
};

function tagsForActiveNode(activeTitle: string | null | undefined): string[] {
  if (!activeTitle) return BASE_TAGS;
  const key = activeTitle.toLowerCase();
  for (const [needle, tags] of Object.entries(NODE_TAGS)) {
    if (key.includes(needle)) return tags;
  }
  return BASE_TAGS;
}

export function CopilotChat({ sessionId }: { sessionId: string }) {
  const { nodes, activeNodeId, recentEdits, applyDraftToNode } = useCanvas();
  const activeNode = React.useMemo(
    () => nodes.find((n) => n.id === activeNodeId) ?? null,
    [nodes, activeNodeId],
  );

  const [messages, setMessages] = React.useState<ChatMessage[]>(seedMessages);
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, loading]);

  // Surface canvas edits as system messages so the chat reflects what the user did inline.
  const seenEditIds = React.useRef<Set<string>>(new Set());
  React.useEffect(() => {
    if (recentEdits.length === 0) return;
    const fresh = recentEdits.filter((e) => !seenEditIds.current.has(e.id));
    if (fresh.length === 0) return;
    fresh.forEach((e) => seenEditIds.current.add(e.id));
    setMessages((prev) => [
      ...prev,
      ...fresh
        .filter((e) => e.source === "inline")
        .map<ChatMessage>((e) => ({
          id: `edit-${e.id}`,
          role: "system",
          text: `You updated ${e.nodeTitle}. Want me to propagate this through the rest of the pillars?`,
          at: e.at,
          edit: e,
        })),
    ]);
  }, [recentEdits]);

  const send = React.useCallback(
    async (text: string) => {
      const t = text.trim();
      if (!t || loading) return;
      const user: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        text: t,
        at: Date.now(),
      };
      setMessages((m) => [...m, user]);
      setInput("");
      setLoading(true);

      try {
        const history = [...messages, user]
          .filter((m) => !m.id.startsWith("seed-") && m.role !== "system")
          .map((m) => ({ role: m.role, content: m.text }));
        if (history.length === 0) history.push({ role: "user", content: t });

        const res = await api.chat(history, sessionId);

        const reply: ChatMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          text: res.response || "Done.",
          at: Date.now(),
        };
        setMessages((m) => [...m, reply]);

        // If a node is active and the assistant returned a value, push it into the canvas.
        if (
          activeNode &&
          res.nodes &&
          res.nodes.length > 0 &&
          typeof res.response === "string" &&
          res.response.trim().length > 0
        ) {
          const matched = res.nodes.find(
            (n) => n.title.toLowerCase() === activeNode.title.toLowerCase(),
          );
          if (matched && matched.content !== activeNode.value) {
            applyDraftToNode(activeNode.id, matched.content, "chat");
          }
        }
      } catch (err) {
        console.error(err);
        toast.error("Couldn't reach the backend. Make sure it's running on :8000.");
        setMessages((m) => [
          ...m,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            text: "I lost the line to the backend. Retry in a moment, or check that the FastAPI server is up.",
            at: Date.now(),
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [activeNode, applyDraftToNode, loading, messages, sessionId],
  );

  const handleAction = React.useCallback(
    (action: CreativeCardAction) => {
      if (action === "image") {
        toast.message("Attach reference", {
          description: "Drop a screenshot, moodboard, or paste a URL to anchor the next brief.",
        });
      } else if (action === "analyze") {
        const focus = activeNode?.title ?? "all pillars";
        send(`Run a stress-test on the ${focus} against the current strategy.`);
      } else {
        toast.message("Copilot menu", {
          description: "Coming next: undo, version history, and export this transcript.",
        });
      }
    },
    [activeNode, send],
  );

  const tags = tagsForActiveNode(activeNode?.title);

  return (
    <WaveBorder
      tone="violet"
      opacity={0.42}
      className="flex h-[600px] flex-col overflow-hidden rounded-3xl bg-white/95 shadow-[0_8px_40px_-12px_color-mix(in_oklab,var(--scope-purple)_18%,transparent)]"
    >
      <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full"
            style={{ background: "var(--gradient-brand)" }}
            aria-hidden
          >
            <Sparkles size={14} className="text-white" />
          </div>
          <div>
            <p className="text-[13px] font-semibold leading-tight text-slate-900">Brand Copilot</p>
            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
              {activeNode ? `Editing · ${activeNode.title}` : "Live sync · ready"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="inline-flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50/80 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-emerald-700"
            aria-label="Connected"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]" />
            Live
          </span>
          <button
            type="button"
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-50 hover:text-slate-600"
            aria-label="Version history"
            title="Version history"
          >
            <History size={14} />
          </button>
          <button
            type="button"
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-50 hover:text-slate-600"
            aria-label="More options"
            title="More options"
          >
            <MoreHorizontal size={14} />
          </button>
        </div>
      </header>

      <div
        ref={scrollRef}
        className="flex-1 space-y-3 overflow-y-auto px-4 py-4"
        aria-live="polite"
      >
        <AnimatePresence initial={false}>
          {messages.map((m) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ type: "spring", stiffness: 220, damping: 26 }}
            >
              {m.role === "system" && m.edit ? (
                <EditEventPill edit={m.edit} />
              ) : (
                <Bubble role={m.role}>{m.text}</Bubble>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {loading ? <TypingBubble /> : null}
      </div>

      <div className="px-4 pb-3 pt-1">
        <div className="mb-2 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-slate-400">
          <PenLine size={11} />
          <span>Quick actions</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {tags.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => send(q)}
              disabled={loading}
              className="rounded-full border border-slate-200 bg-slate-50/80 px-3 py-1 text-[11px] font-medium text-slate-500 transition hover:border-slate-300 hover:bg-white hover:text-slate-700 disabled:opacity-50"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-slate-100 px-3 pb-3 pt-2">
        <CreativeCard
          value={input}
          onChange={setInput}
          onSend={() => send(input)}
          onAction={handleAction}
          onTagClick={send}
          tags={[]}
          loading={loading}
          disabled={loading}
          contextLabel={activeNode ? `Context · ${activeNode.title}` : "Context · whole strategy"}
          placeholder={
            activeNode
              ? `Tell the copilot what to change about ${activeNode.title}…`
              : "Ask the copilot to refine any pillar, or describe the brand in one line…"
          }
        />
      </div>

      <div className="pointer-events-none -mt-px px-5 pb-3">
        <WavePath className="text-slate-300" amplitude={6} baseY={4} auto />
      </div>
    </WaveBorder>
  );
}

function Bubble({ role, children }: { role: Role; children: React.ReactNode }) {
  if (role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-slate-900 px-3.5 py-2.5 text-[13px] leading-snug text-white shadow-sm">
          {children}
        </div>
      </div>
    );
  }
  if (role === "system") {
    return (
      <div className="flex justify-center">
        <div className="max-w-[90%] whitespace-pre-wrap rounded-full border border-slate-200 bg-slate-50/80 px-3 py-1 text-[11.5px] text-slate-500">
          {children}
        </div>
      </div>
    );
  }
  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-bl-md border border-slate-100 bg-slate-50 px-3.5 py-2.5 text-[13px] leading-snug text-slate-800">
        {children}
      </div>
    </div>
  );
}

function TypingBubble() {
  return (
    <div className="flex justify-start">
      <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md border border-slate-100 bg-slate-50 px-3.5 py-2.5">
        <Dot delay={0} />
        <Dot delay={0.15} />
        <Dot delay={0.3} />
      </div>
    </div>
  );
}

function Dot({ delay }: { delay: number }) {
  return (
    <span
      className="block h-1.5 w-1.5 rounded-full bg-slate-400"
      style={{
        animation: "orbital-pulse 1.1s ease-in-out infinite",
        animationDelay: `${delay}s`,
      }}
    />
  );
}

function EditEventPill({ edit }: { edit: EditEvent }) {
  return (
    <div className="flex justify-center">
      <div className="flex max-w-[92%] items-start gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-[12px] text-slate-500 shadow-sm">
        <span
          className="mt-0.5 inline-flex h-5 w-5 flex-none items-center justify-center rounded-full text-white"
          style={{ background: "var(--gradient-brand)" }}
          aria-hidden
        >
          <Undo2 size={10} />
        </span>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            {edit.nodeTitle} · updated inline
          </p>
          <p className="mt-0.5 text-slate-600">
            {truncate(edit.before, 70)} →{" "}
            <span className="text-slate-900">{truncate(edit.after, 70)}</span>
          </p>
        </div>
      </div>
    </div>
  );
}

function truncate(s: string, n: number) {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}
