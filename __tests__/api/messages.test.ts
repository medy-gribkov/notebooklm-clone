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

import { GET } from "@/app/api/messages/route";
import { authenticateRequest } from "@/lib/auth";

const mockedAuth = vi.mocked(authenticateRequest);
const validUUID = "550e8400-e29b-41d4-a716-446655440000";

describe("GET /api/messages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedAuth.mockResolvedValue("skip");
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
    });
  });

  it("returns 401 without auth", async () => {
    mockedAuth.mockResolvedValue(null);
    const req = new Request(`http://test/api/messages?notebookId=${validUUID}`);
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 for missing notebookId", async () => {
    const req = new Request("http://test/api/messages");
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid notebookId", async () => {
    const req = new Request("http://test/api/messages?notebookId=bad");
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("returns messages for valid notebook", async () => {
    const messages = [
      { id: "m1", role: "user", content: "Hello" },
      { id: "m2", role: "assistant", content: "Hi" },
    ];
    mockFrom.mockReturnValue({
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

    const req = new Request(`http://test/api/messages?notebookId=${validUUID}`);
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(messages);
  });

  it("returns empty array for no messages", async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        }),
      }),
    });

    const req = new Request(`http://test/api/messages?notebookId=${validUUID}`);
    const res = await GET(req);
    const body = await res.json();
    expect(body).toEqual([]);
  });

  it("returns 500 on database error", async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({
                data: null,
                error: { message: "DB error" },
              }),
            }),
          }),
        }),
      }),
    });

    const req = new Request(`http://test/api/messages?notebookId=${validUUID}`);
    const res = await GET(req);
    expect(res.status).toBe(500);
  });
});
