import { createFileRoute, Link } from "@tanstack/react-router";
import { FileText, Loader2, Inbox, AlertCircle, CheckCircle2, Plus } from "lucide-react";
import { AppShell } from "@/components/pub/AppShell";
import { PipelineTracker } from "@/components/pub/PipelineTracker";
import { StatusBadge } from "@/components/pub/StatusBadge";
import { Button } from "@/components/ui/button";
import { useApp } from "@/store/app-store";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Author Dashboard — LOREM" },
      { name: "description", content: "Track manuscript pipeline status, AI scores, and editorial actions." },
      { property: "og:title", content: "Author Dashboard — LOREM" },
      { property: "og:description", content: "Live pipeline status for every manuscript you have submitted." },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { manuscripts, loading, error, refresh } = useApp();

  const stats = [
    { label: "Total Submitted", value: manuscripts.length, icon: FileText },
    {
      label: "Under Review",
      value: manuscripts.filter((m) => m.state === "Pending Editor Review" || m.state === "AI Processing").length,
      icon: Inbox,
    },
    {
      label: "Action Required",
      value: manuscripts.filter((m) => m.state === "Revisions Requested" || m.state === "Draft").length,
      icon: AlertCircle,
    },
    { label: "Published", value: manuscripts.filter((m) => m.state === "Published").length, icon: CheckCircle2 },
  ];

  const active =
    manuscripts.find((m) => m.state !== "Published" && m.state !== "Rejected") ?? manuscripts[0] ?? null;

  return (
    <AppShell allow={["author"]}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-normal tracking-tight sm:text-4xl">
            You wrote it. We'll do the rest.
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            A real editor. A fair deal. From first submission to published book — we're with you the whole way.
          </p>
        </div>
        <Button asChild>
          <Link to="/submit">
            <Plus className="size-4" />
            Submit New Manuscript
          </Link>
        </Button>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{s.label}</span>
              <s.icon className="size-4 text-muted-foreground" />
            </div>
            <p className="mt-3 text-3xl font-semibold tabular-nums">{s.value}</p>
          </div>
        ))}
      </div>

      {active && (
        <section className="mt-6 rounded-xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Live pipeline status</p>
              <h2 className="text-lg font-semibold tracking-tight">{active.title}</h2>
            </div>
            <StatusBadge state={active.state} />
          </div>
          <div className="mt-6">
            <PipelineTracker state={active.state} />
          </div>
        </section>
      )}

      <section className="mt-6 rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide">Manuscripts</h2>
          <Button variant="outline" size="sm" onClick={() => void refresh()}>
            Refresh
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading manuscripts…
          </div>
        ) : error ? (
          <div className="px-5 py-12 text-center">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => void refresh()}>
              Retry
            </Button>
          </div>
        ) : manuscripts.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <p className="text-sm text-muted-foreground">
              No submissions found. Click &quot;Submit New Manuscript&quot; to begin.
            </p>
            <Button asChild className="mt-4">
              <Link to="/submit">Submit New Manuscript</Link>
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-5 py-3 font-medium">Manuscript</th>
                  <th className="px-5 py-3 font-medium">Submitted</th>
                  <th className="px-5 py-3 font-medium">State</th>
                  <th className="px-5 py-3 font-medium">Editor</th>
                  <th className="px-5 py-3 font-medium">AI Score</th>
                  <th className="px-5 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {manuscripts.map((m) => (
                  <tr key={m.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                    <td className="px-5 py-4">
                      <p className="font-medium">{m.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {m.id} · {m.genre}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-muted-foreground">
                      {new Date(m.submittedAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge state={m.state} />
                    </td>
                    <td className="px-5 py-4 text-muted-foreground">{m.editor ?? "—"}</td>
                    <td className="px-5 py-4 font-medium tabular-nums">{m.ai ? `${m.ai.score}%` : "—"}</td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <Button asChild variant="outline" size="sm">
                          <Link to="/manuscript/$id" params={{ id: m.id }}>
                            View Details
                          </Link>
                        </Button>
                        {m.state === "Draft" && (
                          <Button asChild size="sm">
                            <Link to="/submit">Continue Draft</Link>
                          </Button>
                        )}
                        {m.state === "Revisions Requested" && (
                          <Button asChild size="sm">
                            <Link to="/manuscript/$id" params={{ id: m.id }}>
                              Upload Revisions
                            </Link>
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AppShell>
  );
}