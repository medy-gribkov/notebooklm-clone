import { authenticateRequest } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { isValidUUID, sanitizeText } from "@/lib/validate";
import { NextResponse } from "next/server";

const NOTEBOOK_COLUMNS = "id, user_id, title, file_url, status, page_count, description, created_at";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(_request);
  if (auth === null) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!isValidUUID(id)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limited = checkRateLimit(`notebook-get:${user.id}`, 60, 60_000);
  if (!limited) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429, headers: { "Retry-After": "60" } });
  }

  const { data, error } = await supabase
    .from("notebooks")
    .select(NOTEBOOK_COLUMNS)
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(data);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!isValidUUID(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const patchLimited = checkRateLimit(`notebook-patch:${user.id}`, 20, 60_000);
  if (!patchLimited) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429, headers: { "Retry-After": "60" } });
  }

  const body = await request.json().catch(() => ({}));
  const updates: Record<string, string> = {};
  if (body.title !== undefined) updates.title = sanitizeText(body.title).slice(0, 200);
  if (body.description !== undefined) updates.description = sanitizeText(body.description).slice(0, 500);

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No updates" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("notebooks")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id)
    .select(NOTEBOOK_COLUMNS)
    .single();

  if (error) return NextResponse.json({ error: "Internal error" }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(data);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authDel = await authenticateRequest(_request);
  if (!authDel) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!isValidUUID(id)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const delLimited = checkRateLimit(`notebook-delete:${user.id}`, 5, 60_000);
  if (!delLimited) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429, headers: { "Retry-After": "60" } });
  }

  // Verify ownership before delete
  const { data: notebook } = await supabase
    .from("notebooks")
    .select("id, file_url")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!notebook) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Delete all storage objects (multi-file support)
  const { data: files } = await supabase
    .from("notebook_files")
    .select("storage_path")
    .eq("notebook_id", id)
    .eq("user_id", user.id);

  const storagePaths = (files ?? [])
    .map((f: { storage_path: string }) => f.storage_path)
    .filter(Boolean);

  // Also include legacy file_url if not already covered
  if (notebook.file_url && !storagePaths.includes(notebook.file_url)) {
    storagePaths.push(notebook.file_url);
  }

  if (storagePaths.length > 0) {
    await supabase.storage.from("pdf-uploads").remove(storagePaths);
  }

  const { error } = await supabase
    .from("notebooks")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error("[notebooks/delete] Delete failed:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
