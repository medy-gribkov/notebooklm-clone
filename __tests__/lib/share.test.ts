import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
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

describe("IP_SALT fallback", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("logs warning in production when SUPABASE_JWT_SECRET is missing", async () => {
    // Must delete (not empty string) because ?? only triggers on null/undefined
    delete process.env.SUPABASE_JWT_SECRET;
    vi.stubEnv("NODE_ENV", "production");
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    await import("@/lib/share");

    expect(warnSpy).toHaveBeenCalledWith(
      "[share] SUPABASE_JWT_SECRET not set, using fallback IP salt"
    );
  });

  it("does not log warning in non-production when SUPABASE_JWT_SECRET is missing", async () => {
    delete process.env.SUPABASE_JWT_SECRET;
    vi.stubEnv("NODE_ENV", "test");
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    await import("@/lib/share");

    expect(warnSpy).not.toHaveBeenCalled();
  });
});
