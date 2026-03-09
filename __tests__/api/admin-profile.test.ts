import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockSupabase, mockServiceFrom, mockServiceClient } = vi.hoisted(() => {
  const mockFrom = vi.fn();
  const mockServiceFrom = vi.fn();
  const mockSupabase = {
    auth: { getUser: vi.fn() },
    from: mockFrom,
  };
  const mockServiceClient = {
    from: mockServiceFrom,
  };
  return { mockFrom, mockSupabase, mockServiceFrom, mockServiceClient };
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue(mockSupabase),
}));

vi.mock("@/lib/supabase/service", () => ({
  getServiceClient: vi.fn().mockReturnValue(mockServiceClient),
}));

vi.mock("@/lib/validate", () => ({
  sanitizeText: vi.fn((text: string) => text.trim()),
}));

const ADMIN_ID = "admin-user-id-123";

describe("GET /api/admin/profile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("ADMIN_USER_ID", ADMIN_ID);
  });

  it("returns 403 when user is null", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });
    const { GET } = await import("@/app/api/admin/profile/route");
    const res = await GET();
    expect(res.status).toBe(403);
  });

  it("returns 403 when user is not admin", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "not-admin" } },
    });
    const { GET } = await import("@/app/api/admin/profile/route");
    const res = await GET();
    expect(res.status).toBe(403);
  });

  it("returns 200 with profile when exists", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: ADMIN_ID } },
    });
    const profileData = { bio_text: "Test bio", display_name: "Admin", contact_info: {}, updated_at: "2025-01-01" };
    mockServiceFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: profileData, error: null }),
        }),
      }),
    });
    const { GET } = await import("@/app/api/admin/profile/route");
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.profile).toEqual(profileData);
  });

  it("returns 200 with null profile when none exists", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: ADMIN_ID } },
    });
    mockServiceFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    });
    const { GET } = await import("@/app/api/admin/profile/route");
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.profile).toBeNull();
  });
});

describe("PUT /api/admin/profile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("ADMIN_USER_ID", ADMIN_ID);
  });

  it("returns 403 when not admin", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "not-admin" } },
    });
    const { PUT } = await import("@/app/api/admin/profile/route");
    const req = new Request("http://test/api/admin/profile", {
      method: "PUT",
      body: JSON.stringify({ bio_text: "something" }),
    });
    const res = await PUT(req);
    expect(res.status).toBe(403);
  });

  it("returns 400 for invalid JSON body", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: ADMIN_ID } },
    });
    const { PUT } = await import("@/app/api/admin/profile/route");
    const req = new Request("http://test/api/admin/profile", {
      method: "PUT",
      body: "not-json{{{",
      headers: { "Content-Type": "application/json" },
    });
    const res = await PUT(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Invalid");
  });

  it("returns 400 when bio_text is too short", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: ADMIN_ID } },
    });
    const { PUT } = await import("@/app/api/admin/profile/route");
    const req = new Request("http://test/api/admin/profile", {
      method: "PUT",
      body: JSON.stringify({ bio_text: "short" }),
    });
    const res = await PUT(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("10 characters");
  });

  it("returns 400 when bio_text is missing", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: ADMIN_ID } },
    });
    const { PUT } = await import("@/app/api/admin/profile/route");
    const req = new Request("http://test/api/admin/profile", {
      method: "PUT",
      body: JSON.stringify({}),
    });
    const res = await PUT(req);
    expect(res.status).toBe(400);
  });

  it("returns 200 and updates existing profile", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: ADMIN_ID } },
    });
    // First call: select existing profile
    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });
    mockServiceFrom
      .mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: "existing-id" }, error: null }),
          }),
        }),
      })
      .mockReturnValueOnce({
        update: mockUpdate,
      });

    const { PUT } = await import("@/app/api/admin/profile/route");
    const req = new Request("http://test/api/admin/profile", {
      method: "PUT",
      body: JSON.stringify({ bio_text: "This is a valid bio text that is long enough" }),
    });
    const res = await PUT(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("returns 200 and creates new profile when none exists", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: ADMIN_ID } },
    });
    mockServiceFrom
      .mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      })
      .mockReturnValueOnce({
        insert: vi.fn().mockResolvedValue({ error: null }),
      });

    const { PUT } = await import("@/app/api/admin/profile/route");
    const req = new Request("http://test/api/admin/profile", {
      method: "PUT",
      body: JSON.stringify({ bio_text: "This is a valid bio text for a new profile" }),
    });
    const res = await PUT(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("returns 500 on update DB error", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: ADMIN_ID } },
    });
    mockServiceFrom
      .mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: "existing-id" }, error: null }),
          }),
        }),
      })
      .mockReturnValueOnce({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: { message: "DB error" } }),
        }),
      });

    const { PUT } = await import("@/app/api/admin/profile/route");
    const req = new Request("http://test/api/admin/profile", {
      method: "PUT",
      body: JSON.stringify({ bio_text: "This is a valid bio text that is long enough" }),
    });
    const res = await PUT(req);
    expect(res.status).toBe(500);
  });

  it("returns 500 on insert DB error", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: ADMIN_ID } },
    });
    mockServiceFrom
      .mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      })
      .mockReturnValueOnce({
        insert: vi.fn().mockResolvedValue({ error: { message: "DB insert error" } }),
      });

    const { PUT } = await import("@/app/api/admin/profile/route");
    const req = new Request("http://test/api/admin/profile", {
      method: "PUT",
      body: JSON.stringify({ bio_text: "This is a valid bio text for a new profile" }),
    });
    const res = await PUT(req);
    expect(res.status).toBe(500);
  });
});
