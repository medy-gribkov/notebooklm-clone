import { authenticateRequest } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { generateShareToken } from "@/lib/share";
import { checkRateLimit } from "@/lib/rate-limit";
import { isValidUUID } from "@/lib/validate";
import { NextResponse } from "next/server";

// GET /api/notebooks/[id]/share - list active shared links
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(request);
  if (!auth) {
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

  const { data: links } = await supabase
    .from("shared_links")
    .select("id, token, permissions, expires_at, is_active, created_at")
    .eq("notebook_id", notebookId)
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  return NextResponse.json({ links: links ?? [] });
}

// POST /api/notebooks/[id]/share - create a new shared link
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(request);
  if (!auth) {
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

  if (!checkRateLimit(user.id + ":share", 10, 3_600_000)) {
    return NextResponse.json(
      { error: "Too many share links created. Try again later." },
      { status: 429, headers: { "Retry-After": "3600" } }
    );
  }

  // Verify notebook ownership
  const { data: notebook } = await supabase
    .from("notebooks")
    .select("id, status")
    .eq("id", notebookId)
    .eq("user_id", user.id)
    .single();

  if (!notebook) {
    return NextResponse.json({ error: "Notebook not found" }, { status: 404 });
  }

  if (notebook.status !== "ready") {
    return NextResponse.json(
      { error: "Notebook is still processing" },
      { status: 400 }
    );
  }

  let body: { permissions?: string; expiresInDays?: number };
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const permissions = body.permissions === "chat" ? "chat" : "view";
  const expiresAt = body.expiresInDays
    ? new Date(Date.now() + body.expiresInDays * 86_400_000).toISOString()
    : null;

  const token = generateShareToken();

  const { data: link, error } = await supabase
    .from("shared_links")
    .insert({
      notebook_id: notebookId,
      user_id: user.id,
      token,
      permissions,
      expires_at: expiresAt,
    })
    .select("id, token, permissions, expires_at, created_at")
    .single();

  if (error) {
    console.error("[share] Failed to create link:", error.message);
    return NextResponse.json(
      { error: "Failed to create share link" },
      { status: 500 }
    );
  }

  return NextResponse.json({ link }, { status: 201 });
}

// DELETE /api/notebooks/[id]/share - revoke a shared link
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(request);
  if (!auth) {
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

  let body: { token?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  if (!body.token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const { error } = await supabase
    .from("shared_links")
    .update({ is_active: false })
    .eq("notebook_id", notebookId)
    .eq("user_id", user.id)
    .eq("token", body.token);

  if (error) {
    console.error("[share] Failed to revoke link:", error.message);
    return NextResponse.json(
      { error: "Failed to revoke share link" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
