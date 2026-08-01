import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { ArrowLeft, Download, Loader2, Upload, FileText } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/pub/AppShell";
import { StatusBadge } from "@/components/pub/StatusBadge";
import { PipelineTracker } from "@/components/pub/PipelineTracker";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import * as service from "@/services/manuscriptService";
import { useApp } from "@/store/app-store";

export const Route = createFileRoute("/manuscript/$id")({
  head: () => ({
    meta: [
      { title: "Manuscript & AI Report — PubFlow ERP" },
      { name: "description", content: "AI analysis, workflow timeline, and editor feedback for a manuscript." },
      { property: "og:title", content: "Manuscript & AI Report — PubFlow ERP" },
      { property: "og:description", content: "Genre confidence, readability, pacing, audit log, and revision uploads." },
    ],
  }),
  component: ManuscriptPage,
});

function Bar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span>{label}</span>
        <span className="font-medium tabular-nums">{value}%</span>
      </div>
      <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-foreground" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function ManuscriptPage() {
  const { id } = useParams({ from: "/manuscript/$id" });
  const { manuscripts, loading, user, refresh } = useApp();
  const m = manuscripts.find((x) => x.id === id);
  const inputRef = useRef<HTMLInputElement>(null);
  const [pct, setPct] = useState(0);
  const [busy, setBusy] = useState(false);

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center gap-2 py-24 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading manuscript…
        </div>
      </AppShell>
    );
  }

  if (!m) {
    return (
      <AppShell>
        <div className="py-24 text-center">
          <p className="text-sm text-muted-foreground">Manuscript {id} could not be found.</p>
          <Button asChild variant="outline" className="mt-4">
            <Link to="/dashboard">Back to dashboard</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  async function upload(file: File | undefined) {
    if (!m) return;
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Only .pdf files are accepted.");
      return;
    }
    setBusy(true);
    setPct(0);
    const t = setInterval(() => setPct((p) => Math.min(100, p + 12)), 120);
    await service.uploadRevision(m.id, file.name, user?.name ?? "Author");
    clearInterval(t);
    setPct(100);
    await refresh();
    setBusy(false);
    toast.success("Revision uploaded", { description: "Your manuscript is back in the editor queue." });
  }

  return (
    <AppShell>
      <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Back to dashboard
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4 rounded-xl border border-border bg-card p-5">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{m.title}</h1>
            <StatusBadge state={m.state} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {m.id} · Submitted {new Date(m.submittedAt).toLocaleString()} · Editor {m.editor ?? "unassigned"}
          </p>
        </div>
        <Button variant="outline" onClick={() => toast.info("Mock mode: PDF download is simulated.")}>
          <Download className="size-4" /> Download PDF
        </Button>
      </div>

      <div className="mt-4 rounded-xl border border-border bg-card p-5">
        <PipelineTracker state={m.state} />
      </div>

      <Tabs defaultValue="ai" className="mt-6">
        <TabsList>
          <TabsTrigger value="ai">AI Analysis Report</TabsTrigger>
          <TabsTrigger value="timeline">Workflow Timeline</TabsTrigger>
          <TabsTrigger value="feedback">Editor Feedback</TabsTrigger>
        </TabsList>

        <TabsContent value="ai" className="mt-4">
          {!m.ai ? (
            <p className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
              No AI report available for this manuscript yet.
            </p>
          ) : (
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="rounded-xl border border-border bg-card p-5 lg:col-span-2">
                <h3 className="text-sm font-semibold uppercase tracking-wide">Genre confidence</h3>
                <div className="mt-4 space-y-4">
                  {m.ai.genreConfidence.map((g) => (
                    <Bar key={g.label} label={g.label} value={g.value} />
                  ))}
                </div>
                <h3 className="mt-8 text-sm font-semibold uppercase tracking-wide">Pacing analysis</h3>
                <div className="mt-4 space-y-4">
                  {m.ai.pacing.map((p) => (
                    <Bar key={p.label} label={p.label} value={p.value} />
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-xl border border-border bg-card p-5 text-center">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Readability score</p>
                  <p className="mt-2 text-5xl font-semibold tabular-nums">{m.ai.readability}</p>
                  <Progress value={m.ai.readability} className="mt-4" />
                </div>
                <div className="rounded-xl border border-border bg-card p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Marketability index</span>
                    <span className="rounded-full bg-foreground px-2.5 py-0.5 text-xs font-medium text-background tabular-nums">
                      {m.ai.marketability}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-sm">Overall AI score</span>
                    <span className="rounded-full bg-foreground px-2.5 py-0.5 text-xs font-medium text-background tabular-nums">
                      {m.ai.score}%
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-sm">Pages detected</span>
                    <span className="text-sm font-medium tabular-nums">{m.ai.detectedPages}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-5 lg:col-span-3">
                <h3 className="text-sm font-semibold uppercase tracking-wide">AI executive summary</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{m.ai.summary}</p>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="timeline" className="mt-4">
          <ol className="rounded-xl border border-border bg-card p-5">
            {m.timeline.map((t, i) => (
              <li key={t.id} className="flex gap-4 pb-6 last:pb-0">
                <div className="flex flex-col items-center">
                  <span className="mt-1 size-2.5 rounded-full bg-foreground" />
                  {i < m.timeline.length - 1 && <span className="w-px flex-1 bg-border" />}
                </div>
                <div>
                  <p className="text-sm font-medium">{t.action}</p>
                  <p className="text-xs text-muted-foreground">
                    {t.actor} · {new Date(t.timestamp).toLocaleString()}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </TabsContent>

        <TabsContent value="feedback" className="mt-4 space-y-4">
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="text-sm font-semibold uppercase tracking-wide">Editor notes</h3>
            {m.notes.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">No editor feedback has been left yet.</p>
            ) : (
              <ul className="mt-4 space-y-4">
                {m.notes.map((n) => (
                  <li key={n.id} className="rounded-lg border border-border p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{n.author}</span>
                      <span className="text-xs text-muted-foreground">{new Date(n.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{n.body}</p>
                  </li>
                ))}
              </ul>
            )}
            {m.rejectionReason && (
              <p className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                Rejection reason: {m.rejectionReason}
              </p>
            )}
          </div>

          {m.state === "Revisions Requested" && (
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="text-sm font-semibold uppercase tracking-wide">Upload revised draft</h3>
              <div
                onClick={() => inputRef.current?.click()}
                className="mt-4 flex cursor-pointer flex-col items-center rounded-xl border-2 border-dashed border-border px-6 py-10 text-center hover:bg-muted/50"
              >
                <Upload className="size-5 text-muted-foreground" />
                <p className="mt-2 text-sm font-medium">Click to upload a revised .pdf</p>
                <p className="text-xs text-muted-foreground">Current file: {m.fileName ?? "none"}</p>
                <input
                  ref={inputRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  className="hidden"
                  onChange={(e) => void upload(e.target.files?.[0])}
                />
              </div>
              {busy && (
                <div className="mt-4">
                  <Progress value={pct} />
                  <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="size-3 animate-spin" /> Uploading revision…
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
            <FileText className="size-4" /> Attached manuscript: {m.fileName ?? "—"}
          </div>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}