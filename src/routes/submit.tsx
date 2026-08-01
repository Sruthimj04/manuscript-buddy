import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  FileUp,
  Loader2,
  Sparkles,
  X,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/pub/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { AUDIENCES, GENRES } from "@/services/mockData";
import * as service from "@/services/manuscriptService";
import type { AIReport } from "@/services/types";
import { useApp } from "@/store/app-store";

export const Route = createFileRoute("/submit")({
  head: () => ({
    meta: [
      { title: "New Submission — PubFlow ERP" },
      { name: "description", content: "Five-step manuscript submission wizard with PDF upload and AI pre-flight scan." },
      { property: "og:title", content: "New Submission — PubFlow ERP" },
      { property: "og:description", content: "Submit a manuscript with metadata, PDF upload, and AI pre-flight analysis." },
    ],
  }),
  component: SubmitPage,
});

const STEPS = ["Title & Category", "Description", "Upload PDF", "Preview & AI Scan", "Confirm"];
const MAX_SIZE = 50 * 1024 * 1024;

function SubmitPage() {
  const { user, refresh } = useApp();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState("");
  const [secondaryGenre, setSecondaryGenre] = useState("");
  const [audience, setAudience] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordDraft, setKeywordDraft] = useState("");

  const [abstract, setAbstract] = useState("");
  const [synopsis, setSynopsis] = useState("");
  const [pageCount, setPageCount] = useState("");
  const [launchDate, setLaunchDate] = useState("");

  const [file, setFile] = useState<{ name: string; size: number } | null>(null);
  const [uploadPct, setUploadPct] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const [scanning, setScanning] = useState(false);
  const [report, setReport] = useState<AIReport | null>(null);
  const [pdfPage, setPdfPage] = useState(1);

  const [confirmed, setConfirmed] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const words = (s: string) => (s.trim() ? s.trim().split(/\s+/).length : 0);

  function handleFiles(list: FileList | null) {
    const f = list?.[0];
    if (!f) return;
    if (!f.name.toLowerCase().endsWith(".pdf") || (f.type && f.type !== "application/pdf")) {
      setFileError("Invalid file format. Only .pdf files are accepted.");
      setFile(null);
      return;
    }
    if (f.size > MAX_SIZE) {
      setFileError("File too large. The maximum size is 50MB.");
      setFile(null);
      return;
    }
    setFileError(null);
    setFile({ name: f.name, size: f.size });
    setUploading(true);
    setUploadPct(0);
    const timer = setInterval(() => {
      setUploadPct((p) => {
        if (p >= 100) {
          clearInterval(timer);
          setUploading(false);
          return 100;
        }
        return Math.min(100, p + 7 + Math.random() * 12);
      });
    }, 140);
  }

  function validateStep(): boolean {
    const e: Record<string, string> = {};
    if (step === 0) {
      if (!title.trim()) e["title"] = "Manuscript title is required.";
      if (!genre) e["genre"] = "Select a primary genre.";
      if (!audience) e["audience"] = "Select a target audience.";
    }
    if (step === 1) {
      if (words(abstract) < 5) e["abstract"] = "Write at least 5 words for the abstract.";
      if (!synopsis.trim()) e["synopsis"] = "A detailed synopsis is required.";
    }
    if (step === 2) {
      if (!file || uploadPct < 100) e["file"] = "Upload a completed PDF to continue.";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function next() {
    if (!validateStep()) return;
    if (step === 2 && !report) {
      setScanning(true);
      setStep(3);
      setTimeout(() => {
        setReport(
          service.generateAIReport({
            title,
            genre,
            secondaryGenre: secondaryGenre || undefined,
            pageCount: pageCount ? Number(pageCount) : undefined,
          }),
        );
        setScanning(false);
      }, 1400);
      return;
    }
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  }

  async function finalSubmit() {
    setSubmitting(true);
    try {
      const created = await service.createManuscript({
        title,
        author: user?.name ?? "Amara Nwosu",
        genre,
        secondaryGenre: secondaryGenre || undefined,
        audience,
        keywords,
        abstract,
        synopsis,
        pageCount: pageCount ? Number(pageCount) : undefined,
        launchDate: launchDate || undefined,
        fileName: file?.name,
        fileSize: file?.size,
        ai: report,
      });
      await refresh();
      setDialogOpen(false);
      toast.success("Manuscript submitted", { description: `${created.title} is now pending editor review.` });
      void navigate({ to: "/manuscript/$id", params: { id: created.id } });
    } catch {
      toast.error("Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell>
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">New submission</h1>
      <p className="mt-1 text-sm text-muted-foreground">Five steps from metadata to editorial queue.</p>

      <ol className="mt-6 flex flex-wrap gap-x-2 gap-y-3 rounded-xl border border-border bg-card p-4">
        {STEPS.map((s, i) => (
          <li key={s} className="flex flex-1 items-center gap-2">
            <span
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                i < step && "border-foreground bg-foreground text-background",
                i === step && "border-foreground ring-2 ring-foreground/20",
                i > step && "border-border text-muted-foreground",
              )}
            >
              {i < step ? <Check className="size-3.5" /> : i + 1}
            </span>
            <span
              className={cn(
                "whitespace-nowrap text-xs",
                i === step ? "font-semibold" : "text-muted-foreground",
              )}
            >
              {s}
            </span>
          </li>
        ))}
      </ol>

      <div className="mt-6 rounded-xl border border-border bg-card p-5 sm:p-6">
        {step === 0 && (
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="title">Manuscript Title</Label>
                <span className="text-xs text-muted-foreground tabular-nums">{title.length}/120</span>
              </div>
              <Input
                id="title"
                maxLength={120}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. The Quantum Paradigm"
              />
              {errors["title"] && <p className="text-xs text-destructive">{errors["title"]}</p>}
            </div>

            <div className="space-y-2">
              <Label>Primary Genre</Label>
              <Select value={genre} onValueChange={setGenre}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select genre" />
                </SelectTrigger>
                <SelectContent>
                  {GENRES.map((g) => (
                    <SelectItem key={g} value={g}>
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors["genre"] && <p className="text-xs text-destructive">{errors["genre"]}</p>}
            </div>

            <div className="space-y-2">
              <Label>Secondary Genre</Label>
              <Select value={secondaryGenre} onValueChange={setSecondaryGenre}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent>
                  {GENRES.map((g) => (
                    <SelectItem key={g} value={g}>
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Target Audience</Label>
              <Select value={audience} onValueChange={setAudience}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select audience" />
                </SelectTrigger>
                <SelectContent>
                  {AUDIENCES.map((a) => (
                    <SelectItem key={a} value={a}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors["audience"] && <p className="text-xs text-destructive">{errors["audience"]}</p>}
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="kw">Keywords</Label>
              <div className="flex flex-wrap items-center gap-2 rounded-md border border-input bg-background p-2">
                {keywords.map((k) => (
                  <span
                    key={k}
                    className="inline-flex items-center gap-1 rounded-full bg-foreground px-2.5 py-0.5 text-xs text-background"
                  >
                    {k}
                    <button type="button" onClick={() => setKeywords(keywords.filter((x) => x !== k))}>
                      <X className="size-3" />
                    </button>
                  </span>
                ))}
                <input
                  id="kw"
                  value={keywordDraft}
                  onChange={(e) => setKeywordDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if ((e.key === "Enter" || e.key === ",") && keywordDraft.trim()) {
                      e.preventDefault();
                      if (!keywords.includes(keywordDraft.trim())) setKeywords([...keywords, keywordDraft.trim()]);
                      setKeywordDraft("");
                    }
                  }}
                  placeholder="Type and press Enter"
                  className="min-w-40 flex-1 bg-transparent text-sm outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="abstract">Executive Abstract</Label>
                <span className="text-xs text-muted-foreground tabular-nums">{words(abstract)} words</span>
              </div>
              <Textarea
                id="abstract"
                rows={4}
                value={abstract}
                onChange={(e) => setAbstract(e.target.value)}
                placeholder="A short, punchy overview of the book."
              />
              {errors["abstract"] && <p className="text-xs text-destructive">{errors["abstract"]}</p>}
            </div>
            <div className="space-y-2 sm:col-span-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="synopsis">Detailed Synopsis</Label>
                <span className="text-xs text-muted-foreground tabular-nums">{words(synopsis)} words</span>
              </div>
              <Textarea
                id="synopsis"
                rows={7}
                value={synopsis}
                onChange={(e) => setSynopsis(e.target.value)}
                placeholder="Structure, arcs, and resolution."
              />
              {errors["synopsis"] && <p className="text-xs text-destructive">{errors["synopsis"]}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="pages">Estimated Page Count</Label>
              <Input
                id="pages"
                type="number"
                min={1}
                value={pageCount}
                onChange={(e) => setPageCount(e.target.value)}
                placeholder="320"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="launch">Target Launch Date</Label>
              <Input id="launch" type="date" value={launchDate} onChange={(e) => setLaunchDate(e.target.value)} />
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                handleFiles(e.dataTransfer.files);
              }}
              onClick={() => inputRef.current?.click()}
              className={cn(
                "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-14 text-center transition-colors",
                dragging ? "border-foreground bg-muted" : "border-border hover:bg-muted/50",
              )}
            >
              <FileUp className="size-6 text-muted-foreground" />
              <p className="mt-3 text-sm font-medium">Drag &amp; drop your manuscript PDF</p>
              <p className="mt-1 text-xs text-muted-foreground">.pdf only · maximum 50MB</p>
              <input
                ref={inputRef}
                type="file"
                accept="application/pdf,.pdf"
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />
            </div>

            {fileError && (
              <p className="mt-3 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {fileError}
              </p>
            )}

            {file && (
              <div className="mt-4 rounded-lg border border-border p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <FileText className="size-4 shrink-0" />
                    <span className="truncate text-sm font-medium">{file.name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {(file.size / 1024 / 1024).toFixed(1)} MB
                  </span>
                </div>
                <Progress value={uploadPct} className="mt-3" />
                <p className="mt-2 text-xs text-muted-foreground tabular-nums">
                  {uploading ? `Uploading… ${Math.round(uploadPct)}%` : "Upload complete · 100%"}
                </p>
              </div>
            )}
            {errors["file"] && <p className="mt-3 text-xs text-destructive">{errors["file"]}</p>}
          </div>
        )}

        {step === 3 && (
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="rounded-lg border border-border">
              <div className="flex items-center justify-between border-b border-border px-4 py-2">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Preview</span>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setPdfPage((p) => Math.max(1, p - 1))}>
                    <ChevronLeft className="size-4" />
                  </Button>
                  <span className="text-xs tabular-nums">Page {pdfPage}</span>
                  <Button variant="outline" size="sm" onClick={() => setPdfPage((p) => p + 1)}>
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              </div>
              <div className="flex items-center justify-center bg-muted p-6">
                <div className="aspect-[3/4] w-full max-w-xs border border-border bg-background p-6 shadow-sm">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{genre || "Genre"}</p>
                  <p className="mt-6 text-lg font-semibold leading-tight">{title || "Untitled manuscript"}</p>
                  <p className="mt-2 text-xs text-muted-foreground">{user?.name}</p>
                  <div className="mt-6 space-y-1.5">
                    {Array.from({ length: 10 }).map((_, i) => (
                      <div key={i} className="h-1.5 rounded bg-muted" style={{ width: `${60 + ((i * 7) % 40)}%` }} />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-border p-4">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4" />
                <h3 className="text-sm font-semibold">AI Pre-flight Report</h3>
              </div>
              {scanning || !report ? (
                <div className="flex flex-col items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
                  <Loader2 className="size-5 animate-spin" />
                  Scanning manuscript…
                </div>
              ) : (
                <dl className="mt-4 space-y-3 text-sm">
                  <Row label="Title matched" value={report.titleMatched ? "Yes" : "No"} />
                  <Row label="Pages detected" value={String(report.detectedPages)} />
                  <Row label="Readability" value={`${report.readability}/100`} badge />
                  <Row label="Marketability" value={`${report.marketability}/100`} badge />
                  <Row label="Overall AI score" value={`${report.score}%`} badge />
                  <p className="rounded-md bg-muted p-3 text-xs leading-relaxed text-muted-foreground">
                    {report.summary}
                  </p>
                </dl>
              )}
            </div>
          </div>
        )}

        {step === 4 && (
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide">Submission summary</h3>
            <div className="mt-4 grid gap-x-8 gap-y-3 sm:grid-cols-2">
              <Row label="Title" value={title} />
              <Row label="Primary genre" value={genre} />
              <Row label="Secondary genre" value={secondaryGenre || "—"} />
              <Row label="Audience" value={audience} />
              <Row label="Keywords" value={keywords.join(", ") || "—"} />
              <Row label="Page count" value={pageCount || "—"} />
              <Row label="Launch date" value={launchDate || "—"} />
              <Row label="File" value={file?.name ?? "—"} />
              <Row label="AI score" value={report ? `${report.score}%` : "—"} />
            </div>
            <div className="mt-4 space-y-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Abstract</p>
                <p className="mt-1 text-sm">{abstract}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Synopsis</p>
                <p className="mt-1 text-sm">{synopsis}</p>
              </div>
            </div>

            <label className="mt-6 flex items-start gap-3 rounded-lg border border-border p-4">
              <Checkbox checked={confirmed} onCheckedChange={(v) => setConfirmed(v === true)} className="mt-0.5" />
              <span className="text-sm">I confirm this is my original work.</span>
            </label>
          </div>
        )}

        <div className="mt-6 flex items-center justify-between border-t border-border pt-5">
          <Button variant="outline" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
            <ChevronLeft className="size-4" /> Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={next} disabled={step === 3 && scanning}>
              Continue <ChevronRight className="size-4" />
            </Button>
          ) : (
            <Button onClick={() => setDialogOpen(true)} disabled={!confirmed}>
              Submit Manuscript
            </Button>
          )}
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit manuscript?</DialogTitle>
            <DialogDescription>
              &quot;{title}&quot; will enter the editorial pipeline and be queued for editor review. You can still
              upload revisions later.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={() => void finalSubmit()} disabled={submitting}>
              {submitting && <Loader2 className="size-4 animate-spin" />}
              Confirm submission
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function Row({ label, value, badge }: { label: string; value: string; badge?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border pb-2 last:border-0">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
      {badge ? (
        <span className="rounded-full bg-foreground px-2.5 py-0.5 text-xs font-medium text-background tabular-nums">
          {value}
        </span>
      ) : (
        <span className="truncate text-sm font-medium">{value}</span>
      )}
    </div>
  );
}