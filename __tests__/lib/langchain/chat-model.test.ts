import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@langchain/google-genai", () => {
  const MockChat = vi.fn(function (this: Record<string, unknown>, opts: Record<string, unknown>) {
    this._type = "mock-chat-model";
    this.apiKey = opts.apiKey;
    this.model = opts.model;
    this.temperature = opts.temperature;
  });
  return { ChatGoogleGenerativeAI: MockChat };
});

beforeEach(() => {
  vi.resetModules();
  vi.unstubAllEnvs();
});

describe("getChatModel", () => {
  it("returns a ChatGoogleGenerativeAI instance", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    const { getChatModel } = await import("@/lib/langchain/chat-model");
    const model = getChatModel();
    expect(model).toBeDefined();
    expect((model as unknown as Record<string, unknown>)._type).toBe("mock-chat-model");
  });

  it("passes correct config", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    const { getChatModel } = await import("@/lib/langchain/chat-model");
    const model = getChatModel() as unknown as Record<string, unknown>;
    expect(model.model).toBe("gemini-2.0-flash");
    expect(model.temperature).toBe(0.7);
  });

  it("returns cached singleton on second call", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    const { getChatModel } = await import("@/lib/langchain/chat-model");
    const a = getChatModel();
    const b = getChatModel();
    expect(a).toBe(b);
  });

  it("throws without GEMINI_API_KEY", async () => {
    delete process.env.GEMINI_API_KEY;
    const { getChatModel } = await import("@/lib/langchain/chat-model");
    expect(() => getChatModel()).toThrow("GEMINI_API_KEY is required");
  });
});
