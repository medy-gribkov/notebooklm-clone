"use client";

import Link from "next/link";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Notebook } from "@/types";

interface NotebookCardProps {
  notebook: Notebook;
  onDelete: (id: string) => void;
}

const statusConfig: Record<Notebook["status"], { label: string; className: string }> = {
  processing: {
    label: "Processing...",
    className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  },
  ready: {
    label: "Ready",
    className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  },
  error: {
    label: "Failed",
    className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  },
};

export function NotebookCard({ notebook, onDelete }: NotebookCardProps) {
  const [deleting, setDeleting] = useState(false);
  const status = statusConfig[notebook.status];

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    if (!confirm(`Delete "${notebook.title}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/notebooks/${notebook.id}`, {
        method: "DELETE",
      });
      if (res.ok) onDelete(notebook.id);
    } finally {
      setDeleting(false);
    }
  }

  async function handleViewPdf(e: React.MouseEvent) {
    e.preventDefault();
    try {
      const res = await fetch(`/api/notebooks/${notebook.id}/pdf`);
      if (!res.ok) return;
      const { url } = await res.json();
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      // silently fail — PDF viewing is supplementary
    }
  }

  const date = new Date(notebook.created_at).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const isClickable = notebook.status === "ready";

  return (
    <Card className="group relative transition-shadow hover:shadow-md">
      <Link
        href={isClickable ? `/notebook/${notebook.id}` : "#"}
        className={!isClickable ? "pointer-events-none" : ""}
        aria-disabled={!isClickable}
      >
        <CardHeader className="pb-2 pr-10">
          <CardTitle className="line-clamp-2 text-base font-semibold leading-snug">
            {notebook.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${status.className}`}
            >
              {notebook.status === "processing" && (
                <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
              )}
              {status.label}
            </span>
            <span className="text-xs text-muted-foreground">{date}</span>
          </div>
          {notebook.status === "ready" && (
            <button
              onClick={handleViewPdf}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
              aria-label="View source PDF"
            >
              View PDF
            </button>
          )}
          {notebook.status === "error" && (
            <span className="text-xs text-muted-foreground">Upload failed</span>
          )}
        </CardContent>
      </Link>

      <Button
        variant="ghost"
        size="sm"
        onClick={handleDelete}
        disabled={deleting}
        className="absolute right-2 top-2 h-7 w-7 p-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-600 transition-opacity"
        aria-label={`Delete ${notebook.title}`}
      >
        <svg
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
          />
        </svg>
      </Button>
    </Card>
  );
}
