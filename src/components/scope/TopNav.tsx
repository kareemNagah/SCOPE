import { LayoutGrid, AlignLeft, FolderClosed, Settings } from "lucide-react";
import { ScopeLogo } from "./ScopeLogo";

const items = [
  { icon: LayoutGrid, label: "Studio", active: true },
  { icon: AlignLeft, label: "Strategy" },
  { icon: FolderClosed, label: "Assets" },
  { icon: Settings, label: "Settings" },
];

export function TopNav() {
  return (
    <header className="fixed inset-x-0 top-0 z-40 px-6 pt-5">
      <nav className="glass mx-auto flex h-16 max-w-[1400px] items-center justify-between rounded-2xl px-5">
        <ScopeLogo />
        <div className="glass !shadow-none flex items-center gap-1 rounded-full p-1">
          {items.map(({ icon: Icon, label, active }) => (
            <button
              key={label}
              aria-label={label}
              className={`flex h-9 w-11 items-center justify-center rounded-full transition-all ${
                active
                  ? "bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)] text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon size={16} strokeWidth={1.8} />
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <button className="hidden md:inline-flex h-9 items-center rounded-full px-4 text-sm text-muted-foreground hover:text-foreground transition">
            Sign in
          </button>
          <div className="h-9 w-9 rounded-full" style={{ background: "var(--gradient-brand)" }} />
        </div>
      </nav>
    </header>
  );
}
