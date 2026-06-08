import { createFileRoute, useSearch } from "@tanstack/react-router";
import { lazy, Suspense, useState, useEffect } from "react";
import { StudioShell } from "@/components/scope/StudioShell";
import { CopilotChat } from "@/components/scope/CopilotChat";
import { initialNodes3D, backendNodesToGraph, type Node3D } from "@/components/scope/BrandGraph3D";
import { Sparkles, RotateCcw, X, Check } from "lucide-react";
import { api, type BrandNode } from "@/lib/api";

const BrandGraph3D = lazy(() =>
  import("@/components/scope/BrandGraph3D").then((m) => ({ default: m.BrandGraph3D })),
);

export const Route = createFileRoute("/canvas")({
  head: () => ({
    meta: [
      { title: "SCOPE — 3D Strategy Canvas" },
      { name: "description", content: "Edit your brand pillars in an interactive 3D graph with your AI copilot." },
    ],
  }),
  component: CanvasPage,
});

function CanvasPage() {
  const search = useSearch({ strict: false }) as { session?: string };
  const [sessionId] = useState(() => search.session || crypto.randomUUID());
  
  const [nodes, setNodes] = useState<Node3D[]>(initialNodes3D);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    if (search.session) {
      api.getNodes(search.session).then((backendNodes) => {
        if (backendNodes && backendNodes.length > 0) {
          setNodes(backendNodesToGraph(backendNodes));
        }
      }).catch(err => {
        console.error("Failed to load session nodes:", err);
      });
    }
  }, [search.session]);

  const active = nodes.find((n) => n.id === selectedId) ?? null;

  const startEdit = () => {
    if (!active) return;
    setDraft(active.value);
    setEditing(true);
  };
  const saveEdit = () => {
    if (!active) return;
    setNodes((prev) => prev.map((n) => (n.id === active.id ? { ...n, value: draft } : n)));
    setEditing(false);
  };

  const handleNodesUpdate = (backendNodes: BrandNode[]) => {
    setNodes(backendNodesToGraph(backendNodes));
    setSelectedId(null);
    setEditing(false);
  };

  return (
    <StudioShell
      stepId="canvas"
      eyebrow="Step 2 · Brand Architect"
      title="Your strategy, in 3D"
      intro="Rotate the graph. Click any node to inspect or refine — chat with the Brand Copilot to propose edits."
    >
      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        {/* 3D canvas */}
        <div className="relative h-[600px] overflow-hidden rounded-3xl shadow-[var(--shadow-prism)]">
          <Suspense fallback={
            <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(ellipse_at_30%_30%,rgba(159,122,234,0.25),rgba(15,8,30,0.95)_70%)]">
              <div className="h-12 w-12 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            </div>
          }>
            <BrandGraph3D nodes={nodes} selectedId={selectedId} onSelect={(id) => { setSelectedId(id); setEditing(false); }} />
          </Suspense>

          {/* Selected node panel */}
          {active && (
            <div className="glass absolute left-4 top-4 w-[280px] rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{active.title}</span>
                <button onClick={() => setSelectedId(null)} className="rounded p-1 text-muted-foreground hover:bg-white/60" aria-label="Close">
                  <X size={13} />
                </button>
              </div>
              {editing ? (
                <>
                  <textarea
                    autoFocus
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    rows={4}
                    className="mt-2 w-full resize-none rounded-md border border-border bg-white/80 p-2 text-[12.5px] text-foreground outline-none focus:border-foreground/40"
                  />
                  <div className="mt-2 flex justify-end gap-1">
                    <button onClick={() => setEditing(false)} className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-white/60">Cancel</button>
                    <button onClick={saveEdit} className="bg-gradient-cta inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-white">
                      <Check size={12} /> Save
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="mt-2 text-[13px] leading-snug text-foreground">{active.value}</p>
                  <button onClick={startEdit} className="mt-3 w-full rounded-md border border-border bg-white/70 py-1.5 text-xs text-foreground hover:bg-white">
                    Refine this pillar
                  </button>
                </>
              )}
            </div>
          )}

          {/* Reset */}
          <button
            onClick={() => { setNodes(initialNodes3D); setSelectedId(null); setEditing(false); }}
            className="glass absolute bottom-4 right-4 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-foreground hover:bg-white"
          >
            <RotateCcw size={12} /> Reset
          </button>

          <div className="pointer-events-none absolute bottom-4 left-4 text-[10px] uppercase tracking-[0.18em] text-white/70">
            Drag to orbit · scroll to zoom
          </div>
        </div>

        {/* Chat copilot */}
        <CopilotChat 
          activeNodeTitle={active?.title ?? null} 
          sessionId={sessionId}
          onNodesUpdate={handleNodesUpdate}
        />
      </div>

      <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <Sparkles size={13} />
        Edits flag downstream Identity, Marketing & Logo as “Needs Update.”
      </div>
    </StudioShell>
  );
}
