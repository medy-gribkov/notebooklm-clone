import { embeddingModel } from "@/lib/gemini";
import { extractText } from "@/lib/pdf";
import { splitText } from "@/lib/splitter";
import type { Source } from "@/types";
import { createClient } from "@supabase/supabase-js";

// Service-role client for server-only operations (no cookie context)
function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Embed with exponential backoff on 429
export async function embedText(text: string, attempt = 0): Promise<number[]> {
  try {
    const result = await embeddingModel.embedContent(text);
    return result.embedding.values;
  } catch (error: unknown) {
    const isRateLimit =
      error instanceof Error &&
      (error.message.includes("429") || error.message.includes("quota"));

    if (isRateLimit && attempt < 5) {
      const wait = Math.pow(2, attempt) * 6000; // 6s, 12s, 24s, 48s, 96s
      await sleep(wait);
      return embedText(text, attempt + 1);
    }
    throw error;
  }
}

export async function processNotebook(
  notebookId: string,
  userId: string,
  pdfBuffer: Buffer
): Promise<void> {
  const supabase = getServiceClient();

  try {
    const text = await extractText(pdfBuffer);
    const chunks = splitText(text);

    // Embed chunks sequentially with small delay to respect 10 RPM
    const BATCH_SIZE = 5;
    const INTER_BATCH_DELAY = 6500; // ~10 RPM = 1 req/6s, batch of 5 = 30s per batch

    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE);

      const embeddings = await Promise.all(batch.map((chunk) => embedText(chunk)));

      const rows = batch.map((content, idx) => ({
        notebook_id: notebookId,
        user_id: userId,
        content,
        embedding: JSON.stringify(embeddings[idx]),
        chunk_index: i + idx,
      }));

      const { error } = await supabase.from("chunks").insert(rows);
      if (error) throw new Error(`Failed to insert chunks: ${error.message}`);

      // Delay between batches (skip after last batch)
      if (i + BATCH_SIZE < chunks.length) {
        await sleep(INTER_BATCH_DELAY);
      }
    }

    await supabase
      .from("notebooks")
      .update({ status: "ready" })
      .eq("id", notebookId);
  } catch (error) {
    await supabase
      .from("notebooks")
      .update({ status: "error" })
      .eq("id", notebookId);
    throw error;
  }
}

export async function retrieveChunks(
  query: string,
  notebookId: string,
  userId: string
): Promise<Source[]> {
  const supabase = getServiceClient();

  const queryEmbedding = await embedText(query);

  const { data, error } = await supabase.rpc("match_chunks", {
    query_embedding: JSON.stringify(queryEmbedding),
    match_notebook_id: notebookId,
    match_user_id: userId,
    match_count: 5,
  });

  if (error) throw new Error(`Vector search failed: ${error.message}`);

  return (data ?? []).map(
    (row: { id: string; content: string; similarity: number }) => ({
      chunkId: row.id,
      content: row.content,
      similarity: row.similarity,
    })
  );
}
