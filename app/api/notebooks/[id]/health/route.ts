import { createClient } from "@/lib/supabase/server";
import { getServiceClient } from "@/lib/supabase/service";
import { isValidUUID } from "@/lib/validate";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!isValidUUID(id)) {
    return NextResponse.json({ error: "Invalid notebook ID" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const serviceClient = getServiceClient();

  const [notebookRes, chunksRes, filesRes] = await Promise.all([
    serviceClient
      .from("notebooks")
      .select("id, status, user_id, title, page_count")
      .eq("id", id)
      .single(),
    serviceClient
      .from("chunks")
      .select("id", { count: "exact", head: true })
      .eq("notebook_id", id),
    serviceClient
      .from("notebook_files")
      .select("id, file_name, status, page_count")
      .eq("notebook_id", id),
  ]);

  const notebook = notebookRes.data;
  if (!notebook) {
    return NextResponse.json({ error: "Notebook not found" }, { status: 404 });
  }

  if (notebook.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({
    notebookId: id,
    status: notebook.status,
    title: notebook.title,
    pageCount: notebook.page_count,
    chunkCount: chunksRes.count ?? 0,
    fileCount: filesRes.data?.length ?? 0,
    files: (filesRes.data ?? []).map((f: { file_name: string; status: string; page_count: number | null }) => ({
      fileName: f.file_name,
      status: f.status,
      pageCount: f.page_count,
    })),
  });
}
