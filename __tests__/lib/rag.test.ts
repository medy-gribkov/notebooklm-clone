import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock dependencies
vi.mock("@/lib/langchain/embeddings", () => ({
  embedQuery: vi.fn(),
  embedDocuments: vi.fn(),
  getEmbeddings: vi.fn(),
}));

vi.mock("@/lib/langchain/chat-model", () => ({
  getChatModel: vi.fn(),
}));

vi.mock("@/lib/pdf", () => ({
  extractText: vi.fn(),
}));

vi.mock("@/lib/extractors/txt", () => ({
  extractTextFromTxt: vi.fn().mockReturnValue("Plain text content"),
}));

vi.mock("@/lib/extractors/docx", () => ({
  extractTextFromDocx: vi.fn().mockResolvedValue("Docx content here"),
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

vi.mock("@langchain/core/messages", () => {
  class MockHumanMessage {
    content: string;
    constructor(content: string) { this.content = content; }
  }
  class MockSystemMessage {
    content: string;
    constructor(content: string) { this.content = content; }
  }
  return { HumanMessage: MockHumanMessage, SystemMessage: MockSystemMessage };
});

import { embedText, processNotebook, getAllChunks, retrieveChunks, deduplicateSources, buildContextBlock } from "@/lib/rag";
import { embedQuery } from "@/lib/langchain/embeddings";
import { getChatModel } from "@/lib/langchain/chat-model";
import { extractText } from "@/lib/pdf";
import { getServiceClient } from "@/lib/supabase/service";

const mockedGetChatModel = vi.mocked(getChatModel);

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

  it("processes txt fileType", async () => {
    const result = await processNotebook(validUUID, validUserUUID, Buffer.from("text"), undefined, undefined, "txt");
    expect(result.pageCount).toBe(1);
    expect(result.chunkCount).toBe(2);
  });

  it("processes docx fileType", async () => {
    const result = await processNotebook(validUUID, validUserUUID, Buffer.from("docx"), undefined, undefined, "docx");
    expect(result.pageCount).toBe(1);
    expect(result.chunkCount).toBe(2);
  });

  it("throws when no chunks are extracted", async () => {
    // Override splitter to return empty array
    const { RecursiveCharacterTextSplitter } = await import("@langchain/textsplitters");
    const originalCreateDocs = RecursiveCharacterTextSplitter.prototype.createDocuments;
    (RecursiveCharacterTextSplitter as unknown as { prototype: { createDocuments: ReturnType<typeof vi.fn> } }).prototype.createDocuments = vi.fn().mockResolvedValue([]);

    await expect(
      processNotebook(validUUID, validUserUUID, Buffer.from("pdf"))
    ).rejects.toThrow("No content could be extracted");

    // Restore
    (RecursiveCharacterTextSplitter as unknown as { prototype: { createDocuments: typeof originalCreateDocs } }).prototype.createDocuments = originalCreateDocs;
  });

  it("cleans up with fileId-specific delete on error", async () => {
    mockedExtractText.mockRejectedValue(new Error("Parse failed"));
    const fileId = "770e8400-e29b-41d4-a716-446655440000";

    await expect(
      processNotebook(validUUID, validUserUUID, Buffer.from("bad"), fileId, "test.pdf")
    ).rejects.toThrow("Parse failed");

    // Verify chunk cleanup was called with fileId path
    expect(mockSupabase.from).toHaveBeenCalledWith("chunks");
  });

  it("deletes existing chunks for specific fileId before re-embedding", async () => {
    const fileId = "770e8400-e29b-41d4-a716-446655440000";
    const result = await processNotebook(validUUID, validUserUUID, Buffer.from("pdf"), fileId, "test.pdf");
    expect(result.chunkCount).toBe(2);
    // from("chunks") should have been called for delete
    expect(mockSupabase.from).toHaveBeenCalledWith("chunks");
  });

  it("applies inter-batch delay when chunks exceed batch size", async () => {
    // Override splitter to return 6 chunks (BATCH_SIZE=5, so 2 batches)
    const { RecursiveCharacterTextSplitter } = await import("@langchain/textsplitters");
    const originalCreateDocs = RecursiveCharacterTextSplitter.prototype.createDocuments;
    (RecursiveCharacterTextSplitter as unknown as { prototype: { createDocuments: ReturnType<typeof vi.fn> } }).prototype.createDocuments = vi.fn().mockResolvedValue([
      { pageContent: "c1" },
      { pageContent: "c2" },
      { pageContent: "c3" },
      { pageContent: "c4" },
      { pageContent: "c5" },
      { pageContent: "c6" },
    ]);

    // Don't await directly — sleep uses fake timers
    const promise = processNotebook(validUUID, validUserUUID, Buffer.from("pdf"));
    // Advance past the inter-batch delay (6500ms)
    await vi.advanceTimersByTimeAsync(7000);
    const result = await promise;

    expect(result.chunkCount).toBe(6);
    expect(mockedEmbedQuery).toHaveBeenCalledTimes(6);

    // Restore for subsequent tests
    (RecursiveCharacterTextSplitter as unknown as { prototype: { createDocuments: typeof originalCreateDocs } }).prototype.createDocuments = originalCreateDocs;
  });

  it("throws on chunk insert error", async () => {
    const errorSupabase = {
      from: vi.fn().mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({}),
          }),
        }),
        insert: vi.fn().mockResolvedValue({ error: { message: "DB insert failed" } }),
        update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({}) }),
      }),
    };
    mockedGetServiceClient.mockReturnValue(errorSupabase as never);

    await expect(
      processNotebook(validUUID, validUserUUID, Buffer.from("pdf"))
    ).rejects.toThrow("Failed to store document chunks");
  });
});

describe("getAllChunks", () => {
  const validUUID = "550e8400-e29b-41d4-a716-446655440000";
  const validUserUUID = "660e8400-e29b-41d4-a716-446655440000";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws for invalid notebookId", async () => {
    await expect(getAllChunks("bad", validUserUUID)).rejects.toThrow(
      "Invalid notebookId"
    );
  });

  it("throws for invalid userId", async () => {
    await expect(getAllChunks(validUUID, "bad")).rejects.toThrow(
      "Invalid userId"
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
    expect(result.length).toBe(30_000); // capped at 30k characters
  });

  it("throws on RPC error", async () => {
    mockedGetServiceClient.mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn().mockResolvedValue({
                data: null,
                error: { message: "DB error" },
              }),
            })),
          })),
        })),
      })),
    } as never);

    await expect(getAllChunks(validUUID, validUserUUID)).rejects.toThrow("Failed to load document");
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
  let mockInvoke: ReturnType<typeof vi.fn>;

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
    mockInvoke = vi.fn().mockResolvedValue({
      content: '{"title": "Test", "description": "Test doc"}',
    });
    mockedGetChatModel.mockReturnValue({ invoke: mockInvoke } as never);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("saves starterPrompts when chat model returns them", async () => {
    const mock = createMetaMockSupabase();
    mockedGetServiceClient.mockReturnValue(mock as never);
    mockInvoke.mockResolvedValue({
      content: '{"title":"Doc Title","description":"A description","starterPrompts":["Q1","Q2","Q3","Q4","Q5","Q6"]}',
    });

    await processNotebook(validUUID, validUserUUID, Buffer.from("pdf"));
    await vi.advanceTimersByTimeAsync(100);

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
    mockInvoke.mockRejectedValue(new Error("API error"));

    await processNotebook(validUUID, validUserUUID, Buffer.from("pdf"));
    await vi.advanceTimersByTimeAsync(5000);

    expect(mockInvoke).toHaveBeenCalledTimes(2);

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
    mockInvoke.mockResolvedValue({
      content: '```json\n{"title":"Fenced Title","description":"Fenced desc"}\n```',
    });

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
    mockInvoke
      .mockResolvedValueOnce({ content: '{"description":"no title here"}' })
      .mockResolvedValueOnce({ content: '{"description":"still no title"}' });

    await processNotebook(validUUID, validUserUUID, Buffer.from("pdf"));
    await vi.advanceTimersByTimeAsync(5000);

    expect(mockInvoke).toHaveBeenCalledTimes(2);

    const updateCalls = mockUpdate.mock.calls;
    const fallbackCall = updateCalls.find(
      (call: unknown[]) => {
        const arg = call[0] as Record<string, unknown>;
        return arg && typeof arg.description === "string" && !arg.title;
      }
    );
    expect(fallbackCall).toBeDefined();
  });

  it("silently catches when generateNotebookMeta throws on both attempts", async () => {
    // First update().eq() call is the status update in processNotebook (must succeed).
    // Subsequent calls are inside generateNotebookMeta (must reject to trigger outer catch).
    let notebookUpdateCount = 0;
    const metaMock = {
      from: vi.fn((table: string) => {
        if (table === "notebooks") {
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockImplementation(() => {
                notebookUpdateCount++;
                if (notebookUpdateCount <= 1) return Promise.resolve({});
                return Promise.reject(new Error("DB connection lost"));
              }),
            }),
          };
        }
        return {
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({}) }),
          }),
          insert: vi.fn().mockResolvedValue({ error: null }),
        };
      }),
    };
    mockedGetServiceClient.mockReturnValue(metaMock as never);
    // Return no title so generateNotebookMeta hits fallback update (which throws)
    mockInvoke.mockResolvedValue({ content: "{}" });

    const result = await processNotebook(validUUID, validUserUUID, Buffer.from("pdf"));
    // Advance past: sleep(2000) internal retry + sleep(5000) outer retry + sleep(2000) internal retry
    await vi.advanceTimersByTimeAsync(12000);

    expect(result.chunkCount).toBe(2);
    // invoke called 4 times: 2 attempts x 2 internal retries each
    expect(mockInvoke).toHaveBeenCalledTimes(4);
  });

  it("retries with shorter text on first parse failure", async () => {
    const mock = createMetaMockSupabase();
    mockedGetServiceClient.mockReturnValue(mock as never);
    mockInvoke
      .mockResolvedValueOnce({ content: "not json at all" })
      .mockResolvedValueOnce({
        content: '{"title":"Retry Title","description":"Retry desc"}',
      });

    await processNotebook(validUUID, validUserUUID, Buffer.from("pdf"));
    await vi.advanceTimersByTimeAsync(5000);

    expect(mockInvoke).toHaveBeenCalledTimes(2);

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
