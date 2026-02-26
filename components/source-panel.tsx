"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import type { Source } from "@/types";

interface SourcePanelProps {
  sources: Source[];
}

function similarityColor(score: number): string {
  if (score >= 0.65) return "from-primary to-primary/80";
  if (score >= 0.45) return "from-chart-2 to-chart-2/80";
  return "from-muted-foreground to-muted-foreground/60";
}

export function SourcePanel({ sources }: SourcePanelProps) {
  const t = useTranslations("sourcePanel");
  const [expanded, setExpanded] = useState<number | null>(null);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const copyContent = useCallback(async (idx: number, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 2000);
    } catch {
      // Clipboard API not available
    }
  }, []);

  if (sources.length === 0) return null;

  return (
    <div className="rounded-xl border bg-card/60 p-3 overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-2.5">
        <p className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
          <svg className="h-3.5 w-3.5 text-primary/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          {t("sourcesCited")}
        </p>
        <span className="text-[10px] text-muted-foreground/60">
          {t("matches", { count: sources.length })}
        </span>
      </div>

      <div className="space-y-2">
        {sources.map((source, i) => (
          <div
            key={source.chunkId}
            className="group/src rounded-lg border border-s-2 border-s-primary/40 bg-background p-2.5 cursor-pointer select-none transition-colors hover:bg-accent/30"
            onClick={() => setExpanded(expanded === i ? null : i)}
            role="button"
            tabIndex={0}
            aria-expanded={expanded === i}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setExpanded(expanded === i ? null : i);
              }
            }}
          >
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="text-xs font-medium flex items-center gap-1.5">
                <svg
                  className={`h-3 w-3 shrink-0 text-muted-foreground transition-transform rtl:rotate-180 ${expanded === i ? "rotate-90 rtl:rotate-90" : ""
                    }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                {t("source", { number: i + 1 })}
                {source.fileName && (
                  <span
                    className="text-[10px] text-muted-foreground font-normal truncate max-w-[120px]"
                    title={source.fileName}
                  >
                    {t("from", { fileName: source.fileName.replace(/\.pdf$/i, "") })}
                  </span>
                )}
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-muted-foreground">
                  {source.similarity >= 0.65 ? t("highRelevance") : source.similarity >= 0.45 ? t("goodRelevance") : t("partialRelevance")}
                </span>
                {/* Copy button */}
                <button
                  onClick={(e) => { e.stopPropagation(); copyContent(i, source.content); }}
                  className="opacity-0 group-hover/src:opacity-100 transition-opacity p-0.5 rounded hover:bg-muted text-muted-foreground/40 hover:text-muted-foreground"
                  aria-label={t("copySource")}
                >
                  {copiedIdx === i ? (
                    <svg className="h-3 w-3 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Similarity bar */}
            <div className="h-1 w-full rounded-full bg-muted overflow-hidden mb-2">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${similarityColor(source.similarity)} transition-all duration-500`}
                style={{ width: `${Math.round(source.similarity * 100)}%` }}
              />
            </div>

            {expanded === i ? (
              <div className="overflow-y-auto max-h-64 scrollbar-thin">
                <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap break-words">
                  {source.content}
                </p>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                {source.content}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
