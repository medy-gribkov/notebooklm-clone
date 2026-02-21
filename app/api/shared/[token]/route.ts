import { getServiceClient } from "@/lib/supabase/service";
import { checkRateLimit } from "@/lib/rate-limit";
import { NextRequest, NextResponse } from "next/server";

// GET /api/shared/[token] - fetch shared notebook data (no auth required)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!checkRateLimit(`ip:${ip}:shared`, 30, 60_000)) {
    return NextResponse.json(
      { error: "Too many requests. Please slow down." },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  const { token } = await params;
  if (!token || token.length < 10 || token.length > 64) {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }

  const supabase = getServiceClient();

  // Validate token
  const { data: tokenData, error: tokenError } = await supabase
    .rpc("validate_share_token", { share_token: token });

  if (tokenError || !tokenData || tokenData.length === 0) {
    return NextResponse.json({ error: "Invalid share link" }, { status: 404 });
  }

  const shareInfo = tokenData[0];
  if (!shareInfo.is_valid) {
    return NextResponse.json({ error: "This share link has expired" }, { status: 410 });
  }

  const notebookId = shareInfo.notebook_id;

  // Fetch notebook metadata
  const { data: notebook } = await supabase
    .from("notebooks")
    .select("id, title, description, status, created_at")
    .eq("id", notebookId)
    .single();

  if (!notebook || notebook.status !== "ready") {
    return NextResponse.json({ error: "Notebook not available" }, { status: 404 });
  }

  // Fetch messages (last 100)
  const { data: messages } = await supabase
    .from("messages")
    .select("id, role, content, sources, created_at")
    .eq("notebook_id", notebookId)
    .order("created_at", { ascending: true })
    .limit(100);

  // Fetch notes
  const { data: notes } = await supabase
    .from("notes")
    .select("id, title, content, created_at")
    .eq("notebook_id", notebookId)
    .order("created_at", { ascending: false });

  // Fetch studio generations
  const { data: generations } = await supabase
    .from("studio_generations")
    .select("id, action, result, created_at")
    .eq("notebook_id", notebookId)
    .order("created_at", { ascending: false });

  return NextResponse.json({
    notebook,
    permissions: shareInfo.permissions,
    messages: messages ?? [],
    notes: notes ?? [],
    generations: generations ?? [],
  });
}
