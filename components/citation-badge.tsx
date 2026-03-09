"use client";

import { createContext, useContext, useCallback } from "react";
import type { Source } from "@/types";

export const CitationContext = createContext<Source[]>([]);

interface CitationBadgeProps {
  "data-index"?: string;
  children?: React.ReactNode;
}

export function CitationBadge(props: CitationBadgeProps) {
  const sources = useContext(CitationContext);
  const index = parseInt(props["data-index"] ?? "0", 10);

  const source = sources[index - 1];
  const tooltip = source?.content
    ? source.content.slice(0, 100).replace(/\n/g, " ") + (source.content.length > 100 ? "..." : "")
    : undefined;

  const handleClick = useCallback(() => {
    const el = document.getElementById(`source-${index}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("source-highlighted");
      setTimeout(() => el.classList.remove("source-highlighted"), 2000);
    }
  }, [index]);

  return (
    <button
      type="button"
      onClick={handleClick}
      title={tooltip}
      className="inline-flex items-center align-super bg-primary/15 text-primary text-[11px] font-bold px-1.5 py-0.5 rounded-md cursor-pointer hover:bg-primary/25 hover:shadow-sm transition-all mx-0.5 leading-none"
    >
      {props.children}
    </button>
  );
}
