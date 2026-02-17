import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const notebookId = searchParams.get("notebookId");

  if (!notebookId) {
    return NextResponse.json({ error: "notebookId required" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("notebook_id", notebookId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(100);

  if (error) {
    console.error("[messages] Failed to fetch messages:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }

  return NextResponse.json(data);
}
