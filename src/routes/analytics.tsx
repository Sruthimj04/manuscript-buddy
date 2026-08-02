import { createFileRoute } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { AppShell } from "@/components/pub/AppShell";
import { StatusBadge } from "@/components/pub/StatusBadge";
import { useApp } from "@/store/app-store";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "AI Analytics — LOREM" },
      { name: "description", content: "Aggregate AI scores, readability, and marketability across all manuscripts." },
      { property: "og:title", content: "AI Analytics — LOREM" },
      { property: "og:description", content: "Portfolio-level view of AI pre-flight analysis results." },
    ],
  }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const { manuscripts, loading } = useApp();
  const scored = manuscripts.filter((m) => m.ai);
  const avg = (key: "score" | "readability" | "marketability") =>
    scored.length ? Math.round(scored.reduce((a, m) => a + (m.ai?.[key] ?? 0), 0) / scored.length) : 0;

  return (
    <AppShell>
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">AI analytics</h1>
      <p className="mt-1 text-sm text-muted-foreground">Portfolio-level signal across every scanned manuscript.</p>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-24 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading analytics…
        </div>
      ) : scored.length === 0 ? (
        <p className="mt-6 rounded-xl border border-border bg-card p-16 text-center text-sm text-muted-foreground">
          No AI reports yet. Submit a manuscript to generate analytics.
        </p>
      ) : (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {[
              { label: "Average AI score", value: avg("score") },
              { label: "Average readability", value: avg("readability") },
              { label: "Average marketability", value: avg("marketability") },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-border bg-card p-5">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{s.label}</p>
                <p className="mt-2 text-4xl font-semibold tabular-nums">{s.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-xl border border-border bg-card p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide">Score by manuscript</h2>
            <div className="mt-5 space-y-5">
              {scored.map((m) => (
                <div key={m.id}>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span className="font-medium">{m.title}</span>
                    <div className="flex items-center gap-3">
                      <StatusBadge state={m.state} />
                      <span className="tabular-nums">{m.ai?.score}%</span>
                    </div>
                  </div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-foreground" style={{ width: `${m.ai?.score ?? 0}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </AppShell>
  );
}