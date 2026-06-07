const items = [
  { title: "Nordic Activewear", tag: "Brand Architect", h: 220, grad: "linear-gradient(135deg, var(--scope-purple), var(--scope-blue))" },
  { title: "Atelier Noir Watches", tag: "Marketing Engine", h: 280, grad: "linear-gradient(135deg, var(--ink-void), var(--scope-violet))" },
  { title: "Voltic Energy", tag: "Ideas Factory", h: 200, grad: "linear-gradient(135deg, var(--scope-orange), var(--scope-pink))" },
  { title: "Moss & Brutal", tag: "Visual DNA", h: 260, grad: "linear-gradient(135deg, var(--scope-blue), var(--scope-violet))" },
  { title: "Helio Skincare", tag: "Brand Architect", h: 230, grad: "linear-gradient(135deg, var(--scope-pink), var(--scope-violet))" },
  { title: "Field Notes 02", tag: "Persona Cards", h: 270, grad: "linear-gradient(135deg, var(--scope-violet), var(--scope-blue))" },
];

export function RecentStrategies() {
  return (
    <section className="mx-auto mt-28 max-w-[1280px] px-6 pb-24">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <p className="font-sans text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
            Curated Visual DNA
          </p>
          <h2 className="mt-1 font-display text-3xl text-foreground">Recent strategies</h2>
        </div>
        <button className="text-sm text-muted-foreground hover:text-foreground transition">
          View all →
        </button>
      </div>

      <div className="columns-2 gap-5 sm:columns-3 lg:columns-3 [&>*]:mb-5 [&>*]:break-inside-avoid">
        {items.map((it) => (
          <article
            key={it.title}
            className="group relative overflow-hidden rounded-2xl border border-white/60 shadow-[0_20px_60px_-30px_rgba(80,40,200,0.35)]"
          >
            <div style={{ height: it.h, background: it.grad }} className="w-full" />
            <div className="glass absolute inset-x-3 bottom-3 flex items-center justify-between rounded-xl px-3 py-2">
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  {it.tag}
                </p>
                <p className="text-sm font-medium text-foreground">{it.title}</p>
              </div>
              <span className="text-xs text-muted-foreground opacity-0 transition group-hover:opacity-100">
                Open →
              </span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
