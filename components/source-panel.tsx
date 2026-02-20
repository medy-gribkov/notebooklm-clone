"use client";

import { useState } from "react";
import type { Source } from "@/types";

interface SourcePanelProps {
  sources: Source[];
}

function similarityLabel(score: number): string {
  if (score >= 0.8) return "High relevance";
  if (score >= 0.6) return "Good relevance";
  return "Partial relevance";
}

function similarityColor(score: number): string {
  if (score >= 0.8) return "from-emerald-500 to-emerald-400";
  if (score >= 0.6) return "from-primary to-primary/80";
  return "from-amber-500 to-amber-400";
}

export function SourcePanel({ sources }: SourcePanelProps) {
  const [expanded, setExpanded] = useState<number | null>(null);

  if (sources.length === 0) return null;

  return (
    <div className="rounded-xl border bg-card/50 p-3 overflow-hidden animate-fade-in">
      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
        Sources ({sources.length})
      </p>
      <div className="space-y-2">
        {sources.map((source, i) => (
          <div
            key={source.chunkId}
            className="rounded-lg border bg-background p-2.5 cursor-pointer select-none transition-colors hover:bg-accent/30"
            onClick={() => setExpanded(expanded === i ? null : i)}
          >
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="text-xs font-medium flex items-center gap-1.5">
                <svg
                  className={`h-3 w-3 shrink-0 text-muted-foreground transition-transform ${
                    expanded === i ? "rotate-90" : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                Source {i + 1}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {similarityLabel(source.similarity)}
              </span>
            </div>

            {/* Similarity bar */}
            <div className="h-1 w-full rounded-full bg-muted overflow-hidden mb-2">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${similarityColor(source.similarity)} transition-all duration-500`}
                style={{ width: `${Math.round(source.similarity * 100)}%` }}
              />
            </div>

            {expanded === i ? (
              <div className="overflow-y-auto max-h-40 scrollbar-thin">
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
