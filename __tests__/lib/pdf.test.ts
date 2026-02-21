import { describe, it, expect, vi } from "vitest";

vi.mock("pdf-parse", () => ({
  default: vi.fn(),
}));

import { extractText } from "@/lib/pdf";
import pdfParse from "pdf-parse";

const mockedPdfParse = vi.mocked(pdfParse);

describe("extractText", () => {
  it("returns text and pageCount for valid PDF", async () => {
    mockedPdfParse.mockResolvedValue({
      text: "Hello World document content",
      numpages: 5,
      numrender: 5,
      info: {},
      metadata: null,
      version: "1.0" as never,
    });

    const result = await extractText(Buffer.from("fake-pdf"));
    expect(result).toEqual({
      text: "Hello World document content",
      pageCount: 5,
    });
  });

  it("throws when text is empty", async () => {
    mockedPdfParse.mockResolvedValue({
      text: "",
      numpages: 1,
      numrender: 1,
      info: {},
      metadata: null,
      version: "1.0" as never,
    });

    await expect(extractText(Buffer.from("fake"))).rejects.toThrow(
      "No text layer found"
    );
  });

  it("throws when text is whitespace only", async () => {
    mockedPdfParse.mockResolvedValue({
      text: "   \n  \t  ",
      numpages: 1,
      numrender: 1,
      info: {},
      metadata: null,
      version: "1.0" as never,
    });

    await expect(extractText(Buffer.from("fake"))).rejects.toThrow(
      "No text layer found"
    );
  });

  it("propagates pdf-parse errors", async () => {
    mockedPdfParse.mockRejectedValue(new Error("Corrupted PDF"));

    await expect(extractText(Buffer.from("bad"))).rejects.toThrow(
      "Corrupted PDF"
    );
  });

  it("maps numpages correctly", async () => {
    mockedPdfParse.mockResolvedValue({
      text: "Page content",
      numpages: 42,
      numrender: 42,
      info: {},
      metadata: null,
      version: "1.0" as never,
    });

    const result = await extractText(Buffer.from("fake"));
    expect(result.pageCount).toBe(42);
  });
});
