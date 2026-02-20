import { authenticateRequest } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isValidUUID } from "@/lib/validate";
import { NextRequest, NextResponse } from "next/server";

// GET /api/notebooks/[id]/generations — list saved generations
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

  const { data, error } = await supabase
    .from("studio_generations")
    .select("id, notebook_id, action, result, created_at")
    .eq("notebook_id", id)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST /api/notebooks/[id]/generations — save a generation
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

  // Verify notebook ownership
  const { data: notebook } = await supabase
    .from("notebooks")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
  if (!notebook) return NextResponse.json({ error: "Notebook not found" }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const { action, result } = body as { action: string; result: unknown };

  if (!action || typeof action !== "string") {
    return NextResponse.json({ error: "Missing action" }, { status: 400 });
  }
  if (!result) {
    return NextResponse.json({ error: "Missing result" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("studio_generations")
    .insert({ notebook_id: id, user_id: user.id, action, result })
    .select("id, notebook_id, action, result, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

// DELETE /api/notebooks/[id]/generations?generationId=uuid
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const generationId = request.nextUrl.searchParams.get("generationId");

  if (!isValidUUID(id) || !generationId || !isValidUUID(generationId)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await supabase
    .from("studio_generations")
    .delete()
    .eq("id", generationId)
    .eq("notebook_id", id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
