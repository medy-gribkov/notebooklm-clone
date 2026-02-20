"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface PdfViewerModalProps {
  notebookId: string;
  trigger: React.ReactNode;
}

export function PdfViewerModal({ notebookId, trigger }: PdfViewerModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function fetchUrl() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/notebooks/${notebookId}/pdf`);
      if (!res.ok) throw new Error("Failed to load PDF");
      const { url } = await res.json();
      setPdfUrl(url);
    } catch {
      setError("Could not load PDF. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleOpenChange(isOpen: boolean) {
    setOpen(isOpen);
    if (isOpen && !pdfUrl) fetchUrl();
    if (!isOpen) {
      setPdfUrl(null);
      setError(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="flex flex-row items-center justify-between px-4 py-3 border-b shrink-0">
          <DialogTitle className="text-sm font-semibold">Document Viewer</DialogTitle>
          {pdfUrl && (
            <a
              href={pdfUrl}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Download PDF
            </a>
          )}
        </DialogHeader>
        <div className="flex-1 min-h-0">
          {loading && (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          )}
          {error && (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <p className="text-sm text-destructive">{error}</p>
              <button
                onClick={fetchUrl}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
              >
                Retry
              </button>
            </div>
          )}
          {pdfUrl && !loading && (
            <iframe
              src={pdfUrl}
              className="w-full h-full border-0"
              title="PDF Viewer"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
