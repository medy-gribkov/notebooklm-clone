import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockFrom, mockSupabase } = vi.hoisted(() => {
  const mockFrom = vi.fn();
  const mockSupabase = {
    auth: { getUser: vi.fn() },
    from: mockFrom,
    storage: {
      from: vi.fn().mockReturnValue({
        remove: vi.fn().mockResolvedValue({}),
      }),
    },
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
  sanitizeText: vi.fn((text: string) => text),
}));

import { GET, PATCH, DELETE } from "@/app/api/notebooks/[id]/route";
import { authenticateRequest } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { isValidUUID } from "@/lib/validate";

const mockedAuth = vi.mocked(authenticateRequest);
const mockedRateLimit = vi.mocked(checkRateLimit);
const mockedIsValidUUID = vi.mocked(isValidUUID);

describe("GET /api/notebooks/[id]", () => {
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
    const req = new Request("http://test/api/notebooks/nb-1");
    const res = await GET(req, { params: Promise.resolve({ id: "nb-1" }) });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({ error: "Unauthorized" });
  });

  it("returns 400 for invalid UUID", async () => {
    mockedIsValidUUID.mockReturnValue(false);
    const req = new Request("http://test/api/notebooks/invalid");
    const res = await GET(req, { params: Promise.resolve({ id: "invalid" }) });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({ error: "Invalid ID" });
  });

  it("returns 404 when notebook not found", async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: { message: "Not found" } }),
          }),
        }),
      }),
    });

    const req = new Request("http://test/api/notebooks/nb-1");
    const res = await GET(req, { params: Promise.resolve({ id: "nb-1" }) });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toEqual({ error: "Not found" });
  });

  it("returns 429 when rate limited", async () => {
    mockedRateLimit.mockReturnValue(false);
    const req = new Request("http://test/api/notebooks/nb-1");
    const res = await GET(req, { params: Promise.resolve({ id: "nb-1" }) });
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("60");
  });

  it("returns 200 with notebook data", async () => {
    const notebook = {
      id: "nb-1",
      user_id: "user-123",
      title: "Test Notebook",
      file_url: "path/to/file",
      status: "ready",
      page_count: 10,
      description: "Test",
      starter_prompts: [],
      created_at: "2026-01-01",
    };

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: notebook, error: null }),
          }),
        }),
      }),
    });

    const req = new Request("http://test/api/notebooks/nb-1");
    const res = await GET(req, { params: Promise.resolve({ id: "nb-1" }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(notebook);
    expect(res.headers.get("Cache-Control")).toBe("private, max-age=5, stale-while-revalidate=30");
  });
});

describe("PATCH /api/notebooks/[id]", () => {
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
    const req = new Request("http://test/api/notebooks/nb-1", {
      method: "PATCH",
      body: JSON.stringify({ title: "New Title" }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "nb-1" }) });
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid UUID", async () => {
    mockedIsValidUUID.mockReturnValue(false);
    const req = new Request("http://test/api/notebooks/invalid", {
      method: "PATCH",
      body: JSON.stringify({ title: "New Title" }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "invalid" }) });
    expect(res.status).toBe(400);
  });

  it("returns 400 when no updates provided", async () => {
    const req = new Request("http://test/api/notebooks/nb-1", {
      method: "PATCH",
      body: JSON.stringify({}),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "nb-1" }) });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({ error: "No updates" });
  });

  it("returns 429 when rate limited", async () => {
    mockedRateLimit.mockReturnValue(false);
    const req = new Request("http://test/api/notebooks/nb-1", {
      method: "PATCH",
      body: JSON.stringify({ title: "New Title" }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "nb-1" }) });
    expect(res.status).toBe(429);
  });

  it("returns 200 on successful update", async () => {
    const updated = {
      id: "nb-1",
      user_id: "user-123",
      title: "Updated Title",
      file_url: "path/to/file",
      status: "ready",
      page_count: 10,
      description: "Updated",
      starter_prompts: [],
      created_at: "2026-01-01",
    };

    mockFrom.mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: updated, error: null }),
            }),
          }),
        }),
      }),
    });

    const req = new Request("http://test/api/notebooks/nb-1", {
      method: "PATCH",
      body: JSON.stringify({ title: "Updated Title", description: "Updated" }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "nb-1" }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(updated);
  });

  it("returns 404 when notebook not found", async () => {
    mockFrom.mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        }),
      }),
    });

    const req = new Request("http://test/api/notebooks/nb-1", {
      method: "PATCH",
      body: JSON.stringify({ title: "New Title" }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "nb-1" }) });
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/notebooks/[id]", () => {
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
    const req = new Request("http://test/api/notebooks/nb-1", { method: "DELETE" });
    const res = await DELETE(req, { params: Promise.resolve({ id: "nb-1" }) });
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid UUID", async () => {
    mockedIsValidUUID.mockReturnValue(false);
    const req = new Request("http://test/api/notebooks/invalid", { method: "DELETE" });
    const res = await DELETE(req, { params: Promise.resolve({ id: "invalid" }) });
    expect(res.status).toBe(400);
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

    const req = new Request("http://test/api/notebooks/nb-1", { method: "DELETE" });
    const res = await DELETE(req, { params: Promise.resolve({ id: "nb-1" }) });
    expect(res.status).toBe(404);
  });

  it("returns 429 when rate limited", async () => {
    mockedRateLimit.mockReturnValue(false);
    const req = new Request("http://test/api/notebooks/nb-1", { method: "DELETE" });
    const res = await DELETE(req, { params: Promise.resolve({ id: "nb-1" }) });
    expect(res.status).toBe(429);
  });

  it("returns 200 on successful deletion", async () => {
    let selectCallCount = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table === "notebooks" && selectCallCount === 0) {
        selectCallCount++;
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: "nb-1", file_url: "path/to/file" },
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      if (table === "notebook_files") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [{ storage_path: "user-123/file1.pdf" }],
              }),
            }),
          }),
        };
      }
      // notebooks delete call
      return {
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        }),
      };
    });

    const req = new Request("http://test/api/notebooks/nb-1", { method: "DELETE" });
    const res = await DELETE(req, { params: Promise.resolve({ id: "nb-1" }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ success: true });
  });

  it("returns 500 on delete error", async () => {
    let selectCallCount = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table === "notebooks" && selectCallCount === 0) {
        selectCallCount++;
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: "nb-1", file_url: "path/to/file" },
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      if (table === "notebook_files") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: [] }),
            }),
          }),
        };
      }
      // notebooks delete call with error
      return {
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: { message: "Delete failed" } }),
          }),
        }),
      };
    });

    const req = new Request("http://test/api/notebooks/nb-1", { method: "DELETE" });
    const res = await DELETE(req, { params: Promise.resolve({ id: "nb-1" }) });
    expect(res.status).toBe(500);
  });
});
