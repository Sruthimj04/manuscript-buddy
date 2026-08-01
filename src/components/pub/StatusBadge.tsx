import { cn } from "@/lib/utils";
import type { WorkflowState } from "@/services/types";

const styles: Record<string, string> = {
  Draft: "border-border bg-muted text-muted-foreground",
  "AI Processing": "border-foreground/30 bg-background text-foreground",
  "Pending Editor Review": "border-foreground bg-background text-foreground",
  "Revisions Requested": "border-foreground bg-foreground/10 text-foreground",
  Approved: "border-foreground bg-foreground text-background",
  Published: "border-foreground bg-foreground text-background",
  Rejected: "border-destructive bg-destructive/10 text-destructive",
};

export function StatusBadge({ state, className }: { state: WorkflowState; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium tracking-tight",
        styles[state] ?? styles["Draft"],
        className,
      )}
    >
      {state}
    </span>
  );
}