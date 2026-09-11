import type { Manuscript, WorkflowState } from "./types";

/**
 * Presentation-only publishing metadata.
 *
 * The mock service layer stores editorial state; a real publishing system also
 * tracks ISBN, proofreading progress, cover design, print readiness and
 * versioning. These values are derived deterministically from the manuscript id
 * so demo data stays stable across renders without touching the service layer.
 */

export type Priority = "High" | "Medium" | "Low";
export type IsbnStatus = "Assigned" | "Reserved" | "Not requested";
export type CoverStatus = "Not started" | "In design" | "In review" | "Approved";

export interface PublishingMeta {
  isbn: string;
  isbnStatus: IsbnStatus;
  editorialStage: string;
  proofreading: number;
  coverStatus: CoverStatus;
  printReady: boolean;
  publicationDate: string;
  version: string;
  revisionRequests: number;
  priority: Priority;
  dueDate: string;
  daysToDue: number;
  overdue: boolean;
  dueToday: boolean;
}

export const PIPELINE_STAGES = [
  "Submitted",
  "Assigned",
  "Editing",
  "Review",
  "Proofreading",
  "Design",
  "Published",
] as const;

export type PipelineStage = (typeof PIPELINE_STAGES)[number];

/** Baseline demo volume so the pipeline reads like a working press. */
export const STAGE_BASELINE: Record<PipelineStage, number> = {
  Submitted: 18,
  Assigned: 12,
  Editing: 15,
  Review: 9,
  Proofreading: 6,
  Design: 4,
  Published: 231,
};

function hash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

const COVER: CoverStatus[] = ["Not started", "In design", "In review", "Approved"];

export function stageOf(m: Manuscript): PipelineStage | null {
  switch (m.state) {
    case "Draft":
    case "AI Processing":
      return "Submitted";
    case "Pending Editor Review":
      return m.editor ? "Review" : "Assigned";
    case "Revisions Requested":
      return "Editing";
    case "Approved":
      return hash(m.id) % 2 === 0 ? "Proofreading" : "Design";
    case "Published":
      return "Published";
    default:
      return null;
  }
}

export function publishingMeta(m: Manuscript): PublishingMeta {
  const h = hash(m.id);
  const advanced = m.state === "Approved" || m.state === "Published";
  const proofreading =
    m.state === "Published" ? 100 : advanced ? 40 + (h % 55) : m.state === "Revisions Requested" ? 10 + (h % 25) : 0;
  const coverIndex = m.state === "Published" ? 3 : advanced ? 1 + (h % 3) : 0;
  const now = new Date();
  const due = new Date(now.getTime() + ((h % 21) - 6) * 86_400_000);
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const daysToDue = Math.round((startOfDay(due) - startOfDay(now)) / 86_400_000);
  const score = m.ai?.score ?? 0;

  return {
    isbn: `978-1-${String(4000 + (h % 5000))}-${String((h % 900) + 100)}-${h % 10}`,
    isbnStatus: m.state === "Published" ? "Assigned" : advanced ? "Reserved" : "Not requested",
    editorialStage: stageOf(m) ?? "Closed",
    proofreading,
    coverStatus: COVER[coverIndex] ?? "Not started",
    printReady: m.state === "Published",
    publicationDate:
      m.launchDate ?? new Date(now.getTime() + (60 + (h % 120)) * 86_400_000).toISOString().slice(0, 10),
    version: `v${1 + (m.notes.length > 0 ? 1 : 0)}.${h % 9}`,
    revisionRequests: m.timeline.filter((t) => t.action.toLowerCase().includes("revision")).length,
    priority: score >= 85 || m.state === "Approved" ? "High" : score >= 70 ? "Medium" : "Low",
    dueDate: due.toISOString().slice(0, 10),
    daysToDue,
    overdue: daysToDue < 0 && m.state !== "Published",
    dueToday: daysToDue === 0 && m.state !== "Published",
  };
}

/** Workflow states that belong to a pipeline stage — used for table filtering. */
export const STAGE_STATES: Record<PipelineStage, WorkflowState[]> = {
  Submitted: ["Draft", "AI Processing"],
  Assigned: ["Pending Editor Review"],
  Editing: ["Revisions Requested"],
  Review: ["Pending Editor Review"],
  Proofreading: ["Approved"],
  Design: ["Approved"],
  Published: ["Published"],
};

export function formatDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

export function relativeDue(days: number): string {
  if (days < 0) return `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} overdue`;
  if (days === 0) return "Due today";
  return `Due in ${days} day${days === 1 ? "" : "s"}`;
}