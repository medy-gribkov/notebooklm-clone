import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockSupabase, mockServiceFrom, mockServiceClient } =
  vi.hoisted(() => {
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

import { POST } from "@/app/api/notebooks/create/route";
import { authenticateRequest } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";

const mockedAuth = vi.mocked(authenticateRequest);
const mockedRateLimit = vi.mocked(checkRateLimit);

function makeRequest(body?: unknown) {
  if (body === undefined) {
    return new Request("http://test/api/notebooks/create", { method: "POST" });
  }
  return new Request("http://test/api/notebooks/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function mockInsertSuccess(notebook: Record<string, unknown>) {
  mockServiceFrom.mockReturnValue({
    insert: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: notebook, error: null }),
      }),
    }),
  });
}

function mockInsertError(message: string) {
  mockServiceFrom.mockReturnValue({
    insert: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: null, error: { message } }),
      }),
    }),
  });
}

describe("POST /api/notebooks/create", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedAuth.mockResolvedValue("skip");
    mockedRateLimit.mockReturnValue(true);
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
    });
  });

  it("returns 401 when authenticateRequest returns null", async () => {
    mockedAuth.mockResolvedValue(null);
    const req = makeRequest();
    const res = await POST(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({ error: "Unauthorized" });
  });

  it("returns 401 when getUser returns no user", async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: null },
    });
    const req = makeRequest();
    const res = await POST(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({ error: "Unauthorized" });
  });

  it("returns 429 when rate limited", async () => {
    mockedRateLimit.mockReturnValue(false);
    const req = makeRequest();
    const res = await POST(req);
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("60");
  });

  it("returns 201 with default title when no body", async () => {
    const notebook = {
      id: "nb-1",
      user_id: "user-123",
      title: "Untitled Notebook",
      description: null,
      file_url: null,
      status: "ready",
    };
    mockInsertSuccess(notebook);

    const req = makeRequest();
    const res = await POST(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toEqual(notebook);
  });

  it("returns 201 with custom title and description", async () => {
    const notebook = {
      id: "nb-2",
      user_id: "user-123",
      title: "My Notebook",
      description: "A test notebook",
      file_url: null,
      status: "ready",
    };
    mockInsertSuccess(notebook);

    const req = makeRequest({ title: "My Notebook", description: "A test notebook" });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toEqual(notebook);
  });

  it("returns 201 with title trimmed and capped at 200 chars", async () => {
    const longTitle = "A".repeat(300);
    const notebook = {
      id: "nb-3",
      user_id: "user-123",
      title: "A".repeat(200),
      description: null,
      file_url: null,
      status: "ready",
    };
    mockInsertSuccess(notebook);

    const req = makeRequest({ title: `  ${longTitle}  ` });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.title).toBe("A".repeat(200));
  });

  it("returns 201 with description capped at 500 chars", async () => {
    const longDesc = "B".repeat(600);
    const notebook = {
      id: "nb-4",
      user_id: "user-123",
      title: "Test",
      description: "B".repeat(500),
      file_url: null,
      status: "ready",
    };
    mockInsertSuccess(notebook);

    const req = makeRequest({ title: "Test", description: longDesc });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.description).toBe("B".repeat(500));
  });

  it("returns 500 when database insert fails", async () => {
    mockInsertError("Database connection lost");

    const req = makeRequest({ title: "Fail" });
    const res = await POST(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ error: "Failed to create notebook" });
  });
});
