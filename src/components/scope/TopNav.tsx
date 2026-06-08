import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutGrid, Compass, Megaphone, Settings } from "lucide-react";
import { ScopeLogo } from "./ScopeLogo";

const items = [
  { icon: LayoutGrid, label: "Studio",    to: "/" as const },
  { icon: Compass,    label: "Strategy",  to: "/canvas" as const },
  { icon: Megaphone,  label: "Marketing", to: "/marketing" as const },
  { icon: Settings,   label: "Settings",  to: "/" as const },
];

export function TopNav() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <header className="fixed inset-x-0 top-0 z-40 px-6 pt-5">
      <nav className="glass mx-auto flex h-16 max-w-[1400px] items-center justify-between rounded-2xl px-5">
        <Link to="/"><ScopeLogo /></Link>
        <div className="glass !shadow-none flex items-center gap-1 rounded-full p-1">
          {items.map(({ icon: Icon, label, to }) => {
            const active = to === path;
            return (
              <Link
                key={label}
                to={to}
                aria-label={label}
                className={`flex h-9 w-11 items-center justify-center rounded-full transition-all ${
                  active
                    ? "bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)] text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon size={16} strokeWidth={1.8} />
              </Link>
            );
          })}
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/signin"
            className="hidden md:inline-flex h-9 items-center rounded-full px-4 text-sm text-muted-foreground hover:text-foreground transition"
          >
            Sign in
          </Link>
          <Link
            to="/signup"
            className="bg-gradient-cta hidden md:inline-flex h-9 items-center rounded-full px-4 text-sm font-medium text-white shadow-[0_8px_24px_-6px_rgba(255,90,120,0.55)] hover:brightness-105 transition"
          >
            Get started
          </Link>
          <div className="h-9 w-9 rounded-full" style={{ background: "var(--gradient-brand)" }} />
        </div>
      </nav>
    </header>
  );
}
