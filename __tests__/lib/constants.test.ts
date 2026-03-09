import { describe, it, expect } from "vitest";
import { CHAT_PROSE_CLASSES } from "@/lib/constants";

describe("CHAT_PROSE_CLASSES", () => {
  it("is a non-empty string", () => {
    expect(typeof CHAT_PROSE_CLASSES).toBe("string");
    expect(CHAT_PROSE_CLASSES.length).toBeGreaterThan(0);
  });

  it("includes core prose classes", () => {
    expect(CHAT_PROSE_CLASSES).toContain("prose");
    expect(CHAT_PROSE_CLASSES).toContain("dark:prose-invert");
    expect(CHAT_PROSE_CLASSES).toContain("prose-sm");
    expect(CHAT_PROSE_CLASSES).toContain("max-w-none");
  });

  it("includes heading styles", () => {
    expect(CHAT_PROSE_CLASSES).toContain("prose-headings:my-3");
    expect(CHAT_PROSE_CLASSES).toContain("prose-h1:text-base");
  });

  it("includes code block styles", () => {
    expect(CHAT_PROSE_CLASSES).toContain("prose-code:bg-muted/50");
    expect(CHAT_PROSE_CLASSES).toContain("prose-pre:rounded-lg");
  });
});
