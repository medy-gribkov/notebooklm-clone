import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the AI SDK modules
vi.mock("@ai-sdk/groq", () => ({
  createGroq: vi.fn(() => vi.fn(() => "groq-model")),
}));

vi.mock("@ai-sdk/google", () => ({
  createGoogleGenerativeAI: vi.fn(() => vi.fn(() => "google-model")),
}));

describe("getLLM", () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.GROQ_API_KEY;
    delete process.env.GEMINI_API_KEY;
  });

  it("returns Groq model when GROQ_API_KEY is set", async () => {
    process.env.GROQ_API_KEY = "groq-key";
    process.env.GEMINI_API_KEY = "gemini-key";
    const { getLLM } = await import("@/lib/llm");
    const model = getLLM();
    expect(model).toBe("groq-model");
  });

  it("returns Google model when only GEMINI_API_KEY is set", async () => {
    process.env.GEMINI_API_KEY = "gemini-key";
    const { getLLM } = await import("@/lib/llm");
    const model = getLLM();
    expect(model).toBe("google-model");
  });

  it("throws when neither key is set", async () => {
    const { getLLM } = await import("@/lib/llm");
    expect(() => getLLM()).toThrow("GROQ_API_KEY or GEMINI_API_KEY is required");
  });
});

// embedQuery tests moved to __tests__/lib/langchain/embeddings.test.ts
// since embeddings are now handled by @langchain/google-genai via lib/langchain/embeddings.ts
