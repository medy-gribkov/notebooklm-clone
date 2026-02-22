import { describe, it, expect } from "vitest";
import { validateUploadFile, ALLOWED_UPLOAD_TYPES } from "@/lib/validate-file";

function mockFile(name: string, type: string, size: number): File {
  const file = new File(["x"], name, { type });
  Object.defineProperty(file, "size", { value: size });
  return file;
}

describe("ALLOWED_UPLOAD_TYPES", () => {
  it("contains 6 MIME types", () => {
    expect(ALLOWED_UPLOAD_TYPES).toHaveLength(6);
  });
});

describe("validateUploadFile", () => {
  it("accepts application/pdf", () => {
    expect(validateUploadFile(mockFile("a.pdf", "application/pdf", 1000))).toEqual({ valid: true });
  });

  it("accepts text/plain", () => {
    expect(validateUploadFile(mockFile("a.txt", "text/plain", 1000))).toEqual({ valid: true });
  });

  it("accepts DOCX MIME type", () => {
    const mime = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    expect(validateUploadFile(mockFile("a.docx", mime, 1000))).toEqual({ valid: true });
  });

  it("accepts image/jpeg", () => {
    expect(validateUploadFile(mockFile("a.jpg", "image/jpeg", 1000))).toEqual({ valid: true });
  });

  it("accepts image/png", () => {
    expect(validateUploadFile(mockFile("a.png", "image/png", 1000))).toEqual({ valid: true });
  });

  it("accepts image/webp", () => {
    expect(validateUploadFile(mockFile("a.webp", "image/webp", 1000))).toEqual({ valid: true });
  });

  it("rejects unsupported MIME type", () => {
    expect(validateUploadFile(mockFile("a.exe", "application/octet-stream", 100))).toEqual({
      valid: false,
      error: "unsupportedType",
    });
  });

  // Size limits
  it("rejects PDF over 5MB", () => {
    const size = 5 * 1024 * 1024 + 1;
    expect(validateUploadFile(mockFile("a.pdf", "application/pdf", size))).toEqual({
      valid: false,
      error: "fileTooLarge",
    });
  });

  it("accepts PDF at exactly 5MB", () => {
    const size = 5 * 1024 * 1024;
    expect(validateUploadFile(mockFile("a.pdf", "application/pdf", size))).toEqual({ valid: true });
  });

  it("rejects TXT over 500KB", () => {
    const size = 500 * 1024 + 1;
    expect(validateUploadFile(mockFile("a.txt", "text/plain", size))).toEqual({
      valid: false,
      error: "fileTooLarge",
    });
  });

  it("accepts TXT at exactly 500KB", () => {
    const size = 500 * 1024;
    expect(validateUploadFile(mockFile("a.txt", "text/plain", size))).toEqual({ valid: true });
  });

  it("rejects DOCX over 10MB", () => {
    const mime = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    const size = 10 * 1024 * 1024 + 1;
    expect(validateUploadFile(mockFile("a.docx", mime, size))).toEqual({
      valid: false,
      error: "fileTooLarge",
    });
  });

  it("rejects image over 5MB", () => {
    const size = 5 * 1024 * 1024 + 1;
    expect(validateUploadFile(mockFile("a.jpg", "image/jpeg", size))).toEqual({
      valid: false,
      error: "fileTooLarge",
    });
  });
});
