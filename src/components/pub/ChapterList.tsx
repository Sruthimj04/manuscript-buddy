import { useState } from "react";
import { Trash2, GripVertical, Pencil, ChevronDown, ChevronUp, ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Chapter } from "@/services/types";

interface ChapterListProps {
  chapters: Chapter[];
  onAdd: () => void;
  onEdit: (chapter: Chapter) => void;
  onDelete: (chapterName: string) => void;
  onReorder: (chapterName: string, direction: "up" | "down") => void;
  disabled?: boolean;
}

export function ChapterList({
  chapters,
  onAdd,
  onEdit,
  onDelete,
  onReorder,
  disabled,
}: ChapterListProps) {
  const sorted = [...chapters].sort((a, b) => a.chapterNumber - b.chapterNumber);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Chapters ({sorted.length})
        </h3>
        <Button size="sm" onClick={onAdd} disabled={disabled}>
          <ImagePlus className="size-4" /> Add Chapter
        </Button>
      </div>

      {sorted.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-border px-6 py-12 text-center">
          <p className="text-sm text-muted-foreground">No chapters yet.</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Click "Add Chapter" to start building your manuscript.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((ch, i) => (
            <div
              key={ch.name || `ch-${i}`}
              className="group flex items-center gap-3 rounded-lg border border-border bg-background p-3 transition-colors hover:bg-muted/50"
            >
              <GripVertical className="size-4 shrink-0 text-muted-foreground/50" />

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-foreground text-xs font-semibold text-background">
                    {ch.chapterNumber}
                  </span>
                  <p className="truncate text-sm font-medium">{ch.chapterTitle || "Untitled Chapter"}</p>
                </div>
                <p className="ml-8 mt-0.5 text-xs text-muted-foreground">
                  {ch.chapterContent
                    ? `${ch.chapterContent.replace(/<[^>]*>/g, "").slice(0, 80)}…`
                    : "No content yet"}
                  {ch.images?.length > 0 && ` · ${ch.images.length} image${ch.images.length > 1 ? "s" : ""}`}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onReorder(ch.name, "up")}
                  disabled={disabled || i === 0}
                  className="size-7 p-0"
                >
                  <ChevronUp className="size-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onReorder(ch.name, "down")}
                  disabled={disabled || i === sorted.length - 1}
                  className="size-7 p-0"
                >
                  <ChevronDown className="size-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(ch)}
                  disabled={disabled}
                  className="size-7 p-0"
                >
                  <Pencil className="size-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(ch.name)}
                  disabled={disabled}
                  className="size-7 p-0 text-destructive hover:text-destructive"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
