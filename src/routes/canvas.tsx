import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  Pencil,
  X,
  Sparkles,
  RotateCcw,
  Target,
  Eye,
  User,
  MessageSquare,
  Shield,
  Clock,
  Calendar,
} from "lucide-react";
import { createFileRoute, useSearch, useNavigate } from "@tanstack/react-router";

import RadialOrbitalTimeline, { type TimelineItem } from "@/components/ui/radial-orbital-timeline";
import { api } from "@/lib/api";
import { StudioShell } from "@/components/scope/StudioShell";
import { CopilotChat } from "@/components/scope/CopilotChat";
import { backendNodesToGraph, type Node3D } from "@/components/scope/BrandGraph3D";
import { CanvasProvider, useCanvas } from "@/components/scope/CanvasContext";
import { BrandIdentityGate, type GatePayload } from "@/components/scope/BrandIdentityGate";
import { WaveBorder } from "@/components/ui/wave-border";

export const Route = createFileRoute("/canvas")({
  head: () => ({
    meta: [
      { title: "SCOPE - Strategy Canvas" },
      {
        name: "description",
        content: "Edit your brand pillars in an interactive orbital timeline with your AI copilot.",
      },
    ],
  }),
  component: CanvasPage,
});

function CanvasPage() {
  const search = useSearch({ strict: false }) as { session?: string };
  const navigate = useNavigate();
  const [sessionId] = React.useState(() => search.session || crypto.randomUUID());
  const [nodes, setNodes] = React.useState<Node3D[]>([]);
  const [status, setStatus] = React.useState({ ready: false, approved: false, confirmed: false });
  const [showGate, setShowGate] = React.useState(false);

  React.useEffect(() => {
    if (!search.session) {
      setStatus({ ready: true, approved: false, confirmed: false });
      return;
    }
    api
      .getBrief(search.session)
      .then((brief) => {
        setStatus({ ready: true, approved: brief.approved, confirmed: brief.strategy_confirmed });
      })
      .catch(() => {
        setStatus({ ready: true, approved: false, confirmed: false });
      });
  }, [search.session]);

  React.useEffect(() => {
    if (!search.session || !status.approved) return;
    api
      .getNodes(search.session)
      .then((backendNodes) => {
        if (backendNodes && backendNodes.length > 0) {
          setNodes(backendNodesToGraph(backendNodes));
        }
      })
      .catch((err) => console.error("Failed to load session nodes:", err));
  }, [search.session, status.approved]);

  return (
    <CanvasProvider nodes={nodes} setNodes={setNodes}>
      <StudioShell
        stepId="canvas"
        eyebrow="Step 2 - Brand Architect"
        title="Your strategy timeline"
        intro="Click a node to focus it. Edit inline, or ask the copilot to push back on the framing."
      >
        {status.ready && status.approved ? (
          <CanvasBody
            sessionId={sessionId}
            strategyConfirmed={status.confirmed}
            onConfirmStrategy={async () => {
              await api.confirmStrategy(sessionId);
              setStatus((s) => ({ ...s, confirmed: true }));
              setShowGate(true);
            }}
          />
        ) : (
          <LockedStrategyState />
        )}
      </StudioShell>

      <AnimatePresence>
        {showGate && (
          <BrandIdentityGate
            sessionId={sessionId}
            onConfirm={async (payload: GatePayload) => {
              await api.generateLogo({
                session_id: sessionId,
                wordmark: payload.brandName,
                concept: payload.concept,
                palette_name: payload.palette.name,
                font_name: payload.fontName,
                brand_context: `Palette mood: ${payload.palette.mood}. Colors: ${payload.palette.colors.join(", ")}.`,
              });
              navigate({
                to: "/logo",
                search: {
                  session: sessionId,
                  paletteName: payload.palette.name,
                  paletteColors: payload.palette.colors.join(","),
                  fontName: payload.fontName,
                  conceptName: payload.concept,
                  wordmark: payload.brandName,
                },
              });
            }}
            onBack={() => setShowGate(false)}
          />
        )}
      </AnimatePresence>
    </CanvasProvider>
  );
}

function CanvasBody({
  sessionId,
  strategyConfirmed,
  onConfirmStrategy,
}: {
  sessionId: string;
  strategyConfirmed: boolean;
  onConfirmStrategy: () => Promise<void>;
}) {
  const {
    nodes,
    activeNodeId,
    editingNodeId,
    setNodes,
    setActiveNodeId,
    setEditingNodeId,
    applyDraftToNode,
  } = useCanvas();
  const [draft, setDraft] = React.useState("");
  const [confirmingStrategy, setConfirmingStrategy] = React.useState(false);

  const timelineData: TimelineItem[] = React.useMemo(() => {
    return nodes.map((node, i) => {
      const status: TimelineItem["status"] =
        i < 2 ? "completed" : i === 2 ? "in-progress" : "pending";
      let icon: TimelineItem["icon"] = Calendar;
      const lowerTitle = node.title.toLowerCase();
      if (lowerTitle.includes("mission") || lowerTitle.includes("purpose")) icon = Target;
      else if (lowerTitle.includes("vision")) icon = Eye;
      else if (lowerTitle.includes("persona") || lowerTitle.includes("audience")) icon = User;
      else if (
        lowerTitle.includes("voice") ||
        lowerTitle.includes("tone") ||
        lowerTitle.includes("message")
      )
        icon = MessageSquare;
      else if (lowerTitle.includes("value")) icon = Shield;
      else if (lowerTitle.includes("promise") || lowerTitle.includes("hook")) icon = Clock;

      const nextId = ((i + 1) % nodes.length) + 1;
      return {
        id: i + 1,
        originalId: node.id,
        title: node.title,
        date: `Pillar ${i + 1}`,
        content: node.value,
        category: node.title,
        icon,
        relatedIds: [nextId],
        status,
        energy: 100 - i * 15,
      };
    });
  }, [nodes]);

  const startEdit = (nodeId: string) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;
    setDraft(node.value);
    setEditingNodeId(nodeId);
  };

  const saveEdit = (nodeId: string) => {
    applyDraftToNode(nodeId, draft, "inline");
    setEditingNodeId(null);
    setDraft("");
  };

  const cancelEdit = () => {
    setEditingNodeId(null);
    setDraft("");
  };

  return (
    <>
      <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
        <div className="h-[600px]">
          <CopilotChat sessionId={sessionId} />
        </div>

        <div className="relative h-[600px] overflow-hidden rounded-3xl border border-slate-800/60 bg-slate-950/95 shadow-[0_20px_60px_-20px_color-mix(in_oklab,var(--scope-purple)_35%,transparent)]">
          {/* Ambient core glow behind the orbit */}
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
            style={{
              background:
                "radial-gradient(circle, color-mix(in oklab, var(--scope-violet) 28%, transparent), transparent 65%)",
            }}
          />
          {timelineData.length > 0 ? (
            <RadialOrbitalTimeline
              timelineData={timelineData}
              selectedNodeId={activeNodeId}
              onNodeSelect={(id) => {
                setActiveNodeId(id);
                setEditingNodeId(null);
              }}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-center text-slate-400">
              <div>
                <p className="text-sm font-medium text-slate-200">No strategy nodes yet</p>
                <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-500">
                  Approve the brief to initialize the canvas
                </p>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              setNodes([]);
              setActiveNodeId(null);
              setEditingNodeId(null);
            }}
            className="absolute bottom-4 right-4 flex cursor-pointer items-center gap-1.5 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs text-white/70 backdrop-blur-sm transition-colors duration-200 hover:bg-white/15 hover:text-white"
          >
            <RotateCcw size={12} /> Reset
          </button>

          <div className="pointer-events-none absolute bottom-4 left-4 flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-slate-400 backdrop-blur-sm">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{
                background: "var(--scope-violet)",
                animation: "orbital-pulse 1.8s ease-in-out infinite",
              }}
            />
            Click any node to focus
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence initial={false}>
          {nodes.map((node) => {
            const isEditing = editingNodeId === node.id;
            const isSelected = activeNodeId === node.id;
            const tone = toneForColor(node.color);
            return (
              <motion.div
                key={node.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ type: "spring", stiffness: 220, damping: 28 }}
                onClick={() => {
                  setActiveNodeId(node.id);
                  setEditingNodeId(null);
                }}
                className="group relative cursor-pointer"
              >
                <WaveBorder
                  tone={tone}
                  static={!isSelected}
                  opacity={isSelected ? 0.75 : 0.32}
                  inset={isSelected ? -1 : 0}
                  className={`rounded-2xl bg-white transition-shadow ${
                    isSelected
                      ? "shadow-[0_8px_30px_-8px_color-mix(in_oklab,var(--scope-purple)_25%,transparent)]"
                      : "shadow-sm hover:shadow-md"
                  }`}
                >
                  <div className="relative z-[2] rounded-2xl p-4">
                    <div
                      className="absolute left-4 right-4 top-0 h-0.5 rounded-b-full"
                      style={{ background: node.color }}
                    />

                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className="flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-bold text-white"
                          style={{ background: node.color }}
                        >
                          {node.title.charAt(0)}
                        </span>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                          {node.title}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isEditing) cancelEdit();
                          else startEdit(node.id);
                        }}
                        className={`rounded-lg p-1.5 transition ${
                          isEditing
                            ? "bg-slate-100 text-slate-700"
                            : "text-slate-400 opacity-0 group-hover:opacity-100 hover:bg-slate-50 hover:text-slate-600"
                        }`}
                        title={isEditing ? "Cancel" : "Edit"}
                      >
                        {isEditing ? <X size={12} /> : <Pencil size={12} />}
                      </button>
                    </div>

                    {isEditing ? (
                      <div className="mt-2.5">
                        <textarea
                          autoFocus
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                          rows={2}
                          className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 p-2 text-[12.5px] text-slate-800 outline-none transition focus:border-slate-400 focus:bg-white"
                        />
                        <div className="mt-1.5 flex justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              cancelEdit();
                            }}
                            className="rounded-md px-2 py-1 text-[11px] text-slate-500 hover:bg-slate-50"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              saveEdit(node.id);
                            }}
                            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-white"
                            style={{ background: "var(--gradient-cta)" }}
                          >
                            <Check size={10} /> Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="mt-2.5 line-clamp-2 text-[13px] leading-snug text-slate-700">
                        {node.value}
                      </p>
                    )}
                  </div>
                </WaveBorder>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <div className="mt-6 flex flex-col items-center gap-3">
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Sparkles size={13} />
          Edits flag downstream Identity, Marketing &amp; Logo as &ldquo;Needs Update.&rdquo;
        </p>
        {!strategyConfirmed && nodes.length > 0 && (
          <motion.button
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            type="button"
            disabled={confirmingStrategy}
            onClick={async () => {
              setConfirmingStrategy(true);
              try {
                await onConfirmStrategy();
              } finally {
                setConfirmingStrategy(false);
              }
            }}
            className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white shadow-[0_8px_24px_-6px_rgba(255,90,120,0.45)] transition hover:brightness-110 disabled:opacity-60"
            style={{ background: "var(--gradient-cta)" }}
          >
            {confirmingStrategy ? (
              <>
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Confirming…
              </>
            ) : (
              <>
                Confirm Strategy &amp; Build Identity
                <Sparkles size={14} />
              </>
            )}
          </motion.button>
        )}
        {strategyConfirmed && (
          <p className="text-[11px] font-medium text-emerald-400">
            ✓ Strategy confirmed — identity gate ready
          </p>
        )}
      </div>
    </>
  );
}

function toneForColor(hex: string): "violet" | "pink" | "blue" | "orange" | "mute" {
  const h = hex.toLowerCase();
  if (h.includes("ed64a6") || h.includes("e")) return "pink";
  if (h.includes("ed8936") || h.includes("orange")) return "orange";
  if (h.includes("4299e1") || h.includes("2") || h.includes("4")) return "blue";
  if (h.includes("7c3aed") || h.includes("6b46c1") || h.includes("9f7aea")) return "violet";
  return "mute";
}

function LockedStrategyState() {
  return (
    <div className="rounded-3xl border border-slate-200/70 bg-white/70 p-10 text-center shadow-[0_24px_60px_-24px_rgba(15,23,42,0.25)] backdrop-blur-md">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
        Strategy locked
      </p>
      <h2 className="mt-3 font-display text-4xl text-slate-950">Start with the brief</h2>
      <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-slate-600">
        The strategy canvas opens only after the brief is generated and approved.
      </p>
    </div>
  );
}
