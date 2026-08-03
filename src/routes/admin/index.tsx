import { createFileRoute } from "@tanstack/react-router";

/**
 * Admin overview placeholder page.
 * Content will be added later. For now it preserves layout & navigation.
 */

export const Route = createFileRoute("/admin")({
  component: AdminOverviewPlaceholder,
});

function AdminOverviewPlaceholder() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Admin — Overview</h1>
      <p className="mt-1 text-sm text-muted-foreground">Placeholder: global metrics & quick actions will appear here.</p>
    </div>
  );
}
