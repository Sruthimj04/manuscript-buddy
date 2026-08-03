import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/pub/AppShell";
import { StatusBadge } from "@/components/pub/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import * as service from "@/services/manuscriptService";
import { EDITORS } from "@/services/mockData";
import { WORKFLOW_STATES, type WorkflowState } from "@/services/types";
import { useApp } from "@/store/app-store";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin Panel — LOREM" },
      { name: "description", content: "Global pipeline oversight: assign editors, advance workflow, publish titles." },
      { property: "og:title", content: "Admin Panel — LOREM" },
      { property: "og:description", content: "Manage every submission across the publishing pipeline." },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { manuscripts, loading, refresh, user } = useApp();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function run(id: string, fn: () => Promise<unknown>, message: string) {
    setBusyId(id);
    await fn();
    await refresh();
    setBusyId(null);
    toast.success(message);
  }

  return (
    <AppShell allow={["admin"]}>
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Admin dashboard</h1>
      <p className="mt-1 text-sm text-muted-foreground">Every submission in the pipeline, with override controls.</p>

      <section className="mt-6 rounded-xl border border-border bg-card">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading pipeline…
          </div>
        ) : manuscripts.length === 0 ? (
          <p className="px-5 py-16 text-center text-sm text-muted-foreground">No submissions in the system.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-5 py-3 font-medium">Manuscript</th>
                  <th className="px-5 py-3 font-medium">Author</th>
                  <th className="px-5 py-3 font-medium">State</th>
                  <th className="px-5 py-3 font-medium">Editor</th>
                  <th className="px-5 py-3 font-medium">Force state</th>
                  <th className="px-5 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {manuscripts.map((m) => (
                  <tr key={m.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                    <td className="px-5 py-4">
                      <p className="font-medium">{m.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {m.id} · AI {m.ai ? `${m.ai.score}%` : "—"}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-muted-foreground">{m.author}</td>
                    <td className="px-5 py-4">
                      <StatusBadge state={m.state} />
                    </td>
                    <td className="px-5 py-4">
                      <Select
                        value={m.editor ?? "Unassigned"}
                        onValueChange={(v) =>
                          void run(m.id, () => service.assignEditor(m.id, v, user?.name ?? "Admin"), "Editor updated")
                        }
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {EDITORS.map((e) => (
                            <SelectItem key={e} value={e}>
                              {e}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-5 py-4">
                      <Select
                        value={m.state}
                        onValueChange={(v) =>
                          void run(
                            m.id,
                            () => service.updateState(m.id, v as WorkflowState, user?.name ?? "Admin", `Force-advanced to ${v}`),
                            "Workflow state updated",
                          )
                        }
                      >
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
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <Button asChild variant="outline" size="sm">
                          <Link to="/manuscript/$id" params={{ id: m.id }}>
                            Open
                          </Link>
                        </Button>
                        <Button
                          size="sm"
                          disabled={m.state !== "Approved" || busyId === m.id}
                          onClick={() =>
                            void run(
                              m.id,
                              () => service.updateState(m.id, "Published", user?.name ?? "Admin", "Published final edition"),
                              "Manuscript published",
                            )
                          }
                        >
                          {busyId === m.id && <Loader2 className="size-4 animate-spin" />}
                          Publish Final
                        </Button>
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