"use client";

import { useState, useRef, useEffect, useCallback, DragEvent, ChangeEvent } from "react";
import type { Notebook } from "@/types";

interface UploadZoneProps {
  onNotebookCreated: (notebook: Notebook) => void;
  onNavigate: (path: string) => void;
}

const MAX_SIZE_MB = 5;
const POLL_INTERVAL = 3000;
const POLL_TIMEOUT = 90000;

const STAGES = [
  { label: "Uploading file...", pct: 20 },
  { label: "Extracting text...", pct: 40 },
  { label: "Building knowledge base...", pct: 70 },
  { label: "Almost ready...", pct: 90 },
];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function UploadZone({ onNotebookCreated, onNavigate }: UploadZoneProps) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [stageIndex, setStageIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pendingNotebook, setPendingNotebook] = useState<Notebook | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const stageTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollStartRef = useRef<number>(0);

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

  function stopPolling() {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }

  const pollNotebookStatus = useCallback(
    async (notebookId: string) => {
      if (Date.now() - pollStartRef.current > POLL_TIMEOUT) {
        stopStageTimer();
        setUploading(false);
        setPendingNotebook(null);
        setSelectedFile(null);
        setStageIndex(0);
        setError("Processing timed out. The notebook may still finish. Check your dashboard.");
        return;
      }

      try {
        const res = await fetch(`/api/notebooks/${notebookId}`);
        if (!res.ok) return;
        const notebook = (await res.json()) as Notebook;

        if (notebook.status === "ready") {
          stopStageTimer();
          setUploading(false);
          setPendingNotebook(null);
          setSelectedFile(null);
          setStageIndex(0);
          onNavigate(`/notebook/${notebookId}`);
          return;
        }

        if (notebook.status === "error") {
          stopStageTimer();
          setUploading(false);
          setPendingNotebook(null);
          setSelectedFile(null);
          setStageIndex(0);
          setError("Processing failed. Please try uploading again.");
          return;
        }

        // Still processing, poll again
        pollTimerRef.current = setTimeout(() => pollNotebookStatus(notebookId), POLL_INTERVAL);
      } catch {
        // Network error, retry
        pollTimerRef.current = setTimeout(() => pollNotebookStatus(notebookId), POLL_INTERVAL);
      }
    },
    [onNavigate]
  );

  useEffect(() => {
    return () => {
      stopStageTimer();
      stopPolling();
    };
  }, []);

  async function upload(file: File) {
    const err = validate(file);
    if (err) {
      setError(err);
      setSelectedFile(null);
      return;
    }

    setError(null);
    setSelectedFile(file);
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

      if (notebook.status === "ready") {
        // Already ready (unlikely but possible for tiny PDFs)
        stopStageTimer();
        setUploading(false);
        setSelectedFile(null);
        setStageIndex(0);
        onNavigate(`/notebook/${notebook.id}`);
      } else {
        // Start polling for status
        setPendingNotebook(notebook);
        pollStartRef.current = Date.now();
        pollTimerRef.current = setTimeout(() => pollNotebookStatus(notebook.id), POLL_INTERVAL);
      }
    } catch (e) {
      stopStageTimer();
      setUploading(false);
      setStageIndex(0);
      setSelectedFile(null);
      setError(e instanceof Error ? e.message : "Upload failed. Please try again.");
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
  const isProcessing = uploading || pendingNotebook !== null;

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={`relative rounded-xl border-2 border-dashed p-8 text-center transition-all duration-300 ${
        isProcessing
          ? "border-primary/30 bg-primary/[0.03] cursor-not-allowed"
          : dragging
          ? "border-primary bg-primary/[0.05] scale-[1.01] shadow-lg shadow-primary/5 cursor-copy"
          : "border-muted-foreground/20 hover:border-primary/40 hover:bg-primary/[0.02] cursor-pointer"
      }`}
      onClick={() => !isProcessing && inputRef.current?.click()}
      role="button"
      tabIndex={isProcessing ? -1 : 0}
      aria-label="Upload a PDF file"
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && !isProcessing) {
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
        disabled={isProcessing}
        aria-hidden
      />

      <div className="flex flex-col items-center gap-3">
        {isProcessing ? (
          <>
            {selectedFile && (
              <div className="flex items-center gap-2 rounded-lg bg-primary/5 border border-primary/10 px-3 py-1.5 mb-1">
                <svg className="h-4 w-4 text-primary/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                <span className="text-xs font-medium text-foreground/80">{selectedFile.name}</span>
                <span className="text-[10px] text-muted-foreground">{formatFileSize(selectedFile.size)}</span>
              </div>
            )}

            <div className="space-y-3 w-full max-w-xs">
              <p className="text-sm font-medium text-foreground/80">{stage.label}</p>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary/80 to-primary transition-all duration-[3000ms] ease-out"
                  style={{ width: `${stage.pct}%` }}
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                {pendingNotebook
                  ? "Processing your document. You'll be redirected automatically."
                  : "This may take up to 60 seconds for large documents."}
              </p>
            </div>
          </>
        ) : (
          <>
            <div className={`flex h-12 w-12 items-center justify-center rounded-full transition-colors duration-300 ${
              dragging ? "bg-primary/10" : "bg-muted"
            }`}>
              <svg
                className={`h-6 w-6 transition-colors duration-300 ${
                  dragging ? "text-primary" : "text-muted-foreground/60"
                }`}
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
            </div>
            <div>
              <p className="text-sm font-medium">
                {dragging ? (
                  <span className="text-primary">Drop to upload</span>
                ) : (
                  <>
                    Drop a PDF here or{" "}
                    <span className="text-primary underline underline-offset-2">browse</span>
                  </>
                )}
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
            className="text-sm text-destructive max-w-xs"
          >
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
