import { createClient } from "@/lib/supabase/server";
import { getServiceClient } from "@/lib/supabase/service";
import { checkRateLimit } from "@/lib/rate-limit";
import { generateCompanyContent } from "@/lib/generate-company";
import { generateShareToken } from "@/lib/share";
import { embedText } from "@/lib/processing/process-notebook";
import { getNotebookHash } from "@/lib/hash";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { NextResponse } from "next/server";

export const maxDuration = 120;

const ADMIN_USER_ID = process.env.ADMIN_USER_ID;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!ADMIN_USER_ID || user.id !== ADMIN_USER_ID) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!checkRateLimit("admin:generate", 10, 3_600_000)) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Max 10 generations per hour." },
      { status: 429, headers: { "Retry-After": "3600" } }
    );
  }

  const body = await request.json().catch(() => ({}));
  const companyName = typeof body.companyName === "string" ? body.companyName.trim() : "";
  const website = typeof body.website === "string" ? body.website.trim() : "";
  const category = typeof body.category === "string" ? body.category.trim() : "Technology";

  if (!companyName || !website) {
    return NextResponse.json(
      { error: "Missing companyName or website" },
      { status: 400 }
    );
  }

  // Generate company content via Gemini + Google Search grounding
  const content = await generateCompanyContent(companyName, website, category);
  if (!content) {
    return NextResponse.json(
      { error: "Failed to generate content. Check GEMINI_API_KEY and try again." },
      { status: 500 }
    );
  }

  const serviceClient = getServiceClient();
  const fullText = content.files.map((f) => f.content).join("\n\n");
  const sourceHash = getNotebookHash(fullText);

  // 1. Create notebook
  let notebook;
  try {
    const { data, error } = await supabase
      .from("notebooks")
      .insert({
        title: companyName,
        user_id: user.id,
        status: "processing",
        description: content.description,
        source_hash: sourceHash,
      })
      .select("id")
      .single();

    if (error) throw error;
    notebook = data;
  } catch (e) {
    console.error("[admin-generate] Failed to create notebook:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "Database error creating notebook." }, { status: 500 });
  }

  // 2. Create notebook files
  const fileEntries: { id: string; fileName: string; content: string }[] = [];
  let totalPages = 0;

  for (const file of content.files) {
    const estimatedPages = Math.max(1, Math.ceil(file.content.length / 3000));
    totalPages += estimatedPages;

    try {
      const { data: notebookFile, error } = await supabase
        .from("notebook_files")
        .insert({
          notebook_id: notebook.id,
          user_id: user.id,
          file_name: file.fileName,
          storage_path: `admin/${companyName.toLowerCase().replace(/\s+/g, "-")}/${file.fileName}`,
          status: "processing",
          page_count: estimatedPages,
        })
        .select("id")
        .single();

      if (error) continue;
      if (notebookFile) {
        fileEntries.push({ id: notebookFile.id, fileName: file.fileName, content: file.content });
      }
    } catch {
      continue;
    }
  }

  // 3. Pre-populate studio generations
  const actions: { action: string; result: unknown }[] = [
    { action: "quiz", result: content.quiz },
    { action: "flashcards", result: content.flashcards },
    { action: "report", result: content.report },
    { action: "mindmap", result: content.mindmap },
    { action: "datatable", result: content.datatable },
    { action: "infographic", result: content.infographic },
    { action: "slidedeck", result: content.slidedeck },
  ];

  try {
    const { error } = await supabase
      .from("studio_generations")
      .insert(
        actions.map((a) => ({
          notebook_id: notebook.id,
          user_id: user.id,
          action: a.action,
          result: a.result,
          source_hash: sourceHash,
        })),
      );
    if (error) throw error;
  } catch (e) {
    console.error("[admin-generate] Studio generation insert failed:", e instanceof Error ? e.message : e);
  }

  // 4. Embed chunks
  if (fileEntries.length > 0) {
    try {
      const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 2000,
        chunkOverlap: 200,
      });

      let globalChunkIndex = 0;
      const allChunkRows: {
        notebook_id: string;
        user_id: string;
        content: string;
        embedding: string;
        chunk_index: number;
        metadata: { file_id: string; file_name: string };
      }[] = [];

      for (const file of fileEntries) {
        const docs = await splitter.createDocuments([file.content]);
        const chunks = docs.map((d) => d.pageContent);

        const BATCH_SIZE = 5;
        for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
          const batch = chunks.slice(i, i + BATCH_SIZE);
          const embeddings = await Promise.all(batch.map((chunk) => embedText(chunk)));

          for (let idx = 0; idx < batch.length; idx++) {
            allChunkRows.push({
              notebook_id: notebook.id,
              user_id: user.id,
              content: batch[idx],
              embedding: JSON.stringify(embeddings[idx]),
              chunk_index: globalChunkIndex++,
              metadata: { file_id: file.id, file_name: file.fileName },
            });
          }

          if (i + BATCH_SIZE < chunks.length) {
            await new Promise((r) => setTimeout(r, 3000));
          }
        }
      }

      if (allChunkRows.length > 0) {
        const { error } = await serviceClient.from("chunks").insert(allChunkRows);
        if (error) throw new Error("Failed to store document chunks");
      }

      await serviceClient
        .from("notebook_files")
        .update({ status: "ready" })
        .eq("notebook_id", notebook.id)
        .eq("user_id", user.id);

      await serviceClient
        .from("notebooks")
        .update({ status: "ready", page_count: totalPages })
        .eq("id", notebook.id);
    } catch (e) {
      console.error("[admin-generate] Embedding failed:", e instanceof Error ? e.message : e);

      await serviceClient
        .from("notebooks")
        .update({ status: "error" })
        .eq("id", notebook.id);

      await serviceClient
        .from("notebook_files")
        .update({ status: "error" })
        .eq("notebook_id", notebook.id)
        .eq("user_id", user.id);

      return NextResponse.json({ error: "Failed to embed content" }, { status: 500 });
    }
  }

  // 5. Auto-create share link with chat permissions, 365-day expiry
  let shareToken: string | null = null;
  let shareUrl: string | null = null;

  try {
    shareToken = generateShareToken();
    const expiresAt = new Date(Date.now() + 365 * 86_400_000).toISOString();

    const { error } = await supabase
      .from("shared_links")
      .insert({
        notebook_id: notebook.id,
        user_id: user.id,
        token: shareToken,
        permissions: "chat",
        expires_at: expiresAt,
      });

    if (error) {
      console.error("[admin-generate] Share link creation failed:", error.message);
      shareToken = null;
    } else {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      shareUrl = `${appUrl}/shared/${shareToken}`;
    }
  } catch (e) {
    console.error("[admin-generate] Share link error:", e instanceof Error ? e.message : e);
  }

  // 6. Insert into companies table (shared page queries this for logo/name)
  try {
    const { error } = await supabase
      .from("companies")
      .insert({
        name: companyName,
        website,
        category,
        notebook_id: notebook.id,
        share_token: shareToken,
      });
    if (error) {
      console.error("[admin-generate] Companies insert failed:", error.message);
    }
  } catch (e) {
    console.error("[admin-generate] Companies insert error:", e instanceof Error ? e.message : e);
  }

  return NextResponse.json(
    {
      notebookId: notebook.id,
      shareToken,
      shareUrl,
    },
    { status: 201 }
  );
}
