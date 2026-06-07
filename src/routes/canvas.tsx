import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState, useEffect, useCallback } from "react";
import { StudioShell } from "@/components/scope/StudioShell";
import { Sparkles, Pencil, RotateCcw, Check, X } from "lucide-react";

export const Route = createFileRoute("/canvas")({
  head: () => ({
    meta: [
      { title: "SCOPE — Strategy Canvas" },
      { name: "description", content: "Edit your brand's 6 strategic pillars on the SCOPE node canvas." },
    ],
  }),
  component: CanvasPage,
});

type NodeT = {
  id: string;
  title: string;
  value: string;
  x: number; // percent
  y: number; // percent
};

const initialNodes: NodeT[] = [
  { id: "mission",  title: "Mission",  value: "Equip corporate athletes with regenerative gear.",          x: 50, y: 14 },
  { id: "vision",   title: "Vision",   value: "Make sustainability the default in performance wear.",      x: 83, y: 30 },
  { id: "persona",  title: "Persona",  value: "Urban women 25–35, corporate athletes.",                    x: 83, y: 70 },
  { id: "voice",    title: "Voice",    value: "Calm, confident, technical.",                               x: 50, y: 86 },
  { id: "values",   title: "Values",   value: "Honesty · Craft · Longevity.",                              x: 17, y: 70 },
  { id: "promise",  title: "Promise",  value: "Built to last. Designed to disappear into your day.",       x: 17, y: 30 },
];

function CanvasPage() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [nodes, setNodes] = useState<NodeT[]>(initialNodes);
  const [dragId, setDragId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const onPointerDown = (id: string) => (e: React.PointerEvent) => {
    if (editingId) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    setDragId(id);
  };

  const onPointerMove = useCallback((e: PointerEvent) => {
    if (!dragId || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setNodes((prev) =>
      prev.map((n) =>
        n.id === dragId
          ? { ...n, x: Math.max(8, Math.min(92, x)), y: Math.max(8, Math.min(92, y)) }
          : n,
      ),
    );
  }, [dragId]);

  const stopDrag = useCallback(() => setDragId(null), []);

  useEffect(() => {
    if (!dragId) return;
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", stopDrag);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", stopDrag);
    };
  }, [dragId, onPointerMove, stopDrag]);

  const startEdit = (n: NodeT) => {
    setEditingId(n.id);
    setDraft(n.value);
  };
  const saveEdit = () => {
    if (!editingId) return;
    setNodes((prev) => prev.map((n) => (n.id === editingId ? { ...n, value: draft } : n)));
    setEditingId(null);
  };

  return (
    <StudioShell
      stepId="canvas"
      eyebrow="Step 2 · Brand Architect"
      title="Your strategy, mapped"
      intro="Drag any node to rearrange. Click the pencil to refine — downstream artefacts flag what needs to update."
    >
      <div
        ref={canvasRef}
        className="glass relative mx-auto h-[600px] touch-none select-none overflow-hidden rounded-3xl"
      >
        {/* connecting lines (live) */}
        <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
          <defs>
            <linearGradient id="line-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="var(--scope-purple)" stopOpacity=".75" />
              <stop offset="1" stopColor="var(--scope-blue)" stopOpacity=".75" />
            </linearGradient>
          </defs>
          {nodes.map((n) => (
            <line
              key={n.id}
              x1="50%" y1="50%"
              x2={`${n.x}%`} y2={`${n.y}%`}
              stroke="url(#line-grad)"
              strokeWidth={dragId === n.id ? 2 : 1.5}
              strokeDasharray="4 6"
              style={{ animation: "pulse-soft 3s ease-in-out infinite" }}
            />
          ))}
        </svg>

        {/* center hub */}
        <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div
            className="flex h-32 w-32 items-center justify-center rounded-full text-white shadow-[var(--shadow-prism)]"
            style={{ background: "var(--gradient-brand)" }}
          >
            <div className="text-center">
              <p className="text-[10px] uppercase tracking-[0.2em] opacity-80">Core</p>
              <p className="font-display text-lg leading-tight">Brand DNA</p>
            </div>
          </div>
        </div>

        {/* nodes */}
        {nodes.map((n) => {
          const isDragging = dragId === n.id;
          const isEditing = editingId === n.id;
          return (
            <div
              key={n.id}
              className={`glass absolute w-[220px] -translate-x-1/2 -translate-y-1/2 rounded-2xl p-3 transition-shadow ${
                isDragging ? "cursor-grabbing shadow-[var(--shadow-prism)]" : "cursor-grab"
              }`}
              style={{
                left: `${n.x}%`,
                top: `${n.y}%`,
                zIndex: isDragging || isEditing ? 20 : 10,
              }}
              onPointerDown={onPointerDown(n.id)}
            >
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  {n.title}
                </span>
                {!isEditing && (
                  <button
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => startEdit(n)}
                    className="rounded p-1 text-muted-foreground hover:bg-white/70 hover:text-foreground"
                    aria-label={`Edit ${n.title}`}
                  >
                    <Pencil size={11} />
                  </button>
                )}
              </div>

              {isEditing ? (
                <div onPointerDown={(e) => e.stopPropagation()}>
                  <textarea
                    autoFocus
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    rows={3}
                    className="w-full resize-none rounded-md border border-border bg-white/80 p-2 text-[12.5px] text-foreground outline-none focus:border-foreground/40"
                  />
                  <div className="mt-1.5 flex justify-end gap-1">
                    <button
                      onClick={() => setEditingId(null)}
                      className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-white/70"
                      aria-label="Cancel"
                    >
                      <X size={13} />
                    </button>
                    <button
                      onClick={saveEdit}
                      className="bg-gradient-cta flex h-6 w-6 items-center justify-center rounded-md text-white"
                      aria-label="Save"
                    >
                      <Check size={13} />
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-[12.5px] leading-snug text-foreground">{n.value}</p>
              )}
            </div>
          );
        })}

        {/* reset */}
        <button
          onClick={() => setNodes(initialNodes)}
          className="glass absolute bottom-4 right-4 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-foreground hover:bg-white"
        >
          <RotateCcw size={12} />
          Reset layout
        </button>
      </div>

      <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <Sparkles size={13} />
        Drag nodes to reframe. Edits propagate to Identity & Logo automatically.
      </div>
    </StudioShell>
  );
}
