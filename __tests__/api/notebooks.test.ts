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

import { GET, DELETE } from "@/app/api/notebooks/route";
import { authenticateRequest } from "@/lib/auth";

const mockedAuth = vi.mocked(authenticateRequest);

describe("GET /api/notebooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedAuth.mockResolvedValue("skip");
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
    });
  });

  it("returns 401 without auth", async () => {
    mockedAuth.mockResolvedValue(null);
    const req = new Request("http://test/api/notebooks");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("returns notebooks list", async () => {
    const notebooks = [{ id: "nb-1", title: "Test" }];
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: notebooks, error: null }),
        }),
      }),
    });

    const req = new Request("http://test/api/notebooks");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(notebooks);
  });

  it("returns 401 when no supabase user", async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: null },
    });
    const req = new Request("http://test/api/notebooks");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("returns 500 on database error", async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: null, error: { message: "err" } }),
        }),
      }),
    });

    const req = new Request("http://test/api/notebooks");
    const res = await GET(req);
    expect(res.status).toBe(500);
  });
});

describe("DELETE /api/notebooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedAuth.mockResolvedValue("skip");
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
    });
  });

  it("returns 401 without auth", async () => {
    mockedAuth.mockResolvedValue(null);
    const req = new Request("http://test/api/notebooks", { method: "DELETE" });
    const res = await DELETE(req);
    expect(res.status).toBe(401);
  });

  it("returns 200 on successful deletion", async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: [] }),
      }),
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    });

    const req = new Request("http://test/api/notebooks", { method: "DELETE" });
    const res = await DELETE(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ success: true });
  });
});
