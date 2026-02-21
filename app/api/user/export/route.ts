import { authenticateRequest } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { NextResponse } from "next/server";

// GET /api/user/export - download all user data as JSON
export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!checkRateLimit(`export:${user.id}`, 1, 3_600_000)) {
    return NextResponse.json(
      { error: "Export rate limit reached. Max 1 export per hour." },
      { status: 429, headers: { "Retry-After": "3600" } }
    );
  }

  // Fetch all user data
  const [notebooks, notes, messages] = await Promise.all([
    supabase.from("notebooks").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5000),
    supabase.from("notes").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5000),
    supabase.from("messages").select("id, notebook_id, role, content, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5000),
  ]);

  const exportData = {
    exported_at: new Date().toISOString(),
    user_email: user.email,
    notebooks: notebooks.data ?? [],
    notes: notes.data ?? [],
    messages: messages.data ?? [],
  };

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="docchat-export-${new Date().toISOString().split("T")[0]}.json"`,
    },
  });
}
