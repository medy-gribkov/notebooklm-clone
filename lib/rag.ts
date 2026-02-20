import { embedQuery } from "@/lib/gemini";
import { extractText } from "@/lib/pdf";
import { isValidUUID, sanitizeText } from "@/lib/validate";
import type { Source } from "@/types";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { getServiceClient } from "@/lib/supabase/service";

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Embed with exponential backoff on 429
export async function embedText(text: string, attempt = 0): Promise<number[]> {
  try {
    return await embedQuery(text);
  } catch (error: unknown) {
    const isRateLimit =
      error instanceof Error &&
      (error.message.includes("429") || error.message.includes("quota"));

    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[embedText] Embedding failed:", {
      attempt,
      errorMessage: errorMsg,
      textLength: text.length,
      isRateLimit,
      fullError: error,
    });

    if (isRateLimit && attempt < 5) {
      const wait = Math.pow(2, attempt) * 6000; // 6s, 12s, 24s, 48s, 96s
      console.log(`[embedText] Rate limited, retrying after ${wait}ms (attempt ${attempt + 1}/5)`);
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
  if (!isValidUUID(notebookId)) throw new Error("Invalid notebookId");
  if (!isValidUUID(userId)) throw new Error("Invalid userId");

  const supabase = getServiceClient();

  try {
    console.log(`[processNotebook] Starting for notebook ${notebookId}`);
    
    const rawText = await extractText(pdfBuffer);
    console.log(`[processNotebook] Extracted ${rawText.length} chars from PDF`);
    
    const text = sanitizeText(rawText);
    console.log(`[processNotebook] Sanitized to ${text.length} chars`);

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 2000,
      chunkOverlap: 200,
    });
    const docs = await splitter.createDocuments([text]);
    const chunks = docs.map((d) => d.pageContent);

    console.log(`[processNotebook] Split into ${chunks.length} chunks`);

    if (chunks.length === 0) {
      throw new Error(
        "No content could be extracted. This may be an image-only PDF."
      );
    }

    // Embed chunks in batches to respect 10 RPM
    const BATCH_SIZE = 5;
    const INTER_BATCH_DELAY = 6500;

    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE);
      console.log(`[processNotebook] Embedding batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(chunks.length / BATCH_SIZE)}`);

      const embeddings = await Promise.all(batch.map((chunk) => embedText(chunk)));

      const rows = batch.map((content, idx) => ({
        notebook_id: notebookId,
        user_id: userId,
        content,
        embedding: JSON.stringify(embeddings[idx]),
        chunk_index: i + idx,
      }));

      const { error } = await supabase.from("chunks").insert(rows);
      if (error) {
        console.error("[processNotebook] Failed to insert chunks:", {
          batchIndex: Math.floor(i / BATCH_SIZE),
          rowCount: rows.length,
          notebookId,
          userId,
          errorMessage: error.message,
          errorDetails: error,
        });
        throw new Error(`Failed to store document chunks: ${error.message}`);
      }

      if (i + BATCH_SIZE < chunks.length) {
        await sleep(INTER_BATCH_DELAY);
      }
    }

    console.log(`[processNotebook] Updating status to ready for ${notebookId}`);
    await supabase
      .from("notebooks")
      .update({ status: "ready" })
      .eq("id", notebookId);
    
    console.log(`[processNotebook] Successfully completed for ${notebookId}`);
  } catch (error) {
    console.error("[processNotebook] Error occurred, updating status to error:", {
      notebookId,
      userId,
      errorMessage: error instanceof Error ? error.message : String(error),
      error,
    });
    
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
  if (!isValidUUID(notebookId)) throw new Error("Invalid notebookId");
  if (!isValidUUID(userId)) throw new Error("Invalid userId");

  const supabase = getServiceClient();

  const queryEmbedding = await embedText(query);

  const { data, error } = await supabase.rpc("match_chunks", {
    query_embedding: JSON.stringify(queryEmbedding),
    match_notebook_id: notebookId,
    match_user_id: userId,
    match_count: 5,
    match_threshold: 0.3,
  });

  if (error) {
    console.error("[rag] Vector search failed:", error);
    throw new Error("Failed to retrieve document context");
  }

  return (data ?? []).map(
    (row: { id: string; content: string; similarity: number }) => ({
      chunkId: row.id,
      content: row.content,
      similarity: row.similarity,
    })
  );
}
