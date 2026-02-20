"use client";

import Link from "next/link";
import { useState } from "react";
import { useTranslations } from "next-intl";
import type { Notebook, NotebookFile } from "@/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NotebookCardProps {
  notebook: Notebook;
  files?: NotebookFile[];
  timedOut?: boolean;
  onDelete: (id: string) => void;
}

// Consistent color from notebook title hash
const ICON_COLORS = [
  "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  "bg-violet-500/15 text-violet-600 dark:text-violet-400",
  "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  "bg-rose-500/15 text-rose-600 dark:text-rose-400",
  "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400",
  "bg-orange-500/15 text-orange-600 dark:text-orange-400",
  "bg-pink-500/15 text-pink-600 dark:text-pink-400",
];

function hashTitle(title: string): number {
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = ((hash << 5) - hash + title.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function NotebookCard({ notebook, files = [], timedOut = false, onDelete }: NotebookCardProps) {
  const [deleting, setDeleting] = useState(false);
  const t = useTranslations("notebookCard");
  const tc = useTranslations("common");
  const isClickable = notebook.status === "ready" && !timedOut;
  const colorClass = ICON_COLORS[hashTitle(notebook.title) % ICON_COLORS.length];

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/notebooks/${notebook.id}`, { method: "DELETE" });
      if (res.ok) onDelete(notebook.id);
    } finally {
      setDeleting(false);
    }
  }

  const isProcessing = notebook.status === "processing" && !timedOut;
  const isError = notebook.status === "error" || timedOut;

  return (
    <div className="group relative rounded-xl border bg-card overflow-hidden transition-all duration-200 shadow-sm shadow-black/[0.03] dark:shadow-none hover:shadow-md hover:shadow-black/5 dark:hover:shadow-black/20 hover:-translate-y-0.5">
      <Link
        href={isClickable ? `/notebook/${notebook.id}` : "#"}
        className={`block p-4 ${!isClickable ? "pointer-events-none" : ""}`}
        aria-disabled={!isClickable}
      >
        <div className="flex items-start gap-3">
          {/* First-letter avatar */}
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${colorClass} text-sm font-bold`}>
            {notebook.title.charAt(0).toUpperCase()}
          </div>

          <div className="flex-1 min-w-0">
            {/* Title */}
            <h3 className="text-heading leading-snug line-clamp-1 pr-6">
              {notebook.title}
            </h3>

            {/* Meta row: date + sources */}
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-caption">
                {relativeTime(notebook.created_at)}
              </span>
              {files.length > 0 && (
                <>
                  <span className="text-muted-foreground/30">&middot;</span>
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    {t("sources", { count: files.length })}
                  </span>
                </>
              )}
            </div>

            {/* Status indicator for non-ready */}
            {isProcessing && (
              <div className="flex items-center gap-1.5 mt-2">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-[11px] text-amber-600 dark:text-amber-400">{t("processing")}</span>
              </div>
            )}
            {isError && (
              <div className="flex items-center gap-1.5 mt-2">
                <svg className="h-3 w-3 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <span className="text-[11px] text-red-600 dark:text-red-400">
                  {timedOut ? t("timedOut") : t("failed")}
                </span>
              </div>
            )}
          </div>
        </div>
      </Link>

      {/* Kebab menu */}
      <div className="absolute right-2 top-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              aria-label={`Options for ${notebook.title}`}
              onClick={(e) => e.preventDefault()}
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="6" r="1.5" />
                <circle cx="12" cy="12" r="1.5" />
                <circle cx="12" cy="18" r="1.5" />
              </svg>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            {isClickable && (
              <DropdownMenuItem
                onClick={() => window.location.href = `/notebook/${notebook.id}`}
              >
                <svg className="h-3.5 w-3.5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                {t("open")}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={handleDelete}
              disabled={deleting}
              className="text-destructive focus:text-destructive"
            >
              <svg className="h-3.5 w-3.5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              {deleting ? t("deleting") : tc("delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
