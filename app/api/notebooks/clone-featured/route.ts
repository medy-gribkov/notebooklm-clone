import { createClient } from "@/lib/supabase/server";
import { getServiceClient } from "@/lib/supabase/service";
import { getFeaturedBySlug } from "@/lib/featured-notebooks";
import { getFeaturedContent } from "@/lib/featured-content";
import { embedText } from "@/lib/rag";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const slug = typeof body.slug === "string" ? body.slug.trim() : "";

  if (!slug) {
    return NextResponse.json({ error: "Missing slug" }, { status: 400 });
  }

  const featured = getFeaturedBySlug(slug);
  const content = getFeaturedContent(slug);

  if (!featured || !content) {
    return NextResponse.json({ error: "Featured notebook not found" }, { status: 404 });
  }

  // Use the English title directly (translation keys map to the same base name)
  const titleMap: Record<string, string> = {
    gettingStarted: "Getting Started with DocChat",
    researchAnalysis: "Research Paper Analysis",
    meetingOrganizer: "Meeting Notes Organizer",
    studyGuide: "Study Guide Builder",
    dataAnalysis: "Data Analysis Workspace",
    legalReview: "Legal Document Review",
    productSpecs: "Product Specs Analyzer",
    literatureReview: "Literature Review Assistant",
  };

  const title = titleMap[featured.titleKey] ?? featured.titleKey;

  // Create notebook
  const { data: notebook, error: nbError } = await supabase
    .from("notebooks")
    .insert({ title, user_id: user.id, status: "ready" })
    .select("id")
    .single();

  if (nbError || !notebook) {
    console.error("[clone-featured] Failed to create notebook:", nbError);
    return NextResponse.json({ error: "Failed to create notebook" }, { status: 500 });
  }

  // Calculate estimated pages from content length
  const estimatedPages = content.content
    ? Math.max(1, Math.ceil(content.content.length / 3000))
    : 1;

  // Insert a synthetic file entry so sources panel isn't empty
  const { error: fileError } = await supabase.from("notebook_files").insert({
    notebook_id: notebook.id,
    user_id: user.id,
    file_name: `${title}.pdf`,
    storage_path: `featured/${slug}`,
    status: "ready",
    page_count: estimatedPages,
  });

  if (fileError) {
    console.error("[clone-featured] Failed to insert file entry:", fileError);
  }

  // Insert pre-generated studio content as generations
  const actions: { action: string; result: unknown }[] = [
    { action: "quiz", result: content.quiz },
    { action: "flashcards", result: content.flashcards },
    { action: "report", result: content.report },
    { action: "mindmap", result: content.mindmap },
  ];

  const generationRows = actions.map((a) => ({
    notebook_id: notebook.id,
    user_id: user.id,
    action: a.action,
    result: a.result,
  }));

  const { error: genError } = await supabase
    .from("studio_generations")
    .insert(generationRows);

  if (genError) {
    console.error("[clone-featured] Failed to insert generations:", genError);
  }

  // Split content into chunks and generate embeddings for RAG
  if (content.content) {
    try {
      const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 2000,
        chunkOverlap: 200,
      });
      const docs = await splitter.createDocuments([content.content]);
      const chunks = docs.map((d) => d.pageContent);
      const serviceClient = getServiceClient();

      const BATCH_SIZE = 5;
      for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
        const batch = chunks.slice(i, i + BATCH_SIZE);
        const embeddings = await Promise.all(batch.map((chunk) => embedText(chunk)));

        const rows = batch.map((text, idx) => ({
          notebook_id: notebook.id,
          user_id: user.id,
          content: text,
          embedding: JSON.stringify(embeddings[idx]),
          chunk_index: i + idx,
          metadata: { file_name: "Featured content" },
        }));

        const { error: chunkError } = await serviceClient.from("chunks").insert(rows);
        if (chunkError) {
          console.error("[clone-featured] Failed to insert chunks:", chunkError.message);
          break;
        }

        // Rate limit delay between batches
        if (i + BATCH_SIZE < chunks.length) {
          await new Promise((r) => setTimeout(r, 6500));
        }
      }

      // Update page count on the notebook record
      await supabase
        .from("notebooks")
        .update({ page_count: estimatedPages })
        .eq("id", notebook.id);
    } catch (e) {
      console.error("[clone-featured] Embedding failed (non-fatal):", e);
      // Non-fatal: notebook and studio content were created, chat just won't have RAG context
    }
  }

  return NextResponse.json({ notebookId: notebook.id }, { status: 201 });
}
