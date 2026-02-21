import { authenticateRequest } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { getServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";
import type { NotebookFile } from "@/types";

const NOTEBOOK_COLUMNS = "id, user_id, title, file_url, status, page_count, description, created_at";
const FILE_COLUMNS = "id, notebook_id, user_id, file_name, storage_path, status, page_count, created_at";

export async function GET(request: Request) {
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

  const limited = checkRateLimit(`notebooks-list:${user.id}`, 60, 60_000);
  if (!limited) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429, headers: { "Retry-After": "60" } });
  }

  // Fetch user's own notebooks
  const { data, error } = await supabase
    .from("notebooks")
    .select(NOTEBOOK_COLUMNS)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[notebooks] Failed to fetch notebooks:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }

  const notebooks = data ?? [];

  // Fetch shared notebooks (where user is a member)
  const serviceClient = getServiceClient();
  const { data: memberships } = await serviceClient
    .from("notebook_members")
    .select("notebook_id, role")
    .eq("user_id", user.id);

  let sharedNotebooks: Array<Record<string, unknown>> = [];
  if (memberships && memberships.length > 0) {
    const sharedIds = memberships.map((m: { notebook_id: string }) => m.notebook_id);
    const { data: shared } = await serviceClient
      .from("notebooks")
      .select(NOTEBOOK_COLUMNS)
      .in("id", sharedIds)
      .order("created_at", { ascending: false });

    sharedNotebooks = (shared ?? []).map((n: Record<string, unknown>) => {
      const membership = memberships.find((m: { notebook_id: string }) => m.notebook_id === n.id);
      return { ...n, memberRole: membership?.role ?? "viewer" };
    });
  }

  // Optional batch include of files (avoids N+1 on dashboard)
  const url = new URL(request.url);
  if (url.searchParams.get("include") === "files" && notebooks.length > 0) {
    const notebookIds = notebooks.map((n) => n.id);
    const { data: allFiles } = await supabase
      .from("notebook_files")
      .select(FILE_COLUMNS)
      .in("notebook_id", notebookIds)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    const filesByNotebook: Record<string, NotebookFile[]> = {};
    for (const file of (allFiles ?? []) as NotebookFile[]) {
      const nid = file.notebook_id;
      if (!filesByNotebook[nid]) filesByNotebook[nid] = [];
      filesByNotebook[nid].push(file);
    }

    return NextResponse.json({ notebooks, sharedNotebooks, filesByNotebook });
  }

  return NextResponse.json({ notebooks, sharedNotebooks });
}

// DELETE /api/notebooks - delete all notebooks for the user
export async function DELETE(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Get all storage paths to clean up
  const { data: files } = await supabase
    .from("notebook_files")
    .select("storage_path")
    .eq("user_id", user.id);

  const paths = (files ?? []).map((f: { storage_path: string }) => f.storage_path).filter(Boolean);
  if (paths.length > 0) {
    await supabase.storage.from("pdf-uploads").remove(paths);
  }

  const { error } = await supabase
    .from("notebooks")
    .delete()
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: "Internal error" }, { status: 500 });
  return NextResponse.json({ success: true });
}
