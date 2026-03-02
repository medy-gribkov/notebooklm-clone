import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockFrom, mockSupabase } = vi.hoisted(() => {
  const mockFrom = vi.fn();
  const mockSupabase = {
    auth: { getUser: vi.fn() },
    from: mockFrom,
  };
  return { mockFrom, mockSupabase };
});

vi.mock("@/lib/auth", () => ({
  authenticateRequest: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue(mockSupabase),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(),
}));

vi.mock("@/lib/validate", () => ({
  isValidUUID: vi.fn(),
}));

vi.mock("@/lib/export", () => ({
  buildNotebookExport: vi.fn().mockReturnValue("# Exported Markdown"),
  buildNotebookJSON: vi.fn().mockReturnValue({ title: "Test", messages: [] }),
}));

import { GET } from "@/app/api/notebooks/[id]/export/route";
import { authenticateRequest } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { isValidUUID } from "@/lib/validate";
import { buildNotebookExport, buildNotebookJSON } from "@/lib/export";

const mockedAuth = vi.mocked(authenticateRequest);
const mockedRateLimit = vi.mocked(checkRateLimit);
const mockedIsValidUUID = vi.mocked(isValidUUID);
const mockedBuildMd = vi.mocked(buildNotebookExport);
const mockedBuildJSON = vi.mocked(buildNotebookJSON);

const notebook = {
  id: "nb-1",
  title: "Test Notebook",
  description: "A test notebook",
  created_at: "2026-01-01",
};

/** Set up mockFrom so notebook lookup succeeds, and the 3 parallel queries return empty arrays. */
function setupSuccessfulNotebook() {
  mockFrom.mockImplementation((table: string) => {
    if (table === "notebooks") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: notebook, error: null }),
            }),
          }),
        }),
      };
    }
    // messages, notes, studio_generations
    return {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: [] }),
          }),
        }),
      }),
    };
  });
}

describe("GET /api/notebooks/[id]/export", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedAuth.mockResolvedValue("skip");
    mockedRateLimit.mockReturnValue(true);
    mockedIsValidUUID.mockReturnValue(true);
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
    });
  });

  it("returns 401 without auth", async () => {
    mockedAuth.mockResolvedValue(null);
    const req = new NextRequest("http://test/api/notebooks/nb-1/export");
    const res = await GET(req, { params: Promise.resolve({ id: "nb-1" }) });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({ error: "Unauthorized" });
  });

  it("returns 401 when no user from getUser", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });
    const req = new NextRequest("http://test/api/notebooks/nb-1/export");
    const res = await GET(req, { params: Promise.resolve({ id: "nb-1" }) });
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid UUID", async () => {
    mockedIsValidUUID.mockReturnValue(false);
    const req = new NextRequest("http://test/api/notebooks/bad/export");
    const res = await GET(req, { params: Promise.resolve({ id: "bad" }) });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({ error: "Invalid ID" });
  });

  it("returns 429 when rate limited", async () => {
    mockedRateLimit.mockReturnValue(false);
    const req = new NextRequest("http://test/api/notebooks/nb-1/export");
    const res = await GET(req, { params: Promise.resolve({ id: "nb-1" }) });
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("3600");
  });

  it("returns 404 when notebook not found", async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      }),
    });
    const req = new NextRequest("http://test/api/notebooks/nb-1/export");
    const res = await GET(req, { params: Promise.resolve({ id: "nb-1" }) });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toEqual({ error: "Notebook not found" });
  });

  it("returns 200 with markdown export by default", async () => {
    setupSuccessfulNotebook();
    const req = new NextRequest("http://test/api/notebooks/nb-1/export");
    const res = await GET(req, { params: Promise.resolve({ id: "nb-1" }) });
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toBe("# Exported Markdown");
    expect(res.headers.get("Content-Type")).toBe("text/markdown; charset=utf-8");
  });

  it("returns 200 with JSON export when format=json", async () => {
    setupSuccessfulNotebook();
    const req = new NextRequest("http://test/api/notebooks/nb-1/export?format=json");
    const res = await GET(req, { params: Promise.resolve({ id: "nb-1" }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ title: "Test", messages: [] });
    expect(res.headers.get("Content-Type")).toBe("application/json");
  });

  it("calls buildNotebookExport for md format", async () => {
    setupSuccessfulNotebook();
    const req = new NextRequest("http://test/api/notebooks/nb-1/export?format=md");
    await GET(req, { params: Promise.resolve({ id: "nb-1" }) });
    expect(mockedBuildMd).toHaveBeenCalledTimes(1);
    expect(mockedBuildJSON).not.toHaveBeenCalled();
  });

  it("calls buildNotebookJSON for json format", async () => {
    setupSuccessfulNotebook();
    const req = new NextRequest("http://test/api/notebooks/nb-1/export?format=json");
    await GET(req, { params: Promise.resolve({ id: "nb-1" }) });
    expect(mockedBuildJSON).toHaveBeenCalledTimes(1);
    expect(mockedBuildMd).not.toHaveBeenCalled();
  });

  it("includes sanitized title in Content-Disposition header", async () => {
    setupSuccessfulNotebook();
    const req = new NextRequest("http://test/api/notebooks/nb-1/export");
    const res = await GET(req, { params: Promise.resolve({ id: "nb-1" }) });
    const disposition = res.headers.get("Content-Disposition");
    expect(disposition).toContain("Test Notebook");
    expect(disposition).toMatch(/^attachment; filename="/);
    expect(disposition).toMatch(/\.md"$/);
  });
});
