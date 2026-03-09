import { describe, it, expect } from "vitest";
import { sanitizeAIJSON } from "@/lib/json-fix";

describe("sanitizeAIJSON", () => {
  it("returns empty string for empty input", () => {
    expect(sanitizeAIJSON("")).toBe("");
  });

  it("returns empty string for falsy input", () => {
    expect(sanitizeAIJSON(null as unknown as string)).toBe("");
    expect(sanitizeAIJSON(undefined as unknown as string)).toBe("");
  });

  it("strips markdown code fences", () => {
    const input = '```json\n{"key": "value"}\n```';
    const result = sanitizeAIJSON(input);
    expect(result).not.toContain("```");
    expect(result).toContain("key");
  });

  it("strips plain code fences without json label", () => {
    const input = '```\n{"key": "value"}\n```';
    const result = sanitizeAIJSON(input);
    expect(result).not.toContain("```");
  });

  it("escapes raw newlines", () => {
    const input = '{"text": "line1\nline2"}';
    const result = sanitizeAIJSON(input);
    expect(result).toContain("\\n");
    // Should be parseable after sanitization (newlines escaped)
    expect(result).not.toContain("\n");
  });

  it("escapes raw carriage returns", () => {
    const input = '{"text": "line1\rline2"}';
    const result = sanitizeAIJSON(input);
    expect(result).toContain("\\r");
    expect(result).not.toContain("\r");
  });

  it("escapes raw tabs", () => {
    const input = '{"text": "col1\tcol2"}';
    const result = sanitizeAIJSON(input);
    expect(result).toContain("\\t");
    expect(result).not.toContain("\t");
  });

  it("does not double-escape already-escaped newlines", () => {
    const input = '{"text": "line1\\nline2"}';
    const result = sanitizeAIJSON(input);
    // Should have exactly \\n, not \\\\n
    expect(result).toContain("\\n");
    expect(result).not.toContain("\\\\n");
  });

  it("does not double-escape already-escaped tabs", () => {
    const input = '{"text": "col1\\tcol2"}';
    const result = sanitizeAIJSON(input);
    expect(result).toContain("\\t");
    expect(result).not.toContain("\\\\t");
  });

  it("does not double-escape already-escaped quotes", () => {
    const input = '{"text": "say \\"hello\\""}';
    const result = sanitizeAIJSON(input);
    expect(result).toContain('\\"');
    expect(result).not.toContain('\\\\\\"');
  });

  it("trims whitespace", () => {
    const input = '   {"key": "value"}   ';
    const result = sanitizeAIJSON(input);
    // After escaping newlines (none here), result should be trimmed
    expect(result).toBe('{"key": "value"}');
  });

  it("handles complex markdown-wrapped JSON", () => {
    const input = '```json\n{\n  "name": "test",\n  "value": 42\n}\n```';
    const result = sanitizeAIJSON(input);
    expect(result).not.toContain("```");
    expect(result).toContain("name");
    expect(result).toContain("42");
  });
});
