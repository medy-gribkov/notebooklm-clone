import { describe, it, expect } from "vitest";
import { isValidUUID, sanitizeText, validateUserMessage } from "@/lib/validate";

describe("isValidUUID", () => {
  it("accepts valid v4 UUID", () => {
    expect(isValidUUID("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
  });

  it("accepts uppercase UUID", () => {
    expect(isValidUUID("550E8400-E29B-41D4-A716-446655440000")).toBe(true);
  });

  it("rejects too short string", () => {
    expect(isValidUUID("550e8400-e29b-41d4")).toBe(false);
  });

  it("rejects missing dashes", () => {
    expect(isValidUUID("550e8400e29b41d4a716446655440000")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(isValidUUID("")).toBe(false);
  });

  it("rejects non-hex characters", () => {
    expect(isValidUUID("550e8400-e29b-41d4-a716-44665544zzzz")).toBe(false);
  });
});

describe("sanitizeText", () => {
  it("strips null bytes", () => {
    expect(sanitizeText("hello\x00world")).toBe("helloworld");
  });

  it("strips control characters", () => {
    expect(sanitizeText("hello\x01\x02\x03world")).toBe("helloworld");
  });

  it("preserves newlines, tabs, carriage returns", () => {
    expect(sanitizeText("hello\n\t\rworld")).toBe("hello\n\t\rworld");
  });

  it("caps text at 100k characters", () => {
    const long = "a".repeat(200_000);
    expect(sanitizeText(long).length).toBe(100_000);
  });
});

describe("validateUserMessage", () => {
  it("returns error for empty string", () => {
    expect(validateUserMessage("")).toBe("Message cannot be empty");
  });

  it("returns error for whitespace-only", () => {
    expect(validateUserMessage("   ")).toBe("Message cannot be empty");
  });

  it("returns error for message over 2000 chars", () => {
    expect(validateUserMessage("a".repeat(2001))).toBe(
      "Message exceeds 2000 character limit"
    );
  });

  it("returns error for null byte", () => {
    expect(validateUserMessage("hello\x00world")).toBe(
      "Invalid characters in message"
    );
  });

  it("returns null for valid message", () => {
    expect(validateUserMessage("Hello, how are you?")).toBeNull();
  });

  it("returns null for message at exactly 2000 chars", () => {
    expect(validateUserMessage("a".repeat(2000))).toBeNull();
  });
});
