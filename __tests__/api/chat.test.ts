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
      auth: { getUser: vi.fn() },
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
  validateUserMessage: vi.fn(),
}));

vi.mock("@/lib/langchain/rag-chain", () => ({
  createRAGChain: vi.fn().mockReturnValue({
    invoke: vi.fn().mockResolvedValue({
      sources: [],
      systemPrompt: "system prompt with context",
    }),
  }),
}));

vi.mock("@/lib/langchain/trim-messages", () => ({
  trimMessages: vi.fn((msgs: unknown[]) => msgs),
}));

vi.mock("@/lib/llm", () => ({
  getLLM: vi.fn().mockReturnValue("mock-model"),
}));

vi.mock("ai", () => ({
  streamText: vi.fn().mockReturnValue({
    toDataStreamResponse: () => new Response("stream"),
  }),
}));

import { POST } from "@/app/api/chat/route";
import { authenticateRequest } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { isValidUUID, validateUserMessage } from "@/lib/validate";

const mockedAuth = vi.mocked(authenticateRequest);
const mockedRateLimit = vi.mocked(checkRateLimit);
const mockedIsValidUUID = vi.mocked(isValidUUID);
const mockedValidateUserMessage = vi.mocked(validateUserMessage);

const validUUID = "550e8400-e29b-41d4-a716-446655440000";

function makeRequest(body: unknown) {
  return new Request("http://test/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/chat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedAuth.mockResolvedValue("skip");
    mockedRateLimit.mockReturnValue(true);
    mockedIsValidUUID.mockReturnValue(true);
    mockedValidateUserMessage.mockReturnValue(null);
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-123", user_metadata: {} } },
    });
  });

  it("returns 401 when authenticateRequest returns null", async () => {
    mockedAuth.mockResolvedValue(null);
    const req = makeRequest({ messages: [{ role: "user", content: "hi" }], notebookId: validUUID });
    const res = await POST(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({ error: "Unauthorized" });
  });

  it("returns 401 when getUser returns no user", async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: null },
    });
    const req = makeRequest({ messages: [{ role: "user", content: "hi" }], notebookId: validUUID });
    const res = await POST(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({ error: "Unauthorized" });
  });

  it("returns 429 when rate limited", async () => {
    mockedRateLimit.mockReturnValue(false);
    const req = makeRequest({ messages: [{ role: "user", content: "hi" }], notebookId: validUUID });
    const res = await POST(req);
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("60");
  });

  it("returns 400 for invalid JSON body", async () => {
    const req = new Request("http://test/api/chat", {
      method: "POST",
      body: "not json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({ error: "Invalid request body" });
  });

  it("returns 400 when notebookId is missing", async () => {
    mockedIsValidUUID.mockReturnValue(false);
    const req = makeRequest({ messages: [{ role: "user", content: "hi" }] });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({ error: "Invalid notebookId" });
  });

  it("returns 400 when notebookId is invalid UUID", async () => {
    mockedIsValidUUID.mockReturnValue(false);
    const req = makeRequest({ messages: [{ role: "user", content: "hi" }], notebookId: "bad-id" });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({ error: "Invalid notebookId" });
  });

  it("returns 400 when messages array is empty", async () => {
    const req = makeRequest({ messages: [], notebookId: validUUID });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({ error: "Messages required" });
  });

  it("returns 400 when validateUserMessage returns error", async () => {
    mockedValidateUserMessage.mockReturnValue("Message too long");
    const req = makeRequest({
      messages: [{ role: "user", content: "hi" }],
      notebookId: validUUID,
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({ error: "Message too long" });
  });

  it("returns 404 when notebook not found", async () => {
    mockServiceFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    });

    const req = makeRequest({
      messages: [{ role: "user", content: "hi" }],
      notebookId: validUUID,
    });
    const res = await POST(req);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toEqual({ error: "Notebook not found" });
  });

  it("returns 404 when non-owner and not a member", async () => {
    mockServiceFrom.mockImplementation((table: string) => {
      if (table === "notebooks") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: validUUID, status: "ready", user_id: "other-user" },
                error: null,
              }),
            }),
          }),
        };
      }
      // notebook_members
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

    const req = makeRequest({
      messages: [{ role: "user", content: "hi" }],
      notebookId: validUUID,
    });
    const res = await POST(req);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toEqual({ error: "Notebook not found" });
  });

  it("returns 403 when viewer tries to send message", async () => {
    mockServiceFrom.mockImplementation((table: string) => {
      if (table === "notebooks") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: validUUID, status: "ready", user_id: "other-user" },
                error: null,
              }),
            }),
          }),
        };
      }
      // notebook_members
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { role: "viewer" },
                error: null,
              }),
            }),
          }),
        }),
      };
    });

    const req = makeRequest({
      messages: [{ role: "user", content: "hi" }],
      notebookId: validUUID,
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body).toEqual({ error: "Viewers cannot send messages" });
  });

  it("returns 400 when notebook is not ready", async () => {
    mockServiceFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: validUUID, status: "processing", user_id: "user-123" },
            error: null,
          }),
        }),
      }),
    });

    const req = makeRequest({
      messages: [{ role: "user", content: "hi" }],
      notebookId: validUUID,
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({ error: "Notebook is still processing" });
  });

  it("returns 200 streaming response for owner", async () => {
    mockServiceFrom.mockImplementation((table: string) => {
      if (table === "notebooks") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: validUUID, status: "ready", user_id: "user-123" },
                error: null,
              }),
            }),
          }),
        };
      }
      // messages insert
      return {
        insert: vi.fn().mockResolvedValue({ error: null }),
      };
    });

    const req = makeRequest({
      messages: [{ role: "user", content: "Tell me about the company" }],
      notebookId: validUUID,
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
  });
});
