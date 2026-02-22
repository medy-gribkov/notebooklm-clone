import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// We need to re-import after each reset to get a fresh store
// Use dynamic import with vi.resetModules

describe("checkRateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.resetModules();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  async function getCheckRateLimit() {
    const mod = await import("@/lib/rate-limit");
    return mod.checkRateLimit;
  }

  it("allows first request", async () => {
    const checkRateLimit = await getCheckRateLimit();
    expect(checkRateLimit("test-key", 3, 60_000)).toBe(true);
  });

  it("allows requests up to the limit", async () => {
    const checkRateLimit = await getCheckRateLimit();
    expect(checkRateLimit("test-key", 3, 60_000)).toBe(true);
    expect(checkRateLimit("test-key", 3, 60_000)).toBe(true);
    expect(checkRateLimit("test-key", 3, 60_000)).toBe(true);
  });

  it("rejects requests over the limit", async () => {
    const checkRateLimit = await getCheckRateLimit();
    checkRateLimit("test-key", 2, 60_000);
    checkRateLimit("test-key", 2, 60_000);
    expect(checkRateLimit("test-key", 2, 60_000)).toBe(false);
  });

  it("resets after window expires", async () => {
    const checkRateLimit = await getCheckRateLimit();
    checkRateLimit("test-key", 1, 60_000);
    expect(checkRateLimit("test-key", 1, 60_000)).toBe(false);

    vi.advanceTimersByTime(60_001);
    expect(checkRateLimit("test-key", 1, 60_000)).toBe(true);
  });

  it("tracks independent keys separately", async () => {
    const checkRateLimit = await getCheckRateLimit();
    checkRateLimit("key-a", 1, 60_000);
    expect(checkRateLimit("key-a", 1, 60_000)).toBe(false);
    expect(checkRateLimit("key-b", 1, 60_000)).toBe(true);
  });

  it("cleans up expired entries", async () => {
    const checkRateLimit = await getCheckRateLimit();
    checkRateLimit("old-key", 1, 1_000);
    vi.advanceTimersByTime(2_000);

    // This call should clean up "old-key"
    checkRateLimit("new-key", 1, 60_000);
    // Old key should be gone, so this should be allowed
    expect(checkRateLimit("old-key", 1, 1_000)).toBe(true);
  });

  it("handles limit of 1 correctly", async () => {
    const checkRateLimit = await getCheckRateLimit();
    expect(checkRateLimit("once", 1, 60_000)).toBe(true);
    expect(checkRateLimit("once", 1, 60_000)).toBe(false);
  });

  it("resets exactly at window boundary", async () => {
    const checkRateLimit = await getCheckRateLimit();
    checkRateLimit("boundary", 1, 10_000);
    expect(checkRateLimit("boundary", 1, 10_000)).toBe(false);

    vi.advanceTimersByTime(10_000);
    // At exactly the boundary, resetAt <= now, so entry is expired
    expect(checkRateLimit("boundary", 1, 10_000)).toBe(true);
  });

  it("clears store when exceeding MAX_ENTRIES (10,000)", async () => {
    const checkRateLimit = await getCheckRateLimit();
    // Fill store with 10,001 unique keys (window far in the future so they don't expire)
    for (let i = 0; i <= 10_000; i++) {
      checkRateLimit(`flood-${i}`, 100, 999_999_999);
    }
    // After exceeding MAX_ENTRIES, oldest 1000 entries are evicted on next call.
    // The next call for an evicted key should succeed (creates fresh entry)
    expect(checkRateLimit("flood-0", 1, 60_000)).toBe(true);
  });
});
