import { createFileRoute } from "@tanstack/react-router";
import { StudioShell } from "@/components/scope/StudioShell";
import { Check, Download, FileText, Image, Palette, Box } from "lucide-react";

export const Route = createFileRoute("/export")({
  head: () => ({
    meta: [
      { title: "SCOPE — Portable Brain Export" },
      { name: "description", content: "Download your brand bundle and Skill.md." },
    ],
  }),
  component: ExportPage,
});

const items = [
  { icon: FileText, label: "Skill.md", note: "Strategy + prompts" },
  { icon: Palette,  label: "tokens.json", note: "Colors & typography" },
  { icon: Image,    label: "Logo set", note: "EPS · SVG · PNG" },
  { icon: Box,      label: "Mockups", note: "12 contexts" },
];

function ExportPage() {
  return (
    <StudioShell
      stepId="export"
      eyebrow="Step 7 · Portable Brain"
      title="Your brand, packaged."
      intro="Everything you've built, zipped and ready to share with your team or feed into any LLM."
    >
      <div className="mx-auto max-w-[640px]">
        <div className="rounded-2xl p-6 bg-white border border-slate-200 shadow-sm">
          <ul className="divide-y divide-border">
            {items.map(({ icon: Icon, label, note }) => (
              <li key={label} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/70 text-foreground">
                    <Icon size={16} />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-foreground">{label}</p>
                    <p className="text-xs text-muted-foreground">{note}</p>
                  </div>
                </div>
                <Check size={16} className="text-scope-purple" />
              </li>
            ))}
          </ul>

          <button className="bg-gradient-cta mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_24px_-6px_rgba(255,90,120,0.55)] transition hover:brightness-105">
            <Download size={16} />
            Download brand.zip
          </button>
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          The Skill.md drops straight into Marketing Engine or Ideas Factory — no re-briefing needed.
        </p>
      </div>
    </StudioShell>
  );
}
