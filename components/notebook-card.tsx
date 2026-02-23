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
  description?: string;
}

const ICON_COLORS = [
  "bg-[oklch(0.62_0.12_45)]/10 text-[oklch(0.62_0.12_45)] dark:text-[oklch(0.70_0.10_50)]",
  "bg-[oklch(0.48_0.006_90)]/10 text-[oklch(0.48_0.006_90)] dark:text-[oklch(0.63_0.006_90)]",
  "bg-[oklch(0.91_0.008_85)]/40 text-[oklch(0.40_0.005_90)] dark:bg-[oklch(0.24_0.005_90)] dark:text-[oklch(0.80_0.005_90)]",
  "bg-[oklch(0.70_0.10_50)]/10 text-[oklch(0.70_0.10_50)] dark:text-[oklch(0.80_0.12_50)]",
  "bg-[oklch(0.55_0.18_25)]/10 text-[oklch(0.55_0.18_25)] dark:text-[oklch(0.60_0.18_25)]",
  "bg-primary/10 text-primary dark:text-primary",
];

const ACCENT_COLORS = [
  "bg-[oklch(0.62_0.12_45)]",
  "bg-[oklch(0.48_0.006_90)]",
  "bg-[oklch(0.91_0.008_85)]",
  "bg-[oklch(0.70_0.10_50)]",
  "bg-[oklch(0.55_0.18_25)]",
  "bg-primary",
];

function hashTitle(title: string): number {
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = ((hash << 5) - hash + title.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function relativeTime(dateStr: string, t: (key: string, values?: Record<string, number>) => string): string {
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return t("justNow");
  if (mins < 60) return t("minutesAgo", { count: mins });
  const hours = Math.floor(mins / 60);
  if (hours < 24) return t("hoursAgo", { count: hours });
  const days = Math.floor(hours / 24);
  if (days < 7) return t("daysAgo", { count: days });
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function NotebookCard({ notebook, files = [], timedOut = false, onDelete, description }: NotebookCardProps) {
  const [deleting, setDeleting] = useState(false);
  const t = useTranslations("notebookCard");
  const tc = useTranslations("common");
  const isClickable = notebook.status === "ready" && !timedOut;
  const colorIndex = hashTitle(notebook.title) % ICON_COLORS.length;
  const colorClass = ICON_COLORS[colorIndex];
  const accentColor = ACCENT_COLORS[colorIndex];

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
    <div className="group relative flex flex-col h-full rounded-2xl border bg-card overflow-hidden transition-all duration-200 shadow-md shadow-black/[0.04] dark:shadow-black/[0.15] hover:shadow-xl hover:shadow-black/8 dark:hover:shadow-black/30 hover:-translate-y-1 min-h-[190px]">
      {/* Top accent bar */}
      <div className={`h-1 w-full ${accentColor} opacity-60`} />
      <Link
        href={isClickable ? `/notebook/${notebook.id}` : "#"}
        className={`flex flex-col flex-1 p-6 ${!isClickable ? "pointer-events-none" : ""}`}
        aria-disabled={!isClickable}
      >
        {/* Large icon */}
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${colorClass} text-sm font-bold mb-3`}>
          {notebook.title.charAt(0).toUpperCase()}
        </div>

        {/* Title */}
        <h3 className="text-base font-bold leading-snug line-clamp-2 pe-6 min-h-[2.5rem]">
          {notebook.title}
        </h3>

        {/* Description */}
        <div className="h-5 mt-1 mb-2">
          {(description || notebook.description) && (
            <p className="text-sm text-muted-foreground line-clamp-1 pe-4">
              {description || notebook.description}
            </p>
          )}
        </div>

        <div className="mt-auto">
          {/* Meta row */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground/60">
              {relativeTime(notebook.created_at, t)}
            </span>
            {files.length > 0 && (
              <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground bg-muted/60 dark:bg-muted/30 rounded-full px-2 py-0.5">
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                {t("sources", { count: files.length })}
              </span>
            )}
          </div>

          {/* Status indicators */}
          {isProcessing && (
            <div className="flex items-center gap-1.5 mt-3">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              <span className="text-[11px] text-primary">{t("processing")}</span>
            </div>
          )}
          {isError && (
            <div className="flex items-center gap-1.5 mt-3">
              <svg className="h-3 w-3 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <span className="text-[11px] text-destructive">
                {timedOut ? t("timedOut") : t("failed")}
              </span>
            </div>
          )}
        </div>
      </Link>

      {/* Kebab menu */}
      <div className="absolute right-3 rtl:right-auto rtl:left-3 top-4 opacity-0 group-hover:opacity-100 transition-opacity">
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
                <svg className="h-3.5 w-3.5 me-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              <svg className="h-3.5 w-3.5 me-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
