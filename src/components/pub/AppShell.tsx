import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, PlusCircle, BarChart3, Settings, Shield, PenLine, LogOut, ChevronDown } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { LoremMark } from "@/components/pub/LoremMark";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useApp } from "@/store/app-store";
import type { Role } from "@/services/types";

export const ROLE_HOME: Record<Role, string> = {
  author: "/dashboard",
  editor: "/editor",
  admin: "/admin",
};

const NAV_BY_ROLE: Record<Role, { to: string; label: string; icon: typeof LayoutDashboard }[]> = {
  author: [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/submit", label: "New Submission", icon: PlusCircle },
    { to: "/analytics", label: "AI Analytics", icon: BarChart3 },
    { to: "/settings", label: "Settings", icon: Settings },
  ],
  editor: [
    { to: "/editor", label: "Review Queue", icon: PenLine },
    { to: "/analytics", label: "AI Analytics", icon: BarChart3 },
    { to: "/settings", label: "Settings", icon: Settings },
  ],
  admin: [
    { to: "/admin", label: "Admin Panel", icon: Shield },
    { to: "/analytics", label: "AI Analytics", icon: BarChart3 },
    { to: "/settings", label: "Settings", icon: Settings },
  ],
};

export function AppShell({ children, allow }: { children: ReactNode; allow?: Role[] }) {
  const { role, user, logout } = useApp();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const authorized = !!role && (!allow || allow.includes(role));

  useEffect(() => {
    if (!role) {
      void navigate({ to: "/", replace: true });
    } else if (!authorized) {
      void navigate({ to: ROLE_HOME[role], replace: true });
    }
  }, [role, authorized, navigate]);

  if (!role || !authorized) return null;

  const roleNav = NAV_BY_ROLE[role];

  function handleLogout() {
    logout();
    void navigate({ to: "/", replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-4 py-3 sm:px-6">
          <Link to={ROLE_HOME[role]} className="flex items-center gap-2">
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
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2 rounded-md border border-border px-2.5 py-1.5 text-left transition-colors hover:bg-muted">
                <span className="flex size-7 items-center justify-center rounded-full bg-foreground text-xs font-semibold text-background">
                  {user?.name?.charAt(0) ?? "U"}
                </span>
                <span className="hidden sm:block">
                  <span className="block text-sm font-medium leading-tight">{user?.name}</span>
                  <span className="block text-xs capitalize text-muted-foreground">{role}</span>
                </span>
                <ChevronDown className="size-4 text-muted-foreground" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <span className="block text-sm">{user?.name}</span>
                  <span className="block text-xs font-normal text-muted-foreground">{user?.email}</span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/settings" className="cursor-pointer">
                    <Settings className="size-4" /> Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                  <LogOut className="size-4" /> Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
