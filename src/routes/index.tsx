import { createFileRoute } from "@tanstack/react-router";
import { MeshBackground } from "@/components/scope/MeshBackground";
import { TopNav } from "@/components/scope/TopNav";
import { PromptBar } from "@/components/scope/PromptBar";
import { MoodboardGrid } from "@/components/scope/MoodboardGrid";
import { RecentStrategies } from "@/components/scope/RecentStrategies";
import { JourneyStepper } from "@/components/scope/Journey";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SCOPE — What brand will we build today?" },
      {
        name: "description",
        content:
          "SCOPE is an ethereal brand studio for founders and marketers. Generate brand strategy, visual identity, and high-converting campaigns from a single prompt.",
      },
      { property: "og:title", content: "SCOPE — Ethereal brand studio" },
      {
        property: "og:description",
        content: "Brand Architect, Marketing Engine, and Ideas Factory in one immersive canvas.",
      },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap",
      },
    ],
  }),
  component: StudioLanding,
});

function StudioLanding() {
  return (
    <div className="relative min-h-screen">
      <MeshBackground />
      <TopNav />
      <JourneyStepper />

      <main className="px-6 pt-44">
        <section className="mx-auto max-w-[1200px] text-center">
          <h1 className="font-display text-[clamp(2.75rem,7vw,6rem)] leading-[1.02] tracking-tight text-foreground">
            What brand will
            <br />
            we build today?
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-[15px] text-muted-foreground">
            Move from a single prompt to a full brand system —
            strategy, identity, and campaigns — without leaving the canvas.
          </p>

          <div className="mt-12">
            <PromptBar />
            <MoodboardGrid />
          </div>
        </section>

        <RecentStrategies />
      </main>
    </div>
  );
}
