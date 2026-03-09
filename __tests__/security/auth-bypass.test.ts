import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockSupabase } = vi.hoisted(() => {
  const mockFrom = vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
        order: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
      order: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    }),
    insert: vi.fn().mockResolvedValue({ data: null, error: null }),
    update: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
    delete: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
  });
  const mockSupabase = {
    auth: { getUser: vi.fn() },
    from: mockFrom,
  };
  return { mockFrom, mockSupabase };
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue(mockSupabase),
}));

vi.mock("@/lib/supabase/service", () => ({
  getServiceClient: vi.fn().mockReturnValue(mockSupabase),
}));

vi.mock("@/lib/auth", () => ({
  authenticateRequest: vi.fn().mockResolvedValue(null),
}));

// Stub dependencies that routes import
vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn().mockReturnValue(true),
}));

vi.mock("@/lib/validate", async () => {
  const actual = await vi.importActual("@/lib/validate");
  return actual;
});

describe("Security: Auth bypass protection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });
  });

  it("GET /api/messages returns 401 without auth", async () => {
    const { GET } = await import("@/app/api/messages/route");
    const req = new Request("http://test/api/messages?notebookId=550e8400-e29b-41d4-a716-446655440000");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("GET /api/notebooks returns 401 without auth", async () => {
    const { GET } = await import("@/app/api/notebooks/route");
    const req = new Request("http://test/api/notebooks");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("PATCH /api/user/preferences returns 401 without auth", async () => {
    const { PATCH } = await import("@/app/api/user/preferences/route");
    const req = new Request("http://test/api/user/preferences", {
      method: "PATCH",
      body: JSON.stringify({ theme: "dark" }),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(401);
  });

  it("GET /api/user/export returns 401 without auth", async () => {
    const { GET } = await import("@/app/api/user/export/route");
    const req = new Request("http://test/api/user/export");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("GET /api/admin/profile returns 403 without auth", async () => {
    const { GET } = await import("@/app/api/admin/profile/route");
    const res = await GET();
    expect(res.status).toBe(403);
  });
});
