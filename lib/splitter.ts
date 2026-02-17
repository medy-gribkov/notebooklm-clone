const CHUNK_SIZE = 2000;
const OVERLAP = 200;

function hardSplit(text: string, size: number, overlap: number): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + size, text.length);
    chunks.push(text.slice(start, end));
    start = end - overlap;
    if (start >= end) break;
  }
  return chunks;
}

function splitSegment(segment: string): string[] {
  if (segment.length <= CHUNK_SIZE) return [segment];

  // Try splitting on newline
  const lines = segment.split("\n").filter((l) => l.trim().length > 0);
  if (lines.length > 1) {
    const result: string[] = [];
    let current = "";
    for (const line of lines) {
      if ((current + "\n" + line).length > CHUNK_SIZE && current.length > 0) {
        result.push(current.trim());
        // Carry overlap from end of current into next chunk
        const words = current.split(" ");
        const overlapWords = words.slice(
          Math.max(0, words.length - Math.ceil(OVERLAP / 5))
        );
        current = overlapWords.join(" ") + "\n" + line;
      } else {
        current = current ? current + "\n" + line : line;
      }
    }
    if (current.trim()) result.push(current.trim());
    if (result.length > 1) return result;
  }

  // Fall back to hard split
  return hardSplit(segment, CHUNK_SIZE, OVERLAP);
}

export function splitText(text: string): string[] {
  const paragraphs = text
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  const chunks: string[] = [];
  let current = "";

  for (const paragraph of paragraphs) {
    if ((current + "\n\n" + paragraph).length > CHUNK_SIZE && current.length > 0) {
      chunks.push(...splitSegment(current));
      // Overlap: start next chunk with tail of previous paragraph
      const tail = current.slice(Math.max(0, current.length - OVERLAP));
      current = tail + "\n\n" + paragraph;
    } else {
      current = current ? current + "\n\n" + paragraph : paragraph;
    }
  }

  if (current.trim()) {
    chunks.push(...splitSegment(current));
  }

  return chunks.filter((c) => c.trim().length > 0);
}
