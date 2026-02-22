import { describe, it, expect } from "vitest";
import { extractTextFromTxt } from "@/lib/extractors/txt";

describe("extractTextFromTxt", () => {
  it("extracts text from valid buffer", () => {
    const buf = Buffer.from("Hello, world!");
    expect(extractTextFromTxt(buf)).toBe("Hello, world!");
  });

  it("throws on buffer exceeding 500KB", () => {
    const buf = Buffer.alloc(500 * 1024 + 1, "a");
    expect(() => extractTextFromTxt(buf)).toThrow("500KB limit");
  });

  it("accepts buffer at exactly 500KB", () => {
    const buf = Buffer.alloc(500 * 1024, "a");
    expect(extractTextFromTxt(buf)).toHaveLength(500 * 1024);
  });

  it("throws on empty buffer", () => {
    const buf = Buffer.from("");
    expect(() => extractTextFromTxt(buf)).toThrow("empty");
  });

  it("throws on whitespace-only buffer", () => {
    const buf = Buffer.from("   \n\t  ");
    expect(() => extractTextFromTxt(buf)).toThrow("empty");
  });

  it("preserves UTF-8 characters", () => {
    const buf = Buffer.from("Héllo wörld 日本語");
    expect(extractTextFromTxt(buf)).toBe("Héllo wörld 日本語");
  });
});
