import { authenticateRequest } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { getServiceClient } from "@/lib/supabase/service";
import { isValidUUID } from "@/lib/validate";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (auth === null) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const notebookId = searchParams.get("notebookId");

  if (!notebookId || !isValidUUID(notebookId)) {
    return NextResponse.json({ error: "Valid notebookId required" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limited = checkRateLimit(`messages-get:${user.id}`, 60, 60_000);
  if (!limited) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429, headers: { "Retry-After": "60" } });
  }

  // Check if user owns the notebook or is a member
  const serviceClient = getServiceClient();
  const { data: notebook } = await serviceClient
    .from("notebooks")
    .select("id, user_id")
    .eq("id", notebookId)
    .single();

  if (!notebook) {
    return NextResponse.json({ error: "Notebook not found" }, { status: 404 });
  }

  const isOwner = notebook.user_id === user.id;
  if (!isOwner) {
    const { data: membership } = await serviceClient
      .from("notebook_members")
      .select("role")
      .eq("notebook_id", notebookId)
      .eq("user_id", user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: "Notebook not found" }, { status: 404 });
    }
  }

  // For shared notebooks, return ALL messages (from all users)
  const { data, error } = await serviceClient
    .from("messages")
    .select("id, notebook_id, user_id, role, content, sources, created_at")
    .eq("notebook_id", notebookId)
    .order("created_at", { ascending: true })
    .limit(100);

  if (error) {
    console.error("[messages] Failed to fetch messages:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }

  return NextResponse.json(data);
}
