import { createFileRoute } from "@tanstack/react-router";

/**
 * Admin — Editors placeholder
 */

export const Route = createFileRoute("/admin/editors")({
  component: AdminEditorsPlaceholder,
});

function AdminEditorsPlaceholder() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Editors</h1>
      <p className="mt-1 text-sm text-muted-foreground">Placeholder: assign/reassign editors and manage editor pool.</p>
    </div>
  );
}
