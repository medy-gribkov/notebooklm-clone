import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGenerateContent = vi.fn();

vi.mock("@google/generative-ai", () => {
  return {
    GoogleGenerativeAI: class {
      getGenerativeModel() {
        return { generateContent: mockGenerateContent };
      }
    },
  };
});

import { extractTextFromImage } from "@/lib/extractors/image";

// Magic byte buffers
const JPEG_HEADER = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00]);
const PNG_HEADER = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00]);
const WEBP_HEADER = Buffer.from([0x52, 0x49, 0x46, 0x46, 0x00]);
const UNKNOWN_HEADER = Buffer.from([0x00, 0x01, 0x02, 0x03, 0x04]);

function makeBuffer(header: Buffer, size = 100): Buffer {
  const buf = Buffer.alloc(size);
  header.copy(buf);
  return buf;
}

describe("extractTextFromImage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("GEMINI_API_KEY", "test-key");
  });

  it("extracts text from JPEG image", async () => {
    mockGenerateContent.mockResolvedValue({
      response: { text: () => "Extracted text from JPEG" },
    });

    const result = await extractTextFromImage(JPEG_HEADER, "image/jpeg");
    expect(result).toBe("Extracted text from JPEG");
  });

  it("extracts text from PNG image", async () => {
    mockGenerateContent.mockResolvedValue({
      response: { text: () => "PNG text" },
    });

    const result = await extractTextFromImage(PNG_HEADER, "image/png");
    expect(result).toBe("PNG text");
  });

  it("extracts text from WebP image", async () => {
    mockGenerateContent.mockResolvedValue({
      response: { text: () => "WebP text" },
    });

    const result = await extractTextFromImage(WEBP_HEADER, "image/webp");
    expect(result).toBe("WebP text");
  });

  it("throws on buffer exceeding 5MB", async () => {
    const buf = makeBuffer(JPEG_HEADER, 5 * 1024 * 1024 + 1);
    await expect(extractTextFromImage(buf, "image/jpeg")).rejects.toThrow("5MB limit");
  });

  it("throws on unknown magic bytes", async () => {
    await expect(extractTextFromImage(UNKNOWN_HEADER, "image/jpeg")).rejects.toThrow(
      "Unsupported image format"
    );
  });

  it("throws on unsupported MIME type", async () => {
    await expect(extractTextFromImage(JPEG_HEADER, "image/gif")).rejects.toThrow(
      "Unsupported image format"
    );
  });

  it("throws when GEMINI_API_KEY is missing", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    await expect(extractTextFromImage(JPEG_HEADER, "image/jpeg")).rejects.toThrow(
      "GEMINI_API_KEY not configured"
    );
  });

  it("throws when OCR returns NO_TEXT_FOUND", async () => {
    mockGenerateContent.mockResolvedValue({
      response: { text: () => "NO_TEXT_FOUND" },
    });

    await expect(extractTextFromImage(JPEG_HEADER, "image/jpeg")).rejects.toThrow(
      "No text could be extracted"
    );
  });

  it("throws when OCR returns empty string", async () => {
    mockGenerateContent.mockResolvedValue({
      response: { text: () => "   " },
    });

    await expect(extractTextFromImage(JPEG_HEADER, "image/jpeg")).rejects.toThrow(
      "No text could be extracted"
    );
  });
});
