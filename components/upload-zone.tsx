"use client";

import { useState, useRef, DragEvent, ChangeEvent } from "react";
import type { Notebook } from "@/types";

interface UploadZoneProps {
  onNotebookCreated: (notebook: Notebook) => void;
}

const MAX_SIZE_MB = 5;

const STAGES = [
  { label: "Uploading file...", pct: 20 },
  { label: "Extracting text...", pct: 40 },
  { label: "Building knowledge base...", pct: 70 },
  { label: "Almost ready...", pct: 90 },
];

export function UploadZone({ onNotebookCreated }: UploadZoneProps) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [stageIndex, setStageIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const stageTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function validate(file: File): string | null {
    if (file.type !== "application/pdf") return "Only PDF files are supported.";
    if (file.size > MAX_SIZE_MB * 1024 * 1024)
      return `File must be under ${MAX_SIZE_MB} MB.`;
    return null;
  }

  function startStageTimer() {
    setStageIndex(0);
    stageTimerRef.current = setInterval(() => {
      setStageIndex((prev) => Math.min(prev + 1, STAGES.length - 1));
    }, 8000);
  }

  function stopStageTimer() {
    if (stageTimerRef.current) {
      clearInterval(stageTimerRef.current);
      stageTimerRef.current = null;
    }
  }

  async function upload(file: File) {
    const err = validate(file);
    if (err) {
      setError(err);
      return;
    }

    setError(null);
    setUploading(true);
    startStageTimer();

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Upload failed. Please try again.");
      }

      const notebook = (await res.json()) as Notebook;
      onNotebookCreated(notebook);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed. Please try again.");
    } finally {
      stopStageTimer();
      setUploading(false);
      setStageIndex(0);
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

  const stage = STAGES[stageIndex];

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={`rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
        uploading
          ? "border-primary/40 bg-primary/5 cursor-not-allowed"
          : dragging
          ? "border-primary bg-primary/5 cursor-copy"
          : "border-muted-foreground/25 hover:border-primary/50 cursor-pointer"
      }`}
      onClick={() => !uploading && inputRef.current?.click()}
      role="button"
      tabIndex={uploading ? -1 : 0}
      aria-label="Upload a PDF file"
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && !uploading) {
          inputRef.current?.click();
        }
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={handleChange}
        disabled={uploading}
        aria-hidden
      />

      <div className="flex flex-col items-center gap-3">
        {uploading ? (
          <>
            <div className="relative h-10 w-10">
              <svg className="animate-spin h-10 w-10 text-primary/30" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
            <div className="space-y-2 w-full max-w-xs">
              <p className="text-sm font-medium text-muted-foreground">{stage.label}</p>
              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-[3000ms] ease-out"
                  style={{ width: `${stage.pct}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                This may take up to 60 seconds for large documents.
              </p>
            </div>
          </>
        ) : (
          <>
            <svg
              className="h-10 w-10 text-muted-foreground/60"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
              />
            </svg>
            <div>
              <p className="text-sm font-medium">
                Drop a PDF here or{" "}
                <span className="text-primary underline underline-offset-2">browse</span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                PDF only, max {MAX_SIZE_MB} MB. Text-based PDFs only (no scanned images).
              </p>
            </div>
          </>
        )}

        {error && (
          <p
            role="alert"
            aria-live="polite"
            className="text-sm text-red-600 dark:text-red-400 max-w-xs"
          >
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
