import { describe, it, expect } from "vitest";
import { generateShareToken, hashIP } from "@/lib/share";

describe("generateShareToken", () => {
  it("returns a 32-character base64url string", () => {
    const token = generateShareToken();
    expect(token).toHaveLength(32);
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("generates unique tokens on each call", () => {
    const a = generateShareToken();
    const b = generateShareToken();
    expect(a).not.toBe(b);
  });
});

describe("hashIP", () => {
  it("returns a 16-character hex string", () => {
    const hash = hashIP("192.168.1.1");
    expect(hash).toHaveLength(16);
    expect(hash).toMatch(/^[0-9a-f]+$/);
  });

  it("is deterministic for the same input", () => {
    expect(hashIP("10.0.0.1")).toBe(hashIP("10.0.0.1"));
  });

  it("produces different hashes for different IPs", () => {
    expect(hashIP("10.0.0.1")).not.toBe(hashIP("10.0.0.2"));
  });

  it("handles empty string", () => {
    const hash = hashIP("");
    expect(hash).toHaveLength(16);
  });
});
