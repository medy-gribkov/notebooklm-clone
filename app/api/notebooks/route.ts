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

  // Fetch user's own notebooks and shared memberships in parallel
  const serviceClient = getServiceClient();
  const [notebooksResult, membershipsResult] = await Promise.all([
    supabase
      .from("notebooks")
      .select(NOTEBOOK_COLUMNS)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    serviceClient
      .from("notebook_members")
      .select("notebook_id, role")
      .eq("user_id", user.id),
  ]);

  if (notebooksResult.error) {
    console.error("[notebooks] Failed to fetch notebooks:", notebooksResult.error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }

  const notebooks = notebooksResult.data ?? [];
  const memberships = membershipsResult.data;

  // Fetch company logos for dashboard cards
  const allNotebookIds = notebooks.map((n) => n.id);
  const companyByNotebook: Record<string, string> = {};
  if (allNotebookIds.length > 0) {
    const { data: companies } = await serviceClient
      .from("companies")
      .select("notebook_id, website")
      .in("notebook_id", allNotebookIds);
    for (const c of (companies ?? []) as Array<{ notebook_id: string; website: string }>) {
      if (c.website) companyByNotebook[c.notebook_id] = c.website;
    }
  }

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
      .order("created_at", { ascending: false })
      .limit(200);

    const filesByNotebook: Record<string, NotebookFile[]> = {};
    for (const file of (allFiles ?? []) as NotebookFile[]) {
      const nid = file.notebook_id;
      if (!filesByNotebook[nid]) filesByNotebook[nid] = [];
      filesByNotebook[nid].push(file);
    }

    return NextResponse.json({ notebooks, sharedNotebooks, filesByNotebook, companyByNotebook }, {
      headers: { "Cache-Control": "private, max-age=15, stale-while-revalidate=60" },
    });
  }

  return NextResponse.json({ notebooks, sharedNotebooks, companyByNotebook }, {
    headers: { "Cache-Control": "private, max-age=15, stale-while-revalidate=60" },
  });
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
