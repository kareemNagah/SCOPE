import { Link, useRouterState } from "@tanstack/react-router";
import { Check } from "lucide-react";

export type JourneyStep = {
  id: string;
  label: string;
  sub: string;
  to: string;
};

export const journey: JourneyStep[] = [
  { id: "brief",     label: "Brief",     sub: "Tell us the spark",         to: "/" },
  { id: "canvas",    label: "Strategy",  sub: "Edit the 6 pillars in 3D",  to: "/canvas" },
  { id: "identity",  label: "Identity",  sub: "Palettes & typography",     to: "/identity" },
  { id: "logo",      label: "Logo",      sub: "Generate the mark",         to: "/logo" },
  { id: "export",    label: "Export",    sub: "Portable Brain",            to: "/export" },
];

export function JourneyStepper() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const activeIdx = Math.max(
    0,
    journey.findIndex((s) => s.to === path),
  );

  return (
    <div className="glass fixed left-1/2 top-24 z-30 hidden -translate-x-1/2 items-center gap-1 rounded-full px-2 py-1.5 md:flex">
      {journey.map((step, i) => {
        const isActive = i === activeIdx;
        const isDone = i < activeIdx;
        return (
          <div key={step.id} className="flex items-center">
            <Link
              to={step.to}
              className={`group flex items-center gap-2 rounded-full px-3 py-1.5 transition ${
                isActive
                  ? "bg-foreground text-background"
                  : isDone
                    ? "text-foreground hover:bg-white/60"
                    : "text-muted-foreground hover:bg-white/60"
              }`}
            >
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-medium ${
                  isActive
                    ? "bg-background text-foreground"
                    : isDone
                      ? "bg-foreground text-background"
                      : "border border-border bg-white/70 text-muted-foreground"
                }`}
              >
                {isDone ? <Check size={11} /> : i + 1}
              </span>
              <span className="text-[12px] font-medium">{step.label}</span>
            </Link>
            {i < journey.length - 1 && (
              <span className="mx-1 h-px w-3 bg-border" />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function JourneyFooter({ stepId }: { stepId: string }) {
  const idx = journey.findIndex((s) => s.id === stepId);
  const prev = journey[idx - 1];
  const next = journey[idx + 1];

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 px-6 pb-5">
      <div className="glass mx-auto flex max-w-[1200px] items-center justify-between rounded-2xl px-4 py-2.5">
        <div className="flex items-center gap-3 text-[12px] text-muted-foreground">
          <span className="font-sans uppercase tracking-[0.18em]">
            Step {idx + 1} / {journey.length}
          </span>
          <span className="hidden sm:inline text-foreground/80">
            {journey[idx]?.sub}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {prev ? (
            <Link
              to={prev.to}
              className="rounded-full px-4 py-2 text-sm text-foreground hover:bg-white/60 transition"
            >
              ← {prev.label}
            </Link>
          ) : (
            <span />
          )}
          {next && (
            <Link
              to={next.to}
              className="bg-gradient-cta inline-flex items-center gap-1.5 rounded-full px-5 py-2 text-sm font-medium text-white shadow-[0_8px_24px_-6px_rgba(255,90,120,0.55)] transition hover:brightness-105"
            >
              Continue to {next.label} →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
