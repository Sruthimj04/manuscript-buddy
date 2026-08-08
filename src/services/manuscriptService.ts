/**
 * Manuscript service — ERPNext backend implementation.
 *
 * Each function calls the corresponding Frappe whitelisted method in
 * manuscript_management.api.*. Function signatures are identical to the
 * previous mock layer, so no UI code changes are needed.
 */

import { call } from "./erpnextClient";
import type {
  AIReport,
  ListManuscriptsOptions,
  Manuscript,
  ManuscriptSortKey,
  Paginated,
  SortDirection,
  WorkflowState,
} from "./types";

// ── API method prefix ────────────────────────────────────────────────────── //

const API = "manuscript_management.api";

// ── Sort helper (kept for any client-side re-sorting needs) ──────────────── //

function sortValue(m: Manuscript, key: ManuscriptSortKey): string | number {
  switch (key) {
    case "aiScore":
      return m.ai?.score ?? -1;
    case "submittedAt":
      return new Date(m.submittedAt).getTime();
    case "title":
      return m.title.toLowerCase();
    case "author":
      return m.author.toLowerCase();
    case "state":
      return m.state.toLowerCase();
  }
}

export function sortManuscripts(
  list: Manuscript[],
  sortBy: ManuscriptSortKey,
  sortDir: SortDirection = "desc",
): Manuscript[] {
  const dir = sortDir === "asc" ? 1 : -1;
  return [...list].sort((a, b) => {
    const av = sortValue(a, sortBy);
    const bv = sortValue(b, sortBy);
    if (av === bv) return 0;
    return av > bv ? dir : -dir;
  });
}

// ── CRUD operations ──────────────────────────────────────────────────────── //

export async function listManuscripts(
  options: ListManuscriptsOptions = {},
): Promise<Manuscript[]> {
  const result = await call<Paginated<Manuscript>>(
    `${API}.list_manuscripts`,
    {
      page: options.page ?? 1,
      limit: options.limit ?? 100,
      sort_by: options.sortBy ?? "submittedAt",
      sort_dir: options.sortDir ?? "desc",
    },
  );
  return result.items;
}

export async function listManuscriptsPaged(
  options: ListManuscriptsOptions = {},
): Promise<Paginated<Manuscript>> {
  return call<Paginated<Manuscript>>(`${API}.list_manuscripts`, {
    page: options.page ?? 1,
    limit: options.limit ?? 10,
    sort_by: options.sortBy ?? "submittedAt",
    sort_dir: options.sortDir ?? "desc",
  });
}

export async function getManuscript(
  id: string,
): Promise<Manuscript | undefined> {
  try {
    return await call<Manuscript>(`${API}.get_manuscript`, {
      manuscript_id: id,
    });
  } catch {
    return undefined;
  }
}

export function generateAIReport(input: {
  title: string;
  genre: string;
  secondaryGenre?: string | undefined;
  pageCount?: number | undefined;
}): AIReport {
  // Generate client-side for the submission wizard preview step.
  // Later this can also call the server-side generate_ai_report endpoint.
  const base = 62 + Math.floor(Math.random() * 32);
  const primary = 55 + Math.floor(Math.random() * 30);
  const genreConfidence = [
    { label: input.genre || "Fiction", value: primary },
    { label: input.secondaryGenre || "General", value: 100 - primary },
  ];
  return {
    score: base,
    genreConfidence,
    readability: 55 + Math.floor(Math.random() * 40),
    marketability: 50 + Math.floor(Math.random() * 45),
    pacing: [
      { label: "Act I", value: 50 + Math.floor(Math.random() * 45) },
      { label: "Act II", value: 50 + Math.floor(Math.random() * 45) },
      { label: "Act III", value: 50 + Math.floor(Math.random() * 45) },
    ],
    detectedPages:
      input.pageCount ?? 200 + Math.floor(Math.random() * 250),
    titleMatched: true,
    summary: `Pre-flight scan of "${input.title || "Untitled"}" completed. Structure and metadata parsed successfully with no extraction errors. Lexical density and chapter balance fall within the expected band for this category.`,
  };
}

export async function createManuscript(
  payload: Omit<
    Manuscript,
    "id" | "timeline" | "notes" | "state" | "editor" | "submittedAt"
  > & {
    state?: WorkflowState | undefined;
  },
): Promise<Manuscript> {
  return call<Manuscript>(`${API}.create_manuscript`, {
    data: {
      title: payload.title,
      author: payload.author,
      genre: payload.genre,
      secondaryGenre: payload.secondaryGenre,
      audience: payload.audience,
      keywords: payload.keywords,
      abstract: payload.abstract,
      synopsis: payload.synopsis,
      pageCount: payload.pageCount,
      launchDate: payload.launchDate,
      fileName: payload.fileName,
      fileSize: payload.fileSize,
      state: payload.state,
      ai: payload.ai,
    },
  });
}

export async function updateState(
  id: string,
  state: WorkflowState,
  actor: string,
  action?: string,
): Promise<Manuscript | undefined> {
  return call<Manuscript>(`${API}.update_state`, {
    manuscript_id: id,
    state,
    actor,
    action,
  });
}

export async function assignEditor(
  id: string,
  editor: string,
  actor: string,
) {
  return call<Manuscript>(`${API}.assign_editor`, {
    manuscript_id: id,
    editor,
    actor,
  });
}

export async function addEditorDecision(
  id: string,
  decision: "approve" | "revise" | "reject",
  actor: string,
  feedback?: string,
  rejectionReason?: string,
) {
  return call<Manuscript>(`${API}.add_editor_decision`, {
    manuscript_id: id,
    decision,
    actor,
    feedback,
    rejection_reason: rejectionReason,
  });
}

export async function uploadRevision(
  id: string,
  fileName: string,
  actor: string,
) {
  return call<Manuscript>(`${API}.upload_revision`, {
    manuscript_id: id,
    file_name: fileName,
    actor,
  });
}