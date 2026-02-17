"use client";

import { useState, useRef, DragEvent, ChangeEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import type { Notebook } from "@/types";

interface UploadZoneProps {
  onNotebookCreated: (notebook: Notebook) => void;
}

const MAX_SIZE_MB = 5;

export function UploadZone({ onNotebookCreated }: UploadZoneProps) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function validate(file: File): string | null {
    if (file.type !== "application/pdf") return "Only PDF files are supported.";
    if (file.size > MAX_SIZE_MB * 1024 * 1024)
      return `File must be under ${MAX_SIZE_MB}MB.`;
    return null;
  }

  async function upload(file: File) {
    const err = validate(file);
    if (err) {
      setError(err);
      return;
    }

    setError(null);
    setUploading(true);
    setProgress("Uploading...");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: session?.access_token
          ? { Authorization: `Bearer ${session.access_token}` }
          : {},
        body: formData,
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? "Upload failed");
      }

      setProgress("Processing and embedding...");
      const notebook = await res.json() as Notebook;
      onNotebookCreated(notebook);
      setProgress(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
      setProgress(null);
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) upload(file);
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) upload(file);
    e.target.value = "";
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={`rounded-xl border-2 border-dashed p-8 text-center transition-colors cursor-pointer ${
        dragging
          ? "border-primary bg-primary/5"
          : "border-muted-foreground/25 hover:border-primary/50"
      }`}
      onClick={() => !uploading && inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={handleChange}
        disabled={uploading}
      />

      <div className="flex flex-col items-center gap-2">
        <svg
          className="h-10 w-10 text-muted-foreground"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>

        {uploading ? (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{progress}</p>
            <div className="h-1.5 w-48 rounded-full bg-muted overflow-hidden">
              <div className="h-full w-1/2 rounded-full bg-primary animate-pulse" />
            </div>
          </div>
        ) : (
          <>
            <p className="text-sm font-medium">
              Drop a PDF here or{" "}
              <span className="text-primary underline underline-offset-2">browse</span>
            </p>
            <p className="text-xs text-muted-foreground">
              Max {MAX_SIZE_MB}MB. Text-based PDFs only.
            </p>
          </>
        )}

        {error && (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
      </div>
    </div>
  );
}
