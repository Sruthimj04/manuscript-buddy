import { Outlet, createFileRoute, Link } from "@tanstack/react-router";
import { LayoutDashboard, FileText, Users, Settings } from "lucide-react";
import { ReactNode } from "react";

import { AppShell } from "@/components/pub/AppShell";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarSeparator,
} from "@/components/ui/sidebar";

/**
 * Admin Layout route
 *
 * - Wraps AppShell (keeps header / role enforcement)
 * - Provides Sidebar (re-uses src/components/ui/sidebar.tsx primitives)
 * - Renders children via <Outlet />
 *
 * NOTE: Keep the visual language identical to the rest of the app by using
 * existing components and Tailwind classes. This file intentionally avoids
 * new styles and uses the exported sidebar building blocks.
 */

export const Route = createFileRoute("/admin/_layout")({
  head: () => ({
    meta: [
      { title: "Admin — LOREM" },
      { name: "description", content: "Admin portal — global pipeline oversight (placeholder)" },
    ],
  }),
  component: AdminLayout,
});

function NavItem({
  to,
  icon: Icon,
  children,
  className,
}: {
  to: string;
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  children: ReactNode;
  className?: string;
}) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild className={className}>
        <Link to={to} className="flex items-center gap-2">
          {Icon && <Icon className="size-4" />}
          <span>{children}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function AdminLayout() {
  return (
    // AppShell enforces role and renders the global header
    <AppShell allow={["admin"]}>
      <SidebarProvider>
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
          <div className="flex gap-6">
            <Sidebar variant="sidebar" collapsible="icon" className="shrink-0">
              <SidebarHeader>
                <div className="flex items-center gap-2 px-2 py-1">
                  <span className="text-sm font-semibold tracking-tight">Admin</span>
                </div>
              </SidebarHeader>

              <SidebarContent>
                <SidebarMenu>
                  <NavItem to="/admin" icon={LayoutDashboard}>
                    Overview
                  </NavItem>

                  <SidebarSeparator />

                  <NavItem to="/admin/manuscripts" icon={FileText}>
                    Manuscripts
                  </NavItem>

                  <NavItem to="/admin/editors" icon={Users}>
                    Editors
                  </NavItem>

                  <NavItem to="/admin/settings" icon={Settings}>
                    Admin settings
                  </NavItem>
                </SidebarMenu>
              </SidebarContent>

              <SidebarFooter>
                <div className="px-2 py-2 text-xs text-muted-foreground">
                  <div className="font-medium">Admin tools</div>
                  <div className="mt-1">Manage the global pipeline & assignments</div>
                </div>
              </SidebarFooter>
            </Sidebar>

            {/* Main content area — keep spacing & typography consistent with the app */}
            <SidebarInset className="flex-1">
              <div className="rounded-xl border border-border bg-card p-6">
                {/* children pages render here */}
                <Outlet />
              </div>
            </SidebarInset>
          </div>
        </div>
      </SidebarProvider>
    </AppShell>
  );
}
