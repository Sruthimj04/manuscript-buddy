import { useMemo, useState } from "react";
import { ArrowUpDown, Download, Loader2, Search, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { StatusBadge } from "@/components/pub/StatusBadge";
import { EmptyState } from "@/components/pub/admin/Panel";
import { cn } from "@/lib/utils";
import { formatDate, publishingMeta, stageOf } from "@/services/publishingMeta";
import type { PipelineStage } from "@/services/publishingMeta";
import { WORKFLOW_STATES, type Manuscript, type WorkflowState } from "@/services/types";

export interface TableFilter {
  label: string;
  states?: WorkflowState[] | undefined;
  stage?: PipelineStage | undefined;
}

type SortKey = "title" | "author" | "state" | "submittedAt" | "aiScore";

const PAGE_SIZE = 8;

const PRIORITY_STYLE = {
  High: "border-foreground bg-foreground text-background",
  Medium: "border-foreground/40 bg-background text-foreground",
  Low: "border-border bg-muted text-muted-foreground",
} as const;

export function ManuscriptTable({
  manuscripts,
  loading,
  editors,
  busyId,
  filter,
  onClearFilter,
  onOpen,
  onAssign,
  onForceState,
  onPublish,
}: {
  manuscripts: Manuscript[];
  loading: boolean;
  editors: string[];
  busyId: string | null;
  filter: TableFilter | null;
  onClearFilter: () => void;
  onOpen: (m: Manuscript) => void;
  onAssign: (id: string, editor: string) => void;
  onForceState: (id: string, state: WorkflowState) => void;
  onPublish: (id: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState<string>("all");
  const [editorFilter, setEditorFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "submittedAt", dir: "desc" });
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = manuscripts.filter((m) => {
      const meta = publishingMeta(m);
      if (q && ![m.title, m.author, m.id, m.genre, m.editor ?? ""].join(" ").toLowerCase().includes(q)) return false;
      if (filter?.states && !filter.states.includes(m.state)) return false;
      if (filter?.stage && stageOf(m) !== filter.stage) return false;
      if (stateFilter !== "all" && m.state !== stateFilter) return false;
      if (editorFilter !== "all" && (m.editor ?? "Unassigned") !== editorFilter) return false;
      if (priorityFilter !== "all" && meta.priority !== priorityFilter) return false;
      return true;
    });
    const dir = sort.dir === "asc" ? 1 : -1;
    list = [...list].sort((a, b) => {
      const val = (m: Manuscript) =>
        sort.key === "aiScore"
          ? (m.ai?.score ?? -1)
          : sort.key === "submittedAt"
            ? new Date(m.submittedAt).getTime()
            : String(m[sort.key]).toLowerCase();
      const av = val(a);
      const bv = val(b);
      return av === bv ? 0 : av > bv ? dir : -dir;
    });
    return list;
  }, [manuscripts, search, filter, stateFilter, editorFilter, priorityFilter, sort]);

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const current = Math.min(page, totalPages);
  const pageRows = rows.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const allSelected = pageRows.length > 0 && pageRows.every((m) => selected.includes(m.id));

  function toggleSort(key: SortKey) {
    setSort((s) => ({ key, dir: s.key === key && s.dir === "desc" ? "asc" : "desc" }));
  }

  function Th({ label, sortKey, className }: { label: string; sortKey?: SortKey; className?: string }) {
    return (
      <th className={cn("px-5 py-3 font-medium", className)}>
        {sortKey ? (
          <button
            type="button"
            onClick={() => toggleSort(sortKey)}
            className="inline-flex items-center gap-1 uppercase tracking-wide transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {label}
            <ArrowUpDown className={cn("size-3", sort.key === sortKey ? "text-foreground" : "opacity-50")} />
          </button>
        ) : (
          label
        )}
      </th>
    );
  }

  return (
    <section className="rounded-xl border border-border bg-card">
      <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-4">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search titles, authors, IDs, editors…"
            aria-label="Search manuscripts"
            className="pl-9"
          />
        </div>
        <Select
          value={stateFilter}
          onValueChange={(v) => {
            setStateFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-44" aria-label="Filter by state">
            <SelectValue placeholder="All states" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All states</SelectItem>
            {[...WORKFLOW_STATES, "Rejected"].map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={editorFilter} onValueChange={(v) => { setEditorFilter(v); setPage(1); }}>
          <SelectTrigger className="w-40" aria-label="Filter by editor">
            <SelectValue placeholder="All editors" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All editors</SelectItem>
            {editors.map((e) => (
              <SelectItem key={e} value={e}>
                {e}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={(v) => { setPriorityFilter(v); setPage(1); }}>
          <SelectTrigger className="w-36" aria-label="Filter by priority">
            <SelectValue placeholder="All priorities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            <SelectItem value="High">High</SelectItem>
            <SelectItem value="Medium">Medium</SelectItem>
            <SelectItem value="Low">Low</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => toast.success("Export queued — CSV will be emailed")}>
          <Download className="size-4" /> Export
        </Button>
      </div>

      {filter && (
        <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-5 py-2 text-xs">
          <span className="text-muted-foreground">Filtered by</span>
          <span className="rounded-full border border-foreground bg-foreground px-2 py-0.5 font-medium text-background">
            {filter.label}
          </span>
          <button
            type="button"
            onClick={onClearFilter}
            className="inline-flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="size-3" /> Clear
          </button>
        </div>
      )}

      {selected.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 border-b border-border bg-muted/40 px-5 py-2 text-xs">
          <span className="font-medium">{selected.length} selected</span>
          <Button size="sm" variant="outline" onClick={() => toast.success("Bulk editor assignment opened")}>
            Assign editor
          </Button>
          <Button size="sm" variant="outline" onClick={() => toast.success("Export queued for selection")}>
            Export selection
          </Button>
          <button type="button" onClick={() => setSelected([])} className="text-muted-foreground hover:text-foreground">
            Clear selection
          </button>
        </div>
      )}

      {loading ? (
        <div className="space-y-3 p-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          title="No manuscripts match these filters"
          hint="Try clearing the search or filters to see the full pipeline."
        />
      ) : (
        <div className="max-h-[640px] overflow-auto">
          <table className="w-full min-w-[1080px] text-sm">
            <thead className="sticky top-0 z-10 bg-card">
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-5 py-3">
                  <Checkbox
                    checked={allSelected}
                    aria-label="Select all on page"
                    onCheckedChange={(v) =>
                      setSelected(v ? Array.from(new Set([...selected, ...pageRows.map((m) => m.id)])) : [])
                    }
                  />
                </th>
                <Th label="Manuscript" sortKey="title" />
                <Th label="Author" sortKey="author" />
                <Th label="State" sortKey="state" />
                <Th label="Priority" />
                <Th label="Submitted" sortKey="submittedAt" />
                <Th label="Editor" />
                <Th label="Force state" />
                <Th label="Actions" className="text-right" />
              </tr>
            </thead>
            <tbody>
              {pageRows.map((m) => {
                const meta = publishingMeta(m);
                return (
                  <tr
                    key={m.id}
                    onClick={() => onOpen(m)}
                    className="cursor-pointer border-b border-border transition-colors last:border-0 hover:bg-muted/50"
                  >
                    <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selected.includes(m.id)}
                        aria-label={`Select ${m.title}`}
                        onCheckedChange={(v) =>
                          setSelected((s) => (v ? [...s, m.id] : s.filter((id) => id !== m.id)))
                        }
                      />
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-medium">{m.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {m.id} · AI {m.ai ? `${m.ai.score}%` : "—"} · {meta.version}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-muted-foreground">{m.author}</td>
                    <td className="px-5 py-4">
                      <StatusBadge state={m.state} />
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={cn(
                          "inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium",
                          PRIORITY_STYLE[meta.priority],
                        )}
                      >
                        {meta.priority}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs text-muted-foreground">{formatDate(m.submittedAt)}</td>
                    <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                      <Select value={m.editor ?? "Unassigned"} onValueChange={(v) => onAssign(m.id, v)}>
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {editors.map((e) => (
                            <SelectItem key={e} value={e}>
                              {e}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                      <Select value={m.state} onValueChange={(v) => onForceState(m.id, v as WorkflowState)}>
                        <SelectTrigger className="w-48">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[...WORKFLOW_STATES, "Rejected"].map((s) => (
                            <SelectItem key={s} value={s}>
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => onOpen(m)}>
                          Open
                        </Button>
                        <Button size="sm" disabled={m.state !== "Approved" || busyId === m.id} onClick={() => onPublish(m.id)}>
                          {busyId === m.id && <Loader2 className="size-4 animate-spin" />}
                          Publish Final
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!loading && rows.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-3">
          <p className="text-xs text-muted-foreground">
            Showing {(current - 1) * PAGE_SIZE + 1}–{Math.min(current * PAGE_SIZE, rows.length)} of {rows.length}
          </p>
          <Pagination className="mx-0 w-auto justify-end">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setPage(Math.max(1, current - 1));
                  }}
                />
              </PaginationItem>
              {Array.from({ length: totalPages }).map((_, i) => (
                <PaginationItem key={i}>
                  <PaginationLink
                    href="#"
                    isActive={current === i + 1}
                    onClick={(e) => {
                      e.preventDefault();
                      setPage(i + 1);
                    }}
                  >
                    {i + 1}
                  </PaginationLink>
                </PaginationItem>
              ))}
              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setPage(Math.min(totalPages, current + 1));
                  }}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </section>
  );
}