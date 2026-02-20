import { authenticateRequest } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";

export async function DELETE(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const serviceClient = getServiceClient();
  const userId = user.id;

  try {
    // 1. Get all notebook IDs for this user
    const { data: notebooks } = await serviceClient
      .from("notebooks")
      .select("id")
      .eq("user_id", userId);

    const notebookIds = (notebooks ?? []).map((n: { id: string }) => n.id);

    // 2. Get all storage paths to delete
    const { data: files } = await serviceClient
      .from("notebook_files")
      .select("storage_path")
      .eq("user_id", userId);

    const storagePaths = (files ?? [])
      .map((f: { storage_path: string }) => f.storage_path)
      .filter(Boolean);

    // Also include legacy file_url from notebooks
    const { data: legacyNotebooks } = await serviceClient
      .from("notebooks")
      .select("file_url")
      .eq("user_id", userId);

    for (const nb of legacyNotebooks ?? []) {
      const fileUrl = (nb as { file_url: string | null }).file_url;
      if (fileUrl && !storagePaths.includes(fileUrl)) {
        storagePaths.push(fileUrl);
      }
    }

    // 3. Delete storage files
    if (storagePaths.length > 0) {
      await serviceClient.storage.from("pdf-uploads").remove(storagePaths);
    }

    // 4. Delete chunks for user's notebooks
    if (notebookIds.length > 0) {
      await serviceClient
        .from("chunks")
        .delete()
        .in("notebook_id", notebookIds);
    }

    // 5. Delete messages
    await serviceClient
      .from("messages")
      .delete()
      .eq("user_id", userId);

    // 6. Delete notebook files
    await serviceClient
      .from("notebook_files")
      .delete()
      .eq("user_id", userId);

    // 7. Delete notebooks
    await serviceClient
      .from("notebooks")
      .delete()
      .eq("user_id", userId);

    // 8. Delete the user via admin API
    const { error: deleteError } = await serviceClient.auth.admin.deleteUser(userId);
    if (deleteError) {
      console.error("[account/delete] Failed to delete user:", deleteError);
      return NextResponse.json({ error: "Failed to delete account" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[account/delete] Error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
