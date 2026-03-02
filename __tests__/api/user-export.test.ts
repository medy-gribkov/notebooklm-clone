import { describe, it, expect, vi, beforeEach } from "vitest";

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
  checkRateLimit: vi.fn().mockReturnValue(true),
}));

import { GET } from "@/app/api/user/export/route";
import { authenticateRequest } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";

const mockedAuth = vi.mocked(authenticateRequest);
const mockedRateLimit = vi.mocked(checkRateLimit);

describe("GET /api/user/export", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    // Re-establish factory defaults after clearAllMocks
    const { createClient } = await import("@/lib/supabase/server");
    vi.mocked(createClient).mockResolvedValue(mockSupabase as never);
    mockedRateLimit.mockReturnValue(true);
  });

  it("should return 401 when authenticateRequest fails", async () => {
    mockedAuth.mockResolvedValueOnce(null);

    const req = new Request("http://localhost:3000/api/user/export");
    const res = await GET(req);

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("Unauthorized");
  });

  it("should return 401 when getUser fails", async () => {
    mockedAuth.mockResolvedValueOnce("skip");
    mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: null }, error: null });

    const req = new Request("http://localhost:3000/api/user/export");
    const res = await GET(req);

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("Unauthorized");
  });

  it("should return 429 when rate limit is exceeded", async () => {
    mockedAuth.mockResolvedValueOnce("skip");
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: "user-123", email: "test@example.com" } },
      error: null,
    });
    mockedRateLimit.mockReturnValueOnce(false);

    const req = new Request("http://localhost:3000/api/user/export");
    const res = await GET(req);

    expect(res.status).toBe(429);
    const json = await res.json();
    expect(json.error).toBe("Export rate limit reached. Max 1 export per hour.");
    expect(res.headers.get("Retry-After")).toBe("3600");
    expect(mockedRateLimit).toHaveBeenCalledWith("export:user-123", 1, 3_600_000);
  });

  it("should return 200 with export data for valid request", async () => {
    mockedAuth.mockResolvedValueOnce("skip");
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: "user-123", email: "test@example.com" } },
      error: null,
    });

    const notebooks = [{ id: "nb-1", title: "Test Notebook", user_id: "user-123", created_at: "2026-03-01T00:00:00Z" }];
    const notes = [{ id: "note-1", title: "Test Note", user_id: "user-123", created_at: "2026-03-01T01:00:00Z" }];
    const messages = [{ id: "msg-1", notebook_id: "nb-1", role: "user", content: "Hello", created_at: "2026-03-01T02:00:00Z" }];

    // First call: notebooks
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: notebooks, error: null }),
          }),
        }),
      }),
    });

    // Second call: notes
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: notes, error: null }),
          }),
        }),
      }),
    });

    // Third call: messages
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: messages, error: null }),
          }),
        }),
      }),
    });

    const req = new Request("http://localhost:3000/api/user/export");
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/json");
    expect(res.headers.get("Content-Disposition")).toMatch(/^attachment; filename="docchat-export-\d{4}-\d{2}-\d{2}\.json"$/);

    const text = await res.text();
    const json = JSON.parse(text);

    expect(json).toMatchObject({
      user_email: "test@example.com",
      notebooks,
      notes,
      messages,
    });
    expect(json.exported_at).toBeDefined();
    expect(new Date(json.exported_at).getTime()).toBeGreaterThan(0);

    expect(mockFrom).toHaveBeenCalledWith("notebooks");
    expect(mockFrom).toHaveBeenCalledWith("notes");
    expect(mockFrom).toHaveBeenCalledWith("messages");
  });

  it("should return empty arrays when user has no data", async () => {
    mockedAuth.mockResolvedValueOnce("skip");
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: "user-123", email: "test@example.com" } },
      error: null,
    });

    const emptyChain = {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      }),
    };

    mockFrom
      .mockReturnValueOnce(emptyChain)
      .mockReturnValueOnce(emptyChain)
      .mockReturnValueOnce(emptyChain);

    const req = new Request("http://localhost:3000/api/user/export");
    const res = await GET(req);

    expect(res.status).toBe(200);
    const text = await res.text();
    const json = JSON.parse(text);

    expect(json).toMatchObject({
      user_email: "test@example.com",
      notebooks: [],
      notes: [],
      messages: [],
    });
  });
});
