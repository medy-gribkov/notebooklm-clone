/**
 * Shared Tailwind prose classes for assistant chat message rendering.
 * Used in both chat-interface.tsx and shared/[token]/page.tsx.
 */
export const CHAT_PROSE_CLASSES = [
  "prose dark:prose-invert prose-sm max-w-none",
  "prose-p:my-1.5",
  "prose-headings:my-3 prose-headings:font-semibold",
  "prose-h1:text-base prose-h2:text-[0.9375rem] prose-h3:text-sm prose-h3:text-muted-foreground",
  "prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5",
  "prose-code:bg-muted/50 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:before:content-none prose-code:after:content-none",
  "prose-pre:bg-muted/30 prose-pre:border prose-pre:border-border/50 prose-pre:rounded-lg",
  "prose-blockquote:border-primary/40 prose-blockquote:not-italic prose-blockquote:text-muted-foreground",
  "prose-strong:font-semibold prose-strong:text-foreground",
  "prose-a:text-primary prose-a:no-underline hover:prose-a:underline",
].join(" ");
