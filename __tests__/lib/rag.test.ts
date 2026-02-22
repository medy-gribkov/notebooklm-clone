import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock dependencies
vi.mock("@/lib/llm", () => ({
  embedQuery: vi.fn(),
  getLLM: vi.fn(() => "mock-model"),
}));

vi.mock("@/lib/pdf", () => ({
  extractText: vi.fn(),
}));

vi.mock("@/lib/supabase/service", () => ({
  getServiceClient: vi.fn(),
}));

vi.mock("@langchain/textsplitters", () => {
  const MockSplitter = vi.fn();
  MockSplitter.prototype.createDocuments = vi.fn().mockResolvedValue([
    { pageContent: "chunk 1" },
    { pageContent: "chunk 2" },
  ]);
  return { RecursiveCharacterTextSplitter: MockSplitter };
});

vi.mock("ai", () => ({
  generateText: vi.fn().mockResolvedValue({
    text: '{"title": "Test", "description": "Test doc"}',
  }),
}));

import { embedText, processNotebook, getAllChunks, retrieveChunks, deduplicateSources, buildContextBlock } from "@/lib/rag";
import { embedQuery } from "@/lib/llm";
import { extractText } from "@/lib/pdf";
import { getServiceClient } from "@/lib/supabase/service";
import { generateText } from "ai";

const mockedGenerateText = vi.mocked(generateText);

const mockedEmbedQuery = vi.mocked(embedQuery);
const mockedExtractText = vi.mocked(extractText);
const mockedGetServiceClient = vi.mocked(getServiceClient);

describe("embedText", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns embedding on success", async () => {
    const embedding = Array.from({ length: 768 }, () => 0.1);
    mockedEmbedQuery.mockResolvedValue(embedding);

    const result = await embedText("test text");
    expect(result).toEqual(embedding);
  });

  it("retries on 429 error", async () => {
    const embedding = Array.from({ length: 768 }, () => 0.1);
    mockedEmbedQuery
      .mockRejectedValueOnce(new Error("Embedding API error 429: Rate limited"))
      .mockResolvedValueOnce(embedding);

    const promise = embedText("test text");
    // Advance past first retry delay (6s)
    await vi.advanceTimersByTimeAsync(6_001);

    const result = await promise;
    expect(result).toEqual(embedding);
    expect(mockedEmbedQuery).toHaveBeenCalledTimes(2);
  });

  it("throws immediately on non-429 error", async () => {
    mockedEmbedQuery.mockRejectedValue(new Error("Embedding API error 500: Server error"));

    await expect(embedText("test")).rejects.toThrow("500");
    expect(mockedEmbedQuery).toHaveBeenCalledTimes(1);
  });

  it("throws after max retries on persistent 429", async () => {
    const error = new Error("Embedding API error 429: Rate limited");
    mockedEmbedQuery.mockRejectedValue(error);

    // Start at attempt 5, which is >= 5, so it should throw immediately without retry
    await expect(embedText("test", 5)).rejects.toThrow("429");
    expect(mockedEmbedQuery).toHaveBeenCalledTimes(1);
  });
});

describe("processNotebook", () => {
  const validUUID = "550e8400-e29b-41d4-a716-446655440000";
  const validUserUUID = "660e8400-e29b-41d4-a716-446655440000";
  let mockSupabase: ReturnType<typeof createMockSupabase>;

  function createMockSupabase() {
    const deleteEq = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({}),
    });
    const insertResult = vi.fn().mockResolvedValue({ error: null });
    const updateEq = vi.fn().mockResolvedValue({});

    return {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      from: vi.fn((_table: string) => ({
        delete: vi.fn().mockReturnValue({
          eq: deleteEq,
        }),
        insert: insertResult,
        update: vi.fn().mockReturnValue({
          eq: updateEq,
        }),
      })),
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockSupabase = createMockSupabase();
    mockedGetServiceClient.mockReturnValue(mockSupabase as never);
    mockedExtractText.mockResolvedValue({ text: "Document content", pageCount: 3 });
    mockedEmbedQuery.mockResolvedValue(Array.from({ length: 768 }, () => 0.1));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("throws for invalid notebookId", async () => {
    await expect(
      processNotebook("invalid", validUserUUID, Buffer.from("pdf"))
    ).rejects.toThrow("Invalid notebookId");
  });

  it("throws for invalid userId", async () => {
    await expect(
      processNotebook(validUUID, "invalid", Buffer.from("pdf"))
    ).rejects.toThrow("Invalid userId");
  });

  it("returns ProcessResult on success", async () => {
    const result = await processNotebook(validUUID, validUserUUID, Buffer.from("pdf"));
    expect(result).toEqual({
      pageCount: 3,
      chunkCount: 2,
      sampleText: "chunk 1\n\nchunk 2",
    });
  });

  it("sets status to 'error' on failure and cleans up", async () => {
    mockedExtractText.mockRejectedValue(new Error("Parse failed"));

    await expect(
      processNotebook(validUUID, validUserUUID, Buffer.from("bad"))
    ).rejects.toThrow("Parse failed");

    // Verify chunk cleanup was called (notebook status is now handled by caller)
    expect(mockSupabase.from).toHaveBeenCalledWith("chunks");
  });
});

describe("getAllChunks", () => {
  const validUUID = "550e8400-e29b-41d4-a716-446655440000";
  const validUserUUID = "660e8400-e29b-41d4-a716-446655440000";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws for invalid UUID", async () => {
    await expect(getAllChunks("bad", validUserUUID)).rejects.toThrow(
      "Invalid notebookId"
    );
  });

  it("concatenates chunks in order and caps at 30k", async () => {
    const longChunk = "a".repeat(20_000);
    mockedGetServiceClient.mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn().mockResolvedValue({
                data: [{ content: longChunk }, { content: longChunk }],
                error: null,
              }),
            })),
          })),
        })),
      })),
    } as never);

    const result = await getAllChunks(validUUID, validUserUUID);
    expect(result.length).toBe(30_000);
  });

  it("returns empty string for no data", async () => {
    mockedGetServiceClient.mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn().mockResolvedValue({ data: null, error: null }),
            })),
          })),
        })),
      })),
    } as never);

    const result = await getAllChunks(validUUID, validUserUUID);
    expect(result).toBe("");
  });
});

describe("retrieveChunks", () => {
  const validUUID = "550e8400-e29b-41d4-a716-446655440000";
  const validUserUUID = "660e8400-e29b-41d4-a716-446655440000";

  beforeEach(() => {
    vi.clearAllMocks();
    mockedEmbedQuery.mockResolvedValue(Array.from({ length: 768 }, () => 0.1));
  });

  it("throws for invalid UUID", async () => {
    await expect(
      retrieveChunks("query", "bad", validUserUUID)
    ).rejects.toThrow("Invalid notebookId");
  });

  it("returns mapped Source array with similarity and fileName", async () => {
    mockedGetServiceClient.mockReturnValue({
      from: vi.fn(),
      rpc: vi.fn().mockResolvedValue({
        data: [
          {
            id: "chunk-1",
            content: "Some content",
            similarity: 0.85,
            metadata: { file_name: "test.pdf" },
          },
        ],
        error: null,
      }),
    } as never);

    const result = await retrieveChunks("test query", validUUID, validUserUUID);
    expect(result).toEqual([
      {
        chunkId: "chunk-1",
        content: "Some content",
        similarity: 0.85,
        fileName: "test.pdf",
      },
    ]);
  });
});

describe("retrieveChunksShared", () => {
  const validUUID = "550e8400-e29b-41d4-a716-446655440000";
  const validUserUUID = "660e8400-e29b-41d4-a716-446655440000";

  beforeEach(() => {
    vi.clearAllMocks();
    mockedEmbedQuery.mockResolvedValue(Array.from({ length: 768 }, () => 0.1));
  });

  it("throws for invalid notebookId", async () => {
    const { retrieveChunksShared } = await import("@/lib/rag");
    await expect(retrieveChunksShared("query", "bad", validUserUUID)).rejects.toThrow("Invalid notebookId");
  });

  it("throws for invalid userId", async () => {
    const { retrieveChunksShared } = await import("@/lib/rag");
    await expect(retrieveChunksShared("query", validUUID, "bad")).rejects.toThrow("Invalid userId");
  });

  it("returns mapped Source array from shared RPC", async () => {
    mockedGetServiceClient.mockReturnValue({
      from: vi.fn(),
      rpc: vi.fn().mockResolvedValue({
        data: [
          { id: "sc-1", content: "Shared content", similarity: 0.9, metadata: { file_name: "shared.pdf" } },
        ],
        error: null,
      }),
    } as never);

    const { retrieveChunksShared } = await import("@/lib/rag");
    const result = await retrieveChunksShared("test", validUUID, validUserUUID);
    expect(result).toEqual([
      { chunkId: "sc-1", content: "Shared content", similarity: 0.9, fileName: "shared.pdf" },
    ]);
  });

  it("throws on RPC error", async () => {
    mockedGetServiceClient.mockReturnValue({
      from: vi.fn(),
      rpc: vi.fn().mockResolvedValue({ data: null, error: { message: "RPC failed" } }),
    } as never);

    const { retrieveChunksShared } = await import("@/lib/rag");
    await expect(retrieveChunksShared("query", validUUID, validUserUUID)).rejects.toThrow("Failed to retrieve");
  });

  it("returns empty array when no data", async () => {
    mockedGetServiceClient.mockReturnValue({
      from: vi.fn(),
      rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    } as never);

    const { retrieveChunksShared } = await import("@/lib/rag");
    const result = await retrieveChunksShared("query", validUUID, validUserUUID);
    expect(result).toEqual([]);
  });
});

describe("generateNotebookMeta (via processNotebook)", () => {
  const validUUID = "550e8400-e29b-41d4-a716-446655440000";
  const validUserUUID = "660e8400-e29b-41d4-a716-446655440000";
  let mockUpdate: ReturnType<typeof vi.fn>;

  function createMetaMockSupabase() {
    mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({}),
    });
    const deleteEq = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({}),
    });
    const insertResult = vi.fn().mockResolvedValue({ error: null });

    return {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      from: vi.fn((_table: string) => ({
        delete: vi.fn().mockReturnValue({ eq: deleteEq }),
        insert: insertResult,
        update: mockUpdate,
      })),
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockedExtractText.mockResolvedValue({ text: "Sample doc content", pageCount: 2 });
    mockedEmbedQuery.mockResolvedValue(Array.from({ length: 768 }, () => 0.1));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("saves starterPrompts when generateText returns them", async () => {
    const mock = createMetaMockSupabase();
    mockedGetServiceClient.mockReturnValue(mock as never);
    mockedGenerateText.mockResolvedValue({
      text: '{"title":"Doc Title","description":"A description","starterPrompts":["Q1","Q2","Q3","Q4","Q5","Q6"]}',
    } as never);

    await processNotebook(validUUID, validUserUUID, Buffer.from("pdf"));
    // Wait for fire-and-forget
    await vi.advanceTimersByTimeAsync(100);

    // generateNotebookMeta calls update with title, description, starter_prompts
    const updateCalls = mockUpdate.mock.calls;
    const metaCall = updateCalls.find(
      (call: unknown[]) => {
        const arg = call[0] as Record<string, unknown>;
        return arg && arg.title === "Doc Title";
      }
    );
    expect(metaCall).toBeDefined();
    const metaArg = metaCall![0] as Record<string, unknown>;
    expect(metaArg.starter_prompts).toEqual(["Q1", "Q2", "Q3", "Q4", "Q5", "Q6"]);
  });

  it("retries and sets fallback on double failure", async () => {
    const mock = createMetaMockSupabase();
    mockedGetServiceClient.mockReturnValue(mock as never);
    mockedGenerateText.mockRejectedValue(new Error("API error"));

    await processNotebook(validUUID, validUserUUID, Buffer.from("pdf"));
    // Wait for retry delay (2s) + execution
    await vi.advanceTimersByTimeAsync(5000);

    // Should have been called twice (first attempt + retry)
    expect(mockedGenerateText).toHaveBeenCalledTimes(2);

    // Fallback description should be set
    const updateCalls = mockUpdate.mock.calls;
    const fallbackCall = updateCalls.find(
      (call: unknown[]) => {
        const arg = call[0] as Record<string, unknown>;
        return arg && typeof arg.description === "string" && !arg.title;
      }
    );
    expect(fallbackCall).toBeDefined();
  });

  it("strips markdown fences from LLM response", async () => {
    const mock = createMetaMockSupabase();
    mockedGetServiceClient.mockReturnValue(mock as never);
    mockedGenerateText.mockResolvedValue({
      text: '```json\n{"title":"Fenced Title","description":"Fenced desc"}\n```',
    } as never);

    await processNotebook(validUUID, validUserUUID, Buffer.from("pdf"));
    await vi.advanceTimersByTimeAsync(100);

    const updateCalls = mockUpdate.mock.calls;
    const metaCall = updateCalls.find(
      (call: unknown[]) => {
        const arg = call[0] as Record<string, unknown>;
        return arg && arg.title === "Fenced Title";
      }
    );
    expect(metaCall).toBeDefined();
  });

  it("returns null when response has no title", async () => {
    const mock = createMetaMockSupabase();
    mockedGetServiceClient.mockReturnValue(mock as never);
    // First call returns valid JSON but no title, second call also no title
    mockedGenerateText
      .mockResolvedValueOnce({ text: '{"description":"no title here"}' } as never)
      .mockResolvedValueOnce({ text: '{"description":"still no title"}' } as never);

    await processNotebook(validUUID, validUserUUID, Buffer.from("pdf"));
    await vi.advanceTimersByTimeAsync(5000);

    // Should have tried twice
    expect(mockedGenerateText).toHaveBeenCalledTimes(2);

    // Should have set fallback description (no title field)
    const updateCalls = mockUpdate.mock.calls;
    const fallbackCall = updateCalls.find(
      (call: unknown[]) => {
        const arg = call[0] as Record<string, unknown>;
        return arg && typeof arg.description === "string" && !arg.title;
      }
    );
    expect(fallbackCall).toBeDefined();
  });

  it("retries with shorter text on first parse failure", async () => {
    const mock = createMetaMockSupabase();
    mockedGetServiceClient.mockReturnValue(mock as never);
    mockedGenerateText
      .mockResolvedValueOnce({ text: "not json at all" } as never)
      .mockResolvedValueOnce({
        text: '{"title":"Retry Title","description":"Retry desc"}',
      } as never);

    await processNotebook(validUUID, validUserUUID, Buffer.from("pdf"));
    await vi.advanceTimersByTimeAsync(5000);

    expect(mockedGenerateText).toHaveBeenCalledTimes(2);

    const updateCalls = mockUpdate.mock.calls;
    const metaCall = updateCalls.find(
      (call: unknown[]) => {
        const arg = call[0] as Record<string, unknown>;
        return arg && arg.title === "Retry Title";
      }
    );
    expect(metaCall).toBeDefined();
  });
});

describe("deduplicateSources", () => {
  it("returns empty array for empty input", () => {
    expect(deduplicateSources([])).toEqual([]);
  });

  it("keeps unique sources", () => {
    const sources = [
      { chunkId: "1", content: "Alpha beta gamma delta", similarity: 0.9, fileName: "a.pdf" },
      { chunkId: "2", content: "Completely different text here", similarity: 0.8, fileName: "b.pdf" },
    ];
    expect(deduplicateSources(sources)).toHaveLength(2);
  });

  it("removes near-duplicate sources (>90% word overlap)", () => {
    const sources = [
      { chunkId: "1", content: "The quick brown fox jumps over the lazy dog", similarity: 0.9, fileName: "a.pdf" },
      { chunkId: "2", content: "The quick brown fox jumps over the lazy dog", similarity: 0.85, fileName: "a.pdf" },
      { chunkId: "3", content: "The quick brown fox jumps over the lazy cat", similarity: 0.8, fileName: "a.pdf" },
    ];
    const result = deduplicateSources(sources);
    // Exact duplicate removed, near-duplicate (dog vs cat) also >90% overlap
    expect(result.length).toBeLessThan(3);
    expect(result[0].chunkId).toBe("1");
  });

  it("keeps sources with different content from same file", () => {
    const sources = [
      { chunkId: "1", content: "Introduction to machine learning algorithms and neural networks", similarity: 0.9, fileName: "paper.pdf" },
      { chunkId: "2", content: "Results show significant improvement in accuracy over baseline methods", similarity: 0.85, fileName: "paper.pdf" },
    ];
    expect(deduplicateSources(sources)).toHaveLength(2);
  });
});

describe("buildContextBlock", () => {
  it("returns empty string for empty sources", () => {
    expect(buildContextBlock([])).toBe("");
  });

  it("groups sources by fileName", () => {
    const sources = [
      { chunkId: "1", content: "Content A", similarity: 0.9, fileName: "resume.pdf" },
      { chunkId: "2", content: "Content B", similarity: 0.8, fileName: "cover.docx" },
      { chunkId: "3", content: "Content C", similarity: 0.7, fileName: "resume.pdf" },
    ];
    const result = buildContextBlock(sources);
    expect(result).toContain("## File: resume.pdf");
    expect(result).toContain("## File: cover.docx");
    // resume.pdf should have both Source 1 and Source 3
    expect(result).toContain("[Source 1]");
    expect(result).toContain("[Source 3]");
    // cover.docx should have Source 2
    expect(result).toContain("[Source 2]");
  });

  it("uses 'document' as fallback when fileName is undefined", () => {
    const sources = [
      { chunkId: "1", content: "Some text", similarity: 0.9 },
    ];
    const result = buildContextBlock(sources);
    expect(result).toContain("## File: document");
  });

  it("separates file groups with ---", () => {
    const sources = [
      { chunkId: "1", content: "A", similarity: 0.9, fileName: "a.pdf" },
      { chunkId: "2", content: "B", similarity: 0.8, fileName: "b.pdf" },
    ];
    const result = buildContextBlock(sources);
    expect(result).toContain("---");
  });
});
