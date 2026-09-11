import { useState } from "react";
import { Loader2, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ImageUploader } from "@/components/pub/ImageUploader";
import type { Chapter, ChapterImage } from "@/services/types";

interface ChapterEditorProps {
  chapter?: Chapter;
  chapterNumber: number;
  onSave: (data: {
    chapterTitle: string;
    chapterContent: string;
    chapterNumber: number;
  }) => Promise<void>;
  onCancel: () => void;
  onImageUpload?: (file: File) => Promise<string | null>;
  disabled?: boolean;
}

export function ChapterEditor({
  chapter,
  chapterNumber,
  onSave,
  onCancel,
  onImageUpload,
  disabled,
}: ChapterEditorProps) {
  const [title, setTitle] = useState(chapter?.chapterTitle ?? "");
  const [content, setContent] = useState(chapter?.chapterContent ?? "");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!title.trim()) e["title"] = "Chapter title is required.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    try {
      await onSave({
        chapterTitle: title.trim(),
        chapterContent: content,
        chapterNumber,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">
          {chapter ? `Edit Chapter ${chapterNumber}` : `New Chapter ${chapterNumber}`}
        </h3>
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={saving}>
          <X className="size-4" />
        </Button>
      </div>

      <div className="space-y-2">
        <Label htmlFor="ch-title">Chapter Title</Label>
        <Input
          id="ch-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={`Chapter ${chapterNumber}: Enter title`}
          disabled={disabled || saving}
        />
        {errors["title"] && <p className="text-xs text-destructive">{errors["title"]}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="ch-content">Chapter Content</Label>
        <Textarea
          id="ch-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write your chapter content here..."
          rows={12}
          disabled={disabled || saving}
          className="font-mono text-sm leading-relaxed"
        />
        <p className="text-xs text-muted-foreground">
          {content.trim() ? `${content.trim().split(/\s+/).length} words` : "0 words"}
        </p>
      </div>

      {chapter?.images && chapter.images.length > 0 && (
        <div className="space-y-2">
          <Label>Attached Images</Label>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {chapter.images.map((img) => (
              <div key={img.name} className="rounded-md border border-border p-1">
                <img
                  src={img.imageFile}
                  alt={img.caption || "Chapter image"}
                  className="aspect-square w-full rounded object-cover"
                />
                {img.caption && (
                  <p className="mt-1 truncate text-xs text-muted-foreground">{img.caption}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {onImageUpload && (
        <ImageUploader onUpload={onImageUpload} disabled={disabled || saving} />
      )}

      <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
        <Button variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving || disabled}>
          {saving && <Loader2 className="size-4 animate-spin" />}
          <Save className="size-4" />
          {saving ? "Saving…" : "Save Chapter"}
        </Button>
      </div>
    </div>
  );
}
