import { describe, it, expect, vi, beforeEach } from "vitest";
import { Document } from "@langchain/core/documents";

const mockInvoke = vi.fn();

vi.mock("@/lib/langchain/retriever", () => {
  const MockRetriever = vi.fn(function (this: Record<string, unknown>) {
    this.invoke = mockInvoke;
  });
  return {
    DocChatRetriever: MockRetriever,
    documentsToSources: vi.fn((docs: Document[]) =>
      docs.map((d) => ({
        chunkId: d.metadata.chunkId,
        content: d.pageContent,
        similarity: d.metadata.similarity,
        fileName: d.metadata.fileName,
      })),
    ),
  };
});

vi.mock("@/lib/rag", () => ({
  deduplicateSources: vi.fn((sources: unknown[]) => sources),
  buildContextBlock: vi.fn(() => "Context block here"),
}));

vi.mock("@/lib/supabase/service", () => ({
  getServiceClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ count: 10, error: null }),
      })),
    })),
  })),
}));

// Mock embeddings (required by retriever's transitive import)
vi.mock("@/lib/langchain/embeddings", () => ({
  embedQuery: vi.fn(),
}));

import { createRAGChain } from "@/lib/langchain/rag-chain";
import { DocChatRetriever } from "@/lib/langchain/retriever";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createRAGChain", () => {
  const BASE_PROMPT = "You are a helpful assistant.";

  it("returns a runnable", () => {
    const chain = createRAGChain(BASE_PROMPT);
    expect(chain).toBeDefined();
    expect(typeof chain.invoke).toBe("function");
  });

  it("includes document context when sources are found", async () => {
    mockInvoke.mockResolvedValue([
      new Document({
        pageContent: "chunk text",
        metadata: { chunkId: "c1", similarity: 0.9, fileName: "doc.pdf" },
      }),
    ]);

    const chain = createRAGChain(BASE_PROMPT);
    const result = await chain.invoke({
      query: "test query",
      notebookId: "550e8400-e29b-41d4-a716-446655440000",
      userId: "660e8400-e29b-41d4-a716-446655440000",
    });

    expect(result.sources).toHaveLength(1);
    expect(result.sources[0].content).toBe("chunk text");
    expect(result.systemPrompt).toContain(BASE_PROMPT);
    expect(result.systemPrompt).toContain("===BEGIN DOCUMENT===");
    expect(result.systemPrompt).toContain("Context block here");
    expect(result.systemPrompt).toContain("===END DOCUMENT===");
  });

  it("includes fallback message when no sources found", async () => {
    mockInvoke.mockResolvedValue([]);

    const chain = createRAGChain(BASE_PROMPT);
    const result = await chain.invoke({
      query: "test query",
      notebookId: "550e8400-e29b-41d4-a716-446655440000",
      userId: "660e8400-e29b-41d4-a716-446655440000",
    });

    expect(result.sources).toEqual([]);
    expect(result.systemPrompt).toContain(BASE_PROMPT);
    expect(result.systemPrompt).toContain("No relevant source passages matched this query");
    expect(result.systemPrompt).not.toContain("===BEGIN DOCUMENT===");
  });

  it("returns early with no-content prompt when chunk count is 0", async () => {
    // Override the service client mock for this test to return 0 chunks
    const { getServiceClient } = await import("@/lib/supabase/service");
    vi.mocked(getServiceClient).mockReturnValueOnce({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ count: 0, error: null }),
        })),
      })),
    } as never);

    const chain = createRAGChain(BASE_PROMPT);
    const result = await chain.invoke({
      query: "test query",
      notebookId: "550e8400-e29b-41d4-a716-446655440000",
      userId: "660e8400-e29b-41d4-a716-446655440000",
    });

    expect(result.sources).toEqual([]);
    expect(result.systemPrompt).toContain("no processed document content yet");
    // Should NOT have called the retriever since we short-circuited
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it("logs error but continues when chunk count query fails", async () => {
    const { getServiceClient } = await import("@/lib/supabase/service");
    vi.mocked(getServiceClient).mockReturnValueOnce({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ count: null, error: { message: "DB down" } }),
        })),
      })),
    } as never);

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const chain = createRAGChain(BASE_PROMPT);
    const result = await chain.invoke({
      query: "test query",
      notebookId: "550e8400-e29b-41d4-a716-446655440000",
      userId: "660e8400-e29b-41d4-a716-446655440000",
    });

    // count is null, so totalChunks defaults to 0 -> early return
    expect(consoleSpy).toHaveBeenCalledWith("[RAG] Failed to count chunks:", "DB down");
    expect(result.sources).toEqual([]);
    expect(result.systemPrompt).toContain("no processed document content yet");
    consoleSpy.mockRestore();
  });

  it("passes shared flag to retriever", async () => {
    mockInvoke.mockResolvedValue([]);

    const chain = createRAGChain(BASE_PROMPT);
    await chain.invoke({
      query: "test",
      notebookId: "550e8400-e29b-41d4-a716-446655440000",
      userId: "660e8400-e29b-41d4-a716-446655440000",
      shared: true,
    });

    expect(DocChatRetriever).toHaveBeenCalledWith(
      expect.objectContaining({ shared: true }),
    );
  });
});
