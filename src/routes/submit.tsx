import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Check, ChevronLeft, ChevronRight, Loader2, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/pub/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { AUDIENCES, GENRES } from "@/services/mockData";
import * as service from "@/services/manuscriptService";
import type { Manuscript, Chapter } from "@/services/types";
import { useApp } from "@/store/app-store";
import { ChapterList } from "@/components/pub/ChapterList";
import { ChapterEditor } from "@/components/pub/ChapterEditor";

export const Route = createFileRoute("/submit")({
  head: () => ({
    meta: [
      { title: "New Submission — LOREM" },
      { name: "description", content: "Five-step manuscript submission wizard with chapter upload and AI pre-flight scan." },
      { property: "og:title", content: "New Submission — LOREM" },
      { property: "og:description", content: "Submit a manuscript with metadata, chapters, and AI pre-flight analysis." },
    ],
  }),
  component: SubmitPage,
});

const STEPS = ["Title & Category", "Description", "Chapters", "Preview & AI Scan", "Confirm"];

function SubmitPage() {
  const { user, refresh } = useApp();
  const navigate = useNavigate();

  // Wizard state
  const [step, setStep] = useState(0);
  const [activeManuscript, setActiveManuscript] = useState<Manuscript | null>(null);
  const [initializing, setInitializing] = useState(true);

  // Form state
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

  // Chapter state
  const [editingChapter, setEditingChapter] = useState<{ chapter?: Chapter; number: number } | null>(null);

  // AI & Final check state
  const [scanning, setScanning] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [legalAccepted, setLegalAccepted] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 1. Initialize submission state
  useEffect(() => {
    async function loadActive() {
      setInitializing(true);
      try {
        const ms = await service.getActiveSubmission();
        if (ms) {
          setActiveManuscript(ms);
          setTitle(ms.title || "");
          setGenre(ms.genre || "");
          setSecondaryGenre(ms.secondaryGenre || "");
          setAudience(ms.audience || "");
          setKeywords(ms.keywords || []);
          setAbstract(ms.abstract || "");
          setSynopsis(ms.synopsis || "");
          setPageCount(ms.pageCount ? String(ms.pageCount) : "");
          setLaunchDate(ms.launchDate || "");
          if (ms.legalDeclaration) {
            setLegalAccepted(true);
            setConfirmed(true);
          }
        }
      } catch (err) {
        toast.error("Failed to load active submission.");
      } finally {
        setInitializing(false);
      }
    }
    void loadActive();
  }, []);

  // Update backend draft state whenever we move steps
  async function syncDraft() {
    if (!title.trim()) return; // Requires at least a title

    const data = {
      title,
      author: user?.name ?? "Unknown Author",
      genre,
      secondaryGenre,
      audience,
      keywords,
      abstract,
      synopsis,
      pageCount: pageCount ? Number(pageCount) : undefined,
      launchDate: launchDate || undefined,
      ai: null,
      chapters: [],
      legalDeclaration: false,
    };

    if (activeManuscript) {
      if (activeManuscript.state === "Draft") {
        await service.saveDraft(activeManuscript.id, data);
      }
    } else {
      // Create new draft
      const newMs = await service.createManuscript({ ...data, state: "Draft" });
      setActiveManuscript(newMs);
    }
  }

  const words = (s: string) => (s.trim() ? s.trim().split(/\s+/).length : 0);

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
      if (!activeManuscript?.chapters?.length) {
        e["chapters"] = "Please add at least one chapter to continue.";
      }
    }
    if (step === 3) {
      // preview/scan step has no manual validation
    }
    if (step === 4) {
      if (!confirmed) e["confirm"] = "Please confirm the legal declaration.";
      if (!legalAccepted) e["legal"] = "Please accept the legal terms.";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function next() {
    if (!validateStep()) return;
    
    // Save state when moving forward
    try {
      await syncDraft();
    } catch (e) {
      toast.error("Failed to save draft.");
      return;
    }

    if (step === 2 && (!activeManuscript?.ai || activeManuscript.state === "Draft")) {
      setScanning(true);
      setStep(3);
      // Simulate AI scan delay but don't actually update the backend draft AI field yet, it saves on final submit
      setTimeout(() => {
        if (activeManuscript) {
          activeManuscript.ai = service.generateAIReport({
            title,
            genre,
            secondaryGenre: secondaryGenre || undefined,
            pageCount: pageCount ? Number(pageCount) : undefined,
          });
        }
        setScanning(false);
      }, 1400);
      return;
    }
    
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  }

  async function finalSubmit() {
    if (!validateStep() || !activeManuscript) return;
    setSubmitting(true);
    try {
      if (activeManuscript.state === "Draft") {
        await syncDraft(); // Endure draft is up to date
      }
      if (legalAccepted) {
        await service.acceptLegalDeclaration(activeManuscript.id);
      }
      await service.finalSubmit(activeManuscript.id);
      await refresh();
      setDialogOpen(false);
      toast.success("Manuscript submitted", { description: `${title} is now pending editor review.` });
      void navigate({ to: "/manuscript/$id", params: { id: activeManuscript.id } });
    } catch {
      toast.error("Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // --- Chapter Management ---

  async function handleChapterSave(data: { chapterTitle: string; chapterContent: string; chapterNumber: number }) {
    if (!activeManuscript) {
      await syncDraft(); // Create draft first if it doesn't exist
    }
    // Need to get the updated manuscript ID if we just created it
    const msId = activeManuscript?.id;
    if (!msId) {
      toast.error("Could not save chapter: manuscript ID missing.");
      return;
    }

    try {
      const isEditing = editingChapter?.chapter;
      if (isEditing) {
        const updatedMs = await service.updateChapter(msId, isEditing.name, data);
        setActiveManuscript(updatedMs);
        toast.success(`Chapter ${data.chapterNumber} updated.`);
      } else {
        const updatedMs = await service.createChapter(msId, data);
        setActiveManuscript(updatedMs);
        toast.success(`Chapter ${data.chapterNumber} created.`);
      }
      setEditingChapter(null);
    } catch {
      toast.error("Failed to save chapter.");
    }
  }

  async function handleChapterDelete(chapterName: string) {
    if (!activeManuscript) return;
    if (confirm("Are you sure you want to delete this chapter?")) {
      try {
        const updatedMs = await service.deleteChapter(activeManuscript.id, chapterName);
        setActiveManuscript(updatedMs);
        toast.success("Chapter deleted.");
      } catch {
        toast.error("Failed to delete chapter.");
      }
    }
  }

  async function handleImageUpload(file: File) {
    if (!activeManuscript || !editingChapter?.chapter) {
      toast.error("Create and save the chapter before adding images.");
      return null;
    }
    
    // In a real app we'd upload to a storage bucket and get a URL here.
    // For this prototype, we'll use a local object URL or base64.
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const b64 = reader.result as string;
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          if (!activeManuscript || !editingChapter?.chapter) return;
          const ms = await service.uploadChapterImage(
            activeManuscript.id,
            editingChapter.chapter.name,
            b64
          );
          setActiveManuscript(ms);
          
          // Update the editor view with the new manuscript state
          const updatedChapter = ms.chapters.find(c => c.name === editingChapter.chapter!.name);
          if (updatedChapter) {
            setEditingChapter({ chapter: updatedChapter, number: updatedChapter.chapterNumber });
          }
          resolve(b64);
        } catch (e) {
          reject(e);
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function handleChapterReorder(chapterName: string, direction: "up" | "down") {
    if (!activeManuscript) return;
    const chapters = [...activeManuscript.chapters].sort((a, b) => a.chapterNumber - b.chapterNumber);
    const index = chapters.findIndex((c) => c.name === chapterName);
    if (index === -1) return;
    
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= chapters.length) return;

    try {
      // Swap numbers
      const ch1 = chapters[index];
      const ch2 = chapters[targetIndex];
      if (!ch1 || !ch2) return;
      const tempNum = ch1.chapterNumber;
      
      await service.updateChapter(activeManuscript.id, ch1.name, {
        chapterTitle: ch1.chapterTitle,
        chapterContent: ch1.chapterContent,
        chapterNumber: ch2.chapterNumber
      });
      const ms = await service.updateChapter(activeManuscript.id, ch2.name, {
        chapterTitle: ch2.chapterTitle,
        chapterContent: ch2.chapterContent,
        chapterNumber: tempNum
      });
      setActiveManuscript(ms);
    } catch {
      toast.error("Failed to reorder chapters.");
    }
  }


  if (initializing) {
    return (
      <AppShell allow={["author"]}>
        <div className="flex h-[60vh] flex-col items-center justify-center gap-4 text-muted-foreground">
          <Loader2 className="size-6 animate-spin" />
          <p>Loading submission…</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell allow={["author"]}>
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
          <div className="space-y-6">
            <div className="flex items-center justify-between border-border pb-4">
              <div>
                <h2 className="text-lg font-semibold tracking-tight">Manuscript Chapters</h2>
                <p className="text-sm text-muted-foreground">Add chapters one by one. You can upload images within each chapter.</p>
              </div>
            </div>

            {editingChapter ? (
              <ChapterEditor
                chapterNumber={editingChapter.number}
                {...(editingChapter.chapter ? { chapter: editingChapter.chapter } : {})}
                onSave={handleChapterSave}
                onCancel={() => setEditingChapter(null)}
                onImageUpload={handleImageUpload}
              />
            ) : (
              <ChapterList
                chapters={activeManuscript?.chapters || []}
                onAdd={() => {
                  if (!activeManuscript) {
                    syncDraft().then(() => {
                      setEditingChapter({ number: 1 });
                    });
                  } else {
                    const nextNum = (activeManuscript.chapters?.length || 0) + 1;
                    setEditingChapter({ number: nextNum });
                  }
                }}
                onEdit={(ch) => setEditingChapter({ chapter: ch, number: ch.chapterNumber })}
                onDelete={handleChapterDelete}
                onReorder={handleChapterReorder}
              />
            )}
            
            {!editingChapter && errors["chapters"] && (
              <p className="rounded-md bg-destructive/10 p-3 text-xs text-destructive">{errors["chapters"]}</p>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="rounded-lg border border-border">
              <div className="flex items-center justify-between border-b border-border px-4 py-2">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Content Preview</span>
              </div>
              <div className="max-h-[600px] overflow-y-auto bg-muted p-4 sm:p-6 space-y-6">
                {!activeManuscript?.chapters?.length ? (
                  <div className="flex h-32 items-center justify-center rounded border border-dashed border-border bg-background">
                    <p className="text-sm text-muted-foreground">No chapters available</p>
                  </div>
                ) : (
                    activeManuscript.chapters.map(ch => (
                        <div key={ch.name} className="space-y-4 bg-background p-6 rounded shadow-sm border border-border">
                            <h3 className="font-serif text-xl border-b pb-2">Chapter {ch.chapterNumber}: {ch.chapterTitle}</h3>
                            <div className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed">
                                {ch.chapterContent.split('\n').map((p, i) => (
                                    <p key={i}>{p}</p>
                                ))}
                            </div>
                            {ch.images?.length > 0 && (
                                <div className="mt-6 grid grid-cols-2 gap-4 border-t pt-4">
                                    {ch.images.map(img => (
                                        <div key={img.name} className="space-y-1">
                                            <img src={img.imageFile} alt={img.caption} className="rounded object-cover w-full aspect-video" />
                                            {img.caption && <p className="text-xs text-muted-foreground">{img.caption}</p>}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))
                )}
              </div>
            </div>

            <div className="rounded-lg border border-border p-4">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4" />
                <h3 className="text-sm font-semibold">AI Pre-flight Report</h3>
              </div>
              {scanning || !activeManuscript?.ai ? (
                <div className="flex flex-col items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
                  <Loader2 className="size-5 animate-spin" />
                  Analyzing manuscript content…
                </div>
              ) : (
                <dl className="mt-4 space-y-3 text-sm">
                  <Row label="Title matched" value={activeManuscript.ai.titleMatched ? "Yes" : "No"} />
                  <Row label="Chapters detected" value={String(activeManuscript.chapters.length)} />
                  <Row label="Readability" value={`${activeManuscript.ai.readability}/100`} badge />
                  <Row label="Marketability" value={`${activeManuscript.ai.marketability}/100`} badge />
                  <Row label="Overall AI score" value={`${activeManuscript.ai.score}%`} badge />
                  <p className="rounded-md bg-muted p-3 text-xs leading-relaxed text-muted-foreground">
                    {activeManuscript.ai.summary}
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
              <Row label="Chapters" value={`${activeManuscript?.chapters?.length || 0} chapters`} />
              <Row label="AI score" value={activeManuscript?.ai ? `${activeManuscript.ai.score}%` : "—"} />
            </div>
            
            <div className="mt-6 mb-2 border-t border-border pt-6">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-destructive">Legal Declaration</h3>
            </div>
            <div className="space-y-4 rounded-lg border border-destructive/20 bg-destructive/5 p-4">
                <label className="flex items-start gap-3">
                    <Checkbox id="legal" checked={legalAccepted} onCheckedChange={(v) => setLegalAccepted(v === true)} className="mt-0.5 border-destructive/50 data-[state=checked]:bg-destructive data-[state=checked]:text-destructive-foreground" />
                    <div className="space-y-1">
                        <span className="text-sm font-medium">I accept the Legal Declaration</span>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            By checking this box, I confirm that I am the sole author of this manuscript and it does not infringe upon any existing copyrights. I assume full legal responsibility for its contents.
                        </p>
                    </div>
                </label>
                {errors["legal"] && <p className="text-xs text-destructive">{errors["legal"]}</p>}
            </div>

            <label className="mt-4 flex items-start gap-3 rounded-lg border border-border p-4">
              <Checkbox checked={confirmed} onCheckedChange={(v) => setConfirmed(v === true)} className="mt-0.5" />
              <span className="text-sm">I confirm all information is correct and ready for transmission.</span>
            </label>
             {errors["confirm"] && <p className="ml-3 mt-1 text-xs text-destructive">{errors["confirm"]}</p>}
          </div>
        )}

        <div className="mt-6 flex items-center justify-between border-t border-border pt-5">
          <Button variant="outline" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0 || editingChapter !== null}>
            <ChevronLeft className="size-4" /> Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={next} disabled={(step === 3 && scanning) || editingChapter !== null}>
              Continue <ChevronRight className="size-4" />
            </Button>
          ) : (
            <Button onClick={() => setDialogOpen(true)} disabled={!confirmed || !legalAccepted}>
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
              &quot;{title}&quot; will enter the editorial pipeline and be queued for editor review. You will not be able to edit chapters while it is under review.
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
    <div className="flex items-center justify-between gap-4 border-b border-border pb-2 last:border-0 hover:bg-muted/50 rounded-sm px-1 transition-colors">
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
