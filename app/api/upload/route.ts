import { authenticateRequest } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { processNotebook } from "@/lib/rag";
import { updateNotebookStatus } from "@/lib/notebook-status";
import { getServiceClient } from "@/lib/supabase/service";
import { checkRateLimit } from "@/lib/rate-limit";
import { NextResponse } from "next/server";

export const maxDuration = 60;

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (auth === null) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!checkRateLimit(user.id + ":notebook-create", 5, 3_600_000)) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (file.type !== "application/pdf") {
    return NextResponse.json(
      { error: "Only PDF files are supported" },
      { status: 400 }
    );
  }

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json(
      { error: "File exceeds 5MB limit" },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // Verify PDF magic bytes. Prevents MIME spoofing
  if (buffer.slice(0, 5).toString("ascii") !== "%PDF-") {
    return NextResponse.json({ error: "Invalid PDF file" }, { status: 400 });
  }

  const serviceClient = getServiceClient();

  // Store path only. Bucket is private, signed URLs generated on demand
  const storagePath = `${user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
  const { error: uploadError } = await serviceClient.storage
    .from("pdf-uploads")
    .upload(storagePath, buffer, { contentType: "application/pdf" });

  if (uploadError) {
    console.error("[upload] Storage upload failed:", uploadError);
    return NextResponse.json(
      { error: "Storage upload failed" },
      { status: 500 }
    );
  }

  // Create notebook row with storage path (not public URL)
  const title = file.name.replace(/\.pdf$/i, "");
  const { data: notebook, error: dbError } = await serviceClient
    .from("notebooks")
    .insert({
      user_id: user.id,
      title,
      file_url: storagePath,
      status: "processing",
    })
    .select()
    .single();

  if (dbError || !notebook) {
    console.error("[upload] Failed to create notebook:", dbError);
    await serviceClient.storage.from("pdf-uploads").remove([storagePath]);
    const msg =
      dbError?.message?.includes("relation") || dbError?.message?.includes("does not exist")
        ? "Database not set up. Please apply the migration in Supabase SQL Editor."
        : "Failed to create notebook. Please try again.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  // Create notebook_files row for multi-file tracking
  const { data: notebookFile, error: fileError } = await serviceClient
    .from("notebook_files")
    .insert({
      notebook_id: notebook.id,
      user_id: user.id,
      file_name: file.name,
      storage_path: storagePath,
      status: "processing",
    })
    .select()
    .single();

  if (fileError || !notebookFile) {
    console.error("[upload] Failed to create notebook_file:", fileError);
    await serviceClient.from("notebooks").delete().eq("id", notebook.id);
    await serviceClient.storage.from("pdf-uploads").remove([storagePath]);
    return NextResponse.json({ error: "Failed to create file record" }, { status: 500 });
  }

  // Process synchronously (embed + store chunks) within 60s timeout
  try {
    const result = await processNotebook(notebook.id, user.id, buffer, notebookFile.id, file.name);

    // Update notebook_file status
    await serviceClient
      .from("notebook_files")
      .update({ status: "ready", page_count: result.pageCount })
      .eq("id", notebookFile.id);
  } catch (error) {
    // Mark file as error
    await serviceClient
      .from("notebook_files")
      .update({ status: "error" })
      .eq("id", notebookFile.id);
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[upload] Processing failed:", {
      notebookId: notebook.id,
      userId: user.id,
      errorMessage: errorMsg,
      errorType: error instanceof Error ? error.name : typeof error,
      fullError: error,
    });
    // Clean up orphaned storage file
    await serviceClient.storage.from("pdf-uploads").remove([storagePath])
      .then(null, (e: unknown) => console.error("[upload] Failed to clean up storage:", e));

    // Recompute notebook status from all files
    await updateNotebookStatus(notebook.id);

    const msg =
      error instanceof Error && error.message.includes("No text layer")
        ? "This PDF has no selectable text (scanned image). Please upload a text-based PDF."
        : error instanceof Error && error.message.includes("quota")
        ? "AI quota exceeded. Please try again in a minute."
        : error instanceof Error && error.message.includes("No content could be extracted")
        ? "No text content found in this PDF."
        : error instanceof Error && error.message.includes("is required")
        ? "Processing failed. Please try again."
        : error instanceof Error && error.message.includes("Failed to store document chunks")
        ? "Processing failed. Please try again."
        : error instanceof Error && error.message.includes("embedding shape")
        ? "Processing failed. Please try again."
        : "Processing failed. Please try again.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  // Recompute notebook status from all files
  await updateNotebookStatus(notebook.id);

  // Return the updated notebook
  const { data: updated } = await serviceClient
    .from("notebooks")
    .select("id, user_id, title, file_url, status, page_count, description, created_at")
    .eq("id", notebook.id)
    .single();

  return NextResponse.json(updated, { status: 201 });
}
