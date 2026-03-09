import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockSupabase } = vi.hoisted(() => {
  const mockSupabase = {
    auth: { getUser: vi.fn() },
    from: vi.fn(),
  };
  return { mockSupabase };
});

vi.mock("@/lib/auth", () => ({
  authenticateRequest: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue(mockSupabase),
}));

import { GET, POST, DELETE } from "@/app/api/notebooks/[id]/generations/route";
import { authenticateRequest } from "@/lib/auth";
import { NextRequest } from "next/server";

const mockedAuth = vi.mocked(authenticateRequest);
const validUUID = "550e8400-e29b-41d4-a716-446655440000";

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("GET /api/notebooks/[id]/generations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedAuth.mockResolvedValue("skip");
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
    });
  });

  it("returns 401 without auth", async () => {
    mockedAuth.mockResolvedValue(null);
    const req = new Request(`http://test/api/notebooks/${validUUID}/generations`);
    const res = await GET(req, makeParams(validUUID));
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid UUID", async () => {
    const req = new Request("http://test/api/notebooks/bad-id/generations");
    const res = await GET(req, makeParams("bad-id"));
    expect(res.status).toBe(400);
  });

  it("returns generations list", async () => {
    const generations = [{ id: "gen-1", action: "flashcards" }];
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: generations, error: null }),
          }),
        }),
      }),
    });

    const req = new Request(`http://test/api/notebooks/${validUUID}/generations`);
    const res = await GET(req, makeParams(validUUID));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(generations);
  });
});

describe("POST /api/notebooks/[id]/generations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedAuth.mockResolvedValue("skip");
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
    });
  });

  it("returns 401 without auth", async () => {
    mockedAuth.mockResolvedValue(null);
    const req = new Request(`http://test/api/notebooks/${validUUID}/generations`, {
      method: "POST",
      body: JSON.stringify({ action: "flashcards", result: {} }),
    });
    const res = await POST(req, makeParams(validUUID));
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid action", async () => {
    // Mock notebook ownership check
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: validUUID } }),
          }),
        }),
      }),
    });

    const req = new Request(`http://test/api/notebooks/${validUUID}/generations`, {
      method: "POST",
      body: JSON.stringify({ action: "invalid-action", result: { data: "test" } }),
    });
    const res = await POST(req, makeParams(validUUID));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid action");
  });

  it("returns 400 for missing result", async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: validUUID } }),
          }),
        }),
      }),
    });

    const req = new Request(`http://test/api/notebooks/${validUUID}/generations`, {
      method: "POST",
      body: JSON.stringify({ action: "flashcards" }),
    });
    const res = await POST(req, makeParams(validUUID));
    expect(res.status).toBe(400);
  });

  it("returns 400 for non-object result", async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: validUUID } }),
          }),
        }),
      }),
    });

    const req = new Request(`http://test/api/notebooks/${validUUID}/generations`, {
      method: "POST",
      body: JSON.stringify({ action: "flashcards", result: "not-object" }),
    });
    const res = await POST(req, makeParams(validUUID));
    expect(res.status).toBe(400);
  });

  it("returns 400 for result > 500KB", async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: validUUID } }),
          }),
        }),
      }),
    });

    const largeResult = { data: "x".repeat(500_001) };
    const req = new Request(`http://test/api/notebooks/${validUUID}/generations`, {
      method: "POST",
      body: JSON.stringify({ action: "flashcards", result: largeResult }),
    });
    const res = await POST(req, makeParams(validUUID));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Result too large");
  });

  it("returns 201 with valid data", async () => {
    const generation = { id: "gen-1", action: "flashcards", result: { cards: [] } };
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: validUUID } }),
          }),
        }),
      }),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: generation, error: null }),
        }),
      }),
    });

    const req = new Request(`http://test/api/notebooks/${validUUID}/generations`, {
      method: "POST",
      body: JSON.stringify({ action: "flashcards", result: { cards: [] } }),
    });
    const res = await POST(req, makeParams(validUUID));
    expect(res.status).toBe(201);
  });
});

describe("DELETE /api/notebooks/[id]/generations", () => {
  const genUUID = "770e8400-e29b-41d4-a716-446655440000";

  beforeEach(() => {
    vi.clearAllMocks();
    mockedAuth.mockResolvedValue("skip");
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
    });
  });

  it("returns 400 for missing generationId", async () => {
    const req = new NextRequest(`http://test/api/notebooks/${validUUID}/generations`);
    const res = await DELETE(req, makeParams(validUUID));
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid UUID", async () => {
    const req = new NextRequest(
      `http://test/api/notebooks/${validUUID}/generations?generationId=bad`
    );
    const res = await DELETE(req, makeParams(validUUID));
    expect(res.status).toBe(400);
  });

  it("returns 200 on success", async () => {
    mockSupabase.from.mockReturnValue({
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        }),
      }),
    });

    const req = new NextRequest(
      `http://test/api/notebooks/${validUUID}/generations?generationId=${genUUID}`
    );
    const res = await DELETE(req, makeParams(validUUID));
    expect(res.status).toBe(200);
  });
});
