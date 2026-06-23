import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Check,
  Download,
  Flame,
  Image as ImageIcon,
  Layers,
  Megaphone,
  Palette,
  Radar,
  RefreshCw,
  Sparkles,
  Target,
  Type,
  Users,
  type LucideIcon,
} from "lucide-react";

import { MeshBackground } from "@/components/scope/MeshBackground";
import { TopNav } from "@/components/scope/TopNav";
import { DEMO_BRANDS, DEMO_ENGINE } from "@/lib/marketingDemo";
import type { AdVariant, MarketingEngine, MarketingHook, MarketingPersona } from "@/lib/api";

export const Route = createFileRoute("/marketing")({
  head: () => ({
    meta: [
      { title: "SCOPE — Marketing Engine" },
      {
        name: "description",
        content:
          "Refract a brief into a full go-to-market system: blueprint, audience, visual DNA, social plan, hooks, and A/B creative.",
      },
    ],
  }),
  component: MarketingPage,
});

type StepId = 1 | 2 | 3 | 4 | 5 | 6 | 7;

type StepDef = { id: StepId; title: string; rail: string; icon: LucideIcon };

const STEPS: StepDef[] = [
  { id: 1, title: "Intake", rail: "Reference pack", icon: ImageIcon },
  { id: 2, title: "Blueprint", rail: "Market logic", icon: Radar },
  { id: 3, title: "Audience", rail: "Persona map", icon: Users },
  { id: 4, title: "Visual DNA", rail: "Creative code", icon: Palette },
  { id: 5, title: "Social plan", rail: "Channel system", icon: Megaphone },
  { id: 6, title: "Hooks", rail: "Risk filter", icon: Flame },
  { id: 7, title: "Ad creative", rail: "A/B preview", icon: Layers },
];

const REFRACT_LINES: Record<StepId, string[]> = {
  1: ["Isolating brand archetype", "Refracting product signal", "Profiling audience segments"],
  2: ["Mapping category tension"],
  3: ["Splitting audience segments"],
  4: ["Extracting visual DNA"],
  5: ["Composing the channel system"],
  6: ["Stress-testing scroll-stoppers"],
  7: ["Colliding copy variants", "Rendering ad creative"],
};

function MarketingPage() {
  const engine = DEMO_ENGINE;
  const [step, setStep] = useState<StepId>(1);
  const [brand, setBrand] = useState(DEMO_BRANDS[0].session_id);
  const [running, setRunning] = useState<string | null>(null);
  const [pickedHook, setPickedHook] = useState<string | null>(null);

  const refract = (target: StepId, next?: StepId) => {
    const lines = REFRACT_LINES[target] ?? ["Refracting"];
    setRunning(lines[0]);
    let i = 0;
    const iv = window.setInterval(() => {
      i += 1;
      if (i < lines.length) setRunning(lines[i]);
    }, 720);
    window.setTimeout(
      () => {
        window.clearInterval(iv);
        setRunning(null);
        if (next) setStep(next);
      },
      Math.max(1100, lines.length * 720 + 360),
    );
  };

  const done = (id: StepId) => id < step;

  return (
    <div className="relative min-h-screen pb-32">
      <MeshBackground />
      <TopNav />

      <main className="px-6 pt-44">
        <header className="mx-auto max-w-[1200px] text-center">
          <p className="font-sans text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
            Module 02 · Marketing Engine
          </p>
          <h1 className="mt-2 font-display text-[clamp(2.2rem,5vw,4rem)] leading-[1.02] tracking-tight text-foreground">
            Refract your <span className="text-gradient-brand italic">campaign</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-[15px] text-muted-foreground">
            One brief, fanned into a full go-to-market system — blueprint, audience, visual DNA,
            social plan, hooks, and A/B creative.
          </p>
        </header>

        <div className="mx-auto mt-10 max-w-[1200px]">
          <div className="overflow-hidden rounded-3xl border border-slate-800/50 bg-[#0D0D1A]/92 p-4 shadow-[0_24px_80px_-20px_rgba(0,0,0,0.55)] backdrop-blur-xl sm:p-6">
            <BrandBar
              brand={brand}
              setBrand={setBrand}
              progress={Math.round((step / STEPS.length) * 100)}
            />

            <div className="mt-5 grid gap-5 lg:grid-cols-[228px_minmax(0,1fr)]">
              {/* Step rail */}
              <ol className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:gap-1 lg:overflow-visible lg:pb-0">
                {STEPS.map((s) => {
                  const active = s.id === step;
                  const isDone = done(s.id);
                  const Icon = s.icon;
                  return (
                    <li key={s.id} className="flex-none lg:flex-auto">
                      <button
                        type="button"
                        onClick={() => setStep(s.id)}
                        className={`group flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all duration-200 ${
                          active
                            ? "border-white/10 bg-white/[0.07] text-slate-100 shadow-[0_0_30px_-12px_var(--scope-purple)]"
                            : "border-transparent text-slate-400 hover:bg-white/[0.04] hover:text-slate-200"
                        }`}
                      >
                        <span
                          className={`flex h-7 w-7 flex-none items-center justify-center rounded-lg border text-[11px] ${
                            active
                              ? "border-transparent text-white"
                              : isDone
                                ? "border-transparent text-white"
                                : "border-slate-700/60 bg-slate-800/50 text-slate-400"
                          }`}
                          style={
                            active || isDone ? { background: "var(--gradient-brand)" } : undefined
                          }
                        >
                          {isDone ? <Check size={13} /> : <Icon size={14} />}
                        </span>
                        <span className="min-w-0">
                          <span className="block whitespace-nowrap text-[13px] font-medium leading-tight">
                            {s.title}
                          </span>
                          <span className="block whitespace-nowrap text-[10px] uppercase tracking-[0.14em] text-slate-500">
                            {s.rail}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>

              {/* Active panel */}
              <div className="min-h-[520px]">
                <AnimatePresence mode="wait">
                  {running ? (
                    <Refracting key="refracting" message={running} />
                  ) : (
                    <motion.div
                      key={step}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                    >
                      {step === 1 && <IntakeStep engine={engine} onRefract={() => refract(1, 2)} />}
                      {step === 2 && <BlueprintStep engine={engine} onNext={() => setStep(3)} />}
                      {step === 3 && (
                        <AudienceStep personas={engine.personas} onNext={() => setStep(4)} />
                      )}
                      {step === 4 && (
                        <VisualDnaStep
                          engine={engine}
                          onRefract={() => refract(4)}
                          onNext={() => setStep(5)}
                        />
                      )}
                      {step === 5 && (
                        <SocialStep
                          engine={engine}
                          onRefract={() => refract(5)}
                          onNext={() => setStep(6)}
                        />
                      )}
                      {step === 6 && (
                        <HookStep
                          hooks={engine.hooks.hooks ?? []}
                          picked={pickedHook}
                          setPicked={setPickedHook}
                          onNext={() => setStep(7)}
                        />
                      )}
                      {step === 7 && <CreativeStep engine={engine} onRefract={() => refract(7)} />}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

/* ─────────────────────────── chrome ─────────────────────────── */

function BrandBar({
  brand,
  setBrand,
  progress,
}: {
  brand: string;
  setBrand: (v: string) => void;
  progress: number;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-slate-800/60 bg-slate-900/40 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <span
          className="grid h-11 w-11 place-items-center rounded-xl text-sm font-bold text-white"
          style={{ background: "var(--gradient-brand)" }}
        >
          KP
        </span>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
            Working brand
          </p>
          <select
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            className="-ml-0.5 mt-0.5 cursor-pointer rounded-md bg-transparent text-sm font-medium text-slate-100 outline-none"
          >
            {DEMO_BRANDS.map((b) => (
              <option key={b.session_id} value={b.session_id} className="bg-[#0D0D1A]">
                {b.brand_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="min-w-[180px] sm:w-56">
        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
          <span>Refraction</span>
          <span className="font-mono text-slate-300">{progress}%</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/8">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progress}%`, background: "var(--gradient-brand)" }}
          />
        </div>
      </div>
    </div>
  );
}

function Refracting({ message }: { message: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="grid min-h-[520px] place-items-center rounded-2xl border border-slate-800/60 bg-slate-950/40 p-8 text-center"
    >
      <div>
        <div className="relative mx-auto h-36 w-36">
          <span
            className="absolute inset-0 animate-spin rounded-full border-2 border-transparent"
            style={{
              borderTopColor: "var(--scope-purple)",
              borderRightColor: "var(--scope-pink)",
              animationDuration: "1.6s",
            }}
          />
          <span
            className="absolute inset-4 animate-spin rounded-full border-2 border-transparent"
            style={{
              borderTopColor: "var(--scope-blue)",
              animationDuration: "2.4s",
              animationDirection: "reverse",
            }}
          />
          <span
            className="absolute inset-8 animate-spin rounded-full border-2 border-transparent"
            style={{ borderTopColor: "var(--scope-orange)", animationDuration: "3.2s" }}
          />
          <span className="absolute inset-0 grid place-items-center">
            <Sparkles size={22} className="text-slate-200" />
          </span>
        </div>
        <p className="mt-7 text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">
          Refraction
        </p>
        <p className="mt-2 font-display text-2xl text-slate-100">{message}…</p>
      </div>
    </motion.div>
  );
}

/* ─────────────────────────── primitives ─────────────────────────── */

function StepHead({
  icon,
  step,
  label,
  note,
}: {
  icon: React.ReactNode;
  step: string;
  label: string;
  note: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700/60 bg-slate-800/60 text-slate-400">
          {icon}
        </span>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-300">
            {label}
          </p>
          <p className="text-[11px] text-slate-500">{note}</p>
        </div>
      </div>
      <span className="font-mono text-[11px] tracking-[0.18em] text-slate-600">{step} / 07</span>
    </div>
  );
}

function PrimaryButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="bg-gradient-cta inline-flex items-center gap-2 rounded-full px-7 py-3 text-sm font-semibold text-white shadow-[0_10px_30px_-8px_rgba(255,90,120,0.5)] transition hover:brightness-105 active:translate-y-px"
    >
      {children}
    </button>
  );
}

function GhostButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-full border border-slate-700/70 bg-slate-900/40 px-5 py-3 text-sm font-medium text-slate-200 transition hover:border-slate-600 hover:bg-slate-900/70"
    >
      {children}
    </button>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="rounded-xl border border-slate-800/60 bg-slate-900/40 p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-1.5 text-[13px] leading-6 text-slate-200">{value}</p>
    </div>
  );
}

function reveal(index: number) {
  return {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: { delay: index * 0.06, ease: [0.22, 1, 0.36, 1] as const, duration: 0.4 },
  };
}

function Footer({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-7 flex items-center justify-end gap-3 border-t border-slate-800/60 pt-5">
      {children}
    </div>
  );
}

/* ─────────────────────────── steps ─────────────────────────── */

function IntakeStep({ engine, onRefract }: { engine: MarketingEngine; onRefract: () => void }) {
  const context = Object.entries(engine.context_data);
  return (
    <section>
      <StepHead
        icon={<ImageIcon size={15} />}
        step="01"
        label="Asset intake"
        note="Brand and product references for the refraction"
      />
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <Drop title="Brand assets" hint="Logo kit · guidelines · past ads" count="6" />
        <Drop title="Product images" hint="Hero angle · macro · packaging" count="9" />
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {context.map(([key, value], i) => (
          <motion.div key={key} {...reveal(i)}>
            <Field label={labelize(key)} value={value} />
          </motion.div>
        ))}
      </div>
      <Footer>
        <PrimaryButton onClick={onRefract}>
          <Sparkles size={15} /> Refract brief
        </PrimaryButton>
      </Footer>
    </section>
  );
}

function Drop({ title, hint, count }: { title: string; hint: string; count: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-700/60 bg-slate-900/30 p-5 transition hover:border-slate-600">
      <div className="flex items-center justify-between">
        <span className="grid h-11 w-11 place-items-center rounded-xl border border-slate-700/60 bg-slate-800/50 text-slate-300">
          <ImageIcon size={18} />
        </span>
        <span className="rounded-full border border-slate-700/60 bg-slate-800/40 px-2.5 py-0.5 font-mono text-[11px] text-slate-300">
          {count} files
        </span>
      </div>
      <p className="mt-4 text-[15px] font-medium text-slate-100">{title}</p>
      <p className="mt-1 text-[12px] text-slate-500">{hint}</p>
    </div>
  );
}

function BlueprintStep({ engine, onNext }: { engine: MarketingEngine; onNext: () => void }) {
  const bp = engine.blueprint;
  const identity = engine.brand_identity;
  const blocks: { title: string; rows: [string, string][] }[] = [
    {
      title: "Product identity",
      rows: [
        ["Category", bp.product_identity.category],
        ["Positioning", bp.product_identity.positioning],
        ["Signature", bp.product_identity.signature],
      ],
    },
    {
      title: "Buying behavior",
      rows: [
        ["Trigger", bp.buying_behavior.trigger],
        ["Decision window", bp.buying_behavior.decision_window],
        ["Friction", bp.buying_behavior.friction],
      ],
    },
    {
      title: "Category tension",
      rows: [
        ["Default", bp.category_tension.default],
        ["Whitespace", bp.category_tension.whitespace],
        ["Opportunity", bp.category_tension.opportunity],
      ],
    },
  ];
  return (
    <section>
      <StepHead
        icon={<Radar size={15} />}
        step="02"
        label="Market blueprint"
        note="Where this brand wins and why"
      />
      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        {blocks.map((block, i) => (
          <motion.div
            key={block.title}
            {...reveal(i)}
            className="rounded-2xl border border-slate-800/60 bg-slate-900/40 p-4"
          >
            <div className="mb-3 flex items-center gap-2">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: "var(--gradient-brand)" }}
              />
              <h3 className="text-[13px] font-semibold text-slate-100">{block.title}</h3>
            </div>
            <div className="space-y-2.5">
              {block.rows.map(([l, v]) => (
                <Field key={l} label={l} value={v} />
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      <div className="mt-4 rounded-2xl border border-slate-800/60 bg-slate-900/40 p-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
          Brand spine
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Archetype" value={textAt(identity, "brand_identity", "brand_archetype")} />
          <Field label="Voice" value={textAt(identity, "brand_identity", "tone_of_voice")} />
          <Field label="Tier" value={textAt(identity, "brand_positioning", "market_tier")} />
          <Field label="Promise" value={textAt(identity, "brand_positioning", "brand_promise")} />
        </div>
      </div>

      <Footer>
        <PrimaryButton onClick={onNext}>
          Continue <ArrowRight size={15} />
        </PrimaryButton>
      </Footer>
    </section>
  );
}

function AudienceStep({ personas, onNext }: { personas: MarketingPersona[]; onNext: () => void }) {
  return (
    <section>
      <StepHead
        icon={<Users size={15} />}
        step="03"
        label="Audience split"
        note="Primary and secondary segments to design for"
      />
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {personas.map((p, i) => (
          <motion.div
            key={p.name}
            {...reveal(i)}
            className="rounded-2xl border border-slate-800/60 bg-slate-900/40 p-5"
          >
            <div className="flex items-center gap-4">
              <span className="h-12 w-12 rounded-2xl" style={{ background: p.gradient }} />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  {p.tier}
                </p>
                <h3 className="font-display text-2xl text-slate-100">{p.name}</h3>
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-300">{p.role}</p>
            <ul className="mt-4 space-y-2">
              {p.jobs.map((job) => (
                <li key={job} className="flex gap-2 text-[13px] text-slate-200">
                  <Check size={14} className="mt-0.5 flex-none text-scope-violet" />
                  {job}
                </li>
              ))}
            </ul>
            <div className="mt-4 flex flex-wrap gap-2">
              {p.channels.map((c) => (
                <span
                  key={c}
                  className="rounded-full border border-slate-700/60 bg-slate-800/40 px-3 py-1 text-[11px] text-slate-300"
                >
                  {c}
                </span>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
      <Footer>
        <PrimaryButton onClick={onNext}>
          Continue <ArrowRight size={15} />
        </PrimaryButton>
      </Footer>
    </section>
  );
}

function VisualDnaStep({
  engine,
  onRefract,
  onNext,
}: {
  engine: MarketingEngine;
  onRefract: () => void;
  onNext: () => void;
}) {
  const rows = Object.entries(engine.visual_dna);
  return (
    <section>
      <StepHead
        icon={<Type size={15} />}
        step="04"
        label="Visual DNA"
        note="The unbreakable look every asset inherits"
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {rows.map(([key, value], i) => (
          <motion.div key={key} {...reveal(i)}>
            <Field label={labelize(key)} value={String(value)} />
          </motion.div>
        ))}
      </div>
      <div
        className="mt-4 overflow-hidden rounded-2xl p-px"
        style={{ background: "var(--gradient-brand)" }}
      >
        <div className="rounded-[15px] bg-[#0D0D1A] p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
            Creative rule
          </p>
          <p className="mt-2 max-w-2xl font-display text-xl leading-7 text-slate-100">
            Hero the product like performance hardware — caption it like a ranked-lobby callout.
          </p>
        </div>
      </div>
      <Footer>
        <GhostButton onClick={onRefract}>
          <RefreshCw size={14} /> Re-run
        </GhostButton>
        <PrimaryButton onClick={onNext}>
          Continue <ArrowRight size={15} />
        </PrimaryButton>
      </Footer>
    </section>
  );
}

function SocialStep({
  engine,
  onRefract,
  onNext,
}: {
  engine: MarketingEngine;
  onRefract: () => void;
  onNext: () => void;
}) {
  const platforms = asRecords(engine.social_plan.platform_strategy);
  const pillars = asRecords(engine.social_plan.content_pillars);
  return (
    <section>
      <StepHead
        icon={<Megaphone size={15} />}
        step="05"
        label="Social media plan"
        note="Per-platform roles and the content pillars beneath them"
      />
      <div className="mt-5 flex flex-wrap gap-2">
        {platforms.map((p) => (
          <span
            key={String(p.platform)}
            className="rounded-full border border-slate-700/60 bg-slate-800/40 px-3 py-1.5 text-[12px] text-slate-200"
          >
            <b className="text-slate-100">{String(p.platform)}</b>
            <span className="text-slate-500"> · {String(p.role)}</span>
          </span>
        ))}
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {pillars.map((pillar, i) => (
          <motion.div
            key={String(pillar.name)}
            {...reveal(i)}
            className="rounded-2xl border border-slate-800/60 bg-slate-900/40 p-5"
          >
            <h3 className="font-display text-xl text-slate-100">{String(pillar.name)}</h3>
            <p className="mt-1.5 text-[13px] leading-6 text-slate-400">
              {String(pillar.description)}
            </p>
            <div className="mt-3 rounded-xl border border-slate-800/60 bg-slate-950/40 p-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-scope-violet">
                Example
              </p>
              <p className="mt-1 text-[13px] text-slate-200">{String(pillar.example_content)}</p>
            </div>
          </motion.div>
        ))}
      </div>
      <Footer>
        <GhostButton onClick={onRefract}>
          <RefreshCw size={14} /> Re-run
        </GhostButton>
        <PrimaryButton onClick={onNext}>
          Continue <ArrowRight size={15} />
        </PrimaryButton>
      </Footer>
    </section>
  );
}

function HookStep({
  hooks,
  picked,
  setPicked,
  onNext,
}: {
  hooks: MarketingHook[];
  picked: string | null;
  setPicked: (id: string | null) => void;
  onNext: () => void;
}) {
  const revealed = picked !== null;
  return (
    <section>
      <StepHead
        icon={<Flame size={15} />}
        step="06"
        label="Hook risk filter"
        note="Spot the line that would alienate the core persona"
      />
      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        {hooks.map((hook, i) => {
          const isPicked = picked === hook.id;
          const bad = hook.alienates;
          const tone = revealed
            ? bad
              ? "border-scope-pink/50 bg-scope-pink/10 shadow-[0_0_30px_-10px_var(--scope-pink)]"
              : "border-scope-violet/40 bg-scope-violet/10"
            : isPicked
              ? "border-slate-600 bg-slate-900/70"
              : "border-slate-800/60 bg-slate-900/40 hover:border-slate-700/60 hover:bg-slate-900/70";
          return (
            <motion.button
              key={hook.id}
              {...reveal(i)}
              type="button"
              onClick={() => setPicked(hook.id)}
              className={`min-h-[210px] rounded-2xl border p-5 text-left transition-all duration-200 ${tone}`}
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                {hook.type ?? "Hook"}
              </p>
              <h3 className="mt-2.5 font-display text-lg leading-snug text-slate-100">
                {hook.title}
              </h3>
              <p className="mt-2.5 text-[13px] leading-6 text-slate-400">{hook.body}</p>
              {revealed && (
                <p
                  className={`mt-3 text-[12px] font-medium ${bad ? "text-scope-pink" : "text-scope-violet"}`}
                >
                  {bad ? "Alienates the core persona" : "Connects"} — {hook.why}
                </p>
              )}
            </motion.button>
          );
        })}
      </div>
      <Footer>
        <PrimaryButton onClick={onNext}>
          Continue <ArrowRight size={15} />
        </PrimaryButton>
      </Footer>
    </section>
  );
}

function CreativeStep({ engine, onRefract }: { engine: MarketingEngine; onRefract: () => void }) {
  const variants: AdVariant[] = engine.ad_copy.variants ?? [];
  return (
    <section>
      <StepHead
        icon={<Layers size={15} />}
        step="07"
        label="A/B ad creative"
        note="Two directions, rendered with the headline baked in"
      />
      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        {variants.slice(0, 2).map((v, i) => (
          <motion.div
            key={v.label}
            {...reveal(i)}
            className="overflow-hidden rounded-2xl border border-slate-800/60 bg-slate-900/40"
          >
            <div className="group relative bg-black">
              <img
                src={engine.ad_creatives[i]}
                alt={v.headline}
                className="aspect-video w-full object-cover"
              />
              <button
                type="button"
                onClick={() => downloadImage(engine.ad_creatives[i], `campaign-ad-${i + 1}.svg`)}
                className="absolute bottom-3 right-3 grid h-9 w-9 place-items-center rounded-lg bg-white/90 text-[#0D0D1A] opacity-0 transition group-hover:opacity-100"
                aria-label="Download creative"
              >
                <Download size={15} />
              </button>
            </div>
            <div className="p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                Variant {i === 0 ? "A" : "B"} · {v.label}
              </p>
              <h3 className="mt-2 font-display text-2xl text-slate-100">{v.headline}</h3>
              <p className="mt-1 text-[13px] text-slate-400">{v.subheadline}</p>
              <p className="mt-3 text-[13px] leading-6 text-slate-300">{v.body}</p>
              <div className="mt-4 space-y-1.5 rounded-xl border border-slate-800/60 bg-slate-950/40 p-3 text-[12px] leading-5 text-slate-400">
                <p>
                  <span className="font-semibold text-slate-200">Trigger:</span>{" "}
                  {v.copy_logic.audience_trigger}
                </p>
                <p>
                  <span className="font-semibold text-slate-200">Hypothesis:</span>{" "}
                  {v.copy_logic.ab_hypothesis}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
      <Footer>
        <GhostButton onClick={onRefract}>
          <RefreshCw size={14} /> Refract again
        </GhostButton>
      </Footer>
      <div className="mt-3 flex items-center gap-2 text-[12px] text-slate-500">
        <Target size={13} className="text-scope-violet" /> Ship Variant A to cold reach, Variant B
        to retargeting.
      </div>
    </section>
  );
}

/* ─────────────────────────── helpers ─────────────────────────── */

function textAt(source: Record<string, unknown>, ...path: string[]): string {
  let current: unknown = source;
  for (const key of path) {
    if (!current || typeof current !== "object") return "";
    current = (current as Record<string, unknown>)[key];
  }
  return typeof current === "string" ? current : "";
}

function asRecords(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value)
    ? value.filter(
        (item): item is Record<string, unknown> => Boolean(item) && typeof item === "object",
      )
    : [];
}

function labelize(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function downloadImage(url: string, name: string) {
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
}
