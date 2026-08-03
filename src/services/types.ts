export type Role = "author" | "editor" | "admin";

export const WORKFLOW_STATES = [
  "Draft",
  "AI Processing",
  "Pending Editor Review",
  "Revisions Requested",
  "Approved",
  "Published",
] as const;

export type WorkflowState = (typeof WORKFLOW_STATES)[number] | "Rejected";

export interface TimelineEvent {
  id: string;
  actor: string;
  action: string;
  timestamp: string;
}

export interface EditorNote {
  id: string;
  author: string;
  createdAt: string;
  body: string;
}

export interface AIReport {
  score: number;
  genreConfidence: { label: string; value: number }[];
  readability: number;
  marketability: number;
  pacing: { label: string; value: number }[];
  summary: string;
  detectedPages: number;
  titleMatched: boolean;
}

/** Fields shared by every manuscript, regardless of workflow state. */
export interface ManuscriptBase {
  id: string;
  title: string;
  author: string;
  submittedAt: string;
  editor: string | null;
  genre: string;
  secondaryGenre?: string | undefined;
  audience?: string | undefined;
  keywords: string[];
  abstract?: string | undefined;
  synopsis?: string | undefined;
  pageCount?: number | undefined;
  launchDate?: string | undefined;
  fileName?: string | undefined;
  fileSize?: number | undefined;
  ai: AIReport | null;
  timeline: TimelineEvent[];
  notes: EditorNote[];
}

/** States other than "Rejected" never carry a rejection reason. */
interface NoRejection {
  rejectionReason?: undefined;
}

export interface DraftManuscript extends ManuscriptBase, NoRejection {
  state: "Draft";
}
export interface ProcessingManuscript extends ManuscriptBase, NoRejection {
  state: "AI Processing";
}
export interface PendingManuscript extends ManuscriptBase, NoRejection {
  state: "Pending Editor Review";
}
export interface RevisionsRequestedManuscript extends ManuscriptBase, NoRejection {
  state: "Revisions Requested";
}
export interface ApprovedManuscript extends ManuscriptBase, NoRejection {
  state: "Approved";
}
export interface PublishedManuscript extends ManuscriptBase, NoRejection {
  state: "Published";
}
export interface RejectedManuscript extends ManuscriptBase {
  state: "Rejected";
  /** Required: a rejection is only valid with a documented reason. */
  rejectionReason: string;
}

export type Manuscript =
  | DraftManuscript
  | ProcessingManuscript
  | PendingManuscript
  | RevisionsRequestedManuscript
  | ApprovedManuscript
  | PublishedManuscript
  | RejectedManuscript;

export function isRejected(m: Manuscript): m is RejectedManuscript {
  return m.state === "Rejected";
}

export interface ListManuscriptsOptions {
  page?: number | undefined;
  limit?: number | undefined;
  sortBy?: ManuscriptSortKey | undefined;
  sortDir?: SortDirection | undefined;
}

export type ManuscriptSortKey = "title" | "author" | "submittedAt" | "aiScore" | "state";
export type SortDirection = "asc" | "desc";

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface User {
  name: string;
  email: string;
  role: Role;
}