import { describe, it, expect, vi, beforeEach } from "vitest";
import { Document } from "@langchain/core/documents";

const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";
const VALID_UUID_2 = "660e8400-e29b-41d4-a716-446655440000";

const mockRpc = vi.fn();
const mockSupabase = { rpc: mockRpc };

vi.mock("@/lib/langchain/embeddings", () => ({
  embedQuery: vi.fn().mockResolvedValue(Array.from({ length: 768 }, () => 0.1)),
}));

vi.mock("@/lib/supabase/service", () => ({
  getServiceClient: vi.fn(() => mockSupabase),
}));

vi.mock("@/lib/validate", () => ({
  isValidUUID: vi.fn((id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)),
}));

import { DocChatRetriever, documentsToSources } from "@/lib/langchain/retriever";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("DocChatRetriever", () => {
  describe("constructor", () => {
    it("creates instance with valid UUIDs", () => {
      const retriever = new DocChatRetriever({
        notebookId: VALID_UUID,
        userId: VALID_UUID_2,
      });
      expect(retriever).toBeInstanceOf(DocChatRetriever);
    });

    it("throws on invalid notebookId", () => {
      expect(
        () => new DocChatRetriever({ notebookId: "bad", userId: VALID_UUID }),
      ).toThrow("Invalid notebookId");
    });

    it("throws on invalid userId", () => {
      expect(
        () => new DocChatRetriever({ notebookId: VALID_UUID, userId: "bad" }),
      ).toThrow("Invalid userId");
    });
  });

  describe("_getRelevantDocuments", () => {
    it("calls match_chunks for non-shared retriever", async () => {
      mockRpc.mockResolvedValue({
        data: [
          { id: "c1", content: "chunk text", similarity: 0.9, metadata: { file_name: "doc.pdf" } },
        ],
        error: null,
      });

      const retriever = new DocChatRetriever({
        notebookId: VALID_UUID,
        userId: VALID_UUID_2,
      });

      const docs = await retriever._getRelevantDocuments("test query");

      expect(mockRpc).toHaveBeenCalledWith("match_chunks", expect.objectContaining({
        match_notebook_id: VALID_UUID,
        match_user_id: VALID_UUID_2,
        match_count: 8,
        match_threshold: 0.45,
      }));
      expect(docs).toHaveLength(1);
      expect(docs[0]).toBeInstanceOf(Document);
      expect(docs[0].pageContent).toBe("chunk text");
      expect(docs[0].metadata.chunkId).toBe("c1");
      expect(docs[0].metadata.similarity).toBe(0.9);
      expect(docs[0].metadata.fileName).toBe("doc.pdf");
    });

    it("calls match_chunks_shared for shared retriever", async () => {
      mockRpc.mockResolvedValue({
        data: [
          { id: "c2", content: "shared chunk", similarity: 0.8, metadata: {} },
        ],
        error: null,
      });

      const retriever = new DocChatRetriever({
        notebookId: VALID_UUID,
        userId: VALID_UUID_2,
        shared: true,
      });

      const docs = await retriever._getRelevantDocuments("query");

      expect(mockRpc).toHaveBeenCalledWith("match_chunks_shared", expect.objectContaining({
        match_notebook_id: VALID_UUID,
        requesting_user_id: VALID_UUID_2,
      }));
      expect(docs).toHaveLength(1);
      expect(docs[0].metadata.fileName).toBeUndefined();
    });

    it("uses custom topK and threshold", async () => {
      mockRpc.mockResolvedValue({ data: [], error: null });

      const retriever = new DocChatRetriever({
        notebookId: VALID_UUID,
        userId: VALID_UUID_2,
        topK: 5,
        threshold: 0.5,
      });

      await retriever._getRelevantDocuments("query");

      expect(mockRpc).toHaveBeenCalledWith("match_chunks", expect.objectContaining({
        match_count: 5,
        match_threshold: 0.5,
      }));
    });

    it("throws on RPC error", async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: { message: "RPC failed" },
      });

      const retriever = new DocChatRetriever({
        notebookId: VALID_UUID,
        userId: VALID_UUID_2,
      });

      await expect(retriever._getRelevantDocuments("query")).rejects.toThrow(
        "Failed to retrieve document context",
      );
    });

    it("returns empty array when data is null", async () => {
      mockRpc.mockResolvedValue({ data: null, error: null });

      const retriever = new DocChatRetriever({
        notebookId: VALID_UUID,
        userId: VALID_UUID_2,
      });

      const docs = await retriever._getRelevantDocuments("query");
      expect(docs).toEqual([]);
    });
  });
});

describe("documentsToSources", () => {
  it("converts Document array to Source array", () => {
    const docs = [
      new Document({
        pageContent: "text1",
        metadata: { chunkId: "c1", similarity: 0.9, fileName: "a.pdf" },
      }),
      new Document({
        pageContent: "text2",
        metadata: { chunkId: "c2", similarity: 0.7, fileName: undefined },
      }),
    ];

    const sources = documentsToSources(docs);
    expect(sources).toEqual([
      { chunkId: "c1", content: "text1", similarity: 0.9, fileName: "a.pdf" },
      { chunkId: "c2", content: "text2", similarity: 0.7, fileName: undefined },
    ]);
  });

  it("returns empty array for empty input", () => {
    expect(documentsToSources([])).toEqual([]);
  });
});
