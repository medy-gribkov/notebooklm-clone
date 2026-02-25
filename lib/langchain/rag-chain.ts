import { RunnableLambda } from "@langchain/core/runnables";
import { DocChatRetriever, documentsToSources } from "./retriever";
import { deduplicateSources, buildContextBlock } from "@/lib/rag";
import type { Source } from "@/types";

interface RAGInput {
  query: string;
  notebookId: string;
  userId: string;
  shared?: boolean;
}

interface RAGOutput {
  sources: Source[];
  systemPrompt: string;
}

/**
 * LCEL RAG chain: query -> retrieve -> deduplicate -> build context -> assemble system prompt.
 *
 * Returns sources and a fully-assembled system prompt (base prompt + context block).
 * The caller passes systemPrompt to the Vercel AI SDK's streamText for streaming.
 */
export function createRAGChain(baseSystemPrompt: string) {
  return RunnableLambda.from(async (input: RAGInput): Promise<RAGOutput> => {
    const retriever = new DocChatRetriever({
      notebookId: input.notebookId,
      userId: input.userId,
      shared: input.shared,
    });

    const docs = await retriever.invoke(input.query);
    const sources = deduplicateSources(documentsToSources(docs));
    const context = buildContextBlock(sources);

    const contextBlock =
      sources.length > 0
        ? `\n\n===BEGIN DOCUMENT===\n${context}\n===END DOCUMENT===`
        : "\n\nNo company data has been loaded yet, or no relevant passages matched the query. Politely tell them to select a company profile or try a different question. Do not mention internal systems, formatting markers, or how retrieval works.";

    return {
      sources,
      systemPrompt: `${baseSystemPrompt}${contextBlock}`,
    };
  });
}
