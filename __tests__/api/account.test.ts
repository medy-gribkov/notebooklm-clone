import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockSupabase, mockServiceClient } = vi.hoisted(() => {
  const mockSupabase = {
    auth: { getUser: vi.fn() },
    from: vi.fn(),
  };
  const mockServiceClient = {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: [] }),
      }),
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({}),
        in: vi.fn().mockResolvedValue({}),
      }),
    }),
    storage: {
      from: vi.fn().mockReturnValue({
        remove: vi.fn().mockResolvedValue({}),
      }),
    },
    auth: {
      admin: {
        deleteUser: vi.fn().mockResolvedValue({ error: null }),
      },
    },
  };
  return { mockSupabase, mockServiceClient };
});

vi.mock("@/lib/auth", () => ({
  authenticateRequest: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue(mockSupabase),
}));

vi.mock("@/lib/supabase/service", () => ({
  getServiceClient: vi.fn(() => mockServiceClient),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(),
}));

import { DELETE } from "@/app/api/account/route";
import { authenticateRequest } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";

const mockedAuth = vi.mocked(authenticateRequest);
const mockedRateLimit = vi.mocked(checkRateLimit);

describe("DELETE /api/account", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedAuth.mockResolvedValue("skip");
    mockedRateLimit.mockReturnValue(true);
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
    });
  });

  it("returns 401 without auth", async () => {
    mockedAuth.mockResolvedValue(null);
    const req = new Request("http://test/api/account", { method: "DELETE" });
    const res = await DELETE(req);
    expect(res.status).toBe(401);
  });

  it("returns 401 when no supabase user", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
    });
    const req = new Request("http://test/api/account", { method: "DELETE" });
    const res = await DELETE(req);
    expect(res.status).toBe(401);
  });

  it("returns 429 when rate limited", async () => {
    mockedRateLimit.mockReturnValue(false);
    const req = new Request("http://test/api/account", { method: "DELETE" });
    const res = await DELETE(req);
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("86400");
  });

  it("returns 200 on successful deletion", async () => {
    const req = new Request("http://test/api/account", { method: "DELETE" });
    const res = await DELETE(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ success: true });
  });

  it("calls deleteUser with correct userId", async () => {
    const req = new Request("http://test/api/account", { method: "DELETE" });
    await DELETE(req);
    expect(mockServiceClient.auth.admin.deleteUser).toHaveBeenCalledWith("user-123");
  });

  it("returns 500 when deleteUser fails", async () => {
    mockServiceClient.auth.admin.deleteUser.mockResolvedValueOnce({
      error: { message: "Failed" },
    });
    const req = new Request("http://test/api/account", { method: "DELETE" });
    const res = await DELETE(req);
    expect(res.status).toBe(500);
  });
});
