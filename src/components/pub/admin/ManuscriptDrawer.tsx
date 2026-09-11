import { Link } from "@tanstack/react-router";
import { BookOpen, FileText, MessageSquare, Paperclip, Sparkles, UserCog, Send, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { StatusBadge } from "@/components/pub/StatusBadge";
import { formatDate, publishingMeta } from "@/services/publishingMeta";
import type { Manuscript } from "@/services/types";

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-background px-3 py-2">
      <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium">{value}</dd>
    </div>
  );
}

function Block({ title, icon: Icon, children }: { title: string; icon: typeof BookOpen; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className="size-3.5" /> {title}
      </h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export function ManuscriptDrawer({
  manuscript,
  open,
  onOpenChange,
}: {
  manuscript: Manuscript | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!manuscript) return null;
  const meta = publishingMeta(manuscript);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader className="space-y-2">
          <SheetTitle className="font-serif text-2xl tracking-tight">{manuscript.title}</SheetTitle>
          <SheetDescription>
            {manuscript.id} · {manuscript.genre} · {meta.version}
          </SheetDescription>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge state={manuscript.state} />
            <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              {meta.priority} priority
            </span>
          </div>
        </SheetHeader>

        <div className="space-y-6 px-4 pb-8">
          <div className="flex gap-4">
            <div className="flex h-36 w-24 shrink-0 flex-col items-center justify-center rounded-md border border-dashed border-border bg-muted/50 text-center">
              <BookOpen className="size-5 text-muted-foreground" />
              <span className="mt-1 px-2 text-[10px] text-muted-foreground">Cover art pending</span>
            </div>
            <p className="text-sm text-muted-foreground">{manuscript.abstract ?? "No abstract supplied."}</p>
          </div>

          <Block title="Book information" icon={FileText}>
            <dl className="grid grid-cols-2 gap-2">
              <Field label="ISBN" value={`${meta.isbn} · ${meta.isbnStatus}`} />
              <Field label="Editorial stage" value={meta.editorialStage} />
              <Field label="Cover design" value={meta.coverStatus} />
              <Field label="Print readiness" value={meta.printReady ? "Print ready" : "Not print ready"} />
              <Field label="Publication date" value={formatDate(meta.publicationDate)} />
              <Field label="Revision requests" value={String(meta.revisionRequests)} />
            </dl>
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Proofreading progress</span>
                <span className="font-medium tabular-nums">{meta.proofreading}%</span>
              </div>
              <Progress value={meta.proofreading} className="mt-1.5 h-1.5" />
            </div>
          </Block>

          <Separator />

          <Block title="People" icon={UserCog}>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Author" value={manuscript.author} />
              <Field label="Assigned editor" value={manuscript.editor ?? "Unassigned"} />
            </div>
          </Block>

          <Separator />

          <Block title="Publishing timeline & workflow history" icon={FileText}>
            <ol className="space-y-3">
              {manuscript.timeline.map((t) => (
                <li key={t.id} className="flex gap-3">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-foreground" />
                  <div>
                    <p className="text-sm">
                      <span className="font-medium">{t.actor}</span> · {t.action}
                    </p>
                    <p className="text-xs text-muted-foreground">{new Date(t.timestamp).toLocaleString()}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Block>

          <Separator />

          <Block title="Editorial notes & comments" icon={MessageSquare}>
            {manuscript.notes.length === 0 ? (
              <p className="text-sm text-muted-foreground">No editorial notes recorded yet.</p>
            ) : (
              <ul className="space-y-3">
                {manuscript.notes.map((n) => (
                  <li key={n.id} className="rounded-md border border-border bg-background p-3">
                    <p className="text-xs font-medium">
                      {n.author} · {formatDate(n.createdAt)}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">{n.body}</p>
                  </li>
                ))}
              </ul>
            )}
          </Block>

          <Separator />

          <Block title="Attachments" icon={Paperclip}>
            <div className="rounded-md border border-border bg-background px-3 py-2 text-sm">
              {manuscript.fileName ?? "No manuscript file uploaded"}
              {manuscript.fileSize && (
                <span className="ml-2 text-xs text-muted-foreground">
                  {(manuscript.fileSize / 1_000_000).toFixed(1)} MB
                </span>
              )}
            </div>
          </Block>

          <Separator />

          <Block title="AI manuscript insights" icon={Sparkles}>
            {manuscript.ai ? (
              <div className="space-y-3">
                <dl className="grid grid-cols-3 gap-2">
                  <Field label="Overall" value={`${manuscript.ai.score}%`} />
                  <Field label="Readability" value={`${manuscript.ai.readability}%`} />
                  <Field label="Marketability" value={`${manuscript.ai.marketability}%`} />
                </dl>
                <p className="text-sm text-muted-foreground">{manuscript.ai.summary}</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">AI pre-flight has not completed for this manuscript.</p>
            )}
          </Block>

          <Separator />

          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm">
              <Link to="/manuscript/$id" params={{ id: manuscript.id }}>
                Open full record
              </Link>
            </Button>
            <Button size="sm" variant="outline" onClick={() => toast.success("Editor assignment opened")}>
              <UserCog className="size-4" /> Reassign editor
            </Button>
            <Button size="sm" variant="outline" onClick={() => toast.success("Approval workflow opened")}>
              <CheckCircle2 className="size-4" /> Approve
            </Button>
            <Button size="sm" variant="outline" onClick={() => toast.success("Publishing checklist opened")}>
              <Send className="size-4" /> Publish
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}