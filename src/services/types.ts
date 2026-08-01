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

export interface Manuscript {
  id: string;
  title: string;
  author: string;
  submittedAt: string;
  state: WorkflowState;
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
  rejectionReason?: string | undefined;
}

export interface User {
  name: string;
  email: string;
  role: Role;
}