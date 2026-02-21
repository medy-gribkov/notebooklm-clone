import { authenticateRequest } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { getServiceClient } from "@/lib/supabase/service";
import { isValidUUID } from "@/lib/validate";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(request);
  if (auth === null) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!isValidUUID(id)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }
  const url = new URL(request.url);
  const fileId = url.searchParams.get("fileId");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limited = checkRateLimit(`pdf-get:${user.id}`, 30, 60_000);
  if (!limited) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429, headers: { "Retry-After": "60" } });
  }

  let storagePath: string | null = null;

  if (fileId) {
    // Fetch specific file by fileId
    const { data: file } = await supabase
      .from("notebook_files")
      .select("storage_path")
      .eq("id", fileId)
      .eq("notebook_id", id)
      .eq("user_id", user.id)
      .single();

    storagePath = file?.storage_path ?? null;
  } else {
    // Fallback: first file in notebook, or legacy file_url
    const { data: firstFile } = await supabase
      .from("notebook_files")
      .select("storage_path")
      .eq("notebook_id", id)
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .single();

    if (firstFile) {
      storagePath = firstFile.storage_path;
    } else {
      // Legacy: use notebooks.file_url
      const { data: notebook } = await supabase
        .from("notebooks")
        .select("file_url")
        .eq("id", id)
        .eq("user_id", user.id)
        .single();

      storagePath = notebook?.file_url ?? null;
    }
  }

  if (!storagePath) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const serviceClient = getServiceClient();
  const { data, error } = await serviceClient.storage
    .from("pdf-uploads")
    .createSignedUrl(storagePath, 60);

  if (error || !data) {
    console.error("[pdf] Failed to create signed URL:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }

  return NextResponse.json({ url: data.signedUrl });
}
