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

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn().mockReturnValue(true),
}));

vi.mock("@/lib/processing/get-all-chunks", () => ({
  getAllChunks: vi.fn().mockResolvedValue("sample document content"),
}));

vi.mock("@/lib/llm", () => ({
  getLLM: vi.fn().mockReturnValue({}),
}));

vi.mock("@/lib/langchain/output-parsers", () => ({
  studioParsers: {
    flashcards: {
      getFormatInstructions: vi.fn().mockReturnValue("format instructions"),
      parse: vi.fn().mockResolvedValue([{ front: "Q", back: "A" }]),
    },
    quiz: {
      getFormatInstructions: vi.fn().mockReturnValue("format instructions"),
      parse: vi.fn().mockResolvedValue([]),
    },
    report: {
      getFormatInstructions: vi.fn().mockReturnValue("format instructions"),
      parse: vi.fn().mockResolvedValue([]),
    },
    mindmap: {
      getFormatInstructions: vi.fn().mockReturnValue("format instructions"),
      parse: vi.fn().mockResolvedValue({}),
    },
    datatable: {
      getFormatInstructions: vi.fn().mockReturnValue("format instructions"),
      parse: vi.fn().mockResolvedValue({}),
    },
    infographic: {
      getFormatInstructions: vi.fn().mockReturnValue("format instructions"),
      parse: vi.fn().mockResolvedValue([]),
    },
    slidedeck: {
      getFormatInstructions: vi.fn().mockReturnValue("format instructions"),
      parse: vi.fn().mockResolvedValue([]),
    },
  },
}));

vi.mock("ai", () => ({
  streamText: vi.fn().mockReturnValue({
    toUIMessageStreamResponse: vi.fn().mockReturnValue(new Response("stream", { status: 200 })),
  }),
}));

import { POST } from "@/app/api/studio/route";
import { authenticateRequest } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";

const mockedAuth = vi.mocked(authenticateRequest);
const mockedRateLimit = vi.mocked(checkRateLimit);
const validUUID = "550e8400-e29b-41d4-a716-446655440000";

describe("POST /api/studio", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedAuth.mockResolvedValue("skip");
    mockedRateLimit.mockReturnValue(true);
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
    });
    process.env.GROQ_API_KEY = "dummy-key";
    process.env.GEMINI_API_KEY = "dummy-key";
  });

  it("returns 401 without auth", async () => {
    mockedAuth.mockResolvedValue(null);
    const req = new Request("http://test/api/studio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notebookId: validUUID, action: "flashcards" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 429 when rate limited", async () => {
    mockedRateLimit.mockReturnValue(false);
    const req = new Request("http://test/api/studio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notebookId: validUUID, action: "flashcards" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error).toContain("rate limit");
  });

  it("returns 400 for missing notebookId", async () => {
    const req = new Request("http://test/api/studio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "flashcards" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid notebookId", async () => {
    const req = new Request("http://test/api/studio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notebookId: "bad-uuid", action: "flashcards" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid action", async () => {
    const req = new Request("http://test/api/studio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notebookId: validUUID, action: "invalid" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid action");
  });

  it("returns 200 with cached result when available", async () => {
    const cachedResult = { flashcards: [{ front: "Q", back: "A" }] };
    mockFrom.mockImplementation((table: string) => {
      if (table === "notebooks") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: validUUID, status: "ready", source_hash: "hash123" },
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      if (table === "studio_generations") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { result: cachedResult },
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        };
      }
      return { select: vi.fn() };
    });

    const req = new Request("http://test/api/studio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notebookId: validUUID, action: "flashcards" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(cachedResult);
  });
});
