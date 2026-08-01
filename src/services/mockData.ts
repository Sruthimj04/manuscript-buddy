import type { Manuscript } from "./types";

export const EDITORS = ["Nina Okoro", "Daniel Reyes", "Priya Shah", "Unassigned"];

export const GENRES = [
  "Fiction",
  "Non-Fiction",
  "Science Fiction",
  "Drama",
  "Biography",
  "Business",
  "Poetry",
  "Academic",
];

export const AUDIENCES = ["General", "Young Adult", "Academic", "Professional", "Children"];

export const REJECTION_REASONS = [
  "Out of scope for our catalogue",
  "Insufficient originality",
  "Manuscript quality below threshold",
  "Incomplete submission",
  "Rights or licensing conflict",
];

export const initialManuscripts: Manuscript[] = [
  {
    id: "MS-1042",
    title: "The Quantum Paradigm",
    author: "Amara Nwosu",
    submittedAt: "2026-07-21T10:02:00Z",
    state: "Pending Editor Review",
    editor: "Nina Okoro",
    genre: "Science Fiction",
    secondaryGenre: "Drama",
    audience: "General",
    keywords: ["physics", "speculative", "near-future"],
    abstract:
      "A theoretical physicist discovers that observation itself can be traded as a commodity, and the market for reality begins to collapse.",
    synopsis:
      "Across three timelines, the novel follows Dr. Imani Sole as she attempts to prove that quantum decoherence is being industrialised. The narrative alternates between laboratory procedural chapters and intimate family scenes.",
    pageCount: 412,
    launchDate: "2026-11-01",
    fileName: "quantum-paradigm-v3.pdf",
    fileSize: 8_412_000,
    ai: {
      score: 88,
      genreConfidence: [
        { label: "Science Fiction", value: 75 },
        { label: "Drama", value: 25 },
      ],
      readability: 72,
      marketability: 84,
      pacing: [
        { label: "Act I", value: 62 },
        { label: "Act II", value: 88 },
        { label: "Act III", value: 79 },
      ],
      detectedPages: 412,
      titleMatched: true,
      summary:
        "Strong high-concept premise with above-average lexical variety. Pacing dips slightly in the first act but recovers with a dense mid-section. Comparable titles suggest a favourable commercial window in Q4.",
    },
    timeline: [
      { id: "t1", actor: "Amara Nwosu", action: "Draft created", timestamp: "2026-07-20T09:12:00Z" },
      { id: "t2", actor: "System", action: "Manuscript submitted", timestamp: "2026-07-21T10:02:00Z" },
      { id: "t3", actor: "AI Engine", action: "AI processing completed", timestamp: "2026-07-21T10:14:00Z" },
      { id: "t4", actor: "System", action: "Assigned to editor Nina Okoro", timestamp: "2026-07-21T10:20:00Z" },
    ],
    notes: [],
  },
  {
    id: "MS-1043",
    title: "Echoes of Tomorrow",
    author: "Amara Nwosu",
    submittedAt: "2026-07-12T14:40:00Z",
    state: "Revisions Requested",
    editor: "Daniel Reyes",
    genre: "Fiction",
    secondaryGenre: "Biography",
    audience: "Young Adult",
    keywords: ["memory", "coming-of-age"],
    abstract:
      "A archivist inherits a machine that replays the last hour of any recorded life, and must decide whose story deserves to be heard.",
    synopsis:
      "Told in linked vignettes, the book explores memory as public infrastructure. Each chapter is a recovered recording, framed by the archivist's own unravelling.",
    pageCount: 268,
    launchDate: "2026-09-15",
    fileName: "echoes-of-tomorrow.pdf",
    fileSize: 4_120_000,
    ai: {
      score: 74,
      genreConfidence: [
        { label: "Fiction", value: 58 },
        { label: "Biography", value: 27 },
        { label: "Drama", value: 15 },
      ],
      readability: 81,
      marketability: 66,
      pacing: [
        { label: "Act I", value: 74 },
        { label: "Act II", value: 51 },
        { label: "Act III", value: 69 },
      ],
      detectedPages: 268,
      titleMatched: true,
      summary:
        "Lyrical and highly readable, but the vignette structure weakens narrative momentum in the middle third. Editorial tightening recommended before acquisition review.",
    },
    timeline: [
      { id: "t1", actor: "Amara Nwosu", action: "Manuscript submitted", timestamp: "2026-07-12T14:40:00Z" },
      { id: "t2", actor: "AI Engine", action: "AI processing completed", timestamp: "2026-07-12T14:52:00Z" },
      { id: "t3", actor: "Daniel Reyes", action: "Requested revisions", timestamp: "2026-07-14T11:30:00Z" },
    ],
    notes: [
      {
        id: "n1",
        author: "Daniel Reyes",
        createdAt: "2026-07-14T11:30:00Z",
        body: "The middle third loses momentum — chapters 9 through 14 repeat the same emotional beat. Please consolidate into four chapters and give the archivist a concrete external deadline. Also tighten the opening vignette; the hook currently arrives on page 12.",
      },
    ],
  },
];