import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ImageUploaderProps {
  onUpload: (file: File) => Promise<string | null>;
  disabled?: boolean;
}

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

export function ImageUploader({ onUpload, disabled }: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  function validateFile(file: File): string | null {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return "Invalid file type. Please upload a JPEG, PNG, GIF, or WebP image.";
    }
    if (file.size > MAX_IMAGE_SIZE) {
      return "Image too large. Maximum size is 10 MB.";
    }
    return null;
  }

  async function handleFile(file: File) {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setUploading(true);

    // Show preview
    const url = URL.createObjectURL(file);
    setPreview(url);

    try {
      const result = await onUpload(file);
      if (result) {
        setPreview(null);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      <div
        onClick={() => !disabled && !uploading && inputRef.current?.click()}
        className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border p-4 text-center transition-colors hover:border-foreground/30 hover:bg-muted/50"
      >
        {uploading ? (
          <>
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Uploading image…</span>
          </>
        ) : (
          <>
            <ImagePlus className="size-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Add image to chapter</span>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(",")}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
          }}
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
          <X className="size-3 shrink-0" />
          {error}
        </div>
      )}

      {preview && (
        <div className="relative w-20">
          <img src={preview} alt="Upload preview" className="rounded-md border border-border object-cover" />
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center rounded-md bg-background/70">
              <Loader2 className="size-4 animate-spin" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
