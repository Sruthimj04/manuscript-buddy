import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, PlusCircle, BarChart3, Settings, Shield, PenLine } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { LoremMark } from "@/components/pub/LoremMark";
import { useApp } from "@/store/app-store";
import type { Role } from "@/services/types";

const ROLES: { id: Role; label: string }[] = [
  { id: "author", label: "Author View" },
  { id: "editor", label: "Editor View" },
  { id: "admin", label: "Admin View" },
];

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/submit", label: "New Submission", icon: PlusCircle },
  { to: "/analytics", label: "AI Analytics", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { role, setRole, user } = useApp();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const roleNav = [
    ...NAV,
    ...(role === "editor" ? [{ to: "/editor", label: "Review Queue", icon: PenLine } as const] : []),
    ...(role === "admin" ? [{ to: "/admin", label: "Admin Panel", icon: Shield } as const] : []),
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-50 border-b border-border bg-foreground text-background">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-2 sm:px-6">
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] opacity-70">Dev Control</span>
          <div className="flex flex-wrap gap-1">
            {ROLES.map((r) => (
              <button
                key={r.id}
                onClick={() => setRole(r.id)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                  role === r.id
                    ? "bg-background text-foreground"
                    : "bg-background/10 text-background hover:bg-background/20",
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
          <span className="ml-auto hidden text-[11px] opacity-70 sm:block">Mock mode · session state only</span>
        </div>
      </div>

      <header className="sticky top-[41px] z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-4 py-3 sm:px-6">
          <Link to="/dashboard" className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-md bg-foreground text-background">
              <LoremMark className="size-5" />
            </span>
            <span className="text-base font-semibold uppercase tracking-[0.28em]">LOREM</span>
          </Link>

          <nav className="order-last flex w-full gap-1 overflow-x-auto md:order-none md:w-auto">
            {roleNav.map((item) => {
              const active = pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-sm transition-colors",
                    active
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <item.icon className="size-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium leading-tight">{user?.name}</p>
              <p className="text-xs text-muted-foreground capitalize">{role}</p>
            </div>
            <span className="rounded-full border border-foreground px-2.5 py-0.5 text-xs font-medium capitalize">
              {role}
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}