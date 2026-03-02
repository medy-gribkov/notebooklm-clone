import { BaseRetriever, type BaseRetrieverInput } from "@langchain/core/retrievers";
import { Document } from "@langchain/core/documents";
import { embedQuery } from "./embeddings";
import { getServiceClient } from "@/lib/supabase/service";
import { isValidUUID } from "@/lib/validate";
import type { Source } from "@/types";

interface DocChatRetrieverInput extends BaseRetrieverInput {
  notebookId: string;
  userId: string;
  topK?: number;
  threshold?: number;
  shared?: boolean;
}

/**
 * Custom LangChain retriever for DocChat.
 * Wraps Supabase pgvector RPC (match_chunks / match_chunks_shared) in a
 * standard BaseRetriever interface so it can be composed with LCEL chains.
 */
export class DocChatRetriever extends BaseRetriever {
  lc_namespace = ["docchat", "retrievers"];

  private notebookId: string;
  private userId: string;
  private topK: number;
  private threshold: number;
  private shared: boolean;

  constructor(fields: DocChatRetrieverInput) {
    super(fields);
    if (!isValidUUID(fields.notebookId)) throw new Error("Invalid notebookId");
    if (!isValidUUID(fields.userId)) throw new Error("Invalid userId");
    this.notebookId = fields.notebookId;
    this.userId = fields.userId;
    this.topK = fields.topK ?? (process.env.RAG_TOP_K ? parseInt(process.env.RAG_TOP_K, 10) : 8);
    this.threshold = fields.threshold ?? (process.env.RAG_THRESHOLD ? parseFloat(process.env.RAG_THRESHOLD) : 0.30);
    this.shared = fields.shared ?? false;
  }

  async _getRelevantDocuments(query: string): Promise<Document[]> {
    const queryEmbedding = await embedQuery(query);
    const supabase = getServiceClient();

    const rpcName = this.shared ? "match_chunks_shared" : "match_chunks";
    const params = this.shared
      ? {
          query_embedding: JSON.stringify(queryEmbedding),
          match_notebook_id: this.notebookId,
          requesting_user_id: this.userId,
          match_count: this.topK,
          match_threshold: this.threshold,
        }
      : {
          query_embedding: JSON.stringify(queryEmbedding),
          match_notebook_id: this.notebookId,
          match_user_id: this.userId,
          match_count: this.topK,
          match_threshold: this.threshold,
        };

    const { data, error } = await supabase.rpc(rpcName, params);
    if (error) {
      console.error(`[DocChatRetriever] ${rpcName} failed:`, error);
      throw new Error("Failed to retrieve document context");
    }

    const rows = data ?? [];
    if (rows.length === 0) {
      console.warn(
        `[DocChatRetriever] 0 chunks returned | notebook=${this.notebookId} | rpc=${rpcName} | threshold=${this.threshold} | query="${query.slice(0, 80)}"`
      );
    } else {
      const sims = rows.map((r: { similarity: number }) => r.similarity);
      console.info(
        `[DocChatRetriever] ${rows.length} chunks | notebook=${this.notebookId} | sim=[${Math.min(...sims).toFixed(3)}..${Math.max(...sims).toFixed(3)}]`
      );
    }

    return rows.map(
      (row: { id: string; content: string; similarity: number; metadata?: { file_name?: string } }) =>
        new Document({
          pageContent: row.content,
          metadata: {
            chunkId: row.id,
            similarity: row.similarity,
            fileName: row.metadata?.file_name,
          },
        }),
    );
  }
}

/** Convert LangChain Documents back to our Source interface. */
export function documentsToSources(docs: Document[]): Source[] {
  return docs.map((doc) => ({
    chunkId: doc.metadata.chunkId as string,
    content: doc.pageContent,
    similarity: doc.metadata.similarity as number,
    fileName: doc.metadata.fileName as string | undefined,
  }));
}
