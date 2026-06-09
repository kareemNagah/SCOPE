import { useState, useEffect } from "react";
import { StudioShell } from "@/components/scope/StudioShell";
import { CopilotChat } from "@/components/scope/CopilotChat";
import { initialNodes3D, backendNodesToGraph, type Node3D } from "@/components/scope/BrandGraph3D";
import { Target, Eye, User, MessageSquare, Shield, Clock, Calendar, Sparkles, RotateCcw, X, Check, Pencil } from "lucide-react";
import { api, type BrandNode } from "@/lib/api";
import RadialOrbitalTimeline, { type TimelineItem } from "@/components/ui/radial-orbital-timeline";

import { createFileRoute, useSearch } from "@tanstack/react-router";

export const Route = createFileRoute("/canvas")({
  head: () => ({
    meta: [
      { title: "SCOPE — Strategy Canvas" },
      { name: "description", content: "Edit your brand pillars in an interactive orbital timeline with your AI copilot." },
    ],
  }),
  component: CanvasPage,
});

function CanvasPage() {
  const search = useSearch({ strict: false }) as { session?: string };
  const [sessionId] = useState(() => search.session || crypto.randomUUID());
  
  const [nodes, setNodes] = useState<Node3D[]>(initialNodes3D);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  // Map nodes dynamically to the timeline data format
  const timelineData: TimelineItem[] = nodes.map((node, i) => {
    const status = i < 2 ? "completed" : i === 2 ? "in-progress" : "pending";
    
    let icon = Calendar;
    const lowerTitle = node.title.toLowerCase();
    if (lowerTitle.includes("mission") || lowerTitle.includes("purpose")) {
      icon = Target;
    } else if (lowerTitle.includes("vision")) {
      icon = Eye;
    } else if (lowerTitle.includes("persona") || lowerTitle.includes("audience")) {
      icon = User;
    } else if (lowerTitle.includes("voice") || lowerTitle.includes("tone") || lowerTitle.includes("message")) {
      icon = MessageSquare;
    } else if (lowerTitle.includes("value")) {
      icon = Shield;
    } else if (lowerTitle.includes("promise") || lowerTitle.includes("hook")) {
      icon = Clock;
    }

    const nextId = ((i + 1) % nodes.length) + 1;

    return {
      id: i + 1,
      originalId: node.id,
      title: node.title,
      date: `Pillar ${i + 1}`,
      content: node.value,
      category: node.title,
      icon: icon,
      relatedIds: [nextId],
      status: status,
      energy: 100 - i * 15,
    };
  });

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

  const startEdit = (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    setDraft(node.value);
    setEditingNodeId(nodeId);
  };

  const saveEdit = (nodeId: string) => {
    setNodes((prev) => prev.map((n) => (n.id === nodeId ? { ...n, value: draft } : n)));
    setEditingNodeId(null);
  };

  const cancelEdit = () => {
    setEditingNodeId(null);
    setDraft("");
  };

  const handleNodesUpdate = (backendNodes: BrandNode[]) => {
    setNodes(backendNodesToGraph(backendNodes));
    setSelectedId(null);
    setEditingNodeId(null);
  };

  return (
    <StudioShell
      stepId="canvas"
      eyebrow="Step 2 · Brand Architect"
      title="Your strategy timeline"
      intro="Interact with the orbital timeline. Click any node to inspect or refine — chat with the Brand Copilot to propose edits."
    >
      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        {/* Radial Timeline - darker */}
        <div className="relative h-[600px] overflow-hidden rounded-3xl bg-slate-950/95 border border-slate-800/60 shadow-[0_20px_60px_-20px_rgba(80,40,200,0.35)]">
          <RadialOrbitalTimeline
            timelineData={timelineData}
            selectedNodeId={selectedId}
            onNodeSelect={(id) => {
              setSelectedId(id);
              setEditingNodeId(null);
            }}
          />

          {/* Reset */}
          <button
            onClick={() => { setNodes(initialNodes3D); setSelectedId(null); setEditingNodeId(null); }}
            className="absolute bottom-4 right-4 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-white/70 bg-white/10 backdrop-blur-sm border border-white/10 hover:bg-white/15 hover:text-white transition"
          >
            <RotateCcw size={12} /> Reset
          </button>

          <div className="pointer-events-none absolute bottom-4 left-4 text-[10px] uppercase tracking-[0.18em] text-slate-500">
            Click any node to focus · Spin controls active
          </div>
        </div>

        {/* Chat copilot */}
        <CopilotChat 
          activeNodeTitle={active?.title ?? null} 
          sessionId={sessionId}
          onNodesUpdate={handleNodesUpdate}
        />
      </div>

      {/* Node cards - brief with inline edit fields */}
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {nodes.map((node) => {
          const isEditing = editingNodeId === node.id;
          const isSelected = selectedId === node.id;
          return (
            <div
              key={node.id}
              onClick={() => setSelectedId(node.id)}
              className={`group relative rounded-2xl p-4 bg-white border transition-all cursor-pointer ${
                isSelected
                  ? "border-slate-900 shadow-[0_8px_30px_-8px_rgba(80,40,200,0.25)]"
                  : "border-slate-200 shadow-sm hover:border-slate-300 hover:shadow-md"
              }`}
            >
              {/* Color accent bar */}
              <div
                className="absolute top-0 left-4 right-4 h-0.5 rounded-b-full"
                style={{ background: node.color }}
              />

              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="flex h-6 w-6 items-center justify-center rounded-full text-white text-[9px] font-bold"
                    style={{ background: node.color }}
                  >
                    {node.title.charAt(0)}
                  </span>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    {node.title}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isEditing) {
                      cancelEdit();
                    } else {
                      startEdit(node.id);
                    }
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
                    className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 p-2 text-[12.5px] text-slate-800 outline-none focus:border-slate-400 focus:bg-white transition"
                  />
                  <div className="mt-1.5 flex justify-end gap-1.5">
                    <button
                      onClick={(e) => { e.stopPropagation(); cancelEdit(); }}
                      className="rounded-md px-2 py-1 text-[11px] text-slate-500 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); saveEdit(node.id); }}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-white"
                      style={{ background: "var(--gradient-cta)" }}
                    >
                      <Check size={10} /> Save
                    </button>
                  </div>
                </div>
              ) : (
                <p className="mt-2.5 text-[13px] leading-snug text-slate-700 line-clamp-2">
                  {node.value}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <Sparkles size={13} />
        Edits flag downstream Identity, Marketing & Logo as "Needs Update."
      </div>
    </StudioShell>
  );
}
