import { authenticateRequest } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isValidUUID, sanitizeText } from "@/lib/validate";
import { NextResponse } from "next/server";

// PATCH /api/notebooks/[id]/notes/[noteId] - update a note
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  const auth = await authenticateRequest(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, noteId } = await params;
  if (!isValidUUID(id) || !isValidUUID(noteId))
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const updates: Record<string, string> = { updated_at: new Date().toISOString() };
  if (body.title !== undefined) updates.title = sanitizeText(body.title).slice(0, 200);
  if (body.content !== undefined) updates.content = sanitizeText(body.content);

  const { data, error } = await supabase
    .from("notes")
    .update(updates)
    .eq("id", noteId)
    .eq("notebook_id", id)
    .eq("user_id", user.id)
    .select("id, notebook_id, title, content, created_at, updated_at")
    .single();

  if (error) return NextResponse.json({ error: "Internal error" }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Note not found" }, { status: 404 });
  return NextResponse.json(data);
}

// DELETE /api/notebooks/[id]/notes/[noteId] - delete a note
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  const auth = await authenticateRequest(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, noteId } = await params;
  if (!isValidUUID(id) || !isValidUUID(noteId))
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await supabase
    .from("notes")
    .delete()
    .eq("id", noteId)
    .eq("notebook_id", id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: "Internal error" }, { status: 500 });
  return NextResponse.json({ success: true });
}
