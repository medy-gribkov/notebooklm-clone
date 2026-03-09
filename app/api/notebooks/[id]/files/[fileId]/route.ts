import { authenticateRequest } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getServiceClient } from "@/lib/supabase/service";
import { updateNotebookStatus } from "@/lib/notebook-status";
import { checkRateLimit } from "@/lib/rate-limit";
import { isValidUUID } from "@/lib/validate";
import { NextResponse } from "next/server";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
  const auth = await authenticateRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: notebookId, fileId } = await params;
  if (!isValidUUID(notebookId) || !isValidUUID(fileId)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!checkRateLimit(`file-delete:${user.id}`, 10, 60_000)) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429, headers: { "Retry-After": "60" } });
  }

  const serviceClient = getServiceClient();

  // Verify ownership
  const { data: file } = await serviceClient
    .from("notebook_files")
    .select("id, storage_path")
    .eq("id", fileId)
    .eq("notebook_id", notebookId)
    .eq("user_id", user.id)
    .single();

  if (!file) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  // Delete chunks for this file (via metadata JSONB filter)
  await serviceClient
    .from("chunks")
    .delete()
    .eq("notebook_id", notebookId)
    .eq("metadata->>file_id", fileId);

  // Delete storage object
  if (file.storage_path) {
    await serviceClient.storage
      .from("pdf-uploads")
      .remove([file.storage_path])
      .then(null, (e: unknown) =>
        console.error("[files/delete] Failed to remove storage:", e)
      );
  }

  // Delete notebook_file row
  await serviceClient.from("notebook_files").delete().eq("id", fileId);

  // Recompute notebook status
  await updateNotebookStatus(notebookId);

  return NextResponse.json({ success: true });
}
