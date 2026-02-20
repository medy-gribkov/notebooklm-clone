"use client";

import { PdfViewerModal } from "@/components/pdf-viewer-modal";

interface ViewPdfButtonProps {
  notebookId: string;
}

export function ViewPdfButton({ notebookId }: ViewPdfButtonProps) {
  return (
    <PdfViewerModal
      notebookId={notebookId}
      trigger={
        <button
          className="text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
          aria-label="View PDF"
        >
          View PDF
        </button>
      }
    />
  );
}
