import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { WORKFLOW_STATES, type WorkflowState } from "@/services/types";

export function PipelineTracker({ state }: { state: WorkflowState }) {
  const idx = WORKFLOW_STATES.indexOf(state as (typeof WORKFLOW_STATES)[number]);
  return (
    <ol className="flex flex-col gap-3 md:flex-row md:items-start md:gap-0">
      {WORKFLOW_STATES.map((step, i) => {
        const done = idx > -1 && i < idx;
        const active = i === idx;
        return (
          <li key={step} className="flex flex-1 items-center gap-3 md:flex-col md:items-start md:gap-2">
            <div className="flex w-full items-center gap-2">
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                  done && "border-foreground bg-foreground text-background",
                  active && "border-foreground bg-background text-foreground ring-2 ring-foreground/20",
                  !done && !active && "border-border bg-background text-muted-foreground",
                )}
              >
                {done ? <Check className="size-3.5" /> : i + 1}
              </span>
              <span
                className={cn(
                  "hidden h-px flex-1 md:block",
                  done ? "bg-foreground" : "bg-border",
                  i === WORKFLOW_STATES.length - 1 && "md:hidden",
                )}
              />
            </div>
            <span
              className={cn(
                "text-xs leading-tight md:pr-4",
                active ? "font-semibold text-foreground" : "text-muted-foreground",
              )}
            >
              {step}
            </span>
          </li>
        );
      })}
    </ol>
  );
}