import type { Source } from "@/types";

function contentOverlap(a: string, b: string): number {
  const wordsA = new Set(a.toLowerCase().split(/\s+/));
  const wordsB = new Set(b.toLowerCase().split(/\s+/));
  let intersection = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) intersection++;
  }
  const union = wordsA.size + wordsB.size - intersection;
  /* v8 ignore next -- @preserve */
  return union === 0 ? 1 : intersection / union;
}

/** Remove near-duplicate sources (>90% word overlap). */
export function deduplicateSources(sources: Source[]): Source[] {
  const result: Source[] = [];
  for (const source of sources) {
    const norm = source.content.replace(/\s+/g, " ").trim();
    const isDup = result.some((existing) => {
      const existNorm = existing.content.replace(/\s+/g, " ").trim();
      return contentOverlap(norm, existNorm) > 0.9;
    });
    if (!isDup) result.push(source);
  }
  return result;
}

const MAX_CONTEXT_CHARS = 30_000; // Safety cap: ~7.5K tokens

/** Build structured context block grouped by file name. */
export function buildContextBlock(sources: Source[]): string {
  if (sources.length === 0) return "";

  const grouped = new Map<string, Array<{ index: number; content: string }>>();
  sources.forEach((s, i) => {
    const fn = s.fileName ?? "document";
    if (!grouped.has(fn)) grouped.set(fn, []);
    grouped.get(fn)!.push({ index: i + 1, content: s.content });
  });

  const sections: string[] = [];
  let totalChars = 0;

  for (const [fileName, chunks] of grouped) {
    const body = chunks
      .map((c) => `[Source ${c.index}]\n${c.content}`)
      .join("\n\n");
    const section = `## File: ${fileName}\n${body}`;

    if (totalChars + section.length > MAX_CONTEXT_CHARS && sections.length > 0) {
      break;
    }

    sections.push(section);
    totalChars += section.length;
  }

  let result = sections.join("\n\n---\n\n");
  if (result.length > MAX_CONTEXT_CHARS) {
    result = result.slice(0, MAX_CONTEXT_CHARS);
  }
  return result;
}
