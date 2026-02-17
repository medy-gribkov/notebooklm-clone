"use client";

import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import type { Source } from "@/types";

interface SourcePanelProps {
  sources: Source[];
}

export function SourcePanel({ sources }: SourcePanelProps) {
  const [expanded, setExpanded] = useState<number | null>(null);

  if (sources.length === 0) return null;

  return (
    <div className="border rounded-lg bg-muted/30 p-3">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
        Sources ({sources.length})
      </p>
      <div className="space-y-2">
        {sources.map((source, i) => (
          <div
            key={source.chunkId}
            className="rounded-md border bg-background p-2 cursor-pointer select-none"
            onClick={() => setExpanded(expanded === i ? null : i)}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-foreground">
                Source {i + 1}
              </span>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {(source.similarity * 100).toFixed(0)}% match
              </Badge>
            </div>
            {expanded === i && (
              <ScrollArea className="mt-2 max-h-40">
                <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {source.content}
                </p>
              </ScrollArea>
            )}
            {expanded !== i && (
              <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                {source.content}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
