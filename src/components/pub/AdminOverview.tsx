import { useState } from "react";
import {
  Users,
  PenLine,
  FileText,
  Clock,
  BookCheck,
  UserPlus,
  CheckCircle2,
  Send,
  UserCog,
  CalendarDays,
  AlertTriangle,
  ArrowUpRight,
  Sparkles,
  MessageSquare,
  Upload,
  Timer,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { Panel, EmptyState, RowSkeleton } from "@/components/pub/admin/Panel";
import {
  PIPELINE_STAGES,
  STAGE_BASELINE,
  formatDate,
  publishingMeta,
  relativeDue,
  stageOf,
  type PipelineStage,
} from "@/services/publishingMeta";
import type { Manuscript, WorkflowState } from "@/services/types";

export interface OverviewFilter {
  label: string;
  states?: WorkflowState[];
  stage?: PipelineStage;
  onlyOverdue?: boolean;
}

interface Props {
  name?: string;
  manuscripts: Manuscript[];
  loading: boolean;
  onFilter: (filter: OverviewFilter) => void;
  onOpen: (id: string) => void;
}

/** Demo staffing figures — the mock service has no editor records. */
const EDITOR_STATS = [
  { name: "Nina Okoro", capacity: 10, baseActive: 8, avgReviewDays: 3.2, completed: 14, overdue: 2 },
  { name: "Daniel Reyes", capacity: 10, baseActive: 5, avgReviewDays: 4.6, completed: 9, overdue: 1 },
  { name: "Priya Shah", capacity: 8, baseActive: 3, avgReviewDays: 2.8, completed: 11, overdue: 0 },
  { name: "Marcus Feld", capacity: 8, baseActive: 1, avgReviewDays: 5.4, completed: 4, overdue: 0 },
];

const DEMO_ACTIVITY = [
  { actor: "Admin", action: "assigned Daniel Reyes to “Salt & Cartography”", time: "3 h ago", kind: "assign" as const },
  { actor: "Design Studio", action: "uploaded final cover art for “Nightfall Arithmetic”", time: "Yesterday", kind: "upload" as const },
  { actor: "System", action: "published “A Grammar of Rivers” to distribution", time: "2 days ago", kind: "publish" as const },
];

const ACTIVITY_ICON = {
  submit: Upload,
  assign: UserCog,
  revision: MessageSquare,
  approve: CheckCircle2,
  publish: Send,
  ai: Sparkles,
  upload: Upload,
} as const;

type ActivityKind = keyof typeof ACTIVITY_ICON;

function classify(action: string): ActivityKind {
  const a = action.toLowerCase();
  if (a.includes("publish")) return "publish";
  if (a.includes("approve")) return "approve";
  if (a.includes("revision")) return "revision";
  if (a.includes("assign") || a.includes("editor set")) return "assign";
  if (a.includes("ai")) return "ai";
  if (a.includes("upload")) return "upload";
  return "submit";
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 60) return `${Math.max(1, mins)} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "Yesterday" : `${days} days ago`;
}

function Badge({ children, tone = "muted" }: { children: React.ReactNode; tone?: "muted" | "solid" | "outline" | "alert" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium",
        tone === "muted" && "border-border bg-muted text-muted-foreground",
        tone === "outline" && "border-foreground/40 bg-background text-foreground",
        tone === "solid" && "border-foreground bg-foreground text-background",
        tone === "alert" && "border-destructive bg-destructive/10 text-destructive",
      )}
    >
      {children}
    </span>
  );
}

export function AdminOverview({ name, manuscripts, loading, onFilter, onOpen }: Props) {
  const [confirm, setConfirm] = useState<{ title: string; description: string; confirmLabel: string } | null>(null);

  const metas = manuscripts.map((m) => ({ m, meta: publishingMeta(m) }));
  const active = manuscripts.filter((m) => m.state !== "Published" && m.state !== "Rejected");
  const pending = manuscripts.filter((m) => m.state === "Pending Editor Review");
  const published = manuscripts.filter((m) => m.state === "Published");
  const authors = new Set(manuscripts.map((m) => m.author)).size;
  const overdueCount = metas.filter(({ meta }) => meta.overdue).length;

  const kpis = [
    {
      label: "Total Authors",
      value: 148 + authors,
      delta: "+12 this month",
      icon: Users,
      filter: { label: "All manuscripts" } satisfies OverviewFilter,
    },
    {
      label: "Total Editors",
      value: EDITOR_STATS.length + 12,
      delta: "3 onboarding",
      icon: PenLine,
      filter: { label: "Assigned manuscripts", states: ["Pending Editor Review", "Revisions Requested"] } satisfies OverviewFilter,
    },
    {
      label: "Active Manuscripts",
      value: 60 + active.length,
      delta: "+8 this week",
      icon: FileText,
      filter: {
        label: "Active manuscripts",
        states: ["Draft", "AI Processing", "Pending Editor Review", "Revisions Requested", "Approved"],
      } satisfies OverviewFilter,
    },
    {
      label: "Pending Approvals",
      value: 8 + pending.length,
      delta: `${overdueCount + 4} overdue`,
      icon: Clock,
      filter: { label: "Pending approvals", states: ["Pending Editor Review"] } satisfies OverviewFilter,
    },
    {
      label: "Published Books",
      value: 231 + published.length,
      delta: "+5 in Q3",
      icon: BookCheck,
      filter: { label: "Published books", states: ["Published"] } satisfies OverviewFilter,
    },
  ];

  const stages = PIPELINE_STAGES.map((stage, i) => {
    const live = metas.filter(({ m }) => stageOf(m) === stage);
    const count = STAGE_BASELINE[stage] + live.length;
    const overdue = live.filter(({ meta }) => meta.overdue).length + (stage === "Editing" ? 5 : stage === "Review" ? 3 : 1);
    const newToday = live.filter(({ meta }) => meta.daysToDue >= 13).length + (stage === "Submitted" ? 4 : stage === "Assigned" ? 2 : 0);
    const completion = Math.round(((i + 1) / PIPELINE_STAGES.length) * 100);
    const bottleneck = stage !== "Published" && overdue / Math.max(count, 1) > 0.28;
    return { stage, count, overdue, newToday, completion, bottleneck };
  });

  const liveActivity = manuscripts
    .flatMap((m) => m.timeline.map((t) => ({ ...t, manuscriptId: m.id, title: m.title })))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 4);

  const deadlines = [...metas]
    .filter(({ m }) => m.state !== "Published" && m.state !== "Rejected")
    .sort((a, b) => a.meta.daysToDue - b.meta.daysToDue)
    .slice(0, 5);

  const quickActions = [
    {
      label: "Assign Editor",
      description: "Route an unassigned manuscript to an available editor.",
      icon: UserCog,
      confirm: null,
    },
    {
      label: "Approve Manuscript",
      description: "Clear a reviewed manuscript for proofreading.",
      icon: CheckCircle2,
      confirm: {
        title: "Approve manuscript?",
        description: "This moves the selected manuscript into proofreading and notifies the assigned editor.",
        confirmLabel: "Approve",
      },
    },
    {
      label: "Add Author",
      description: "Invite a new author to the LOREM press workspace.",
      icon: UserPlus,
      confirm: null,
    },
    {
      label: "Publish Book",
      description: "Release a print-ready title to distribution channels.",
      icon: Send,
      confirm: {
        title: "Publish to distribution?",
        description: "Publishing is irreversible from this panel and pushes the title to all distribution partners.",
        confirmLabel: "Publish",
      },
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <section className="rounded-xl border border-border bg-card px-5 py-6 sm:px-6">
        <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Admin overview</p>
        <h1 className="mt-2 font-serif text-2xl tracking-tight sm:text-3xl">Welcome back{name ? `, ${name}` : ""}.</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          {loading
            ? "Loading today's pipeline snapshot…"
            : `${8 + pending.length} manuscripts are waiting on approval and ${overdueCount + 4} tasks are past due. Here is the state of the press today.`}
        </p>
      </section>

      {/* KPIs */}
      <div>
        <div className="mb-3">
          <h2 className="text-sm font-semibold tracking-tight">Key metrics</h2>
          <p className="mt-1 text-xs text-muted-foreground">Select a card to filter the submissions table below.</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {loading
            ? Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-border bg-card p-5">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="mt-4 h-8 w-16" />
                  <Skeleton className="mt-3 h-3 w-20" />
                </div>
              ))
            : kpis.map((k) => (
                <button
                  key={k.label}
                  type="button"
                  onClick={() => onFilter(k.filter)}
                  className="group rounded-xl border border-border bg-card p-5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-foreground/40 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">{k.label}</p>
                    <k.icon className="size-4 text-muted-foreground transition-colors group-hover:text-foreground" />
                  </div>
                  <p className="mt-3 text-3xl font-semibold tracking-tight tabular-nums">{k.value}</p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    {k.delta}
                    <ArrowUpRight className="size-3 opacity-0 transition-opacity group-hover:opacity-100" />
                  </p>
                </button>
              ))}
        </div>
      </div>

      {/* Pipeline */}
      <Panel
        title="Publishing pipeline"
        description="Manuscript volume at each stage. Bottlenecks are flagged automatically — select a stage to filter the table."
      >
        {loading ? (
          <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
            {stages.map((s, i) => {
              const last = i === stages.length - 1;
              return (
                <button
                  key={s.stage}
                  type="button"
                  onClick={() => onFilter({ label: `${s.stage} stage`, stage: s.stage })}
                  className={cn(
                    "rounded-lg border border-border bg-background p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-foreground/50 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    last && "border-foreground bg-foreground text-background hover:border-foreground",
                    s.bottleneck && !last && "border-foreground ring-1 ring-foreground/20",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <p className={cn("text-xs uppercase tracking-wide", last ? "text-background/70" : "text-muted-foreground")}>
                      Stage {i + 1}
                    </p>
                    {s.bottleneck && !last && <AlertTriangle className="size-3.5" />}
                  </div>
                  <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">{s.count}</p>
                  <p className="mt-1 text-xs font-medium">{s.stage}</p>
                  <dl className={cn("mt-3 space-y-1 text-[11px]", last ? "text-background/70" : "text-muted-foreground")}>
                    <div className="flex justify-between gap-2">
                      <dt>Overdue</dt>
                      <dd className="tabular-nums font-medium">{s.overdue}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt>New today</dt>
                      <dd className="tabular-nums font-medium">{s.newToday}</dd>
                    </div>
                  </dl>
                  <div className={cn("mt-3 h-1 w-full overflow-hidden rounded-full", last ? "bg-background/25" : "bg-muted")}>
                    <div
                      className={cn("h-full rounded-full transition-all", last ? "bg-background" : "bg-foreground")}
                      style={{ width: `${s.completion}%` }}
                    />
                  </div>
                  <p className={cn("mt-1 text-[11px]", last ? "text-background/70" : "text-muted-foreground")}>
                    {s.completion}% through pipeline
                  </p>
                  {s.bottleneck && !last && <p className="mt-2 text-[11px] font-medium">Bottleneck detected</p>}
                </button>
              );
            })}
          </div>
        )}
      </Panel>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent activity */}
        <Panel title="Recent activity" description="Latest editorial events across the press. Select an entry to open the manuscript.">
          {loading ? (
            <RowSkeleton rows={4} />
          ) : (
            <ul className="divide-y divide-border">
              {liveActivity.map((a) => {
                const kind = classify(a.action);
                const Icon = ACTIVITY_ICON[kind];
                return (
                  <li key={a.id + a.manuscriptId}>
                    <button
                      type="button"
                      onClick={() => onOpen(a.manuscriptId)}
                      className="flex w-full items-start gap-3 px-5 py-3 text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                    >
                      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border border-border bg-muted">
                        <Icon className="size-3.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm">
                          <span className="font-medium">{a.actor}</span> {a.action.toLowerCase()} on “{a.title}”
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <Badge tone={kind === "publish" || kind === "approve" ? "solid" : "muted"}>{kind}</Badge>
                          <span className="text-xs text-muted-foreground">{timeAgo(a.timestamp)}</span>
                        </div>
                      </div>
                      <ArrowUpRight className="mt-1 size-4 shrink-0 text-muted-foreground" />
                    </button>
                  </li>
                );
              })}
              {DEMO_ACTIVITY.map((a, i) => {
                const Icon = ACTIVITY_ICON[a.kind];
                return (
                  <li key={`demo-${i}`} className="flex items-start gap-3 px-5 py-3">
                    <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border border-border bg-muted">
                      <Icon className="size-3.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm">
                        <span className="font-medium">{a.actor}</span> {a.action}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <Badge tone={a.kind === "publish" ? "solid" : "muted"}>{a.kind}</Badge>
                        <span className="text-xs text-muted-foreground">{a.time}</span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        {/* Deadlines */}
        <Panel title="Upcoming deadlines" description="Editorial commitments ranked by urgency. Overdue and same-day items are flagged.">
          {loading ? (
            <RowSkeleton rows={4} />
          ) : deadlines.length === 0 ? (
            <EmptyState title="No open deadlines" hint="Every active manuscript is on schedule." />
          ) : (
            <ul className="divide-y divide-border">
              {deadlines.map(({ m, meta }) => (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => onOpen(m.id)}
                    className="flex w-full items-start justify-between gap-3 px-5 py-3 text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{m.title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{meta.editorialStage} · {m.editor ?? "Unassigned"}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        {meta.overdue && <Badge tone="alert">Overdue</Badge>}
                        {meta.dueToday && <Badge tone="solid">Due today</Badge>}
                        {meta.priority === "High" && <Badge tone="outline">High priority</Badge>}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="flex items-center justify-end gap-1.5 text-xs font-medium">
                        <CalendarDays className="size-3.5" />
                        {formatDate(meta.dueDate)}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{relativeDue(meta.daysToDue)}</p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {/* Editor workload */}
        <Panel title="Editor workload" description="Capacity, throughput and overdue tasks for the editorial team this month.">
          {loading ? (
            <RowSkeleton rows={4} />
          ) : (
            <ul className="divide-y divide-border">
              {EDITOR_STATS.map((e) => {
                const live = manuscripts.filter((m) => m.editor === e.name && m.state !== "Published").length;
                const activeCount = Math.min(e.capacity, e.baseActive + live);
                const pct = Math.round((activeCount / e.capacity) * 100);
                const availability = pct >= 90 ? "At capacity" : pct >= 60 ? "Balanced" : "Available";
                return (
                  <li key={e.name} className="px-5 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="flex size-8 items-center justify-center rounded-full bg-foreground text-xs font-semibold text-background">
                          {e.name.charAt(0)}
                        </span>
                        <div>
                          <p className="text-sm font-medium">{e.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {activeCount}/{e.capacity} active manuscripts
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Badge tone={pct >= 90 ? "solid" : pct >= 60 ? "outline" : "muted"}>{availability}</Badge>
                        {e.overdue > 0 && (
                          <Badge tone="alert">
                            <AlertTriangle className="size-3" /> {e.overdue} overdue
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Progress value={pct} className="mt-3 h-1.5" />
                    <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
                      <div className="rounded-md border border-border bg-background px-2.5 py-2">
                        <dt className="flex items-center gap-1 text-[11px] text-muted-foreground">
                          <Timer className="size-3" /> Avg review
                        </dt>
                        <dd className="mt-0.5 font-medium tabular-nums">{e.avgReviewDays} days</dd>
                      </div>
                      <div className="rounded-md border border-border bg-background px-2.5 py-2">
                        <dt className="flex items-center gap-1 text-[11px] text-muted-foreground">
                          <TrendingUp className="size-3" /> Completed
                        </dt>
                        <dd className="mt-0.5 font-medium tabular-nums">{e.completed} this month</dd>
                      </div>
                      <div className="rounded-md border border-border bg-background px-2.5 py-2">
                        <dt className="flex items-center gap-1 text-[11px] text-muted-foreground">
                          <Clock className="size-3" /> Overdue
                        </dt>
                        <dd className="mt-0.5 font-medium tabular-nums">{e.overdue} tasks</dd>
                      </div>
                    </dl>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        {/* Quick actions */}
        <Panel title="Quick actions" description="Common administrative operations. Destructive steps ask for confirmation.">
          <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2">
            {quickActions.map((a) => (
              <button
                key={a.label}
                type="button"
                onClick={() =>
                  a.confirm ? setConfirm(a.confirm) : toast.success(`${a.label} — workflow opened`)
                }
                className="group flex h-full flex-col items-start gap-2 rounded-lg border border-border bg-background p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-foreground/50 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <span className="flex size-8 items-center justify-center rounded-md border border-border bg-card transition-colors group-hover:bg-foreground group-hover:text-background">
                  <a.icon className="size-4" />
                </span>
                <span className="text-sm font-medium">{a.label}</span>
                <span className="text-xs text-muted-foreground">{a.description}</span>
              </button>
            ))}
          </div>
        </Panel>
      </div>

      <AlertDialog open={!!confirm} onOpenChange={(open) => !open && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm?.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirm?.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                toast.success(`${confirm?.confirmLabel ?? "Action"} confirmed`);
                setConfirm(null);
              }}
            >
              {confirm?.confirmLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export { Badge as AdminBadge };
export { Button as AdminButton };
