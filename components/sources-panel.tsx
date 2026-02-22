"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useTranslations } from "next-intl";
import { PdfViewerModal } from "@/components/pdf-viewer-modal";
import { validateUploadFile } from "@/lib/validate-file";
import type { NotebookFile } from "@/types";

interface SourcesPanelProps {
  notebookId: string;
  initialFiles: NotebookFile[];
}

export function SourcesPanel({ notebookId, initialFiles }: SourcesPanelProps) {
  const t = useTranslations("sources");
  const [files, setFiles] = useState<NotebookFile[]>(initialFiles);
  const [uploadingFiles, setUploadingFiles] = useState<Map<string, number>>(new Map());
  const uploading = uploadingFiles.size > 0;
  const uploadProgress = uploading
    ? Math.round([...uploadingFiles.values()].reduce((a, b) => a + b, 0) / uploadingFiles.size)
    : 0;
  const [error, setError] = useState<string | null>(null);
  const MAX_FILES = 5;
  const [dragging, setDragging] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

  // Auto-dismiss error after 5s
  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(null), 5000);
    return () => clearTimeout(timer);
  }, [error]);

  const handleUpload = useCallback(async (file: File) => {
    const validation = validateUploadFile(file);
    if (!validation.valid) {
      setError(t(validation.error === "unsupportedType" ? "unsupportedType" : "fileTooLarge"));
      return;
    }
    if (files.some(f => f.file_name === file.name && f.status !== "error")) {
      setError(t("duplicateFile"));
      return;
    }
    if (files.length >= MAX_FILES) {
      setError(t("fileLimitReached"));
      return;
    }

    const uploadKey = `${file.name}-${Date.now()}`;
    setError(null);
    setUploadingFiles((prev) => new Map(prev).set(uploadKey, 0));

    const formData = new FormData();
    formData.append("file", file);

    try {
      const xhr = new XMLHttpRequest();

      const result = await new Promise<NotebookFile>((resolve, reject) => {
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 80);
            setUploadingFiles((prev) => new Map(prev).set(uploadKey, pct));
          }
        };
        xhr.upload.onloadend = () => {
          setUploadingFiles((prev) => new Map(prev).set(uploadKey, 90));
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              resolve(JSON.parse(xhr.responseText));
            } catch {
              reject(new Error("Invalid response"));
            }
          } else {
            try {
              const body = JSON.parse(xhr.responseText);
              reject(new Error(body.error ?? "Upload failed"));
            } catch {
              reject(new Error("Upload failed"));
            }
          }
        };
        xhr.onerror = () => reject(new Error("Upload failed"));
        xhr.open("POST", `/api/notebooks/${notebookId}/files`);
        xhr.send(formData);
      });

      setUploadingFiles((prev) => new Map(prev).set(uploadKey, 100));
      setFiles((prev) => [result, ...prev]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setTimeout(() => {
        setUploadingFiles((prev) => {
          const next = new Map(prev);
          next.delete(uploadKey);
          return next;
        });
      }, 500);
    }
  }, [notebookId, t, files]);

  async function handleDelete(fileId: string) {
    setConfirmDeleteId(null);
    try {
      const res = await fetch(`/api/notebooks/${notebookId}/files/${fileId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setFiles((prev) => prev.filter((f) => f.id !== fileId));
      }
    } catch {
      // File remains in list on failure
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    const remaining = MAX_FILES - files.length;
    if (remaining <= 0) {
      setError(t("fileLimitReached"));
      e.target.value = "";
      return;
    }
    const selected = Array.from(fileList).slice(0, remaining);
    for (const file of selected) {
      handleUpload(file);
    }
    e.target.value = "";
  }

  function handleDragEnter(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.types.includes("Files")) {
      setDragging(true);
    }
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setDragging(false);
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    dragCounterRef.current = 0;
    const remaining = MAX_FILES - files.length;
    if (remaining <= 0) {
      setError(t("fileLimitReached"));
      return;
    }
    const dropped = Array.from(e.dataTransfer.files).slice(0, remaining);
    for (const file of dropped) {
      handleUpload(file);
    }
  }

  return (
    <div
      className="flex flex-col h-full"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold">{t("title")}</h2>
          {files.length > 0 && (
            <span className="text-[10px] text-muted-foreground bg-muted rounded-full px-1.5 py-0.5">
              {files.length}
            </span>
          )}
        </div>
        <div>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.txt,.docx,.jpg,.jpeg,.png,.webp"
            multiple
            className="hidden"
            onChange={handleFileChange}
            disabled={uploading}
          />
          <button
            onClick={() => inputRef.current?.click()}
            disabled={uploading || files.length >= MAX_FILES}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-50"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {t("add")}
          </button>
        </div>
      </div>

      {/* Drop zone */}
      <div
        className={`mx-3 mt-3 rounded-lg border-2 border-dashed px-3 py-3 text-center cursor-pointer transition-all shrink-0 ${
          dragging
            ? "border-primary bg-primary/5 scale-[1.01]"
            : "border-muted-foreground/20 hover:border-primary/40 hover:bg-primary/[0.02]"
        } ${uploading ? "pointer-events-none opacity-60" : ""}`}
        onClick={() => !uploading && files.length < MAX_FILES && inputRef.current?.click()}
      >
        <div className="flex items-center justify-center gap-2">
          <svg className="h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <span className="text-xs text-muted-foreground">
            {dragging ? t("dropHere") : t("dropOrClick")}
          </span>
        </div>
      </div>

      {/* Upload progress */}
      {uploading && (
        <div className="mx-3 mt-2 shrink-0">
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary/80 to-primary transition-[width] duration-500 ease-out"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">
            {uploadingFiles.size > 1
              ? t("uploadingCount", { count: uploadingFiles.size })
              : uploadProgress < 80 ? t("uploading") : t("processing")}
          </p>
        </div>
      )}

      {/* File list */}
      <div className="flex-1 overflow-y-auto scrollbar-thin mt-2 min-h-0">
        {files.length === 0 && !uploading ? (
          <div className="flex flex-col items-center justify-center h-full px-4 py-8 text-center">
            <svg className="h-10 w-10 text-muted-foreground/30 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <p className="text-xs font-medium text-muted-foreground">{t("noSources")}</p>
            <p className="text-[10px] text-muted-foreground/60 mt-1">{t("addPdfToStart")}</p>
            <button
              onClick={() => inputRef.current?.click()}
              className="mt-3 text-xs text-primary hover:text-primary/80 font-medium transition-colors"
            >
              {t("uploadPdf")}
            </button>
          </div>
        ) : (
          <div className="px-2">
            {files.map((file) => (
              <div
                key={file.id}
                className="group flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-accent/50 transition-colors relative"
              >
                {/* Status dot + icon */}
                <div className="relative shrink-0">
                  <svg className="h-4 w-4 text-muted-foreground/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <span className={`absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full border border-background ${
                    file.status === "ready" ? "bg-primary" :
                    file.status === "processing" ? "bg-[#D4A27F] animate-pulse" :
                    "bg-destructive"
                  }`} />
                </div>

                {/* File info */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate" title={file.file_name}>
                    {file.file_name.replace(/\.(pdf|txt|docx|jpg|jpeg|png|webp)$/i, "")}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {file.status === "ready" && file.page_count
                      ? t("pages", { count: file.page_count })
                      : file.status === "processing"
                      ? t("processing")
                      : file.status === "error"
                      ? t("failed")
                      : ""}
                  </p>
                </div>

                {/* Actions */}
                {confirmDeleteId === file.id ? (
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-[10px] text-destructive mr-1">{t("deleteConfirm")}</span>
                    <button
                      onClick={() => handleDelete(file.id)}
                      className="h-5 w-5 flex items-center justify-center rounded text-destructive hover:bg-destructive/10"
                      aria-label="Confirm delete"
                    >
                      <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      className="h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:bg-accent"
                      aria-label="Cancel delete"
                    >
                      <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    {file.status === "ready" && (
                      <PdfViewerModal
                        notebookId={notebookId}
                        fileId={file.id}
                        trigger={
                          <button
                            className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent"
                            aria-label={t("viewPdf")}
                          >
                            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                        }
                      />
                    )}
                    <button
                      onClick={() => setConfirmDeleteId(file.id)}
                      className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      aria-label={t("deleteFile")}
                    >
                      <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Error bar */}
      {error && (
        <div className="px-3 py-2 border-t shrink-0 animate-fade-in">
          <p className="text-[11px] text-destructive">{error}</p>
        </div>
      )}
    </div>
  );
}
