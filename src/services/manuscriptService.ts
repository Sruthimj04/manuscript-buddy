import { initialManuscripts } from "./mockData";
import type { AIReport, Manuscript, WorkflowState } from "./types";

/**
 * Mock data layer. Every function is async so that swapping the bodies for
 * `fetch("/api/...")` calls later requires no changes in the UI.
 */

let db: Manuscript[] = structuredClone(initialManuscripts);
let counter = 1043;

const delay = (ms = 380) => new Promise((r) => setTimeout(r, ms));
const clone = <T,>(v: T): T => structuredClone(v);

function event(actor: string, action: string) {
  return { id: crypto.randomUUID(), actor, action, timestamp: new Date().toISOString() };
}

export async function listManuscripts(): Promise<Manuscript[]> {
  await delay(220);
  return clone(db);
}

export async function getManuscript(id: string): Promise<Manuscript | undefined> {
  await delay(180);
  return clone(db.find((m) => m.id === id));
}

export function generateAIReport(input: {
  title: string;
  genre: string;
  secondaryGenre?: string | undefined;
  pageCount?: number | undefined;
}): AIReport {
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
    detectedPages: input.pageCount ?? 200 + Math.floor(Math.random() * 250),
    titleMatched: true,
    summary: `Pre-flight scan of "${input.title || "Untitled"}" completed. Structure and metadata parsed successfully with no extraction errors. Lexical density and chapter balance fall within the expected band for this category.`,
  };
}

export async function createManuscript(
  payload: Omit<Manuscript, "id" | "timeline" | "notes" | "state" | "editor" | "submittedAt"> & {
    state?: WorkflowState | undefined;
  },
): Promise<Manuscript> {
  await delay(700);
  counter += 1;
  const record: Manuscript = {
    ...payload,
    id: `MS-${counter}`,
    submittedAt: new Date().toISOString(),
    state: payload.state ?? "Pending Editor Review",
    editor: null,
    timeline: [
      event(payload.author, "Manuscript submitted"),
      event("AI Engine", "AI processing completed"),
    ],
    notes: [],
  };
  db = [record, ...db];
  return clone(record);
}

export async function updateState(
  id: string,
  state: WorkflowState,
  actor: string,
  action?: string,
): Promise<Manuscript | undefined> {
  await delay();
  db = db.map((m) =>
    m.id === id
      ? { ...m, state, timeline: [...m.timeline, event(actor, action ?? `Status changed to ${state}`)] }
      : m,
  );
  return clone(db.find((m) => m.id === id));
}

export async function assignEditor(id: string, editor: string, actor: string) {
  await delay();
  db = db.map((m) =>
    m.id === id
      ? {
          ...m,
          editor: editor === "Unassigned" ? null : editor,
          timeline: [...m.timeline, event(actor, `Editor set to ${editor}`)],
        }
      : m,
  );
  return clone(db.find((m) => m.id === id));
}

export async function addEditorDecision(
  id: string,
  decision: "approve" | "revise" | "reject",
  actor: string,
  feedback?: string,
  rejectionReason?: string,
) {
  await delay(600);
  const stateMap = { approve: "Approved", revise: "Revisions Requested", reject: "Rejected" } as const;
  const labelMap = {
    approve: "Approved manuscript",
    revise: "Requested revisions",
    reject: "Rejected manuscript",
  } as const;
  db = db.map((m) => {
    if (m.id !== id) return m;
    return {
      ...m,
      state: stateMap[decision],
      rejectionReason: decision === "reject" ? rejectionReason : m.rejectionReason,
      editor: m.editor ?? actor,
      notes: feedback
        ? [...m.notes, { id: crypto.randomUUID(), author: actor, createdAt: new Date().toISOString(), body: feedback }]
        : m.notes,
      timeline: [...m.timeline, event(actor, labelMap[decision])],
    };
  });
  return clone(db.find((m) => m.id === id));
}

export async function uploadRevision(id: string, fileName: string, actor: string) {
  await delay(800);
  db = db.map((m) =>
    m.id === id
      ? {
          ...m,
          fileName,
          state: "Pending Editor Review" as WorkflowState,
          timeline: [...m.timeline, event(actor, `Uploaded revised draft (${fileName})`)],
        }
      : m,
  );
  return clone(db.find((m) => m.id === id));
}