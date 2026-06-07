import type { ReactNode } from "react";
import { MeshBackground } from "@/components/scope/MeshBackground";
import { TopNav } from "@/components/scope/TopNav";
import { JourneyStepper, JourneyFooter } from "@/components/scope/Journey";

export function StudioShell({
  stepId,
  eyebrow,
  title,
  intro,
  children,
}: {
  stepId: string;
  eyebrow: string;
  title: string;
  intro?: string;
  children: ReactNode;
}) {
  return (
    <div className="relative min-h-screen pb-32">
      <MeshBackground />
      <TopNav />
      <JourneyStepper />
      <main className="px-6 pt-44">
        <header className="mx-auto max-w-[1200px] text-center">
          <p className="font-sans text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
            {eyebrow}
          </p>
          <h1 className="mt-2 font-display text-[clamp(2rem,4.5vw,3.75rem)] leading-[1.05] tracking-tight text-foreground">
            {title}
          </h1>
          {intro && (
            <p className="mx-auto mt-4 max-w-xl text-[15px] text-muted-foreground">
              {intro}
            </p>
          )}
        </header>
        <div className="mx-auto mt-10 max-w-[1200px]">{children}</div>
      </main>
      <JourneyFooter stepId={stepId} />
    </div>
  );
}
