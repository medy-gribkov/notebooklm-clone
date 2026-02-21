import { embedQuery, getLLM } from "@/lib/llm";
import { extractText, type PdfResult } from "@/lib/pdf";
import { extractTextFromTxt } from "@/lib/extractors/txt";
import { extractTextFromDocx } from "@/lib/extractors/docx";
import { extractTextFromImage } from "@/lib/extractors/image";
import { isValidUUID, sanitizeText } from "@/lib/validate";
import type { Source } from "@/types";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { generateText } from "ai";
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
      console.error(`[embedText] Rate limited, retrying after ${wait}ms (attempt ${attempt + 1}/5)`);
      await sleep(wait);
      return embedText(text, attempt + 1);
    }
    throw error;
  }
}

export interface ProcessResult {
  pageCount: number;
  chunkCount: number;
  sampleText: string;
}

export type FileType = "pdf" | "txt" | "docx" | "image";

export async function processNotebook(
  notebookId: string,
  userId: string,
  fileBuffer: Buffer,
  fileId?: string,
  fileName?: string,
  fileType: FileType = "pdf",
  mimeType?: string
): Promise<ProcessResult> {
  if (!isValidUUID(notebookId)) throw new Error("Invalid notebookId");
  if (!isValidUUID(userId)) throw new Error("Invalid userId");

  const supabase = getServiceClient();

  try {
    let rawText: string;
    let pageCount = 0;

    switch (fileType) {
      case "txt":
        rawText = extractTextFromTxt(fileBuffer);
        pageCount = 1;
        break;
      case "docx":
        rawText = await extractTextFromDocx(fileBuffer);
        pageCount = 1;
        break;
      case "image":
        rawText = await extractTextFromImage(fileBuffer, mimeType ?? "image/jpeg");
        pageCount = 1;
        break;
      case "pdf":
      default: {
        const pdfResult: PdfResult = await extractText(fileBuffer);
        rawText = pdfResult.text;
        pageCount = pdfResult.pageCount;
        break;
      }
    }

    const text = sanitizeText(rawText);

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 2000,
      chunkOverlap: 200,
    });
    const docs = await splitter.createDocuments([text]);
    const chunks = docs.map((d) => d.pageContent);

    if (chunks.length === 0) {
      throw new Error(
        "No content could be extracted. This may be an image-only PDF."
      );
    }

    // Delete existing chunks for this file (or all if no fileId)
    if (fileId) {
      await supabase
        .from("chunks")
        .delete()
        .eq("notebook_id", notebookId)
        .eq("metadata->>file_id", fileId);
    } else {
      await supabase.from("chunks").delete().eq("notebook_id", notebookId);
    }

    // Embed chunks in batches to respect 10 RPM
    const BATCH_SIZE = 5;
    const INTER_BATCH_DELAY = 6500;

    const metadata = fileId
      ? { file_id: fileId, file_name: fileName ?? "unknown" }
      : {};

    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE);
      const embeddings = await Promise.all(batch.map((chunk) => embedText(chunk)));

      const rows = batch.map((content, idx) => ({
        notebook_id: notebookId,
        user_id: userId,
        content,
        embedding: JSON.stringify(embeddings[idx]),
        chunk_index: i + idx,
        metadata,
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
        throw new Error("Failed to store document chunks");
      }

      if (i + BATCH_SIZE < chunks.length) {
        await sleep(INTER_BATCH_DELAY);
      }
    }

    // Update notebook status and page count
    await supabase
      .from("notebooks")
      .update({ status: "ready", page_count: pageCount })
      .eq("id", notebookId);

    // Generate title and description (fire-and-forget)
    generateNotebookMeta(notebookId, chunks.slice(0, 3).join("\n\n")).catch((e) =>
      console.error("[processNotebook] Meta generation failed:", e)
    );

    return {
      pageCount,
      chunkCount: chunks.length,
      sampleText: chunks.slice(0, 3).join("\n\n"),
    };
  } catch (error) {
    console.error("[processNotebook] Error occurred, updating status to error:", {
      notebookId,
      userId,
      errorMessage: error instanceof Error ? error.message : String(error),
      error,
    });

    // Clean up any partially inserted chunks for this file
    if (fileId) {
      await supabase
        .from("chunks")
        .delete()
        .eq("notebook_id", notebookId)
        .eq("metadata->>file_id", fileId);
    } else {
      await supabase.from("chunks").delete().eq("notebook_id", notebookId);
    }

    await supabase
      .from("notebooks")
      .update({ status: "error" })
      .eq("id", notebookId);
    throw error;
  }
}

/**
 * Get all chunks for a notebook (for Studio features that need full document context).
 * Returns concatenated text capped at 30k characters.
 */
export async function getAllChunks(
  notebookId: string,
  userId: string
): Promise<string> {
  if (!isValidUUID(notebookId)) throw new Error("Invalid notebookId");
  if (!isValidUUID(userId)) throw new Error("Invalid userId");

  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from("chunks")
    .select("content")
    .eq("notebook_id", notebookId)
    .eq("user_id", userId)
    .order("chunk_index", { ascending: true });

  if (error) {
    throw new Error("Failed to load document");
  }

  const fullText = (data ?? []).map((row: { content: string }) => row.content).join("\n\n");
  return fullText.slice(0, 30_000);
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
    match_threshold: 0.5,
  });

  if (error) {
    console.error("[rag] Vector search failed:", error);
    throw new Error("Failed to retrieve document context");
  }

  return (data ?? []).map(
    (row: { id: string; content: string; similarity: number; metadata?: { file_name?: string } }) => ({
      chunkId: row.id,
      content: row.content,
      similarity: row.similarity,
      fileName: row.metadata?.file_name,
    })
  );
}

/**
 * Retrieve chunks for shared/group notebooks.
 * Uses match_chunks_shared which checks notebook_members table.
 */
export async function retrieveChunksShared(
  query: string,
  notebookId: string,
  requestingUserId: string
): Promise<Source[]> {
  if (!isValidUUID(notebookId)) throw new Error("Invalid notebookId");
  if (!isValidUUID(requestingUserId)) throw new Error("Invalid userId");

  const supabase = getServiceClient();
  const queryEmbedding = await embedText(query);

  const { data, error } = await supabase.rpc("match_chunks_shared", {
    query_embedding: JSON.stringify(queryEmbedding),
    match_notebook_id: notebookId,
    requesting_user_id: requestingUserId,
    match_count: 5,
    match_threshold: 0.5,
  });

  if (error) {
    console.error("[rag] Shared vector search failed:", error);
    throw new Error("Failed to retrieve document context");
  }

  return (data ?? []).map(
    (row: { id: string; content: string; similarity: number; metadata?: { file_name?: string } }) => ({
      chunkId: row.id,
      content: row.content,
      similarity: row.similarity,
      fileName: row.metadata?.file_name,
    })
  );
}

async function generateNotebookMeta(notebookId: string, sampleText: string): Promise<void> {
  const supabase = getServiceClient();

  const { text } = await generateText({
    model: getLLM(),
    system: 'You generate a short title and one-sentence description for a document. Return JSON only: {"title": "...", "description": "..."}. Title max 60 chars. Description max 150 chars. No markdown.',
    messages: [{ role: "user", content: `Document excerpt:\n${sampleText.slice(0, 3000)}` }],
  });

  try {
    let cleaned = text.trim();
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }
    const meta = JSON.parse(cleaned) as { title?: string; description?: string };
    if (meta.title && meta.description) {
      await supabase
        .from("notebooks")
        .update({ title: meta.title, description: meta.description })
        .eq("id", notebookId);
    }
  } catch {
    console.error("[generateNotebookMeta] Failed to parse LLM response:", text.slice(0, 200));
  }
}
