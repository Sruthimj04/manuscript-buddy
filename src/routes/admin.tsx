import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/pub/AppShell";
import { AdminOverview, type OverviewFilter } from "@/components/pub/AdminOverview";
import { ManuscriptTable, type TableFilter } from "@/components/pub/admin/ManuscriptTable";
import { ManuscriptDrawer } from "@/components/pub/admin/ManuscriptDrawer";
import * as service from "@/services/manuscriptService";
import { EDITORS } from "@/services/mockData";
import { type Manuscript, type WorkflowState } from "@/services/types";
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
  const [filter, setFilter] = useState<TableFilter | null>(null);
  const [drawerId, setDrawerId] = useState<string | null>(null);

  async function run(id: string, fn: () => Promise<unknown>, message: string) {
    setBusyId(id);
    try {
      await fn();
      await refresh();
      toast.success(message);
    } catch {
      toast.error("Something went wrong. Please retry.");
    } finally {
      setBusyId(null);
    }
  }

  function applyOverviewFilter(f: OverviewFilter) {
    setFilter({ label: f.label, states: f.states, stage: f.stage });
    document.getElementById("admin-submissions")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const drawerManuscript: Manuscript | null = manuscripts.find((m) => m.id === drawerId) ?? null;

  return (
    <AppShell allow={["admin"]}>
      <AdminOverview
        {...(user?.name ? { name: user.name } : {})}
        manuscripts={manuscripts}
        loading={loading}
        onFilter={applyOverviewFilter}
        onOpen={(id) => setDrawerId(id)}
      />

      <div id="admin-submissions" className="mt-8 scroll-mt-24">
        <h2 className="text-xl font-semibold tracking-tight">All submissions</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Search, filter and act on every manuscript in the pipeline. Select a row to open the full record.
        </p>

        <div className="mt-4">
          <ManuscriptTable
            manuscripts={manuscripts}
            loading={loading}
            editors={EDITORS}
            busyId={busyId}
            filter={filter}
            onClearFilter={() => setFilter(null)}
            onOpen={(m) => setDrawerId(m.id)}
            onAssign={(id, v) =>
              void run(id, () => service.assignEditor(id, v, user?.name ?? "Admin"), "Editor updated")
            }
            onForceState={(id, state: WorkflowState) =>
              void run(
                id,
                () => service.updateState(id, state, user?.name ?? "Admin", `Force-advanced to ${state}`),
                "Workflow state updated",
              )
            }
            onPublish={(id) =>
              void run(
                id,
                () => service.updateState(id, "Published", user?.name ?? "Admin", "Published final edition"),
                "Manuscript published",
              )
            }
          />
        </div>
      </div>

      <ManuscriptDrawer
        manuscript={drawerManuscript}
        open={!!drawerManuscript}
        onOpenChange={(open) => !open && setDrawerId(null)}
      />
    </AppShell>
  );
}