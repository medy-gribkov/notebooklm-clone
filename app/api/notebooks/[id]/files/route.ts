import { authenticateRequest } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getServiceClient } from "@/lib/supabase/service";
import { processNotebook, type FileType } from "@/lib/rag";
import { updateNotebookStatus } from "@/lib/notebook-status";
import { checkRateLimit } from "@/lib/rate-limit";
import { isValidUUID } from "@/lib/validate";
import { NextResponse } from "next/server";

export const maxDuration = 60;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(request);
  if (auth === null) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: notebookId } = await params;
  if (!isValidUUID(notebookId)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify notebook ownership
  const { data: notebook } = await supabase
    .from("notebooks")
    .select("id")
    .eq("id", notebookId)
    .eq("user_id", user.id)
    .single();

  if (!notebook) {
    return NextResponse.json({ error: "Notebook not found" }, { status: 404 });
  }

  const { data: files, error } = await supabase
    .from("notebook_files")
    .select("id, notebook_id, user_id, file_name, storage_path, status, page_count, created_at")
    .eq("notebook_id", notebookId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[notebooks/files] Failed to fetch files:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }

  return NextResponse.json(files ?? []);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(request);
  if (auth === null) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: notebookId } = await params;
  if (!isValidUUID(notebookId)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!checkRateLimit(user.id + ":file-upload", 15, 3_600_000)) {
    return NextResponse.json(
      { error: "Too many uploads. Please wait before uploading again." },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  // Verify notebook ownership
  const { data: notebook } = await supabase
    .from("notebooks")
    .select("id")
    .eq("id", notebookId)
    .eq("user_id", user.id)
    .single();

  if (!notebook) {
    return NextResponse.json({ error: "Notebook not found" }, { status: 404 });
  }

  // Enforce max 5 files per notebook
  const MAX_FILES_PER_NOTEBOOK = 5;
  const { count: fileCount } = await supabase
    .from("notebook_files")
    .select("id", { count: "exact", head: true })
    .eq("notebook_id", notebookId)
    .eq("user_id", user.id);

  if ((fileCount ?? 0) >= MAX_FILES_PER_NOTEBOOK) {
    return NextResponse.json(
      { error: "Maximum 5 files per notebook. Delete a file to upload more." },
      { status: 400 }
    );
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  // Determine file type and validate
  const ALLOWED_TYPES: Record<string, { fileType: FileType; maxSize: number }> = {
    "application/pdf": { fileType: "pdf", maxSize: 5 * 1024 * 1024 },
    "text/plain": { fileType: "txt", maxSize: 500 * 1024 },
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": { fileType: "docx", maxSize: 10 * 1024 * 1024 },
    "image/jpeg": { fileType: "image", maxSize: 5 * 1024 * 1024 },
    "image/png": { fileType: "image", maxSize: 5 * 1024 * 1024 },
    "image/webp": { fileType: "image", maxSize: 5 * 1024 * 1024 },
  };

  const typeInfo = ALLOWED_TYPES[file.type];
  if (!typeInfo) {
    return NextResponse.json(
      { error: "Unsupported file type. Upload PDF, DOCX, TXT, or images (JPEG, PNG, WebP)." },
      { status: 400 }
    );
  }

  if (file.size > typeInfo.maxSize) {
    const sizeMB = Math.round(typeInfo.maxSize / (1024 * 1024));
    return NextResponse.json(
      { error: `File exceeds ${sizeMB}MB limit` },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // Magic byte validation
  if (typeInfo.fileType === "pdf" && buffer.slice(0, 5).toString("ascii") !== "%PDF-") {
    return NextResponse.json({ error: "Invalid PDF file" }, { status: 400 });
  }
  if (typeInfo.fileType === "docx" && (buffer.length < 4 || buffer[0] !== 0x50 || buffer[1] !== 0x4b || buffer[2] !== 0x03 || buffer[3] !== 0x04)) {
    return NextResponse.json({ error: "Invalid DOCX file" }, { status: 400 });
  }
  if (typeInfo.fileType === "image") {
    const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8;
    const isPng = buffer[0] === 0x89 && buffer[1] === 0x50;
    const isWebp = buffer[0] === 0x52 && buffer[1] === 0x49;
    if (!isJpeg && !isPng && !isWebp) {
      return NextResponse.json({ error: "Invalid image file" }, { status: 400 });
    }
  }

  const serviceClient = getServiceClient();

  const storagePath = `${user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
  const { error: uploadError } = await serviceClient.storage
    .from("pdf-uploads")
    .upload(storagePath, buffer, { contentType: file.type });

  if (uploadError) {
    console.error("[notebooks/files] Storage upload failed:", uploadError);
    return NextResponse.json(
      { error: "Storage upload failed" },
      { status: 500 }
    );
  }

  const { data: notebookFile, error: dbError } = await serviceClient
    .from("notebook_files")
    .insert({
      notebook_id: notebookId,
      user_id: user.id,
      file_name: file.name,
      storage_path: storagePath,
      status: "processing",
    })
    .select()
    .single();

  if (dbError || !notebookFile) {
    console.error("[notebooks/files] Failed to create notebook_file:", dbError);
    await serviceClient.storage.from("pdf-uploads").remove([storagePath]);
    return NextResponse.json(
      { error: "Failed to create file record" },
      { status: 500 }
    );
  }

  // Update notebook status to processing
  await serviceClient
    .from("notebooks")
    .update({ status: "processing" })
    .eq("id", notebookId);

  try {
    const result = await processNotebook(
      notebookId,
      user.id,
      buffer,
      notebookFile.id,
      file.name,
      typeInfo.fileType,
      file.type
    );

    await serviceClient
      .from("notebook_files")
      .update({ status: "ready", page_count: result.pageCount })
      .eq("id", notebookFile.id);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[notebooks/files] Processing failed:", {
      notebookFileId: notebookFile.id,
      errorMessage: errorMsg,
    });

    await serviceClient
      .from("notebook_files")
      .update({ status: "error" })
      .eq("id", notebookFile.id);

    await serviceClient.storage
      .from("pdf-uploads")
      .remove([storagePath])
      .then(null, (e: unknown) =>
        console.error("[notebooks/files] Failed to clean up storage:", e)
      );
  }

  // Recompute notebook status from all files
  await updateNotebookStatus(notebookId);

  const { data: updated } = await serviceClient
    .from("notebook_files")
    .select("id, notebook_id, user_id, file_name, storage_path, status, page_count, created_at")
    .eq("id", notebookFile.id)
    .single();

  return NextResponse.json(updated, { status: 201 });
}
