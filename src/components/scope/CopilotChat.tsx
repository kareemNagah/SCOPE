import * as React from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, Globe, Maximize2, Minimize2, Sparkles, Undo2 } from "lucide-react";
import { toast } from "sonner";

import { CreativeCard, type CreativeCardAction } from "@/components/ui/creative-card";
import { api, type ChatMode, type ChatSuggestion, type ProposedPalette } from "@/lib/api";
import { useCanvas, type EditEvent } from "./CanvasContext";

type Role = "user" | "assistant" | "system" | "choices" | "palettes";
type Lang = "en" | "ar";

type ChatMessage = {
  id: string;
  role: Role;
  text: string;
  at: number;
  edit?: EditEvent;
  suggestions?: ChatSuggestion[];
  choices?: string[];
  palettes?: ProposedPalette[];
};

// ── i18n ────────────────────────────────────────────────────────────────────

const T = {
  en: {
    title: "Brand Copilot",
    free: "Free",
    guided: "Guided",
    live: "Live",
    wholeStrategy: "Whole strategy",
    pickAMove: "Where do you want to go?",
    nextMoves: "Suggested moves",
    context: "Focus",
    seed1:
      "I can critique one pillar, map the tradeoffs, or recommend a sharper direction — you pick the path.",
    backendError: "The API didn't respond. Make sure the backend is running on :8000.",
    paletteSuggestions: "Color palette suggestions",
    paletteSelected: "Selected",
    paletteRecommended: "Recommended",
  },
  ar: {
    title: "المساعد الإبداعي",
    free: "حر",
    guided: "موجه",
    live: "مباشر",
    wholeStrategy: "الاستراتيجية كاملة",
    pickAMove: "إلى أين تريد الذهاب؟",
    nextMoves: "خطوات مقترحة",
    context: "التركيز",
    seed1: "يمكنني نقد أحد الركائز، ورسم المقايضات، أو اقتراح توجه أكثر حدة — أنت تختار المسار.",
    backendError: "لم يستجب الخادم. تأكد من أن الـ API يعمل على :8000.",
    paletteSuggestions: "اقتراحات لوحة الألوان",
    paletteSelected: "مختار",
    paletteRecommended: "موصى به",
  },
} as const;

// ── choice pools ─────────────────────────────────────────────────────────────

const CHOICES = {
  en: {
    base: [
      "What is the weakest pillar?",
      "Where is the positioning too generic?",
      "What tension should the brand own?",
      "Stress-test the promise",
    ],
    free: [
      "Give me a direct take",
      "Rewrite this with more edge",
      "Push back on my assumption",
      "Map the tradeoff",
    ],
    mission: [
      "What is the sharper mission?",
      "What should this exclude?",
      "Where is the real urgency?",
    ],
    vision: [
      "What future are we claiming?",
      "What makes this credible?",
      "How can we make it bolder?",
    ],
    persona: [
      "What job are they hiring us for?",
      "What trade-off do they reject?",
      "What daily friction matters most?",
    ],
    voice: [
      "What should the voice avoid?",
      "Give me 3 tone options",
      "Write a sharper sample line",
    ],
    values: ["Which value is weakest?", "What proves each value?", "What should we cut?"],
    promise: ["Stress-test the promise", "Make it more specific", "What proof does this need?"],
  },
  ar: {
    base: [
      "ما أضعف الركائز؟",
      "أين يكون التموضع عاماً جداً؟",
      "ما التوتر الذي يجب على العلامة امتلاكه؟",
      "اختبر الوعد",
    ],
    free: ["أعطني رأياً مباشراً", "أعد الصياغة بحدة أكثر", "اعترض على افتراضي", "ارسم المقايضة"],
    mission: ["ما الرسالة الأكثر حدة؟", "ما الذي يجب أن تستبعده؟", "أين الإلحاح الحقيقي؟"],
    vision: ["أي مستقبل ندّعيه؟", "ما يجعل هذا موثوقاً؟", "كيف نجعله أكثر جرأة؟"],
    persona: ["لماذا يوظفنا هذا الشخص؟", "ما المقايضة التي يرفضها؟", "أي احتكاك يومي يهم أكثر؟"],
    voice: ["ما الذي يجب أن يتجنبه الصوت؟", "أعطني 3 خيارات للنبرة", "اكتب سطراً عينة أكثر حدة"],
    values: ["أي قيمة هي الأضعف؟", "ما يثبت كل قيمة؟", "ما الذي يجب حذفه؟"],
    promise: ["اختبر الوعد", "اجعله أكثر تحديداً", "ما الدليل الذي يحتاجه؟"],
  },
} as const;

type ChoiceKey = keyof typeof CHOICES.en;

function getChoices(mode: ChatMode, nodeTitle: string | null | undefined, lang: Lang): string[] {
  const pool = CHOICES[lang];
  if (mode === "free") return [...pool.free];
  if (!nodeTitle) return [...pool.base];
  const lower = nodeTitle.toLowerCase();
  const nodeKeys: ChoiceKey[] = ["mission", "vision", "persona", "voice", "values", "promise"];
  for (const k of nodeKeys) {
    if (lower.includes(k)) return [...pool[k]];
  }
  return [...pool.base];
}

function makeSeed(mode: ChatMode, nodeTitle: string | null, lang: Lang): ChatMessage[] {
  const t = T[lang];
  const msgs: ChatMessage[] = [{ id: "seed-1", role: "assistant", text: t.seed1, at: 0 }];
  if (mode === "guided") {
    msgs.push({
      id: "seed-choices",
      role: "choices",
      text: t.pickAMove,
      at: 0,
      choices: getChoices(mode, nodeTitle, lang),
    });
  }
  return msgs;
}

function nodeType(id: string | null): string | null {
  if (!id) return null;
  return id.split("-")[0] || null;
}

// ── Main component ────────────────────────────────────────────────────────────

export function CopilotChat({ sessionId }: { sessionId: string }) {
  const { nodes, activeNodeId, recentEdits, applyDraftToNode } = useCanvas();
  const activeNode = React.useMemo(
    () => nodes.find((n) => n.id === activeNodeId) ?? null,
    [nodes, activeNodeId],
  );
  const focusType = React.useMemo(() => nodeType(activeNodeId), [activeNodeId]);

  const [lang, setLang] = React.useState<Lang>("en");
  const [mode, setMode] = React.useState<ChatMode>(() => {
    if (typeof window === "undefined") return "guided";
    return localStorage.getItem("scope_chat_mode") === "free" ? "free" : "guided";
  });
  const [messages, setMessages] = React.useState<ChatMessage[]>(() =>
    makeSeed("guided", null, "en"),
  );
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [expanded, setExpanded] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const t = T[lang];
  const dir = lang === "ar" ? "rtl" : "ltr";

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    localStorage.setItem("scope_chat_mode", mode);
  }, [mode]);

  // Load history on mount
  React.useEffect(() => {
    let active = true;
    api
      .getChatHistory(sessionId)
      .then((history) => {
        if (!active) return;
        if (history && history.length > 0) {
          setMessages(
            history.map((m: any) => ({ id: m.id, role: m.role as Role, text: m.text, at: m.at })),
          );
        } else {
          setMessages(makeSeed(mode, activeNode?.title ?? null, lang));
        }
      })
      .catch(() => {
        if (active) setMessages(makeSeed(mode, activeNode?.title ?? null, lang));
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // Refresh seed when mode / node / lang changes (only if no real conversation yet)
  React.useEffect(() => {
    setMessages((prev) => {
      const hasReal = prev.some(
        (m) => m.role === "user" || (m.role === "assistant" && !m.id.startsWith("seed-")),
      );
      if (hasReal) return prev;
      return makeSeed(mode, activeNode?.title ?? null, lang);
    });
  }, [activeNode?.title, mode, lang]);

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const seenEditIds = React.useRef<Set<string>>(new Set());
  React.useEffect(() => {
    const fresh = recentEdits.filter((e) => !seenEditIds.current.has(e.id));
    if (!fresh.length) return;
    fresh.forEach((e) => seenEditIds.current.add(e.id));
    setMessages((prev) => [
      ...prev,
      ...fresh
        .filter((e) => e.source === "inline")
        .map<ChatMessage>((e) => ({
          id: `edit-${e.id}`,
          role: "system",
          text: "",
          at: e.at,
          edit: e,
        })),
    ]);
  }, [recentEdits]);

  const send = React.useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;

      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        text: trimmed,
        at: Date.now(),
      };
      // Remove any pending choice cards and add the user message
      setMessages((m) => [...m.filter((x) => x.role !== "choices"), userMsg]);
      setInput("");
      setLoading(true);

      try {
        const history = [...messages.filter((m) => m.role !== "choices"), userMsg]
          .filter((m) => !m.id.startsWith("seed-") && (m.role === "user" || m.role === "assistant"))
          .map((m) => ({ role: m.role as "user" | "assistant", content: m.text }));

        const res = await api.chat(history, sessionId, {
          mode,
          focus_node_type: focusType,
          focus_node_title: activeNode?.title ?? null,
          focus_node_value: activeNode?.value ?? null,
        });

        const reply: ChatMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          text: res.response || "Done.",
          at: Date.now(),
          suggestions: res.suggestions ?? [],
        };

        const toAppend: ChatMessage[] = [reply];

        if (res.proposed_palettes && res.proposed_palettes.length > 0) {
          toAppend.push({
            id: `palettes-${reply.id}`,
            role: "palettes",
            text: t.paletteSuggestions,
            at: Date.now(),
            palettes: res.proposed_palettes,
          });
        }

        if (mode === "guided") {
          toAppend.push({
            id: `choices-${reply.id}`,
            role: "choices",
            text: t.nextMoves,
            at: Date.now(),
            choices: getChoices(mode, activeNode?.title, lang),
          });
        }
        setMessages((m) => [...m, ...toAppend]);

        if (activeNode && res.nodes?.length) {
          const matched = res.nodes.find(
            (n) => n.title.toLowerCase() === activeNode.title.toLowerCase(),
          );
          if (matched && matched.content !== activeNode.value) {
            applyDraftToNode(activeNode.id, matched.content, "chat");
          }
        }
      } catch {
        toast.error("Backend unavailable on :8000.");
        setMessages((m) => [
          ...m,
          { id: crypto.randomUUID(), role: "assistant", text: t.backendError, at: Date.now() },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [activeNode, applyDraftToNode, focusType, lang, loading, messages, mode, sessionId, t],
  );

  const handleAction = React.useCallback(
    (action: CreativeCardAction) => {
      if (action === "image") {
        toast.message("Image input", { description: "Attach reference images in the brief flow." });
        return;
      }
      if (action === "analyze") {
        send(
          `Stress-test the ${activeNode?.title ?? "whole strategy"} against the brief and show the biggest weakness first.`,
        );
      }
    },
    [activeNode, send],
  );

  const inputPlaceholder =
    lang === "ar"
      ? "اكتب أو اختر من الخيارات أعلاه..."
      : mode === "guided"
        ? "Type a response or pick from the choices above..."
        : "Ask anything about the strategy...";

  const panelContent = (
    <div
      dir={dir}
      className={`relative flex min-h-0 flex-col overflow-hidden rounded-3xl border border-slate-800/60 bg-slate-950/95 shadow-[0_20px_60px_-20px_color-mix(in_oklab,var(--scope-purple)_35%,transparent)] ${expanded ? "h-[88vh] w-[min(780px,96vw)]" : "h-full"}`}
    >
      {/* Ambient atmosphere */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-40"
        style={{
          background:
            "radial-gradient(120% 100% at 0% 0%, color-mix(in oklab, var(--scope-purple) 22%, transparent), transparent 70%)",
        }}
      />

      {/* Header */}
      <header className="relative z-10 flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/50 bg-slate-950/40 px-4 py-3 backdrop-blur-sm">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-8 w-8 flex-none items-center justify-center">
            <span
              className="absolute inset-0 rounded-full opacity-60 blur-[6px]"
              style={{ background: "var(--gradient-brand)" }}
              aria-hidden
            />
            <span
              className="relative flex h-7 w-7 items-center justify-center rounded-full ring-1 ring-white/20"
              style={{ background: "var(--gradient-brand)" }}
            >
              <Sparkles size={12} className="text-white" />
            </span>
          </span>
          <div>
            <p className="font-display text-[16px] leading-none tracking-tight text-slate-50">
              {t.title}
            </p>
            <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-slate-500">
              {mode === "guided" ? t.guided : t.free}
              {" · "}
              <span className="text-slate-400">{activeNode?.title ?? t.wholeStrategy}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <div className="inline-flex rounded-full border border-slate-800 bg-slate-900/60 p-0.5">
            <button
              type="button"
              onClick={() => setMode("free")}
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium transition ${mode === "free" ? "bg-white text-slate-950" : "text-slate-400 hover:text-slate-200"}`}
            >
              {t.free}
            </button>
            <button
              type="button"
              onClick={() => setMode("guided")}
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium transition ${mode === "guided" ? "bg-white text-slate-950" : "text-slate-400 hover:text-slate-200"}`}
            >
              {t.guided}
            </button>
          </div>

          <button
            type="button"
            onClick={() => setLang((l) => (l === "en" ? "ar" : "en"))}
            title="Switch language / تبديل اللغة"
            className="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900/30 px-2 py-1 text-[10px] font-medium text-slate-400 transition hover:border-slate-700 hover:text-slate-200"
          >
            <Globe size={11} />
            {lang === "en" ? "ع" : "EN"}
          </button>

          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-400">
            <span className="h-1 w-1 rounded-full bg-emerald-400 shadow-[0_0_4px_rgba(52,211,153,0.5)]" />
            {t.live}
          </span>

          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            title={expanded ? "Collapse" : "Expand copilot"}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-800 bg-slate-900/30 text-slate-400 transition hover:border-slate-700 hover:text-slate-200"
          >
            {expanded ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
          </button>
        </div>
      </header>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-4"
        style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.06) transparent" }}
        aria-live="polite"
      >
        <div className="flex-1" />
        <AnimatePresence initial={false}>
          {messages.map((m) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
            >
              {m.role === "system" && m.edit ? (
                <EditEventPill edit={m.edit} />
              ) : m.role === "palettes" && m.palettes ? (
                <PaletteSuggestionCards
                  label={m.text}
                  palettes={m.palettes}
                  lang={lang}
                  dir={dir}
                  loading={loading}
                />
              ) : m.role === "choices" ? (
                <ChoiceCards
                  label={m.text}
                  choices={m.choices ?? []}
                  onPick={send}
                  loading={loading}
                  dir={dir}
                />
              ) : m.role === "assistant" ? (
                <AssistantBubble
                  text={m.text}
                  suggestions={mode === "guided" ? (m.suggestions ?? []) : []}
                  loading={loading}
                  onSuggestionClick={send}
                  dir={dir}
                />
              ) : (
                <UserBubble dir={dir}>{m.text}</UserBubble>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        {loading && <TypingBubble />}
      </div>

      {/* Input */}
      <div className="border-t border-slate-800/40 bg-slate-950/30 px-4 pb-4 pt-3">
        <CreativeCard
          value={input}
          onChange={setInput}
          onSend={() => send(input)}
          onAction={handleAction}
          onTagClick={send}
          tags={[]}
          loading={loading}
          disabled={loading}
          contextLabel={
            activeNode ? `${t.context} · ${activeNode.title}` : `${t.context} · ${t.wholeStrategy}`
          }
          placeholder={inputPlaceholder}
        />
      </div>
    </div>
  );

  if (expanded && mounted) {
    return (
      <>
        {/* Collapsed placeholder in grid slot */}
        <div className="flex h-full flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-slate-800/40 bg-slate-950/30">
          <span
            className="flex h-9 w-9 items-center justify-center rounded-full"
            style={{ background: "var(--gradient-brand)" }}
          >
            <Sparkles size={14} className="text-white" />
          </span>
          <p className="text-[11px] font-medium text-slate-500">
            {lang === "ar" ? "المساعد مفتوح" : "Copilot expanded"}
          </p>
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="flex items-center gap-1.5 rounded-full border border-slate-800 px-3 py-1.5 text-[11px] text-slate-400 transition hover:border-slate-700 hover:text-slate-200"
          >
            <Minimize2 size={11} />
            {lang === "ar" ? "تصغير" : "Collapse"}
          </button>
        </div>
        {createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
              onClick={() => setExpanded(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 280, damping: 28 }}
              className="relative z-10"
            >
              {panelContent}
            </motion.div>
          </div>,
          document.body,
        )}
      </>
    );
  }

  return panelContent;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function UserBubble({ children, dir }: { children: React.ReactNode; dir: string }) {
  return (
    <div className={`flex ${dir === "rtl" ? "justify-start" : "justify-end"}`}>
      <div className="max-w-[80%] whitespace-pre-wrap rounded-2xl border border-scope-purple/20 bg-gradient-to-br from-scope-purple to-scope-violet px-3.5 py-2.5 text-[13px] leading-relaxed text-white shadow-[0_4px_16px_-6px_rgba(139,92,246,0.4)]">
        {children}
      </div>
    </div>
  );
}

function AssistantBubble({
  text,
  suggestions,
  loading,
  onSuggestionClick,
  dir,
}: {
  text: string;
  suggestions: ChatSuggestion[];
  loading: boolean;
  onSuggestionClick: (p: string) => void;
  dir: string;
}) {
  const isRtl = dir === "rtl";
  return (
    <div className={`flex ${isRtl ? "justify-end" : "justify-start"}`}>
      <div
        className={`relative max-w-[92%] ${isRtl ? "rounded-tr-sm" : "rounded-tl-sm"} rounded-2xl border border-slate-800/60 bg-slate-900/50 px-4 py-3 text-[13px] leading-relaxed text-slate-200 shadow-sm`}
      >
        <div
          className={`absolute ${isRtl ? "right-0" : "left-0"} bottom-3 top-3 w-[2px] rounded-full bg-gradient-to-b from-scope-pink to-scope-orange`}
          aria-hidden
        />
        <div className={`whitespace-pre-wrap ${isRtl ? "pr-3" : "pl-3"}`}>{text}</div>
        {suggestions.length > 0 && (
          <div
            className={`mt-3 space-y-1.5 border-t border-slate-800/60 pt-3 ${isRtl ? "pr-3" : "pl-3"}`}
          >
            {suggestions.map((s) => (
              <button
                key={`${s.label}-${s.prompt}`}
                type="button"
                disabled={loading}
                onClick={() => onSuggestionClick(s.prompt)}
                className="group flex w-full items-start gap-2.5 rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-left transition hover:border-slate-700 hover:bg-slate-950 disabled:opacity-40"
              >
                <ChevronRight
                  size={11}
                  className="mt-0.5 flex-none text-slate-600 transition group-hover:text-slate-400"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-semibold text-slate-100">{s.label}</p>
                  <p className="mt-0.5 text-[11px] text-slate-400">{s.rationale}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ChoiceCards({
  label,
  choices,
  onPick,
  loading,
  dir,
}: {
  label: string;
  choices: string[];
  onPick: (t: string) => void;
  loading: boolean;
  dir: string;
}) {
  const isRtl = dir === "rtl";
  return (
    <div className="space-y-2 py-1">
      {label && (
        <p
          className={`flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 ${isRtl ? "flex-row-reverse justify-end" : ""}`}
        >
          <span
            className="h-px w-6 rounded-full"
            style={{ background: "var(--gradient-brand)" }}
            aria-hidden
          />
          {label}
        </p>
      )}
      <div className="flex flex-col gap-[5px]">
        {choices.map((choice, i) => (
          <motion.button
            key={choice}
            type="button"
            disabled={loading}
            onClick={() => onPick(choice)}
            initial={{ opacity: 0, x: isRtl ? -10 : 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.055, type: "spring", stiffness: 280, damping: 28 }}
            className={`group relative flex items-center gap-3 overflow-hidden rounded-xl border border-slate-800/50 bg-slate-900/20 py-2.5 text-${isRtl ? "right" : "left"} transition-all hover:border-slate-700/60 hover:bg-slate-900/55 active:scale-[0.99] disabled:opacity-40 ${isRtl ? "flex-row-reverse pr-3 pl-3.5" : "pl-3 pr-3.5"}`}
          >
            {/* Accent rail — always visible */}
            <span
              className={`pointer-events-none absolute inset-y-0 ${isRtl ? "right-0" : "left-0"} w-[1.5px] rounded-full`}
              style={{ background: "var(--gradient-cta)", opacity: 0.4 }}
              aria-hidden
            />
            {/* Hover fill — brand gradient wash */}
            <span
              className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              style={{
                background: isRtl
                  ? "linear-gradient(270deg, color-mix(in oklab, var(--scope-purple) 9%, transparent), transparent 75%)"
                  : "linear-gradient(90deg, color-mix(in oklab, var(--scope-purple) 9%, transparent), transparent 75%)",
              }}
              aria-hidden
            />
            {/* Monospace number */}
            <span className="relative font-mono text-[9px] font-semibold tabular-nums text-slate-600 transition-colors group-hover:text-slate-500">
              {String(i + 1).padStart(2, "0")}
            </span>
            {/* Choice text */}
            <span className="relative flex-1 text-[12.5px] leading-snug text-slate-300 transition-colors group-hover:text-white">
              {choice}
            </span>
            {/* Trailing arrow */}
            <ChevronRight
              size={11}
              className={`relative flex-none text-slate-700 transition-all duration-200 group-hover:text-scope-violet ${isRtl ? "rotate-180 group-hover:-translate-x-0.5" : "group-hover:translate-x-0.5"}`}
            />
          </motion.button>
        ))}
      </div>
    </div>
  );
}

function TypingBubble() {
  return (
    <div className="flex justify-start">
      <div className="relative flex items-center gap-1.5 rounded-2xl rounded-tl-sm border border-slate-800/60 bg-slate-900/50 px-4 py-3">
        <div className="absolute bottom-3 left-0 top-3 w-[2px] rounded-full bg-gradient-to-b from-scope-pink to-scope-orange" />
        <span className="flex gap-1.5 pl-3">
          <Dot delay={0} />
          <Dot delay={0.14} />
          <Dot delay={0.28} />
        </span>
      </div>
    </div>
  );
}

function Dot({ delay }: { delay: number }) {
  return (
    <span
      className="block h-1.5 w-1.5 rounded-full bg-slate-500"
      style={{ animation: "orbital-pulse 1.1s ease-in-out infinite", animationDelay: `${delay}s` }}
    />
  );
}

function EditEventPill({ edit }: { edit: EditEvent }) {
  return (
    <div className="flex justify-center">
      <div className="flex max-w-[90%] items-center gap-2 rounded-xl border border-dashed border-slate-800 bg-slate-900/30 px-3 py-2 text-[11px] text-slate-400">
        <span
          className="inline-flex h-4 w-4 flex-none items-center justify-center rounded-full text-white"
          style={{ background: "var(--gradient-brand)" }}
        >
          <Undo2 size={9} />
        </span>
        <span>
          <strong className="text-slate-300">{edit.nodeTitle}</strong>
          {" — "}
          {trunc(edit.before, 35)} → <span className="text-white">{trunc(edit.after, 35)}</span>
        </span>
      </div>
    </div>
  );
}

function trunc(text: string, max: number) {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function isLightHex(hex: string): boolean {
  const h = hex.replace("#", "");
  if (h.length < 6) return false;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 160;
}

function PaletteSuggestionCards({
  label,
  palettes,
  lang,
  dir,
  loading,
}: {
  label: string;
  palettes: ProposedPalette[];
  lang: Lang;
  dir: string;
  loading: boolean;
}) {
  const { selectedPalette, setSelectedPalette } = useCanvas();
  const t = T[lang];
  const isRtl = dir === "rtl";

  return (
    <div className="space-y-3 py-1">
      {label && (
        <p
          className={`flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 ${isRtl ? "flex-row-reverse justify-end" : ""}`}
        >
          <span
            className="h-px w-6 rounded-full"
            style={{ background: "var(--gradient-brand)" }}
            aria-hidden
          />
          {label}
        </p>
      )}
      <div className={`grid gap-2 ${palettes.length <= 2 ? "grid-cols-2" : "grid-cols-1 sm:grid-cols-3"}`}>
        {palettes.map((palette) => {
          const isSelected = selectedPalette?.name === palette.name;
          return (
            <motion.button
              key={palette.name}
              type="button"
              disabled={loading}
              onClick={() =>
                setSelectedPalette(
                  isSelected
                    ? null
                    : {
                        name: palette.name,
                        colors: palette.colors,
                        mood: palette.mood,
                        usage_note: palette.usage_note,
                      },
                )
              }
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 280, damping: 28 }}
              className={`group relative overflow-hidden rounded-xl border text-left transition-all duration-200 disabled:opacity-40 ${
                isSelected
                  ? "border-scope-purple/60 bg-slate-900/80 shadow-[0_0_20px_-4px_var(--scope-purple)]"
                  : "border-slate-800/50 bg-slate-900/30 hover:border-slate-700/60 hover:bg-slate-900/55"
              }`}
            >
              {/* 2×2 swatch grid */}
              <div className="grid grid-cols-2">
                {palette.colors.slice(0, 4).map((c, i) => (
                  <span
                    key={`${c}-${i}`}
                    className="h-8 transition-all duration-300 group-hover:scale-y-[1.02]"
                    style={{ background: c }}
                  />
                ))}
              </div>
              {/* Labels */}
              <div className="p-2">
                <div className="flex items-start justify-between gap-1">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                      {palette.mood}
                    </p>
                    <p className="mt-0.5 text-[12px] font-medium text-slate-200">{palette.name}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {palette.recommended && (
                      <span className="rounded-full bg-scope-purple/20 px-1.5 py-0.5 text-[9px] font-semibold text-scope-violet">
                        {t.paletteRecommended}
                      </span>
                    )}
                    {isSelected && (
                      <span className="rounded-full bg-scope-purple/30 px-1.5 py-0.5 text-[9px] font-semibold text-white">
                        {t.paletteSelected}
                      </span>
                    )}
                  </div>
                </div>
                {/* Hex chips */}
                <div className="mt-1.5 flex flex-wrap gap-0.5">
                  {palette.colors.slice(0, 4).map((c, i) => (
                    <span
                      key={`chip-${c}-${i}`}
                      className="rounded px-1 py-0.5 font-mono text-[8px]"
                      style={{
                        background: c,
                        color: isLightHex(c) ? "#0F172A" : "#F8FAFC",
                      }}
                    >
                      {c.toUpperCase()}
                    </span>
                  ))}
                </div>
              </div>
              {/* Selected glow rail */}
              {isSelected && (
                <span
                  className={`pointer-events-none absolute inset-y-0 ${isRtl ? "right-0" : "left-0"} w-[2px] rounded-full`}
                  style={{ background: "var(--gradient-brand)" }}
                  aria-hidden
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
