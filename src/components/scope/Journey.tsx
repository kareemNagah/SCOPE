import { useEffect, useState } from "react";
import { Link, useRouter, useRouterState, useSearch } from "@tanstack/react-router";
import { Check } from "lucide-react";

import { api } from "@/lib/api";

export type JourneyStep = {
  id: string;
  label: string;
  sub: string;
  to: string;
};

export const journey: JourneyStep[] = [
  { id: "brief", label: "Brief", sub: "Tell us the spark", to: "/" },
  { id: "canvas", label: "Strategy", sub: "Edit the 6 pillars in 3D", to: "/canvas" },
  { id: "identity", label: "Identity", sub: "Palettes & typography", to: "/identity" },
  { id: "logo", label: "Logo", sub: "Generate the mark", to: "/logo" },
  { id: "export", label: "Export", sub: "Portable Brain", to: "/export" },
];

export function useSessionBriefStatus(sessionId?: string) {
  const [status, setStatus] = useState<{ approved: boolean; strategy_confirmed: boolean }>({
    approved: false,
    strategy_confirmed: false,
  });

  useEffect(() => {
    if (!sessionId) {
      setStatus({ approved: false, strategy_confirmed: false });
      return;
    }

    let active = true;
    api
      .getBrief(sessionId)
      .then((res) => {
        if (!active) return;
        setStatus({
          approved: res.approved,
          strategy_confirmed: res.strategy_confirmed,
        });
      })
      .catch((err) => {
        console.error("Failed to load brief status:", err);
      });

    return () => {
      active = false;
    };
  }, [sessionId]);

  return status;
}

export function JourneyStepper() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const search = useSearch({ strict: false }) as { session?: string };
  const sessionId = search.session;
  const { approved, strategy_confirmed } = useSessionBriefStatus(sessionId);

  const activeIdx = Math.max(
    0,
    journey.findIndex((step) => step.to === path),
  );

  return (
    <div className="glass fixed left-1/2 top-24 z-30 hidden -translate-x-1/2 items-center gap-1 rounded-full px-2 py-1.5 md:flex">
      {journey.map((step, index) => {
        const isActive = index === activeIdx;
        const isDone = index < activeIdx;

        let isLocked = false;
        if (index === 1) {
          isLocked = !approved;
        } else if (index > 1) {
          isLocked = !strategy_confirmed;
        }

        return (
          <div key={step.id} className="flex items-center">
            {isLocked ? (
              <span
                className="group cursor-not-allowed rounded-full px-3 py-1.5 text-muted-foreground/40"
                title="Complete the previous steps to unlock"
              >
                <span className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full border border-border/40 bg-white/20 text-[10px] font-medium">
                    {index + 1}
                  </span>
                  <span className="text-[12px] font-medium">{step.label}</span>
                </span>
              </span>
            ) : (
              <Link
                to={step.to}
                search={sessionId ? { session: sessionId } : undefined}
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
                  {isDone ? <Check size={11} /> : index + 1}
                </span>
                <span className="text-[12px] font-medium">{step.label}</span>
              </Link>
            )}
            {index < journey.length - 1 ? <span className="mx-1 h-px w-3 bg-border" /> : null}
          </div>
        );
      })}
    </div>
  );
}

export function JourneyFooter({ stepId }: { stepId: string }) {
  const router = useRouter();
  const search = useSearch({ strict: false }) as { session?: string };
  const sessionId = search.session;
  const { approved, strategy_confirmed } = useSessionBriefStatus(sessionId);

  const idx = journey.findIndex((step) => step.id === stepId);
  const prev = journey[idx - 1];
  const next = journey[idx + 1];

  const handleConfirmStrategy = async () => {
    if (!sessionId) return;
    try {
      await api.confirmStrategy(sessionId);
      router.navigate({
        to: "/identity",
        search: { session: sessionId },
      });
    } catch (err) {
      console.error("Failed to confirm strategy:", err);
    }
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 px-6 pb-5">
      <div className="glass mx-auto flex max-w-[1200px] items-center justify-between rounded-2xl px-4 py-2.5">
        <div className="flex items-center gap-3 text-[12px] text-muted-foreground">
          <span className="font-sans uppercase tracking-[0.18em]">
            Step {idx + 1} / {journey.length}
          </span>
          <span className="hidden text-foreground/80 sm:inline">{journey[idx]?.sub}</span>
        </div>
        <div className="flex items-center gap-2">
          {prev ? (
            <Link
              to={prev.to}
              search={sessionId ? { session: sessionId } : undefined}
              className="rounded-full px-4 py-2 text-sm text-foreground transition hover:bg-white/60"
            >
              {"<-"} {prev.label}
            </Link>
          ) : (
            <span />
          )}

          {stepId === "canvas" && !strategy_confirmed ? (
            <button
              onClick={handleConfirmStrategy}
              className="bg-gradient-cta inline-flex items-center gap-1.5 rounded-full px-5 py-2 text-sm font-medium text-white shadow-[0_8px_24px_-6px_rgba(255,90,120,0.55)] transition hover:brightness-105"
            >
              Confirm Strategy & Unlock Studios {"->"}
            </button>
          ) : next ? (
            stepId === "brief" && !approved ? null : (
              <Link
                to={next.to}
                search={sessionId ? { session: sessionId } : undefined}
                className="bg-gradient-cta inline-flex items-center gap-1.5 rounded-full px-5 py-2 text-sm font-medium text-white shadow-[0_8px_24px_-6px_rgba(255,90,120,0.55)] transition hover:brightness-105"
              >
                Continue to {next.label} {"->"}
              </Link>
            )
          ) : null}
        </div>
      </div>
    </div>
  );
}
