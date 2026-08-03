import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Loader2, ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { toast } from "sonner";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AppShell } from "@/components/pub/AppShell";
import { StatusBadge } from "@/components/pub/StatusBadge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import * as service from "@/services/manuscriptService";
import { REJECTION_REASONS } from "@/services/mockData";
import { useApp } from "@/store/app-store";
import type { ManuscriptSortKey, SortDirection } from "@/services/types";

export const Route = createFileRoute("/editor")({
  head: () => ({
    meta: [
      { title: "Editor Review Queue — LOREM" },
      { name: "description", content: "Review pending manuscripts and approve, request revisions, or reject." },
      { property: "og:title", content: "Editor Review Queue — LOREM" },
      { property: "og:description", content: "Editorial decisions with structured feedback and rejection reasons." },
    ],
  }),
  component: EditorPage,
});

type Decision = "approve" | "revise" | "reject";

const decisionSchema = z
  .object({
    decision: z.enum(["approve", "revise", "reject"]),
    reason: z.string().optional(),
    feedback: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    if (values.decision === "revise" && !values.feedback?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["feedback"],
        message: "Feedback is required when requesting revisions.",
      });
    }
    if (values.decision === "reject") {
      if (!values.reason) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["reason"],
          message: "A rejection reason and explanation are both required.",
        });
      }
      if (!values.feedback?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["feedback"],
          message: "A rejection reason and explanation are both required.",
        });
      }
    }
  });

type DecisionForm = z.infer<typeof decisionSchema>;

const PAGE_SIZE = 5;

function EditorPage() {
  const { manuscripts, loading, refresh, user } = useApp();
  const [openId, setOpenId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<ManuscriptSortKey>("submittedAt");
  const [sortDir, setSortDir] = useState<SortDirection>("desc");
  const [page, setPage] = useState(1);

  const {
    control,
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<DecisionForm>({
    resolver: zodResolver(decisionSchema),
    defaultValues: { decision: "approve", reason: "", feedback: "" },
  });
  const decision = watch("decision");
  const formError =
    errors.reason?.message ?? errors.feedback?.message ?? errors.decision?.message ?? null;

  const pending = useMemo(
    () =>
      service.sortManuscripts(
        manuscripts.filter((m) => m.state === "Pending Editor Review" || m.state === "AI Processing"),
        sortBy,
        sortDir,
      ),
    [manuscripts, sortBy, sortDir],
  );

  const totalPages = Math.max(1, Math.ceil(pending.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const rows = pending.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function toggleSort(key: ManuscriptSortKey) {
    if (sortBy === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key);
      setSortDir("desc");
    }
    setPage(1);
  }

  function SortIcon({ column }: { column: ManuscriptSortKey }) {
    if (sortBy !== column) return <ChevronsUpDown className="size-3 opacity-50" />;
    return sortDir === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />;
  }

  function closeDialog() {
    setOpenId(null);
    reset({ decision: "approve", reason: "", feedback: "" });
  }

  const submit = handleSubmit(async (values) => {
    if (!openId) return;
    try {
      await service.addEditorDecision(
        openId,
        values.decision as Decision,
        user?.name ?? "Editor",
        values.feedback?.trim() || undefined,
        values.reason || undefined,
      );
      await refresh();
      closeDialog();
      toast.success("Decision recorded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unable to record decision");
    }
  });

  return (
    <AppShell allow={["editor"]}>
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Editor review workspace</h1>
      <p className="mt-1 text-sm text-muted-foreground">Manuscripts awaiting an editorial decision.</p>

      <section className="mt-6 rounded-xl border border-border bg-card">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading queue…
          </div>
        ) : pending.length === 0 ? (
          <p className="px-5 py-16 text-center text-sm text-muted-foreground">
            The review queue is empty. New submissions will appear here.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-5 py-3 font-medium">
                    <button
                      type="button"
                      onClick={() => toggleSort("submittedAt")}
                      className="inline-flex items-center gap-1 uppercase tracking-wide"
                    >
                      Manuscript <SortIcon column="submittedAt" />
                    </button>
                  </th>
                  <th className="px-5 py-3 font-medium">
                    <button
                      type="button"
                      onClick={() => toggleSort("author")}
                      className="inline-flex items-center gap-1 uppercase tracking-wide"
                    >
                      Author <SortIcon column="author" />
                    </button>
                  </th>
                  <th className="px-5 py-3 font-medium">State</th>
                  <th className="px-5 py-3 font-medium">
                    <button
                      type="button"
                      onClick={() => toggleSort("aiScore")}
                      className="inline-flex items-center gap-1 uppercase tracking-wide"
                    >
                      AI Score <SortIcon column="aiScore" />
                    </button>
                  </th>
                  <th className="px-5 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((m) => (
                  <tr key={m.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                    <td className="px-5 py-4">
                      <p className="font-medium">{m.title}</p>
                      <p className="text-xs text-muted-foreground">{m.id}</p>
                    </td>
                    <td className="px-5 py-4 text-muted-foreground">{m.author}</td>
                    <td className="px-5 py-4">
                      <StatusBadge state={m.state} />
                    </td>
                    <td className="px-5 py-4 tabular-nums">{m.ai ? `${m.ai.score}%` : "—"}</td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <Button asChild variant="outline" size="sm">
                          <Link to="/manuscript/$id" params={{ id: m.id }}>
                            Open
                          </Link>
                        </Button>
                        <Button
                          size="sm"
                          disabled={m.state !== "Pending Editor Review"}
                          onClick={() => setOpenId(m.id)}
                        >
                          Make decision
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && pending.length > PAGE_SIZE && (
          <div className="border-t border-border px-5 py-3">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setPage(Math.max(1, currentPage - 1));
                    }}
                  />
                </PaginationItem>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <PaginationItem key={p}>
                    <PaginationLink
                      href="#"
                      isActive={p === currentPage}
                      onClick={(e) => {
                        e.preventDefault();
                        setPage(p);
                      }}
                    >
                      {p}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setPage(Math.min(totalPages, currentPage + 1));
                    }}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </section>

      <Dialog
        open={!!openId}
        onOpenChange={(o) => {
          if (!o && !isSubmitting) closeDialog();
        }}
      >
        <DialogContent
          className="max-h-[85vh] overflow-y-auto"
          onInteractOutside={(e) => isSubmitting && e.preventDefault()}
          onEscapeKeyDown={(e) => isSubmitting && e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>Editorial decision</DialogTitle>
            <DialogDescription>Your decision is logged in the manuscript audit timeline.</DialogDescription>
          </DialogHeader>

          <Controller
            control={control}
            name="decision"
            render={({ field }) => (
              <RadioGroup value={field.value} onValueChange={field.onChange} className="gap-3">
                {[
                  { id: "approve", label: "Approve Manuscript" },
                  { id: "revise", label: "Request Revisions" },
                  { id: "reject", label: "Reject Manuscript" },
                ].map((o) => (
                  <label key={o.id} className="flex items-center gap-3 rounded-lg border border-border p-3 text-sm">
                    <RadioGroupItem value={o.id} id={o.id} />
                    {o.label}
                  </label>
                ))}
              </RadioGroup>
            )}
          />

          {decision === "reject" && (
            <div className="space-y-2">
              <Label>Rejection reason</Label>
              <Controller
                control={control}
                name="reason"
                render={({ field }) => (
                  <Select value={field.value ?? ""} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a reason" />
                    </SelectTrigger>
                    <SelectContent>
                      {REJECTION_REASONS.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          )}

          {decision !== "approve" && (
            <div className="space-y-2">
              <Label htmlFor="fb">{decision === "reject" ? "Explanation" : "Revision feedback"}</Label>
              <Textarea id="fb" rows={5} {...register("feedback")} />
            </div>
          )}

          {formError && <p className="text-xs text-destructive">{formError}</p>}

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={() => void submit()} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="size-4 animate-spin" />}
              Submit decision
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}