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
    expect(result.systemPrompt).toContain("No company data has been loaded yet");
    expect(result.systemPrompt).not.toContain("===BEGIN DOCUMENT===");
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
