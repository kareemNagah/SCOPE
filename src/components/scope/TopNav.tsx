import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { LayoutGrid, Compass, Megaphone, Settings } from "lucide-react";
import { ScopeLogo } from "./ScopeLogo";
import { ExpandableTabs } from "@/components/ui/expandable-tabs";
import { AuroraButton } from "@/components/ui/aurora-button";

const items = [
  { icon: LayoutGrid, label: "Studio",    to: "/" as const },
  { icon: Compass,    label: "Strategy",  to: "/canvas" as const },
  { icon: Megaphone,  label: "Marketing", to: "/marketing" as const },
  { icon: Settings,   label: "Settings",  to: "/" as const },
];




export function TopNav() {
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });

  // Map our items to the format expected by ExpandableTabs
  const tabs = items.map((item) => ({
    title: item.label,
    icon: item.icon,
  }));

  // Find active tab index based on pathname
  // If no match (e.g., in other child pages), default to Studio (index 0) or null
  const activeIndex = items.findIndex((item) => item.to === path);

  const handleTabChange = (index: number | null) => {
    if (index !== null) {
      navigate({ to: items[index].to });
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
          <Link
            to="/signin"
            className="hidden md:inline-flex h-9 items-center rounded-full px-4 text-sm text-muted-foreground hover:text-foreground transition"
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
        </div>
      </nav>
    </header>
  );
}
