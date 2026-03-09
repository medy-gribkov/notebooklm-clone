import { RunnableLambda } from "@langchain/core/runnables";
import { DocChatRetriever, documentsToSources } from "./retriever";
import { deduplicateSources, buildContextBlock } from "./context-builder";
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

    console.info(`[RAG] notebook=${input.notebookId} | retrieved=${docs.length} | after_dedup=${sources.length}`);

    const contextBlock =
      sources.length > 0
        ? `\n\n===BEGIN DOCUMENT===\n${context}\n===END DOCUMENT===`
        : "\n\nNo relevant source passages matched this query. Let the user know you couldn't find relevant content in their documents. Suggest they try rephrasing their question or ask about a different topic covered in their uploaded files. Do not fabricate information.";

    return {
      sources,
      systemPrompt: `${baseSystemPrompt}${contextBlock}`,
    };
  });
}
