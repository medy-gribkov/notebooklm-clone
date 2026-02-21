import { authenticateRequest } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { isValidUUID } from "@/lib/validate";
import { buildNotebookExport, buildNotebookJSON } from "@/lib/export";
import { NextRequest, NextResponse } from "next/server";

// GET /api/notebooks/[id]/export?format=md|json
export async function GET(
  request: NextRequest,
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

  if (!checkRateLimit(user.id + ":export", 5, 3_600_000)) {
    return NextResponse.json(
      { error: "Export limit reached. Try again later." },
      { status: 429, headers: { "Retry-After": "3600" } }
    );
  }

  // Verify ownership or membership
  const { data: notebook } = await supabase
    .from("notebooks")
    .select("id, title, description, created_at")
    .eq("id", notebookId)
    .eq("user_id", user.id)
    .single();

  if (!notebook) {
    return NextResponse.json({ error: "Notebook not found" }, { status: 404 });
  }

  // Fetch all data
  const [messagesResult, notesResult, generationsResult] = await Promise.all([
    supabase
      .from("messages")
      .select("id, role, content, sources, created_at, notebook_id, user_id")
      .eq("notebook_id", notebookId)
      .order("created_at", { ascending: true })
      .limit(500),
    supabase
      .from("notes")
      .select("id, notebook_id, title, content, created_at, updated_at")
      .eq("notebook_id", notebookId)
      .order("created_at", { ascending: false }),
    supabase
      .from("studio_generations")
      .select("id, notebook_id, user_id, action, result, created_at")
      .eq("notebook_id", notebookId)
      .order("created_at", { ascending: false }),
  ]);

  const messages = messagesResult.data ?? [];
  const notes = notesResult.data ?? [];
  const generations = generationsResult.data ?? [];

  const format = request.nextUrl.searchParams.get("format") || "md";
  const safeTitle = notebook.title.replace(/[^a-zA-Z0-9-_ ]/g, "").slice(0, 50);

  if (format === "json") {
    const json = buildNotebookJSON(
      notebook as { id: string; user_id: string; title: string; file_url: string | null; status: "ready"; page_count: number | null; description: string | null; created_at: string },
      messages,
      notes,
      generations
    );
    return new NextResponse(JSON.stringify(json, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${safeTitle}.json"`,
      },
    });
  }

  // Default: markdown
  const md = buildNotebookExport(
    notebook as { id: string; user_id: string; title: string; file_url: string | null; status: "ready"; page_count: number | null; description: string | null; created_at: string },
    messages,
    notes,
    generations
  );
  return new NextResponse(md, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${safeTitle}.md"`,
    },
  });
}
