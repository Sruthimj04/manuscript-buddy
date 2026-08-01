import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { BookOpen, Loader2 } from "lucide-react";
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
      { title: "PubFlow ERP" },
      { name: "description", content: "Sign in to PubFlow ERP to submit manuscripts and track editorial review." },
      { property: "og:title", content: "PubFlow ERP" },
      { property: "og:description", content: "Sign in to PubFlow ERP to submit manuscripts and track editorial review." },
    ],
  }),
  component: LoginPage,
});

const NAMES: Record<Role, string> = {
  author: "Amara Nwosu",
  editor: "Nina Okoro",
  admin: "Sasha Bell",
};

function LoginPage() {
  const { login } = useApp();
  const navigate = useNavigate();
  const [email, setEmail] = useState("amara@pubflow.io");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("author");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const next: { email?: string; password?: string } = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = "Enter a valid email address.";
    if (!password.trim()) next.password = "Password is required.";
    setErrors(next);
    if (Object.keys(next).length) return;
    setSubmitting(true);
    setTimeout(() => {
      login({ name: NAMES[role], email, role });
      void navigate({ to: "/dashboard" });
    }, 500);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-md bg-foreground text-background">
            <BookOpen className="size-4" />
          </span>
          <span className="text-lg font-semibold tracking-tight">PubFlow ERP</span>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
          <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Book submission &amp; AI-assisted publishing workspace.
          </p>

          <form className="mt-6 space-y-4" onSubmit={submit} noValidate>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@publisher.com"
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
            Mock mode — any password works. Data persists for this session only.
          </p>
        </div>
      </div>
    </div>
  );
}
