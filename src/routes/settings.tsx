import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/pub/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useApp } from "@/store/app-store";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — LOREM" },
      { name: "description", content: "Manage your LOREM profile, notification preferences, and session." },
      { property: "og:title", content: "Settings — LOREM" },
      { property: "og:description", content: "Profile and notification preferences for the publishing workspace." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user, role, logout } = useApp();
  const navigate = useNavigate();

  return (
    <AppShell>
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Settings</h1>
      <p className="mt-1 text-sm text-muted-foreground">Profile and workspace preferences.</p>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide">Profile</h2>
          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full name</Label>
              <Input id="name" defaultValue={user?.name} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mail">Email</Label>
              <Input id="mail" defaultValue={user?.email} />
            </div>
            <div className="space-y-2">
              <Label>Active role</Label>
              <Input value={role} readOnly className="capitalize" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide">Notifications</h2>
          <div className="mt-4 space-y-4">
            {["Editor decisions", "AI scan completion", "Publication milestones"].map((n) => (
              <div key={n} className="flex items-center justify-between">
                <span className="text-sm">{n}</span>
                <Switch defaultChecked />
              </div>
            ))}
          </div>
          <Button
            variant="outline"
            className="mt-8 w-full"
            onClick={() => {
              logout();
              void navigate({ to: "/" });
            }}
          >
            Sign out
          </Button>
        </div>
      </div>
    </AppShell>
  );
}