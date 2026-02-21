import mammoth from "mammoth";

const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export async function extractTextFromDocx(buffer: Buffer): Promise<string> {
  if (buffer.length > MAX_SIZE) {
    throw new Error("DOCX file exceeds 10MB limit");
  }

  // Verify PK zip header (DOCX is a zip archive)
  if (
    buffer.length < 4 ||
    buffer[0] !== 0x50 ||
    buffer[1] !== 0x4b ||
    buffer[2] !== 0x03 ||
    buffer[3] !== 0x04
  ) {
    throw new Error("Invalid DOCX file");
  }

  const result = await mammoth.extractRawText({ buffer });
  const text = result.value.trim();
  if (!text) {
    throw new Error("DOCX file contains no extractable text");
  }
  return text;
}
