import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { GET } from "@/app/api/logo/route";
import { NextRequest } from "next/server";

function makeRequest(params: Record<string, string>) {
  const url = new URL("http://localhost/api/logo");
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return new NextRequest(url);
}

describe("GET /api/logo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 with transparent PNG when no domain provided", async () => {
    const res = await GET(makeRequest({}));
    expect(res.status).toBe(400);
    expect(res.headers.get("Content-Type")).toBe("image/png");
  });

  it("returns Google favicon on success", async () => {
    const fakePng = Buffer.alloc(200, 0x89); // >100 bytes
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ "content-type": "image/png" }),
      arrayBuffer: () => Promise.resolve(fakePng.buffer),
    });

    const res = await GET(makeRequest({ domain: "example.com" }));
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toContain("max-age=86400");
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch.mock.calls[0][0]).toContain("google.com/s2/favicons");
  });

  it("falls back to DuckDuckGo when Google returns small icon", async () => {
    const smallPng = Buffer.alloc(50); // <100 bytes, treated as default globe
    const realIcon = Buffer.alloc(200, 0x89);

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ "content-type": "image/png" }),
        arrayBuffer: () => Promise.resolve(smallPng.buffer),
      })
      .mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ "content-type": "image/x-icon" }),
        arrayBuffer: () => Promise.resolve(realIcon.buffer),
      });

    const res = await GET(makeRequest({ domain: "example.com" }));
    expect(res.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(mockFetch.mock.calls[1][0]).toContain("duckduckgo.com");
  });

  it("returns transparent PNG with short cache when all providers fail", async () => {
    mockFetch
      .mockRejectedValueOnce(new Error("timeout"))
      .mockRejectedValueOnce(new Error("timeout"));

    const res = await GET(makeRequest({ domain: "nonexistent.invalid" }));
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toContain("max-age=300");
  });

  it("returns transparent PNG when Google fails and DDG returns small icon", async () => {
    const smallIcon = Buffer.alloc(50);

    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ "content-type": "image/x-icon" }),
        arrayBuffer: () => Promise.resolve(smallIcon.buffer),
      });

    const res = await GET(makeRequest({ domain: "test.com" }));
    // Both returned small/failed, should get failure cache
    expect(res.headers.get("Cache-Control")).toContain("max-age=300");
  });
});
