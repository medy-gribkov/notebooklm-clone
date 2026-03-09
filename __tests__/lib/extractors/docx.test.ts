import { describe, it, expect, vi } from "vitest";

vi.mock("mammoth", () => ({
  default: {
    extractRawText: vi.fn(),
  },
}));

import { extractTextFromDocx } from "@/lib/extractors/docx";
import mammoth from "mammoth";

const mockedMammoth = vi.mocked(mammoth);

// Valid PK zip header
const PK_HEADER = Buffer.from([0x50, 0x4b, 0x03, 0x04]);

function makeValidBuffer(size = 100): Buffer {
  const buf = Buffer.alloc(size);
  PK_HEADER.copy(buf);
  return buf;
}

describe("extractTextFromDocx", () => {
  it("extracts text from valid DOCX", async () => {
    mockedMammoth.extractRawText.mockResolvedValue({ value: "Hello from DOCX", messages: [] });

    const result = await extractTextFromDocx(makeValidBuffer());
    expect(result).toBe("Hello from DOCX");
  });

  it("throws on buffer exceeding 10MB", async () => {
    const buf = makeValidBuffer(10 * 1024 * 1024 + 1);
    await expect(extractTextFromDocx(buf)).rejects.toThrow("10MB limit");
  });

  it("throws on invalid magic bytes", async () => {
    const buf = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00]);
    await expect(extractTextFromDocx(buf)).rejects.toThrow("Invalid DOCX");
  });

  it("throws on buffer shorter than 4 bytes", async () => {
    const buf = Buffer.from([0x50, 0x4b]);
    await expect(extractTextFromDocx(buf)).rejects.toThrow("Invalid DOCX");
  });

  it("throws when extracted text is empty", async () => {
    mockedMammoth.extractRawText.mockResolvedValue({ value: "   ", messages: [] });

    await expect(extractTextFromDocx(makeValidBuffer())).rejects.toThrow(
      "no extractable text"
    );
  });

  it("trims whitespace from extracted text", async () => {
    mockedMammoth.extractRawText.mockResolvedValue({ value: "  content  \n", messages: [] });

    const result = await extractTextFromDocx(makeValidBuffer());
    expect(result).toBe("content");
  });
});
