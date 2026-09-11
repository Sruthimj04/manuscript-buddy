import { createFileRoute } from "@tanstack/react-router";

/**
 * Admin — Settings placeholder
 */

export const Route = createFileRoute("/admin/settings")({
  component: AdminSettingsPlaceholder,
});

function AdminSettingsPlaceholder() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Admin settings</h1>
      <p className="mt-1 text-sm text-muted-foreground">Placeholder: global admin configuration.</p>
    </div>
  );
}
