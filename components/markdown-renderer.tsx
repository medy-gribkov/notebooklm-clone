"use client";

import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import remarkCitations from "@/lib/remark-citations";
import { CitationContext, CitationBadge } from "@/components/citation-badge";
import type { Source } from "@/types";

interface MarkdownRendererProps {
  content: string;
  sources?: Source[];
}

export default function MarkdownRenderer({ content, sources }: MarkdownRendererProps) {
  return (
    <CitationContext.Provider value={sources ?? []}>
      <ReactMarkdown
        remarkPlugins={[remarkCitations]}
        rehypePlugins={[rehypeSanitize]}
        components={{ cite: CitationBadge as never }}
      >
        {content}
      </ReactMarkdown>
    </CitationContext.Provider>
  );
}
