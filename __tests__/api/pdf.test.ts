import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockFrom, mockSupabase, mockServiceClient, mockCreateSignedUrl } =
  vi.hoisted(() => {
    const mockFrom = vi.fn();
    const mockCreateSignedUrl = vi.fn();
    const mockSupabase = {
      auth: { getUser: vi.fn() },
      from: mockFrom,
    };
    const mockServiceClient = {
      from: vi.fn(),
      storage: {
        from: vi.fn().mockReturnValue({
          createSignedUrl: mockCreateSignedUrl,
        }),
      },
    };
    return { mockFrom, mockSupabase, mockServiceClient, mockCreateSignedUrl };
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

import { GET } from "@/app/api/notebooks/[id]/pdf/route";
import { authenticateRequest } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { isValidUUID } from "@/lib/validate";

const mockedAuth = vi.mocked(authenticateRequest);
const mockedRateLimit = vi.mocked(checkRateLimit);
const mockedIsValidUUID = vi.mocked(isValidUUID);

const validUUID = "550e8400-e29b-41d4-a716-446655440000";
const fileId = "660e8400-e29b-41d4-a716-446655440001";

function makeRequest(id: string, queryParams = "") {
  return new Request(`http://test/api/notebooks/${id}/pdf${queryParams}`);
}

describe("GET /api/notebooks/[id]/pdf", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedAuth.mockResolvedValue("skip");
    mockedRateLimit.mockReturnValue(true);
    mockedIsValidUUID.mockReturnValue(true);
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
    });
  });

  it("returns 401 when authenticateRequest returns null", async () => {
    mockedAuth.mockResolvedValue(null);
    const req = makeRequest(validUUID);
    const res = await GET(req, { params: Promise.resolve({ id: validUUID }) });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({ error: "Unauthorized" });
  });

  it("returns 401 when getUser returns no user", async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: null },
    });
    const req = makeRequest(validUUID);
    const res = await GET(req, { params: Promise.resolve({ id: validUUID }) });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({ error: "Unauthorized" });
  });

  it("returns 400 for invalid UUID", async () => {
    mockedIsValidUUID.mockReturnValue(false);
    const req = makeRequest("bad-id");
    const res = await GET(req, { params: Promise.resolve({ id: "bad-id" }) });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({ error: "Invalid ID" });
  });

  it("returns 429 when rate limited", async () => {
    mockedRateLimit.mockReturnValue(false);
    const req = makeRequest(validUUID);
    const res = await GET(req, { params: Promise.resolve({ id: validUUID }) });
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("60");
  });

  it("returns 404 when no storage path found", async () => {
    // No fileId param, no files, no legacy
    mockFrom.mockImplementation((table: string) => {
      if (table === "notebook_files") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({ data: null, error: null }),
                  }),
                }),
              }),
            }),
          }),
        };
      }
      // notebooks legacy fallback
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        }),
      };
    });

    const req = makeRequest(validUUID);
    const res = await GET(req, { params: Promise.resolve({ id: validUUID }) });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toEqual({ error: "Not found" });
  });

  it("returns 404 for featured file with text-based message", async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { storage_path: "featured/some-notebook/file.txt" },
                  error: null,
                }),
              }),
            }),
          }),
        }),
      }),
    });

    const req = makeRequest(validUUID);
    const res = await GET(req, { params: Promise.resolve({ id: validUUID }) });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toEqual({ error: "This source is text-based and has no downloadable PDF." });
  });

  it("returns 500 when signed URL generation fails", async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { storage_path: "user-123/doc.pdf" },
                  error: null,
                }),
              }),
            }),
          }),
        }),
      }),
    });
    mockCreateSignedUrl.mockResolvedValue({ data: null, error: { message: "Storage error" } });

    const req = makeRequest(validUUID);
    const res = await GET(req, { params: Promise.resolve({ id: validUUID }) });
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ error: "Internal error" });
  });

  it("returns 200 with signed URL using fileId", async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { storage_path: "user-123/specific.pdf" },
                error: null,
              }),
            }),
          }),
        }),
      }),
    });
    mockCreateSignedUrl.mockResolvedValue({
      data: { signedUrl: "https://storage.example.com/signed" },
      error: null,
    });

    const req = makeRequest(validUUID, `?fileId=${fileId}`);
    const res = await GET(req, { params: Promise.resolve({ id: validUUID }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ url: "https://storage.example.com/signed" });
  });

  it("returns 200 with signed URL via first file fallback", async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { storage_path: "user-123/first-file.pdf" },
                  error: null,
                }),
              }),
            }),
          }),
        }),
      }),
    });
    mockCreateSignedUrl.mockResolvedValue({
      data: { signedUrl: "https://storage.example.com/first-signed" },
      error: null,
    });

    const req = makeRequest(validUUID);
    const res = await GET(req, { params: Promise.resolve({ id: validUUID }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ url: "https://storage.example.com/first-signed" });
  });

  it("returns 200 with signed URL via legacy file_url fallback", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "notebook_files") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({ data: null, error: null }),
                  }),
                }),
              }),
            }),
          }),
        };
      }
      // notebooks legacy
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { file_url: "user-123/legacy.pdf" },
                error: null,
              }),
            }),
          }),
        }),
      };
    });
    mockCreateSignedUrl.mockResolvedValue({
      data: { signedUrl: "https://storage.example.com/legacy-signed" },
      error: null,
    });

    const req = makeRequest(validUUID);
    const res = await GET(req, { params: Promise.resolve({ id: validUUID }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ url: "https://storage.example.com/legacy-signed" });
  });
});
