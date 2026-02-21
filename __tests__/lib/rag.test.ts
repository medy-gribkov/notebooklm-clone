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

import { embedText, processNotebook, getAllChunks, retrieveChunks } from "@/lib/rag";
import { embedQuery } from "@/lib/llm";
import { extractText } from "@/lib/pdf";
import { getServiceClient } from "@/lib/supabase/service";

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

    // Verify cleanup was called (chunks deleted, status set to error)
    expect(mockSupabase.from).toHaveBeenCalledWith("chunks");
    expect(mockSupabase.from).toHaveBeenCalledWith("notebooks");
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
