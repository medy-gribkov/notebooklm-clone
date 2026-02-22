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

  // Create notebook with description
  const { data: notebook, error: nbError } = await supabase
    .from("notebooks")
    .insert({
      title,
      user_id: user.id,
      status: "ready",
      description: content.description,
    })
    .select("id")
    .single();

  if (nbError || !notebook) {
    console.error("[clone-featured] Failed to create notebook:", nbError);
    return NextResponse.json({ error: "Failed to create notebook" }, { status: 500 });
  }

  // Insert synthetic file entries for each file in the featured content
  const fileEntries: { id: string; fileName: string; content: string }[] = [];
  let totalPages = 0;

  for (const file of content.files) {
    const estimatedPages = Math.max(1, Math.ceil(file.content.length / 3000));
    totalPages += estimatedPages;

    const { data: notebookFile, error: fileError } = await supabase
      .from("notebook_files")
      .insert({
        notebook_id: notebook.id,
        user_id: user.id,
        file_name: file.fileName,
        storage_path: `featured/${slug}/${file.fileName}`,
        status: "ready",
        page_count: estimatedPages,
      })
      .select("id")
      .single();

    if (fileError || !notebookFile) {
      console.error("[clone-featured] Failed to insert file entry:", fileError);
      continue;
    }

    fileEntries.push({
      id: notebookFile.id,
      fileName: file.fileName,
      content: file.content,
    });
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

  // Return immediately so the user can start using the notebook.
  // Embeddings run in the background (fire-and-forget).
  if (fileEntries.length > 0) {
    const nbId = notebook.id;
    const uid = user.id;
    void (async () => {
      try {
        const splitter = new RecursiveCharacterTextSplitter({
          chunkSize: 2000,
          chunkOverlap: 200,
        });
        const serviceClient = getServiceClient();

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
                notebook_id: nbId,
                user_id: uid,
                content: batch[idx],
                embedding: JSON.stringify(embeddings[idx]),
                chunk_index: globalChunkIndex++,
                metadata: { file_id: file.id, file_name: file.fileName },
              });
            }

            if (i + BATCH_SIZE < chunks.length) {
              await new Promise((r) => setTimeout(r, 6500));
            }
          }

          await new Promise((r) => setTimeout(r, 6500));
        }

        if (allChunkRows.length > 0) {
          const { error: chunkError } = await serviceClient.from("chunks").insert(allChunkRows);
          if (chunkError) {
            console.error("[clone-featured] Failed to insert chunks:", chunkError.message);
          }
        }

        await getServiceClient()
          .from("notebooks")
          .update({ page_count: totalPages })
          .eq("id", nbId);
      } catch (e) {
        console.error("[clone-featured] Background embedding failed:", e);
      }
    })();
  }

  return NextResponse.json({ notebookId: notebook.id }, { status: 201 });
}
