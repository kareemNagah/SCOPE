import { Link, useRouterState, useNavigate, useSearch } from "@tanstack/react-router";
import { LayoutGrid, Compass, Megaphone, Settings, LogOut } from "lucide-react";
import { useState, useEffect } from "react";
import { ScopeLogo } from "./ScopeLogo";
import { ExpandableTabs } from "@/components/ui/expandable-tabs";
import { AuroraButton } from "@/components/ui/aurora-button";
import { api, type AuthUser } from "@/lib/api";
import { useSessionBriefStatus } from "./Journey";

const items = [
  { icon: LayoutGrid, label: "Studio", to: "/" as const, locked: false },
  { icon: Compass, label: "Strategy", to: "/canvas" as const, locked: "brief" as const },
  { icon: Megaphone, label: "Marketing", to: "/marketing" as const, locked: "strategy" as const },
  { icon: Settings, label: "Settings", to: "/" as const, locked: false },
];

export function TopNav() {
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const search = useSearch({ strict: false }) as { session?: string };
  const sessionId = search.session;
  const [user, setUser] = useState<AuthUser | null>(null);
  const { approved, strategy_confirmed } = useSessionBriefStatus(sessionId);

  useEffect(() => {
    const stored = api.getStoredUser();
    if (stored) setUser(stored);
  }, []);

  const handleLogout = () => {
    api.logout();
    setUser(null);
    navigate({ to: "/" });
  };

  // Map our items to the format expected by ExpandableTabs
  const tabs = items.map((item) => ({
    title: item.label,
    icon: item.icon,
    disabled:
      item.locked === "brief"
        ? !approved
        : item.locked === "strategy"
          ? !strategy_confirmed
          : false,
  }));

  // Find active tab index based on pathname
  const activeIndex = items.findIndex((item) => item.to === path);

  const handleTabChange = (index: number | null) => {
    if (index !== null) {
      navigate({
        to: items[index].to,
        search: sessionId ? { session: sessionId } : undefined,
      });
    }
  };

  return (
    <header className="fixed inset-x-0 top-0 z-40 px-6 pt-5">
      <nav
        className="glass mx-auto flex h-16 max-w-[1400px] items-center justify-between rounded-2xl px-5"
        style={{ backdropFilter: 'url("#container-glass")' }}
      >
        <Link to="/"><ScopeLogo /></Link>
        
        <ExpandableTabs
          tabs={tabs}
          selectedIndex={activeIndex >= 0 ? activeIndex : 0}
          onChange={handleTabChange}
          activeColor="text-foreground"
        />

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <span className="hidden md:inline-flex text-sm text-muted-foreground">
                {user.name || user.email}
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="hidden md:inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full px-3 text-sm text-muted-foreground transition-colors duration-200 hover:bg-slate-100 hover:text-foreground"
                title="Sign out"
              >
                <LogOut size={14} />
                Sign out
              </button>
              <div
                className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-white"
                style={{ background: "var(--gradient-brand)" }}
              >
                {(user.name || user.email).charAt(0).toUpperCase()}
              </div>
            </>
          ) : (
            <>
              <Link
                to="/signin"
                className="hidden md:inline-flex h-9 items-center rounded-full px-4 text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground"
              >
                Sign in
              </Link>
              <Link
                to="/signup"
                className="hidden md:inline-flex"
              >
                <AuroraButton className="h-9 px-4 text-xs font-semibold uppercase tracking-wider rounded-full">
                  Get started
                </AuroraButton>
              </Link>
              <div className="h-9 w-9 rounded-full" style={{ background: "var(--gradient-brand)" }} />
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
