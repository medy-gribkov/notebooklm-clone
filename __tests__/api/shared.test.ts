import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockFrom, mockRpc, mockSupabase } = vi.hoisted(() => {
  const mockFrom = vi.fn();
  const mockRpc = vi.fn();
  const mockSupabase = {
    from: mockFrom,
    rpc: mockRpc,
  };
  return { mockFrom, mockRpc, mockSupabase };
});

vi.mock("@/lib/supabase/service", () => ({
  getServiceClient: vi.fn().mockReturnValue(mockSupabase),
}));
vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn().mockReturnValue(true),
}));

import { GET } from "@/app/api/shared/[token]/route";
import { checkRateLimit } from "@/lib/rate-limit";

const mockedRateLimit = vi.mocked(checkRateLimit);

describe("GET /api/shared/[token]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 404 for invalid token format (too short)", async () => {
    const req = new NextRequest("http://localhost:3000/api/shared/abc");
    const res = await GET(req, { params: Promise.resolve({ token: "abc" }) });

    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBe("Invalid share link");
  });

  it("should return 404 for invalid token format (invalid characters)", async () => {
    const req = new NextRequest("http://localhost:3000/api/shared/invalidtoken123");
    const res = await GET(req, { params: Promise.resolve({ token: "invalid@token!with#special$chars" }) });

    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBe("Invalid share link");
  });

  it("should return 404 when token validation fails", async () => {
    mockRpc.mockResolvedValueOnce({ data: [], error: null });

    const req = new NextRequest("http://localhost:3000/api/shared/validtoken123456789012345678901234");
    const res = await GET(req, { params: Promise.resolve({ token: "validtoken123456789012345678901234" }) });

    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBe("Invalid or expired share link");
    expect(mockRpc).toHaveBeenCalledWith("validate_share_token", { share_token: "validtoken123456789012345678901234" });
  });

  it("should return 404 when notebook is not ready", async () => {
    mockRpc.mockResolvedValueOnce({
      data: [{ is_valid: true, notebook_id: "notebook-123", permissions: "view", owner_id: "user-123" }],
      error: null,
    });

    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockReturnThis();
    const mockSingle = vi.fn().mockResolvedValue({ data: { id: "notebook-123", status: "processing" }, error: null });

    mockFrom.mockReturnValue({
      select: mockSelect,
      eq: mockEq,
      single: mockSingle,
    });

    const req = new NextRequest("http://localhost:3000/api/shared/validtoken123456789012345678901234");
    const res = await GET(req, { params: Promise.resolve({ token: "validtoken123456789012345678901234" }) });

    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBe("Notebook not available");
  });

  it("should return 200 with full notebook data", async () => {
    mockRpc.mockResolvedValueOnce({
      data: [{ is_valid: true, notebook_id: "notebook-123", permissions: "chat", owner_id: "user-123" }],
      error: null,
    });

    const notebook = { id: "notebook-123", title: "Test Notebook", description: "Test description", status: "ready", created_at: "2026-03-01T00:00:00Z" };
    const messages = [{ id: "msg-1", role: "user", content: "Hello", sources: null, created_at: "2026-03-01T01:00:00Z" }];
    const notes = [{ id: "note-1", title: "Test Note", content: "Note content", created_at: "2026-03-01T02:00:00Z" }];
    const generations = [{ id: "gen-1", action: "summary", result: "Summary text", created_at: "2026-03-01T03:00:00Z" }];
    const company = { name: "Test Corp", website: "https://test.com", category: "Tech" };

    // First call: notebooks
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: notebook, error: null }),
        }),
      }),
    });

    // Second call: messages (has two .eq() calls)
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ data: messages, error: null }),
            }),
          }),
        }),
      }),
    });

    // Third call: notes
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: notes, error: null }),
          }),
        }),
      }),
    });

    // Fourth call: studio_generations
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: generations, error: null }),
          }),
        }),
      }),
    });

    // Fifth call: companies
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: company, error: null }),
        }),
      }),
    });

    const req = new NextRequest("http://localhost:3000/api/shared/validtoken123456789012345678901234");
    const res = await GET(req, { params: Promise.resolve({ token: "validtoken123456789012345678901234" }) });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toMatchObject({
      notebook,
      permissions: "chat",
      messages,
      notes,
      generations,
      company,
    });
    expect(res.headers.get("Cache-Control")).toBe("public, s-maxage=60, stale-while-revalidate=300");
  });

  it("should return 429 when rate limit is exceeded", async () => {
    mockedRateLimit.mockReturnValueOnce(false);

    const req = new NextRequest("http://localhost:3000/api/shared/validtoken123456789012345678901234");
    const res = await GET(req, { params: Promise.resolve({ token: "validtoken123456789012345678901234" }) });

    expect(res.status).toBe(429);
    const json = await res.json();
    expect(json.error).toBe("Too many requests. Please slow down.");
    expect(res.headers.get("Retry-After")).toBe("60");
  });
});
