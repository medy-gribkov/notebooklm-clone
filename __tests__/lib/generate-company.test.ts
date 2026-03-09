import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { generateCompanyContent } from "@/lib/generate-company";

const LONG_TEXT = "A".repeat(300);

const mockSuccessResponse = {
  candidates: [
    {
      content: {
        parts: [{ text: LONG_TEXT }],
      },
    },
  ],
};

describe("generateCompanyContent", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.unstubAllEnvs();
  });

  it("returns null when GEMINI_API_KEY is missing", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    const result = await generateCompanyContent("TestCo", "test.com", "SaaS");
    expect(result).toBeNull();
  });

  it("returns content object on successful API response", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockSuccessResponse),
    });

    const result = await generateCompanyContent("TestCo", "test.com", "SaaS");
    expect(result).not.toBeNull();
    expect(result!.description).toContain("TestCo");
    expect(result!.files).toHaveLength(1);
    expect(result!.files[0].fileName).toBe("TestCo Company Profile.pdf");
    expect(result!.files[0].content).toBe(LONG_TEXT);
  });

  it("returns correct structure with all studio content", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockSuccessResponse),
    });

    const result = await generateCompanyContent("Acme", "acme.io", "DevTools");
    expect(result).not.toBeNull();
    expect(result!.quiz).toHaveLength(1);
    expect(result!.quiz[0].question).toContain("Acme");
    expect(result!.flashcards).toHaveLength(1);
    expect(result!.report).toHaveLength(1);
    expect(result!.mindmap.label).toBe("Acme");
    expect(result!.mindmap.children).toHaveLength(3);
    expect(result!.datatable.columns).toEqual(["Attribute", "Details"]);
    expect(result!.datatable.rows).toHaveLength(4);
    expect(result!.infographic).toHaveLength(1);
    expect(result!.slidedeck).toHaveLength(1);
  });

  it("returns null when API returns non-ok status", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    });

    const result = await generateCompanyContent("TestCo", "test.com", "SaaS");
    expect(result).toBeNull();
  });

  it("returns null when profile text is too short", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          candidates: [{ content: { parts: [{ text: "Short" }] } }],
        }),
    });

    const result = await generateCompanyContent("TestCo", "test.com", "SaaS");
    expect(result).toBeNull();
  });

  it("returns null when candidates are missing", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });

    const result = await generateCompanyContent("TestCo", "test.com", "SaaS");
    expect(result).toBeNull();
  });

  it("returns null on fetch error", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    const result = await generateCompanyContent("TestCo", "test.com", "SaaS");
    expect(result).toBeNull();
  });

  it("returns null on non-Error throw", async () => {
    global.fetch = vi.fn().mockRejectedValue("string error");

    const result = await generateCompanyContent("TestCo", "test.com", "SaaS");
    expect(result).toBeNull();
  });

  it("calls fetch with correct URL and headers", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockSuccessResponse),
    });
    global.fetch = mockFetch;

    await generateCompanyContent("TestCo", "test.com", "SaaS");

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain("gemini-2.0-flash");
    expect(url).toContain("generateContent");
    expect(options.method).toBe("POST");
    expect(options.headers["x-goog-api-key"]).toBe("test-key");
    expect(options.headers["Content-Type"]).toBe("application/json");

    const body = JSON.parse(options.body);
    expect(body.contents[0].parts[0].text).toContain("TestCo");
    expect(body.tools).toEqual([{ googleSearch: {} }]);
  });
});
