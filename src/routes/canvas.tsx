import { createFileRoute } from "@tanstack/react-router";
import { StudioShell } from "@/components/scope/StudioShell";
import { Sparkles, Pencil } from "lucide-react";

export const Route = createFileRoute("/canvas")({
  head: () => ({
    meta: [
      { title: "SCOPE — Strategy Canvas" },
      { name: "description", content: "Edit your brand's 6 strategic pillars on the SCOPE node canvas." },
    ],
  }),
  component: CanvasPage,
});

type Node = {
  id: string;
  title: string;
  value: string;
  x: number; y: number;
};

const nodes: Node[] = [
  { id: "mission",  title: "Mission",   value: "Equip corporate athletes with regenerative gear.", x: 50, y: 12 },
  { id: "vision",   title: "Vision",    value: "Make sustainability the default in performance wear.", x: 84, y: 30 },
  { id: "persona",  title: "Persona",   value: "Urban women 25–35, corporate athletes.", x: 84, y: 68 },
  { id: "voice",    title: "Voice",     value: "Calm, confident, technical.", x: 50, y: 86 },
  { id: "values",   title: "Values",    value: "Honesty · Craft · Longevity.", x: 16, y: 68 },
  { id: "promise",  title: "Promise",   value: "Built to last. Designed to disappear into your day.", x: 16, y: 30 },
];

function CanvasPage() {
  return (
    <StudioShell
      stepId="canvas"
      eyebrow="Step 2 · Brand Architect"
      title="Your strategy, mapped"
      intro="Six connected pillars. Click any node to refine — downstream artefacts will flag what needs to update."
    >
      <div className="glass relative mx-auto h-[560px] overflow-hidden rounded-3xl">
        {/* connecting lines */}
        <svg className="absolute inset-0 h-full w-full" aria-hidden>
          <defs>
            <linearGradient id="line-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="var(--scope-purple)" stopOpacity=".7" />
              <stop offset="1" stopColor="var(--scope-blue)" stopOpacity=".7" />
            </linearGradient>
          </defs>
          {nodes.map((n) => (
            <line
              key={n.id}
              x1="50%" y1="50%"
              x2={`${n.x}%`} y2={`${n.y}%`}
              stroke="url(#line-grad)"
              strokeWidth="1.5"
              strokeDasharray="4 6"
              style={{ animation: "pulse-soft 3s ease-in-out infinite" }}
            />
          ))}
        </svg>

        {/* center mission hub */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
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
        {nodes.map((n) => (
          <button
            key={n.id}
            className="glass absolute w-[200px] -translate-x-1/2 -translate-y-1/2 rounded-2xl p-3 text-left transition hover:scale-[1.02] hover:shadow-[var(--shadow-prism)]"
            style={{ left: `${n.x}%`, top: `${n.y}%` }}
          >
            <div className="mb-1 flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                {n.title}
              </span>
              <Pencil size={11} className="text-muted-foreground" />
            </div>
            <p className="text-[12.5px] leading-snug text-foreground">{n.value}</p>
          </button>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <Sparkles size={13} />
        Edits propagate to Identity & Logo automatically.
      </div>
    </StudioShell>
  );
}
