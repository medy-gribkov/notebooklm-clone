import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockFrom, mockSupabase, mockServiceFrom, mockServiceClient } =
  vi.hoisted(() => {
    const mockFrom = vi.fn();
    const mockServiceFrom = vi.fn();
    const mockSupabase = {
      auth: { getUser: vi.fn() },
      from: mockFrom,
    };
    const mockServiceClient = {
      auth: {
        admin: {
          getUserById: vi.fn(),
          listUsers: vi.fn(),
        },
      },
      from: mockServiceFrom,
    };
    return { mockFrom, mockSupabase, mockServiceFrom, mockServiceClient };
  });

vi.mock("@/lib/auth", () => ({
  authenticateRequest: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue(mockSupabase),
}));

vi.mock("@/lib/supabase/service", () => ({
  getServiceClient: vi.fn().mockReturnValue(mockServiceClient),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(),
}));

vi.mock("@/lib/validate", () => ({
  isValidUUID: vi.fn(),
}));

import { GET, POST, DELETE } from "@/app/api/notebooks/[id]/members/route";
import { authenticateRequest } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { isValidUUID } from "@/lib/validate";

const mockedAuth = vi.mocked(authenticateRequest);
const mockedRateLimit = vi.mocked(checkRateLimit);
const mockedIsValidUUID = vi.mocked(isValidUUID);

// ---------------------------------------------------------------------------
// GET /api/notebooks/[id]/members
// ---------------------------------------------------------------------------
describe("GET /api/notebooks/[id]/members", () => {
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
    const req = new Request("http://test/api/notebooks/nb-1/members");
    const res = await GET(req, { params: Promise.resolve({ id: "nb-1" }) });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({ error: "Unauthorized" });
  });

  it("returns 400 for invalid UUID", async () => {
    mockedIsValidUUID.mockReturnValue(false);
    const req = new Request("http://test/api/notebooks/bad/members");
    const res = await GET(req, { params: Promise.resolve({ id: "bad" }) });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({ error: "Invalid ID" });
  });

  it("returns 401 when no user from getUser", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });
    const req = new Request("http://test/api/notebooks/nb-1/members");
    const res = await GET(req, { params: Promise.resolve({ id: "nb-1" }) });
    expect(res.status).toBe(401);
  });

  it("returns 429 when rate limited", async () => {
    mockedRateLimit.mockReturnValue(false);
    const req = new Request("http://test/api/notebooks/nb-1/members");
    const res = await GET(req, { params: Promise.resolve({ id: "nb-1" }) });
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("60");
  });

  it("returns 404 when notebook not found", async () => {
    mockServiceFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null }),
        }),
      }),
    });
    const req = new Request("http://test/api/notebooks/nb-1/members");
    const res = await GET(req, { params: Promise.resolve({ id: "nb-1" }) });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toEqual({ error: "Notebook not found" });
  });

  it("returns 404 when non-owner is not a member", async () => {
    let serviceCallCount = 0;
    mockServiceFrom.mockImplementation(() => {
      serviceCallCount++;
      if (serviceCallCount === 1) {
        // notebooks lookup: returns notebook owned by someone else
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: "nb-1", user_id: "other-user" },
              }),
            }),
          }),
        };
      }
      // notebook_members membership check: not found
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null }),
            }),
          }),
        }),
      };
    });

    const req = new Request("http://test/api/notebooks/nb-1/members");
    const res = await GET(req, { params: Promise.resolve({ id: "nb-1" }) });
    expect(res.status).toBe(404);
  });

  it("returns 200 with members when user is owner", async () => {
    let serviceCallCount = 0;
    mockServiceFrom.mockImplementation(() => {
      serviceCallCount++;
      if (serviceCallCount === 1) {
        // notebooks: owned by user-123
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: "nb-1", user_id: "user-123" },
              }),
            }),
          }),
        };
      }
      // notebook_members list
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: [
                { id: "m-1", user_id: "member-1", role: "editor", created_at: "2026-01-01" },
              ],
            }),
          }),
        }),
      };
    });

    mockServiceClient.auth.admin.getUserById.mockResolvedValue({
      data: {
        user: {
          email: "member@test.com",
          user_metadata: { display_name: "Member One" },
        },
      },
    });

    const req = new Request("http://test/api/notebooks/nb-1/members");
    const res = await GET(req, { params: Promise.resolve({ id: "nb-1" }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.isOwner).toBe(true);
    expect(body.members).toHaveLength(1);
    expect(body.members[0].email).toBe("member@test.com");
    expect(body.members[0].display_name).toBe("Member One");
  });

  it("returns 200 with members when user is a member (not owner)", async () => {
    let serviceCallCount = 0;
    mockServiceFrom.mockImplementation(() => {
      serviceCallCount++;
      if (serviceCallCount === 1) {
        // notebooks: owned by other-user
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: "nb-1", user_id: "other-user" },
              }),
            }),
          }),
        };
      }
      if (serviceCallCount === 2) {
        // membership check: user IS a member
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { role: "viewer" },
                }),
              }),
            }),
          }),
        };
      }
      // members list
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: [] }),
          }),
        }),
      };
    });

    const req = new Request("http://test/api/notebooks/nb-1/members");
    const res = await GET(req, { params: Promise.resolve({ id: "nb-1" }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.isOwner).toBe(false);
    expect(body.members).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// POST /api/notebooks/[id]/members
// ---------------------------------------------------------------------------
describe("POST /api/notebooks/[id]/members", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedAuth.mockResolvedValue("skip");
    mockedRateLimit.mockReturnValue(true);
    mockedIsValidUUID.mockReturnValue(true);
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
    });
  });

  const makeReq = (body: unknown) =>
    new Request("http://test/api/notebooks/nb-1/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

  it("returns 401 without auth", async () => {
    mockedAuth.mockResolvedValue(null);
    const res = await POST(makeReq({ email: "a@b.com" }), {
      params: Promise.resolve({ id: "nb-1" }),
    });
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid UUID", async () => {
    mockedIsValidUUID.mockReturnValue(false);
    const res = await POST(makeReq({ email: "a@b.com" }), {
      params: Promise.resolve({ id: "bad" }),
    });
    expect(res.status).toBe(400);
  });

  it("returns 401 when no user from getUser", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });
    const res = await POST(makeReq({ email: "a@b.com" }), {
      params: Promise.resolve({ id: "nb-1" }),
    });
    expect(res.status).toBe(401);
  });

  it("returns 429 when rate limited", async () => {
    mockedRateLimit.mockReturnValue(false);
    const res = await POST(makeReq({ email: "a@b.com" }), {
      params: Promise.resolve({ id: "nb-1" }),
    });
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("3600");
  });

  it("returns 404 when notebook not owned by user", async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null }),
          }),
        }),
      }),
    });
    const res = await POST(makeReq({ email: "a@b.com" }), {
      params: Promise.resolve({ id: "nb-1" }),
    });
    expect(res.status).toBe(404);
  });

  it("returns 400 when email is missing", async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: "nb-1" } }),
          }),
        }),
      }),
    });
    const res = await POST(makeReq({}), {
      params: Promise.resolve({ id: "nb-1" }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({ error: "Email is required" });
  });

  it("returns 400 for invalid email format", async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: "nb-1" } }),
          }),
        }),
      }),
    });
    const res = await POST(makeReq({ email: "not-an-email" }), {
      params: Promise.resolve({ id: "nb-1" }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({ error: "Invalid email format" });
  });

  it("returns 400 when inviting yourself", async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: "nb-1" } }),
          }),
        }),
      }),
    });
    mockServiceClient.auth.admin.listUsers.mockResolvedValue({
      data: {
        users: [{ id: "user-123", email: "me@test.com" }],
      },
    });
    const res = await POST(makeReq({ email: "me@test.com" }), {
      params: Promise.resolve({ id: "nb-1" }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({ error: "You cannot invite yourself" });
  });

  it("returns 404 when invited user not found", async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: "nb-1" } }),
          }),
        }),
      }),
    });
    mockServiceClient.auth.admin.listUsers.mockResolvedValue({
      data: { users: [] },
    });
    const res = await POST(makeReq({ email: "nobody@test.com" }), {
      params: Promise.resolve({ id: "nb-1" }),
    });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toEqual({ error: "User not found. They must sign up first." });
  });

  it("returns 500 when upsert fails", async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: "nb-1" } }),
          }),
        }),
      }),
    });
    mockServiceClient.auth.admin.listUsers.mockResolvedValue({
      data: {
        users: [{ id: "invited-1", email: "friend@test.com" }],
      },
    });
    mockServiceFrom.mockReturnValue({
      upsert: vi.fn().mockResolvedValue({ error: { message: "DB fail" } }),
    });
    const res = await POST(makeReq({ email: "friend@test.com" }), {
      params: Promise.resolve({ id: "nb-1" }),
    });
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ error: "Failed to add member" });
  });

  it("returns 201 on successful invitation", async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: "nb-1" } }),
          }),
        }),
      }),
    });
    mockServiceClient.auth.admin.listUsers.mockResolvedValue({
      data: {
        users: [{ id: "invited-1", email: "friend@test.com" }],
      },
    });
    mockServiceFrom.mockReturnValue({
      upsert: vi.fn().mockResolvedValue({ error: null }),
    });
    const res = await POST(makeReq({ email: "friend@test.com", role: "editor" }), {
      params: Promise.resolve({ id: "nb-1" }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.member).toEqual({
      user_id: "invited-1",
      email: "friend@test.com",
      role: "editor",
    });
  });

  it("defaults role to viewer when not editor", async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: "nb-1" } }),
          }),
        }),
      }),
    });
    mockServiceClient.auth.admin.listUsers.mockResolvedValue({
      data: {
        users: [{ id: "invited-1", email: "friend@test.com" }],
      },
    });
    mockServiceFrom.mockReturnValue({
      upsert: vi.fn().mockResolvedValue({ error: null }),
    });
    const res = await POST(makeReq({ email: "friend@test.com" }), {
      params: Promise.resolve({ id: "nb-1" }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.member.role).toBe("viewer");
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/notebooks/[id]/members
// ---------------------------------------------------------------------------
describe("DELETE /api/notebooks/[id]/members", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedAuth.mockResolvedValue("skip");
    mockedIsValidUUID.mockReturnValue(true);
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
    });
  });

  const makeReq = (body: unknown) =>
    new Request("http://test/api/notebooks/nb-1/members", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

  it("returns 401 without auth", async () => {
    mockedAuth.mockResolvedValue(null);
    const res = await DELETE(makeReq({ userId: "member-1" }), {
      params: Promise.resolve({ id: "nb-1" }),
    });
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid notebook UUID", async () => {
    mockedIsValidUUID.mockReturnValue(false);
    const res = await DELETE(makeReq({ userId: "member-1" }), {
      params: Promise.resolve({ id: "bad" }),
    });
    expect(res.status).toBe(400);
  });

  it("returns 401 when no user from getUser", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });
    const res = await DELETE(makeReq({ userId: "member-1" }), {
      params: Promise.resolve({ id: "nb-1" }),
    });
    expect(res.status).toBe(401);
  });

  it("returns 404 when notebook not owned by user", async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null }),
          }),
        }),
      }),
    });
    const res = await DELETE(makeReq({ userId: "member-1" }), {
      params: Promise.resolve({ id: "nb-1" }),
    });
    expect(res.status).toBe(404);
  });

  it("returns 400 when userId is missing or invalid", async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: "nb-1" } }),
          }),
        }),
      }),
    });
    // isValidUUID returns true for the notebook id, then false for the body userId
    mockedIsValidUUID.mockReturnValueOnce(true).mockReturnValueOnce(false);
    const res = await DELETE(makeReq({ userId: "bad-id" }), {
      params: Promise.resolve({ id: "nb-1" }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({ error: "Valid userId is required" });
  });

  it("returns 500 when delete fails", async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: "nb-1" } }),
          }),
        }),
      }),
    });
    mockServiceFrom.mockReturnValue({
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: { message: "DB error" } }),
        }),
      }),
    });
    const res = await DELETE(makeReq({ userId: "member-1" }), {
      params: Promise.resolve({ id: "nb-1" }),
    });
    expect(res.status).toBe(500);
  });

  it("returns 200 on successful removal", async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: "nb-1" } }),
          }),
        }),
      }),
    });
    mockServiceFrom.mockReturnValue({
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      }),
    });
    const res = await DELETE(makeReq({ userId: "member-1" }), {
      params: Promise.resolve({ id: "nb-1" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ success: true });
  });
});
