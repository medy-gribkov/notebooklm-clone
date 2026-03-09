import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockFrom, mockSupabase } = vi.hoisted(() => {
  const mockFrom = vi.fn();
  const mockSupabase = {
    auth: { getUser: vi.fn() },
    from: mockFrom,
    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({ error: null }),
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

vi.mock("@/lib/supabase/service", () => ({
  getServiceClient: vi.fn().mockReturnValue(mockSupabase),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(),
}));

vi.mock("@/lib/validate", () => ({
  isValidUUID: vi.fn(),
}));

vi.mock("@/lib/processing/process-notebook", () => ({
  processNotebook: vi.fn().mockResolvedValue({ pageCount: 5 }),
}));

vi.mock("@/lib/notebook-status", () => ({
  updateNotebookStatus: vi.fn().mockResolvedValue(undefined),
}));

import { GET, POST } from "@/app/api/notebooks/[id]/files/route";
import { authenticateRequest } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { isValidUUID } from "@/lib/validate";

const mockedAuth = vi.mocked(authenticateRequest);
const mockedRateLimit = vi.mocked(checkRateLimit);
const mockedIsValidUUID = vi.mocked(isValidUUID);

describe("GET /api/notebooks/[id]/files", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedAuth.mockResolvedValue("skip");
    mockedIsValidUUID.mockReturnValue(true);
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
    });
  });

  it("returns 401 without auth", async () => {
    mockedAuth.mockResolvedValue(null);
    const req = new Request("http://test/api/notebooks/nb-1/files");
    const res = await GET(req, { params: Promise.resolve({ id: "nb-1" }) });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({ error: "Unauthorized" });
  });

  it("returns 400 for invalid UUID", async () => {
    mockedIsValidUUID.mockReturnValue(false);
    const req = new Request("http://test/api/notebooks/invalid/files");
    const res = await GET(req, { params: Promise.resolve({ id: "invalid" }) });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({ error: "Invalid ID" });
  });

  it("returns 404 when notebook not found", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "notebooks") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        }),
      };
    });

    const req = new Request("http://test/api/notebooks/nb-1/files");
    const res = await GET(req, { params: Promise.resolve({ id: "nb-1" }) });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toEqual({ error: "Notebook not found" });
  });

  it("returns 200 with files list", async () => {
    const files = [
      {
        id: "file-1",
        notebook_id: "nb-1",
        user_id: "user-123",
        file_name: "test.pdf",
        storage_path: "user-123/test.pdf",
        status: "ready",
        page_count: 10,
        created_at: "2026-01-01",
      },
    ];

    mockFrom.mockImplementation((table: string) => {
      if (table === "notebooks") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: "nb-1" },
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      // notebook_files
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: files, error: null }),
            }),
          }),
        }),
      };
    });

    const req = new Request("http://test/api/notebooks/nb-1/files");
    const res = await GET(req, { params: Promise.resolve({ id: "nb-1" }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(files);
    expect(res.headers.get("Cache-Control")).toBe("private, no-cache");
  });

  it("returns 500 on database error", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "notebooks") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: "nb-1" },
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      // notebook_files with error
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: null, error: { message: "DB error" } }),
            }),
          }),
        }),
      };
    });

    const req = new Request("http://test/api/notebooks/nb-1/files");
    const res = await GET(req, { params: Promise.resolve({ id: "nb-1" }) });
    expect(res.status).toBe(500);
  });
});

describe("POST /api/notebooks/[id]/files", () => {
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
    const formData = new FormData();
    const req = new Request("http://test/api/notebooks/nb-1/files", {
      method: "POST",
      body: formData,
    });
    const res = await POST(req, { params: Promise.resolve({ id: "nb-1" }) });
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid UUID", async () => {
    mockedIsValidUUID.mockReturnValue(false);
    const formData = new FormData();
    const req = new Request("http://test/api/notebooks/invalid/files", {
      method: "POST",
      body: formData,
    });
    const res = await POST(req, { params: Promise.resolve({ id: "invalid" }) });
    expect(res.status).toBe(400);
  });

  it("returns 429 when rate limited", async () => {
    mockedRateLimit.mockReturnValue(false);
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: "nb-1" },
              error: null,
            }),
          }),
        }),
      }),
    });

    const formData = new FormData();
    const req = new Request("http://test/api/notebooks/nb-1/files", {
      method: "POST",
      body: formData,
    });
    const res = await POST(req, { params: Promise.resolve({ id: "nb-1" }) });
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error).toBe("Too many uploads. Please wait before uploading again.");
    expect(res.headers.get("Retry-After")).toBe("60");
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

    const formData = new FormData();
    const req = new Request("http://test/api/notebooks/nb-1/files", {
      method: "POST",
      body: formData,
    });
    const res = await POST(req, { params: Promise.resolve({ id: "nb-1" }) });
    expect(res.status).toBe(404);
  });

  it("returns 400 when no file provided", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "notebooks") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: "nb-1" },
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      // notebook_files count
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ count: 0 }),
          }),
        }),
      };
    });

    const formData = new FormData();
    const req = new Request("http://test/api/notebooks/nb-1/files", {
      method: "POST",
      body: formData,
    });
    const res = await POST(req, { params: Promise.resolve({ id: "nb-1" }) });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({ error: "No file provided" });
  });

  it("returns 400 when max files exceeded", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "notebooks") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: "nb-1" },
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      // notebook_files count = 5 (max)
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ count: 5 }),
          }),
        }),
      };
    });

    const formData = new FormData();
    formData.append("file", new File(["test"], "test.pdf", { type: "application/pdf" }));

    const req = new Request("http://test/api/notebooks/nb-1/files", {
      method: "POST",
      body: formData,
    });
    const res = await POST(req, { params: Promise.resolve({ id: "nb-1" }) });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Maximum 5 files per notebook. Delete a file to upload more.");
  });
});
