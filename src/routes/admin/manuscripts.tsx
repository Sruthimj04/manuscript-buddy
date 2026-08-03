import { createFileRoute } from "@tanstack/react-router";

/**
 * Admin — Manuscripts placeholder
 */

export const Route = createFileRoute("/admin/manuscripts")({
  component: AdminManuscriptsPlaceholder,
});

function AdminManuscriptsPlaceholder() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Manuscripts</h1>
      <p className="mt-1 text-sm text-muted-foreground">Placeholder: global manuscript table & actions will be implemented here.</p>
    </div>
  );
}
