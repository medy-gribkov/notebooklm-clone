import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockFrom, mockSupabase } = vi.hoisted(() => {
  const mockFrom = vi.fn();
  const mockSupabase = {
    auth: { getUser: vi.fn() },
    from: mockFrom,
    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({ error: null }),
        remove: vi.fn().mockResolvedValue({ error: null }),
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
  checkRateLimit: vi.fn().mockReturnValue(true),
}));

vi.mock("@/lib/rag", () => ({
  processNotebook: vi.fn().mockResolvedValue({ pageCount: 5 }),
}));

vi.mock("@/lib/notebook-status", () => ({
  updateNotebookStatus: vi.fn().mockResolvedValue(undefined),
}));

import { POST } from "@/app/api/upload/route";
import { authenticateRequest } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";

const mockedAuth = vi.mocked(authenticateRequest);
const mockedRateLimit = vi.mocked(checkRateLimit);

describe("POST /api/upload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedAuth.mockResolvedValue("skip");
    mockedRateLimit.mockReturnValue(true);
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
    });

    // Default successful DB operations
    mockFrom.mockImplementation((table: string) => {
      if (table === "notebooks") {
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: "notebook-1", user_id: "user-123", title: "Test", status: "processing" },
                error: null,
              }),
            }),
          }),
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: "notebook-1", status: "ready" },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "notebook_files") {
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: "file-1", notebook_id: "notebook-1", status: "processing" },
                error: null,
              }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        };
      }
      return { select: vi.fn() };
    });
  });

  it("returns 401 without auth", async () => {
    mockedAuth.mockResolvedValue(null);
    const formData = new FormData();
    formData.append("file", new File(["%PDF-1.4"], "test.pdf", { type: "application/pdf" }));

    const req = new Request("http://test/api/upload", {
      method: "POST",
      body: formData,
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 429 when rate limited", async () => {
    mockedRateLimit.mockReturnValue(false);
    const formData = new FormData();
    formData.append("file", new File(["%PDF-1.4"], "test.pdf", { type: "application/pdf" }));

    const req = new Request("http://test/api/upload", {
      method: "POST",
      body: formData,
    });
    const res = await POST(req);
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error).toBe("Too many requests");
  });

  it("returns 400 when no file is provided", async () => {
    const formData = new FormData();

    const req = new Request("http://test/api/upload", {
      method: "POST",
      body: formData,
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("No file provided");
  });

  it("returns 400 when file is not PDF", async () => {
    const formData = new FormData();
    formData.append("file", new File(["not a pdf"], "test.txt", { type: "text/plain" }));

    const req = new Request("http://test/api/upload", {
      method: "POST",
      body: formData,
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Only PDF files are supported");
  });

  it("returns 400 when PDF magic bytes are invalid", async () => {
    const formData = new FormData();
    // File claims to be PDF but doesn't have magic bytes
    formData.append("file", new File(["fake pdf content"], "test.pdf", { type: "application/pdf" }));

    const req = new Request("http://test/api/upload", {
      method: "POST",
      body: formData,
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid PDF file");
  });

  it("returns 400 when file exceeds size limit", async () => {
    const formData = new FormData();
    // Create a 6MB file (exceeds 5MB limit)
    const largeBuffer = Buffer.alloc(6 * 1024 * 1024);
    largeBuffer.write("%PDF-1.4");
    formData.append("file", new File([largeBuffer], "large.pdf", { type: "application/pdf" }));

    const req = new Request("http://test/api/upload", {
      method: "POST",
      body: formData,
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("File exceeds 5MB limit");
  });
});
