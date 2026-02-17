import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { processNotebook } from "@/lib/rag";
import { NextResponse } from "next/server";

export const maxDuration = 60;

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
  const serviceClient = getServiceClient();

  // Upload to Supabase Storage
  const storagePath = `${user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
  const { error: uploadError } = await serviceClient.storage
    .from("pdf-uploads")
    .upload(storagePath, buffer, { contentType: "application/pdf" });

  if (uploadError) {
    return NextResponse.json(
      { error: `Storage upload failed: ${uploadError.message}` },
      { status: 500 }
    );
  }

  const {
    data: { publicUrl },
  } = serviceClient.storage.from("pdf-uploads").getPublicUrl(storagePath);

  // Create notebook row (status=processing)
  const title = file.name.replace(/\.pdf$/i, "");
  const { data: notebook, error: dbError } = await serviceClient
    .from("notebooks")
    .insert({
      user_id: user.id,
      title,
      file_url: publicUrl,
      status: "processing",
    })
    .select()
    .single();

  if (dbError || !notebook) {
    return NextResponse.json(
      { error: `Failed to create notebook: ${dbError?.message}` },
      { status: 500 }
    );
  }

  // Process synchronously (embed + store chunks)
  // This runs within the 60s function timeout
  try {
    await processNotebook(notebook.id, user.id, buffer);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Processing failed",
        notebookId: notebook.id,
      },
      { status: 500 }
    );
  }

  // Return the updated notebook
  const { data: updated } = await serviceClient
    .from("notebooks")
    .select("*")
    .eq("id", notebook.id)
    .single();

  return NextResponse.json(updated, { status: 201 });
}
