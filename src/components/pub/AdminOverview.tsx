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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const KPIS = [
  { label: "Total Authors", value: 148, delta: "+12 this month", icon: Users },
  { label: "Total Editors", value: 16, delta: "3 onboarding", icon: PenLine },
  { label: "Active Manuscripts", value: 62, delta: "+8 this week", icon: FileText },
  { label: "Pending Approvals", value: 9, delta: "4 overdue", icon: Clock },
  { label: "Published Books", value: 231, delta: "+5 in Q3", icon: BookCheck },
];

const PIPELINE = [
  { stage: "Submitted", count: 18 },
  { stage: "Assigned", count: 12 },
  { stage: "Editing", count: 15 },
  { stage: "Review", count: 9 },
  { stage: "Proofreading", count: 6 },
  { stage: "Design", count: 4 },
  { stage: "Published", count: 231 },
];

const ACTIVITY = [
  { actor: "Nina Okoro", action: "approved “The Quantum Paradigm” for proofreading", time: "12 min ago" },
  { actor: "Amara Nwosu", action: "submitted a revised draft of “Echoes of Tomorrow”", time: "1 h ago" },
  { actor: "Admin", action: "assigned Daniel Reyes to “Salt & Cartography”", time: "3 h ago" },
  { actor: "Priya Shah", action: "requested revisions on “The Ledger of Small Hours”", time: "Yesterday" },
  { actor: "Design Studio", action: "uploaded final cover art for “Nightfall Arithmetic”", time: "Yesterday" },
  { actor: "System", action: "published “A Grammar of Rivers” to distribution", time: "2 days ago" },
];

const DEADLINES = [
  { title: "The Quantum Paradigm", task: "Proofreading sign-off", due: "Aug 08, 2026", urgency: "Due in 4 days" },
  { title: "Echoes of Tomorrow", task: "Author revision deadline", due: "Aug 11, 2026", urgency: "Due in 7 days" },
  { title: "Salt & Cartography", task: "Editorial review", due: "Aug 15, 2026", urgency: "Due in 11 days" },
  { title: "Nightfall Arithmetic", task: "Print-ready handover", due: "Aug 21, 2026", urgency: "Due in 17 days" },
];

const WORKLOAD = [
  { name: "Nina Okoro", active: 9, capacity: 10 },
  { name: "Daniel Reyes", active: 6, capacity: 10 },
  { name: "Priya Shah", active: 4, capacity: 10 },
  { name: "Marcus Feld", active: 2, capacity: 10 },
];

const QUICK_ACTIONS = [
  { label: "Assign Editor", icon: UserCog },
  { label: "Approve Manuscript", icon: CheckCircle2 },
  { label: "Add Author", icon: UserPlus },
  { label: "Publish Book", icon: Send },
];

function Panel({ title, subtitle, children, className }: { title: string; subtitle?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-xl border border-border bg-card", className)}>
      <div className="border-b border-border px-5 py-4">
        <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

export function AdminOverview({ name }: { name?: string }) {
  return (
    <div className="space-y-6">
      {/* Welcome */}
      <section className="rounded-xl border border-border bg-card px-5 py-6 sm:px-6">
        <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Admin overview</p>
        <h1 className="mt-2 font-serif text-2xl tracking-tight sm:text-3xl">
          Welcome back{name ? `, ${name}` : ""}.
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Nine manuscripts are waiting on approval and four editors are near capacity. Here is the state of the press today.
        </p>
      </section>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {KPIS.map((k) => (
          <div key={k.label} className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{k.label}</p>
              <k.icon className="size-4 text-muted-foreground" />
            </div>
            <p className="mt-3 text-3xl font-semibold tracking-tight">{k.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{k.delta}</p>
          </div>
        ))}
      </div>

      {/* Pipeline */}
      <Panel title="Publishing pipeline" subtitle="Manuscripts currently at each stage">
        <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
          {PIPELINE.map((s, i) => (
            <div
              key={s.stage}
              className={cn(
                "rounded-lg border border-border bg-background p-4",
                i === PIPELINE.length - 1 && "border-foreground bg-foreground text-background",
              )}
            >
              <p className={cn("text-xs uppercase tracking-wide", i === PIPELINE.length - 1 ? "text-background/70" : "text-muted-foreground")}>
                Stage {i + 1}
              </p>
              <p className="mt-2 text-2xl font-semibold tracking-tight">{s.count}</p>
              <p className="mt-1 text-xs font-medium">{s.stage}</p>
            </div>
          ))}
        </div>
      </Panel>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent activity */}
        <Panel title="Recent activity">
          <ul className="divide-y divide-border">
            {ACTIVITY.map((a, i) => (
              <li key={i} className="flex gap-3 px-5 py-3">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-foreground" />
                <div className="min-w-0">
                  <p className="text-sm">
                    <span className="font-medium">{a.actor}</span> {a.action}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{a.time}</p>
                </div>
              </li>
            ))}
          </ul>
        </Panel>

        {/* Deadlines */}
        <Panel title="Upcoming deadlines">
          <ul className="divide-y divide-border">
            {DEADLINES.map((d) => (
              <li key={d.title} className="flex items-start justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{d.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{d.task}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="flex items-center gap-1.5 text-xs font-medium">
                    <CalendarDays className="size-3.5" />
                    {d.due}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{d.urgency}</p>
                </div>
              </li>
            ))}
          </ul>
        </Panel>

        {/* Editor workload */}
        <Panel title="Editor workload" subtitle="Active manuscripts against capacity">
          <ul className="divide-y divide-border">
            {WORKLOAD.map((e) => {
              const pct = Math.round((e.active / e.capacity) * 100);
              return (
                <li key={e.name} className="px-5 py-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{e.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {e.active}/{e.capacity} · {pct >= 80 ? "At capacity" : pct >= 50 ? "Balanced" : "Available"}
                    </span>
                  </div>
                  <Progress value={pct} className="mt-2 h-1.5" />
                </li>
              );
            })}
          </ul>
        </Panel>

        {/* Quick actions */}
        <Panel title="Quick actions">
          <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2">
            {QUICK_ACTIONS.map((a) => (
              <Button key={a.label} variant="outline" className="justify-start gap-2">
                <a.icon className="size-4" />
                {a.label}
              </Button>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
