import { authenticateRequest } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { isValidUUID, sanitizeText } from "@/lib/validate";
import { NextResponse } from "next/server";

// GET /api/notebooks/[id]/notes - list notes for a notebook
export async function GET(
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

  const getLimited = checkRateLimit(`notes-get:${user.id}`, 60, 60_000);
  if (!getLimited) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429, headers: { "Retry-After": "60" } });
  }

  const { data, error } = await supabase
    .from("notes")
    .select("id, notebook_id, title, content, created_at, updated_at")
    .eq("notebook_id", id)
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) return NextResponse.json({ error: "Internal error" }, { status: 500 });
  return NextResponse.json(data);
}

// POST /api/notebooks/[id]/notes - create a note
export async function POST(
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

  const postLimited = checkRateLimit(`notes-post:${user.id}`, 20, 60_000);
  if (!postLimited) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429, headers: { "Retry-After": "60" } });
  }

  // Verify notebook ownership
  const { data: notebook } = await supabase
    .from("notebooks")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
  if (!notebook) return NextResponse.json({ error: "Notebook not found" }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const title = sanitizeText(body.title || "New note").slice(0, 200);
  const content = sanitizeText(body.content || "");

  const { data, error } = await supabase
    .from("notes")
    .insert({ notebook_id: id, user_id: user.id, title, content })
    .select("id, notebook_id, title, content, created_at, updated_at")
    .single();

  if (error) return NextResponse.json({ error: "Internal error" }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
