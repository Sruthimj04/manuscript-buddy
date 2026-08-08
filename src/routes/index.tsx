import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { LoremMark } from "@/components/pub/LoremMark";
import { ROLE_HOME } from "@/components/pub/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useApp } from "@/store/app-store";
import type { Role } from "@/services/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LOREM" },
      { name: "description", content: "Sign in to LOREM to submit manuscripts and track editorial review." },
      { property: "og:title", content: "LOREM" },
      { property: "og:description", content: "Sign in to LOREM to submit manuscripts and track editorial review." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { login, role: activeRole } = useApp();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("author");
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (activeRole) void navigate({ to: ROLE_HOME[activeRole], replace: true });
  }, [activeRole, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const next: { email?: string; password?: string } = {};
    if (!email.trim()) next.email = "Email or username is required.";
    if (!password.trim()) next.password = "Password is required.";
    setErrors(next);
    if (Object.keys(next).length) return;
    setSubmitting(true);
    try {
      await login(email, password, role);
      void navigate({ to: ROLE_HOME[role], replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login failed. Please check your credentials.";
      setErrors({ general: message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-md bg-foreground text-background">
            <LoremMark className="size-5" />
          </span>
          <span className="text-lg font-semibold uppercase tracking-[0.3em]">LOREM</span>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
          <h1 className="font-serif text-3xl font-normal leading-tight tracking-tight">
            You wrote it. We'll do the rest.
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            A real editor. A fair deal. From first submission to published book — we're with you the whole way.
          </p>

          <form className="mt-6 space-y-4" onSubmit={submit} noValidate>
            {errors.general && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {errors.general}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email / Username</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Administrator or you@example.com"
                aria-invalid={!!errors.email}
              />
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                aria-invalid={!!errors.password}
              />
              {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as Role)}>
                <SelectTrigger id="role" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="author">Author</SelectItem>
                  <SelectItem value="editor">Editor</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting && <Loader2 className="size-4 animate-spin" />}
              {submitting ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Sign in with your ERPNext credentials. Data is stored on your Frappe server.
          </p>
        </div>
      </div>
    </div>
  );
}
