import { Link } from "@tanstack/react-router";
import {
  BarChart3,
  CalendarDays,
  Users,
  TableProperties,
  Settings,
  FlaskConical,
  BookOpen,
} from "lucide-react";

type NavItem = {
  to: "/" | "/daily" | "/leads" | "/weekly" | "/experiments" | "/playbook" | "/settings";
  label: string;
  icon: typeof BarChart3;
  exact?: boolean;
};

const items: NavItem[] = [
  { to: "/", label: "Dashboard", icon: BarChart3, exact: true },
  { to: "/daily", label: "Daily", icon: CalendarDays },
  { to: "/leads", label: "Leads", icon: Users },
  { to: "/weekly", label: "Weekly", icon: TableProperties },
  { to: "/experiments", label: "Tests", icon: FlaskConical },
  { to: "/playbook", label: "Playbook", icon: BookOpen },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function Nav() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-primary text-primary-foreground text-xs font-bold">
            CH
          </span>
          <span className="hidden sm:inline">Chatter Tracker</span>
        </Link>
        <nav className="flex items-center gap-0.5 overflow-x-auto">
          {items.map((it) => {
            const Icon = it.icon;
            return (
              <Link
                key={it.to}
                to={it.to}
                activeOptions={{ exact: !!it.exact }}
                activeProps={{ className: "bg-accent text-accent-foreground" }}
                className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{it.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
