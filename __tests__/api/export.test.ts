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
  checkRateLimit: vi.fn(),
}));

import { GET } from "@/app/api/user/export/route";
import { authenticateRequest } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";

const mockedAuth = vi.mocked(authenticateRequest);
const mockedRateLimit = vi.mocked(checkRateLimit);

describe("GET /api/user/export", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedAuth.mockResolvedValue("skip");
    mockedRateLimit.mockReturnValue(true);
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-123", email: "test@test.com" } },
    });

    // Mock chainable query builder for from()
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: [] }),
          }),
        }),
      }),
    });
  });

  it("returns 401 without auth", async () => {
    mockedAuth.mockResolvedValue(null);
    const req = new Request("http://test/api/user/export");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("returns 429 when rate limited", async () => {
    mockedRateLimit.mockReturnValue(false);
    const req = new Request("http://test/api/user/export");
    const res = await GET(req);
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("3600");
  });

  it("returns JSON with Content-Disposition header", async () => {
    const req = new Request("http://test/api/user/export");
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Disposition")).toMatch(/^attachment; filename="docchat-export-/);
    expect(res.headers.get("Content-Type")).toBe("application/json");
  });

  it("includes user email in export data", async () => {
    const req = new Request("http://test/api/user/export");
    const res = await GET(req);
    const body = await res.json();
    expect(body.user_email).toBe("test@test.com");
    expect(body.exported_at).toBeDefined();
    expect(body.notebooks).toEqual([]);
    expect(body.notes).toEqual([]);
    expect(body.messages).toEqual([]);
  });

  it("queries all 3 tables", async () => {
    const req = new Request("http://test/api/user/export");
    await GET(req);
    expect(mockFrom).toHaveBeenCalledWith("notebooks");
    expect(mockFrom).toHaveBeenCalledWith("notes");
    expect(mockFrom).toHaveBeenCalledWith("messages");
  });
});
