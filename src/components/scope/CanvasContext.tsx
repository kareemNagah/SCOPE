import * as React from "react";
import type { Node3D } from "./BrandGraph3D";

export type EditEvent = {
  id: string;
  nodeId: string;
  nodeTitle: string;
  before: string;
  after: string;
  source: "inline" | "chat";
  at: number;
};

export type CanvasState = {
  nodes: Node3D[];
  activeNodeId: string | null;
  editingNodeId: string | null;
  recentEdits: EditEvent[];
  setNodes: React.Dispatch<React.SetStateAction<Node3D[]>>;
  setActiveNodeId: (id: string | null) => void;
  setEditingNodeId: (id: string | null) => void;
  recordEdit: (event: Omit<EditEvent, "id" | "at">) => void;
  applyDraftToNode: (nodeId: string, draft: string, source: EditEvent["source"]) => void;
};

const CanvasContext = React.createContext<CanvasState | null>(null);

export function CanvasProvider({
  nodes,
  setNodes,
  children,
}: {
  nodes: Node3D[];
  setNodes: React.Dispatch<React.SetStateAction<Node3D[]>>;
  children: React.ReactNode;
}) {
  const [activeNodeId, setActiveNodeId] = React.useState<string | null>(null);
  const [editingNodeId, setEditingNodeId] = React.useState<string | null>(null);
  const [recentEdits, setRecentEdits] = React.useState<EditEvent[]>([]);

  const recordEdit = React.useCallback<CanvasState["recordEdit"]>((event) => {
    const next: EditEvent = {
      ...event,
      id: crypto.randomUUID(),
      at: Date.now(),
    };
    setRecentEdits((prev) => [next, ...prev].slice(0, 6));
  }, []);

  const applyDraftToNode = React.useCallback<CanvasState["applyDraftToNode"]>(
    (nodeId, draft, source) => {
      const target = nodes.find((n) => n.id === nodeId);
      if (!target || target.value === draft) return;
      const before = target.value;
      setNodes((prev) => prev.map((n) => (n.id === nodeId ? { ...n, value: draft } : n)));
      recordEdit({
        nodeId,
        nodeTitle: target.title,
        before,
        after: draft,
        source,
      });
    },
    [nodes, setNodes, recordEdit],
  );

  const value = React.useMemo<CanvasState>(
    () => ({
      nodes,
      activeNodeId,
      editingNodeId,
      recentEdits,
      setNodes,
      setActiveNodeId,
      setEditingNodeId,
      recordEdit,
      applyDraftToNode,
    }),
    [nodes, activeNodeId, editingNodeId, recentEdits, setNodes, recordEdit, applyDraftToNode],
  );

  return <CanvasContext.Provider value={value}>{children}</CanvasContext.Provider>;
}

export function useCanvas(): CanvasState {
  const ctx = React.useContext(CanvasContext);
  if (!ctx) {
    throw new Error("useCanvas must be used within a <CanvasProvider>");
  }
  return ctx;
}
