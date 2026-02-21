const MAX_SIZE = 500 * 1024; // 500KB

export function extractTextFromTxt(buffer: Buffer): string {
  if (buffer.length > MAX_SIZE) {
    throw new Error("Text file exceeds 500KB limit");
  }
  const text = buffer.toString("utf-8");
  if (!text.trim()) {
    throw new Error("Text file is empty");
  }
  return text;
}
