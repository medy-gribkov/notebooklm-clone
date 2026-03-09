import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const { mockFrom, mockRpc, mockSupabase } = vi.hoisted(() => {
  const mockFrom = vi.fn();
  const mockRpc = vi.fn();
  const mockInsert = vi.fn();
  const mockSupabase = {
    from: mockFrom,
    rpc: mockRpc,
  };
  mockFrom.mockReturnValue({
    insert: mockInsert.mockResolvedValue({ data: null, error: null }),
  });
  return { mockFrom, mockRpc, mockSupabase };
});

const { mockStreamText } = vi.hoisted(() => {
  const mockStreamText = vi.fn(() => ({
    toUIMessageStreamResponse: vi.fn((opts?: { headers?: Record<string, string> }) =>
      new NextResponse("stream", { status: 200, headers: { "Content-Type": "text/event-stream", ...opts?.headers } })
    ),
  }));

  return { mockStreamText };
});

vi.mock("@/lib/supabase/service", () => ({
  getServiceClient: vi.fn().mockReturnValue(mockSupabase),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn().mockReturnValue(true),
}));

vi.mock("@/lib/share", () => ({
  hashIP: vi.fn((ip: string) => `hashed-${ip}`),
}));

vi.mock("@/lib/validate", () => ({
  validateUserMessage: vi.fn(() => null),
  sanitizeText: vi.fn((text: string) => text),
  extractMessageContent: vi.fn((msg: { content?: string; parts?: Array<{ type: string; text?: string }> }) => {
    if (typeof msg.content === "string") return msg.content;
    if (Array.isArray(msg.parts)) {
      return msg.parts
        .filter((p: { type: string; text?: string }) => p.type === "text" && typeof p.text === "string")
        .map((p: { type: string; text?: string }) => p.text!)
        .join("");
    }
    return "";
  }),
}));

vi.mock("@/lib/llm", () => ({
  getLLM: vi.fn(() => "mock-llm-model"),
  getGeminiLLM: vi.fn(() => "mock-gemini-model"),
}));

vi.mock("@/lib/langchain/rag-chain", () => ({
  createRAGChain: vi.fn(() => ({
    invoke: vi.fn().mockResolvedValue({
      sources: [{ id: "chunk-1", content: "Test content", metadata: {} }],
      systemPrompt: "Test system prompt",
    }),
  })),
}));

vi.mock("@/lib/langchain/trim-messages", () => ({
  trimMessages: vi.fn((messages) => messages),
}));

vi.mock("ai", () => ({
  streamText: mockStreamText,
}));

import { POST } from "@/app/api/shared/[token]/chat/route";
import { checkRateLimit } from "@/lib/rate-limit";
import { validateUserMessage } from "@/lib/validate";

const mockedRateLimit = vi.mocked(checkRateLimit);
const mockedValidateMessage = vi.mocked(validateUserMessage);

describe("POST /api/shared/[token]/chat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 404 for invalid token format", async () => {
    const req = new NextRequest("http://localhost:3000/api/shared/abc/chat", {
      method: "POST",
      body: JSON.stringify({ messages: [{ role: "user", content: "Hello" }] }),
    });

    const res = await POST(req, { params: Promise.resolve({ token: "abc" }) });

    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBe("Invalid or expired share link");
  });

  it("should return 404 when token validation fails", async () => {
    mockRpc.mockResolvedValueOnce({ data: [], error: null });

    const req = new NextRequest("http://localhost:3000/api/shared/validtoken123456789012345678901234/chat", {
      method: "POST",
      body: JSON.stringify({ messages: [{ role: "user", content: "Hello" }] }),
    });

    const res = await POST(req, { params: Promise.resolve({ token: "validtoken123456789012345678901234" }) });

    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBe("Invalid or expired share link");
    expect(mockRpc).toHaveBeenCalledWith("validate_share_token", { share_token: "validtoken123456789012345678901234" });
  });

  it("should return 403 when permissions are view-only", async () => {
    mockRpc.mockResolvedValueOnce({
      data: [{ is_valid: true, notebook_id: "notebook-123", permissions: "view", owner_id: "user-123" }],
      error: null,
    });

    const req = new NextRequest("http://localhost:3000/api/shared/validtoken123456789012345678901234/chat", {
      method: "POST",
      body: JSON.stringify({ messages: [{ role: "user", content: "Hello" }] }),
    });

    const res = await POST(req, { params: Promise.resolve({ token: "validtoken123456789012345678901234" }) });

    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toBe("This shared notebook is view-only");
  });

  it("should return 400 for invalid request body", async () => {
    mockRpc.mockResolvedValueOnce({
      data: [{ is_valid: true, notebook_id: "notebook-123", permissions: "chat", owner_id: "user-123" }],
      error: null,
    });

    const req = new NextRequest("http://localhost:3000/api/shared/validtoken123456789012345678901234/chat", {
      method: "POST",
      body: "invalid json",
    });

    const res = await POST(req, { params: Promise.resolve({ token: "validtoken123456789012345678901234" }) });

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Invalid request body");
  });

  it("should return 400 when messages array is empty", async () => {
    mockRpc.mockResolvedValueOnce({
      data: [{ is_valid: true, notebook_id: "notebook-123", permissions: "chat", owner_id: "user-123" }],
      error: null,
    });

    const req = new NextRequest("http://localhost:3000/api/shared/validtoken123456789012345678901234/chat", {
      method: "POST",
      body: JSON.stringify({ messages: [] }),
    });

    const res = await POST(req, { params: Promise.resolve({ token: "validtoken123456789012345678901234" }) });

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("No messages provided");
  });

  it("should return 400 when last message is not from user", async () => {
    mockRpc.mockResolvedValueOnce({
      data: [{ is_valid: true, notebook_id: "notebook-123", permissions: "chat", owner_id: "user-123" }],
      error: null,
    });

    const req = new NextRequest("http://localhost:3000/api/shared/validtoken123456789012345678901234/chat", {
      method: "POST",
      body: JSON.stringify({ messages: [{ role: "assistant", content: "Hello" }] }),
    });

    const res = await POST(req, { params: Promise.resolve({ token: "validtoken123456789012345678901234" }) });

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Last message must be from user");
  });

  it("should return 400 when message validation fails", async () => {
    mockRpc.mockResolvedValueOnce({
      data: [{ is_valid: true, notebook_id: "notebook-123", permissions: "chat", owner_id: "user-123" }],
      error: null,
    });

    mockedValidateMessage.mockReturnValueOnce("Message too long");

    const req = new NextRequest("http://localhost:3000/api/shared/validtoken123456789012345678901234/chat", {
      method: "POST",
      body: JSON.stringify({ messages: [{ role: "user", content: "A".repeat(10000) }] }),
    });

    const res = await POST(req, { params: Promise.resolve({ token: "validtoken123456789012345678901234" }) });

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Message too long");
  });

  it("should return 429 when rate limit is exceeded", async () => {
    mockedRateLimit.mockReturnValueOnce(false);

    const req = new NextRequest("http://localhost:3000/api/shared/validtoken123456789012345678901234/chat", {
      method: "POST",
      body: JSON.stringify({ messages: [{ role: "user", content: "Hello" }] }),
    });

    const res = await POST(req, { params: Promise.resolve({ token: "validtoken123456789012345678901234" }) });

    expect(res.status).toBe(429);
    const json = await res.json();
    expect(json.error).toBe("Too many requests. Please slow down.");
    expect(res.headers.get("Retry-After")).toBe("60");
  });

  it("should return 200 streaming response for valid request", async () => {
    mockRpc.mockResolvedValueOnce({
      data: [{ is_valid: true, notebook_id: "notebook-123", permissions: "chat", owner_id: "user-123" }],
      error: null,
    });

    const req = new NextRequest("http://localhost:3000/api/shared/validtoken123456789012345678901234/chat", {
      method: "POST",
      body: JSON.stringify({ messages: [{ role: "user", content: "What is this company about?" }] }),
    });

    const res = await POST(req, { params: Promise.resolve({ token: "validtoken123456789012345678901234" }) });

    expect(res.status).toBe(200);
    expect(mockStreamText).toHaveBeenCalled();
    expect(mockFrom).toHaveBeenCalledWith("messages");
  });
});
