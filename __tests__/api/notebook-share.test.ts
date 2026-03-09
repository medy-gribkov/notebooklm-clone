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

vi.mock("@/lib/share", () => ({
  generateShareToken: vi.fn().mockReturnValue("share-token-123"),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(),
}));

vi.mock("@/lib/validate", () => ({
  isValidUUID: vi.fn(),
}));

import { GET, POST, DELETE } from "@/app/api/notebooks/[id]/share/route";
import { authenticateRequest } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { isValidUUID } from "@/lib/validate";

const mockedAuth = vi.mocked(authenticateRequest);
const mockedRateLimit = vi.mocked(checkRateLimit);
const mockedIsValidUUID = vi.mocked(isValidUUID);

describe("GET /api/notebooks/[id]/share", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedAuth.mockResolvedValue("skip");
    mockedIsValidUUID.mockReturnValue(true);
    mockedRateLimit.mockReturnValue(true);
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
    });
  });

  it("returns 401 without auth", async () => {
    mockedAuth.mockResolvedValue(null);
    const req = new Request("http://test/api/notebooks/nb-1/share");
    const res = await GET(req, { params: Promise.resolve({ id: "nb-1" }) });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({ error: "Unauthorized" });
  });

  it("returns 400 for invalid UUID", async () => {
    mockedIsValidUUID.mockReturnValue(false);
    const req = new Request("http://test/api/notebooks/invalid/share");
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
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          }),
        }),
      };
    });

    const req = new Request("http://test/api/notebooks/nb-1/share");
    const res = await GET(req, { params: Promise.resolve({ id: "nb-1" }) });
    expect(res.status).toBe(404);
  });

  it("returns 200 with share links list", async () => {
    const links = [
      {
        id: "link-1",
        token: "token-123",
        permissions: "view",
        expires_at: null,
        is_active: true,
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
      // shared_links
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: links, error: null }),
              }),
            }),
          }),
        }),
      };
    });

    const req = new Request("http://test/api/notebooks/nb-1/share");
    const res = await GET(req, { params: Promise.resolve({ id: "nb-1" }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ links });
  });
});

describe("POST /api/notebooks/[id]/share", () => {
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
    const req = new Request("http://test/api/notebooks/nb-1/share", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await POST(req, { params: Promise.resolve({ id: "nb-1" }) });
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid UUID", async () => {
    mockedIsValidUUID.mockReturnValue(false);
    const req = new Request("http://test/api/notebooks/invalid/share", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await POST(req, { params: Promise.resolve({ id: "invalid" }) });
    expect(res.status).toBe(400);
  });

  it("returns 429 when rate limited", async () => {
    mockedRateLimit.mockReturnValue(false);
    const req = new Request("http://test/api/notebooks/nb-1/share", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await POST(req, { params: Promise.resolve({ id: "nb-1" }) });
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error).toBe("Too many share links created. Try again later.");
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

    const req = new Request("http://test/api/notebooks/nb-1/share", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await POST(req, { params: Promise.resolve({ id: "nb-1" }) });
    expect(res.status).toBe(404);
  });

  it("returns 400 when notebook is processing", async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: "nb-1", status: "processing" },
              error: null,
            }),
          }),
        }),
      }),
    });

    const req = new Request("http://test/api/notebooks/nb-1/share", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await POST(req, { params: Promise.resolve({ id: "nb-1" }) });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Notebook is still processing");
  });

  it("returns 201 on successful share link creation", async () => {
    const link = {
      id: "link-1",
      token: "share-token-123",
      permissions: "view",
      expires_at: null,
      created_at: "2026-01-01",
    };

    mockFrom.mockImplementation((table: string) => {
      if (table === "notebooks") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: "nb-1", status: "ready" },
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      // shared_links insert
      return {
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: link, error: null }),
          }),
        }),
      };
    });

    const req = new Request("http://test/api/notebooks/nb-1/share", {
      method: "POST",
      body: JSON.stringify({ permissions: "view" }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: "nb-1" }) });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toEqual({ link });
  });

  it("creates chat permission link", async () => {
    const link = {
      id: "link-1",
      token: "share-token-123",
      permissions: "chat",
      expires_at: null,
      created_at: "2026-01-01",
    };

    mockFrom.mockImplementation((table: string) => {
      if (table === "notebooks") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: "nb-1", status: "ready" },
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      // shared_links insert
      return {
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: link, error: null }),
          }),
        }),
      };
    });

    const req = new Request("http://test/api/notebooks/nb-1/share", {
      method: "POST",
      body: JSON.stringify({ permissions: "chat", expiresInDays: 7 }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: "nb-1" }) });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.link.permissions).toBe("chat");
  });

  it("returns 500 on database error", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "notebooks") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: "nb-1", status: "ready" },
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      // shared_links insert with error
      return {
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: { message: "DB error" } }),
          }),
        }),
      };
    });

    const req = new Request("http://test/api/notebooks/nb-1/share", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await POST(req, { params: Promise.resolve({ id: "nb-1" }) });
    expect(res.status).toBe(500);
  });
});

describe("DELETE /api/notebooks/[id]/share", () => {
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
    const req = new Request("http://test/api/notebooks/nb-1/share", {
      method: "DELETE",
      body: JSON.stringify({ token: "token-123" }),
    });
    const res = await DELETE(req, { params: Promise.resolve({ id: "nb-1" }) });
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid UUID", async () => {
    mockedIsValidUUID.mockReturnValue(false);
    const req = new Request("http://test/api/notebooks/invalid/share", {
      method: "DELETE",
      body: JSON.stringify({ token: "token-123" }),
    });
    const res = await DELETE(req, { params: Promise.resolve({ id: "invalid" }) });
    expect(res.status).toBe(400);
  });

  it("returns 400 when token missing", async () => {
    const req = new Request("http://test/api/notebooks/nb-1/share", {
      method: "DELETE",
      body: JSON.stringify({}),
    });
    const res = await DELETE(req, { params: Promise.resolve({ id: "nb-1" }) });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Missing token");
  });

  it("returns 200 on successful revoke", async () => {
    mockFrom.mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        }),
      }),
    });

    const req = new Request("http://test/api/notebooks/nb-1/share", {
      method: "DELETE",
      body: JSON.stringify({ token: "token-123" }),
    });
    const res = await DELETE(req, { params: Promise.resolve({ id: "nb-1" }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ success: true });
  });

  it("returns 500 on database error", async () => {
    mockFrom.mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: { message: "DB error" } }),
          }),
        }),
      }),
    });

    const req = new Request("http://test/api/notebooks/nb-1/share", {
      method: "DELETE",
      body: JSON.stringify({ token: "token-123" }),
    });
    const res = await DELETE(req, { params: Promise.resolve({ id: "nb-1" }) });
    expect(res.status).toBe(500);
  });
});
