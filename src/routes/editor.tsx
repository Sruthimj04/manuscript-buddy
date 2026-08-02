import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/pub/AppShell";
import { StatusBadge } from "@/components/pub/StatusBadge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import * as service from "@/services/manuscriptService";
import { REJECTION_REASONS } from "@/services/mockData";
import { useApp } from "@/store/app-store";

export const Route = createFileRoute("/editor")({
  head: () => ({
    meta: [
      { title: "Editor Review Queue — LOREM" },
      { name: "description", content: "Review pending manuscripts and approve, request revisions, or reject." },
      { property: "og:title", content: "Editor Review Queue — LOREM" },
      { property: "og:description", content: "Editorial decisions with structured feedback and rejection reasons." },
    ],
  }),
  component: EditorPage,
});

type Decision = "approve" | "revise" | "reject";

function EditorPage() {
  const { manuscripts, loading, refresh, user } = useApp();
  const [openId, setOpenId] = useState<string | null>(null);
  const [decision, setDecision] = useState<Decision>("approve");
  const [feedback, setFeedback] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const pending = manuscripts.filter((m) => m.state === "Pending Editor Review" || m.state === "AI Processing");

  async function submit() {
    if (!openId) return;
    if (decision === "revise" && !feedback.trim()) {
      setError("Feedback is required when requesting revisions.");
      return;
    }
    if (decision === "reject" && (!reason || !feedback.trim())) {
      setError("A rejection reason and explanation are both required.");
      return;
    }
    setError(null);
    setBusy(true);
    await service.addEditorDecision(openId, decision, user?.name ?? "Editor", feedback.trim() || undefined, reason || undefined);
    await refresh();
    setBusy(false);
    setOpenId(null);
    setFeedback("");
    setReason("");
    toast.success("Decision recorded");
  }

  return (
    <AppShell>
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Editor review workspace</h1>
      <p className="mt-1 text-sm text-muted-foreground">Manuscripts awaiting an editorial decision.</p>

      <section className="mt-6 rounded-xl border border-border bg-card">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading queue…
          </div>
        ) : pending.length === 0 ? (
          <p className="px-5 py-16 text-center text-sm text-muted-foreground">
            The review queue is empty. New submissions will appear here.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-5 py-3 font-medium">Manuscript</th>
                  <th className="px-5 py-3 font-medium">Author</th>
                  <th className="px-5 py-3 font-medium">State</th>
                  <th className="px-5 py-3 font-medium">AI Score</th>
                  <th className="px-5 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pending.map((m) => (
                  <tr key={m.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                    <td className="px-5 py-4">
                      <p className="font-medium">{m.title}</p>
                      <p className="text-xs text-muted-foreground">{m.id}</p>
                    </td>
                    <td className="px-5 py-4 text-muted-foreground">{m.author}</td>
                    <td className="px-5 py-4">
                      <StatusBadge state={m.state} />
                    </td>
                    <td className="px-5 py-4 tabular-nums">{m.ai ? `${m.ai.score}%` : "—"}</td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <Button asChild variant="outline" size="sm">
                          <Link to="/manuscript/$id" params={{ id: m.id }}>
                            Open
                          </Link>
                        </Button>
                        <Button size="sm" onClick={() => setOpenId(m.id)}>
                          Make decision
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Dialog open={!!openId} onOpenChange={(o) => !o && setOpenId(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editorial decision</DialogTitle>
            <DialogDescription>Your decision is logged in the manuscript audit timeline.</DialogDescription>
          </DialogHeader>

          <RadioGroup value={decision} onValueChange={(v) => setDecision(v as Decision)} className="gap-3">
            {[
              { id: "approve", label: "Approve Manuscript" },
              { id: "revise", label: "Request Revisions" },
              { id: "reject", label: "Reject Manuscript" },
            ].map((o) => (
              <label key={o.id} className="flex items-center gap-3 rounded-lg border border-border p-3 text-sm">
                <RadioGroupItem value={o.id} id={o.id} />
                {o.label}
              </label>
            ))}
          </RadioGroup>

          {decision === "reject" && (
            <div className="space-y-2">
              <Label>Rejection reason</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  {REJECTION_REASONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {decision !== "approve" && (
            <div className="space-y-2">
              <Label htmlFor="fb">{decision === "reject" ? "Explanation" : "Revision feedback"}</Label>
              <Textarea id="fb" rows={5} value={feedback} onChange={(e) => setFeedback(e.target.value)} />
            </div>
          )}

          {error && <p className="text-xs text-destructive">{error}</p>}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenId(null)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={() => void submit()} disabled={busy}>
              {busy && <Loader2 className="size-4 animate-spin" />}
              Submit decision
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}