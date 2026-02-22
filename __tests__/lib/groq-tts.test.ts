import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const originalFetch = globalThis.fetch;

describe("generateSpeech", () => {
  beforeEach(() => {
    vi.stubEnv("GROQ_API_KEY", "test-key");
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.unstubAllEnvs();
  });

  it("throws when GROQ_API_KEY is missing", async () => {
    vi.stubEnv("GROQ_API_KEY", "");
    // Re-import to pick up env change
    const { generateSpeech } = await import("@/lib/groq-tts");
    await expect(generateSpeech("hello")).rejects.toThrow("GROQ_API_KEY not configured");
  });

  it("returns ArrayBuffer on success", async () => {
    const audioData = new ArrayBuffer(100);
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(audioData),
    });

    const { generateSpeech } = await import("@/lib/groq-tts");
    const result = await generateSpeech("hello");
    expect(result).toBe(audioData);
  });

  it("sends correct request body", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(10)),
    });
    globalThis.fetch = mockFetch;

    const { generateSpeech } = await import("@/lib/groq-tts");
    await generateSpeech("test text", "TestVoice");

    const call = mockFetch.mock.calls[0];
    const body = JSON.parse(call[1].body);
    expect(body.model).toBe("playai-tts");
    expect(body.input).toBe("test text");
    expect(body.voice).toBe("TestVoice");
    expect(body.response_format).toBe("mp3");
  });

  it("truncates text longer than 10,000 chars", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(10)),
    });
    globalThis.fetch = mockFetch;

    const { generateSpeech } = await import("@/lib/groq-tts");
    const longText = "a".repeat(15_000);
    await generateSpeech(longText);

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.input).toHaveLength(10_000);
  });

  it("throws on non-OK response with status", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      text: () => Promise.resolve("Rate limited"),
    });

    const { generateSpeech } = await import("@/lib/groq-tts");
    await expect(generateSpeech("test")).rejects.toThrow("Groq TTS failed (429)");
  });

  it("handles text() failure in error path", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: () => Promise.reject(new Error("no body")),
    });

    const { generateSpeech } = await import("@/lib/groq-tts");
    await expect(generateSpeech("test")).rejects.toThrow("Groq TTS failed (500)");
  });
});
