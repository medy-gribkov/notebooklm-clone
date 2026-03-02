import { embedQuery } from "@/lib/langchain/embeddings";
import { DocChatRetriever, documentsToSources } from "@/lib/langchain/retriever";
import { getChatModel } from "@/lib/langchain/chat-model";
import { extractText, type PdfResult } from "@/lib/pdf";
import { extractTextFromTxt } from "@/lib/extractors/txt";
import { extractTextFromDocx } from "@/lib/extractors/docx";
import { isValidUUID, sanitizeText } from "@/lib/validate";
import type { Source } from "@/types";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { getServiceClient } from "@/lib/supabase/service";
import { getNotebookHash } from "@/lib/hash";

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

    if (isRateLimit && attempt < 5) {
      const wait = Math.pow(2, attempt) * 6000; // 6s, 12s, 24s, 48s, 96s
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

export type FileType = "pdf" | "txt" | "docx";

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
      case "pdf":
      default: {
        const pdfResult: PdfResult = await extractText(fileBuffer);
        rawText = pdfResult.text;
        pageCount = pdfResult.pageCount;
        break;
      }
    }

    const text = sanitizeText(rawText);

    // Calculate source_hash anchor
    const sourceHash = getNotebookHash(text);

    // Update notebook with status and source_hash
    await supabase
      .from("notebooks")
      .update({ status: "processing", source_hash: sourceHash })
      .eq("id", notebookId);

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

    // Embed chunks in batches to respect Gemini 10 RPM limit
    const BATCH_SIZE = 5;
    const INTER_BATCH_DELAY = 6500; // ms between batches (~9.2 batches/min)

    /* v8 ignore next 3 -- @preserve */
    const metadata: Record<string, string> = fileId
      ? { file_id: fileId, file_name: fileName ?? "unknown" }
      : {};

    // Start metadata generation early (runs in parallel with remaining batches)
    const sampleForMeta = chunks.slice(0, 3).join("\n\n");
    const metaPromise = (async () => {
      try {
        await generateNotebookMeta(notebookId, sampleForMeta);
      } catch {
        await sleep(1000);
        try {
          await generateNotebookMeta(notebookId, sampleForMeta);
        } catch {
          // Meta generation failed after retry, notebook keeps default title
        }
      }
    })();

    // Accumulate all rows, insert once after embedding completes
    const allRows: Array<{
      notebook_id: string;
      user_id: string;
      content: string;
      embedding: string;
      chunk_index: number;
      metadata: Record<string, string>;
    }> = [];

    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batchStart = Date.now();
      const batch = chunks.slice(i, i + BATCH_SIZE);
      const embeddings = await Promise.all(batch.map((chunk) => embedText(chunk)));

      for (let idx = 0; idx < batch.length; idx++) {
        allRows.push({
          notebook_id: notebookId,
          user_id: userId,
          content: batch[idx],
          embedding: JSON.stringify(embeddings[idx]),
          chunk_index: i + idx,
          metadata,
        });
      }

      if (i + BATCH_SIZE < chunks.length) {
        const elapsed = Date.now() - batchStart;
        const remaining = INTER_BATCH_DELAY - elapsed;
        /* v8 ignore next -- @preserve */
        if (remaining > 0) await sleep(remaining);
      }
    }

    // Single bulk insert (avoids N round-trips to Supabase)
    const { error: insertError } = await supabase.from("chunks").insert(allRows);
    if (insertError) {
      console.error("[processNotebook] Failed to insert chunks:", insertError.message);
      throw new Error("Failed to store document chunks");
    }

    // Don't block on metadata, but let it finish if it can
    void metaPromise;

    return {
      pageCount,
      chunkCount: chunks.length,
      sampleText: chunks.slice(0, 3).join("\n\n"),
    };
  } catch (error) {
    /* v8 ignore next -- @preserve */
    console.error("[processNotebook] Failed:", error instanceof Error ? error.message : error);

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

  const text = (data ?? []).map((row: { content: string }) => row.content).join("\n\n");
  return text.slice(0, 30_000);
}

export async function retrieveChunks(
  query: string,
  notebookId: string,
  userId: string,
): Promise<Source[]> {
  const retriever = new DocChatRetriever({ notebookId, userId });
  const docs = await retriever.invoke(query);
  return documentsToSources(docs);
}

/**
 * Retrieve chunks for shared/group notebooks.
 * Uses match_chunks_shared which checks notebook_members table.
 */
export async function retrieveChunksShared(
  query: string,
  notebookId: string,
  requestingUserId: string,
): Promise<Source[]> {
  const retriever = new DocChatRetriever({
    notebookId,
    userId: requestingUserId,
    shared: true,
  });
  const docs = await retriever.invoke(query);
  return documentsToSources(docs);
}

// ---------- Deduplication & Context Builder ----------

function contentOverlap(a: string, b: string): number {
  const wordsA = new Set(a.toLowerCase().split(/\s+/));
  const wordsB = new Set(b.toLowerCase().split(/\s+/));
  let intersection = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) intersection++;
  }
  const union = wordsA.size + wordsB.size - intersection;
  /* v8 ignore next -- @preserve */
  return union === 0 ? 1 : intersection / union;
}

/** Remove near-duplicate sources (>90% word overlap). */
export function deduplicateSources(sources: Source[]): Source[] {
  const result: Source[] = [];
  for (const source of sources) {
    const norm = source.content.replace(/\s+/g, " ").trim();
    const isDup = result.some((existing) => {
      const existNorm = existing.content.replace(/\s+/g, " ").trim();
      return contentOverlap(norm, existNorm) > 0.9;
    });
    if (!isDup) result.push(source);
  }
  return result;
}

/** Build structured context block grouped by file name. */
export function buildContextBlock(sources: Source[]): string {
  if (sources.length === 0) return "";

  const grouped = new Map<string, Array<{ index: number; content: string }>>();
  sources.forEach((s, i) => {
    const fn = s.fileName ?? "document";
    if (!grouped.has(fn)) grouped.set(fn, []);
    grouped.get(fn)!.push({ index: i + 1, content: s.content });
  });

  const sections: string[] = [];
  for (const [fileName, chunks] of grouped) {
    const body = chunks
      .map((c) => `[Source ${c.index}]\n${c.content}`)
      .join("\n\n");
    sections.push(`## File: ${fileName}\n${body}`);
  }

  return sections.join("\n\n---\n\n");
}

async function generateNotebookMeta(notebookId: string, sampleText: string): Promise<void> {
  const supabase = getServiceClient();

  const systemPrompt = `You generate metadata for company research documents. Return ONLY valid JSON, no markdown.
Format: {"title": "...", "description": "...", "starterPrompts": ["...", "...", "...", "...", "...", "..."]}

Rules:
- title: A clear, descriptive title (max 60 chars). Not the filename. e.g. "Wix - Company Intelligence Report"
- description: Describe the company, its sector, and key topics covered (max 150 chars).
- starterPrompts: 6 diverse questions a user might ask about this company (max 80 chars each).
  Focus on: company overview, tech stack, engineering culture, products, market position, career opportunities.

Example for a company profile:
{"title": "Wix - Company Intelligence Report", "description": "Cloud-based web development platform. Tech stack, engineering culture, market position, and career opportunities.", "starterPrompts": ["What does this company do?", "What is their technology stack?", "What engineering roles are they hiring for?", "Who are their main competitors?", "What is their company culture like?", "What recent developments have they had?"]}`;

  async function attemptGenerate(excerpt: string): Promise<{ title?: string; description?: string; starterPrompts?: string[] } | null> {
    try {
      const chat = getChatModel();
      const response = await chat.invoke([
        new SystemMessage(systemPrompt),
        new HumanMessage(`Document excerpt:\n${excerpt}`),
      ]);

      /* v8 ignore next -- @preserve */
      let cleaned = (typeof response.content === "string" ? response.content : "").trim();
      if (cleaned.startsWith("```")) {
        cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
      }
      const meta = JSON.parse(cleaned) as { title?: string; description?: string; starterPrompts?: string[] };
      if (meta.title && meta.description) return meta;
      return null;
    } catch (e) {
      /* v8 ignore next -- @preserve */
      console.error("[generateNotebookMeta] Attempt failed:", e instanceof Error ? e.message : e);
      return null;
    }
  }

  // First attempt with more text
  let meta = await attemptGenerate(sampleText.slice(0, 5000));

  // Retry with shorter text on failure
  if (!meta) {
    await sleep(2000);
    meta = await attemptGenerate(sampleText.slice(0, 1500));
  }

  if (meta) {
    const updateData: Record<string, unknown> = {
      title: meta.title,
      description: meta.description,
    };
    if (Array.isArray(meta.starterPrompts) && meta.starterPrompts.length > 0) {
      updateData.starter_prompts = meta.starterPrompts.slice(0, 6);
    }
    await supabase
      .from("notebooks")
      .update(updateData)
      .eq("id", notebookId);
  } else {
    // Fallback: set a basic description from the sample text
    const fallbackDesc = sampleText.slice(0, 140).replace(/\n/g, " ").trim() + "...";
    await supabase
      .from("notebooks")
      .update({ description: fallbackDesc })
      .eq("id", notebookId);
  }
}
