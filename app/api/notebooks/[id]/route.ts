import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("notebooks")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(data);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

  // Delete storage object
  if (notebook.file_url) {
    const path = notebook.file_url.split("/pdf-uploads/")[1];
    if (path) {
      await supabase.storage.from("pdf-uploads").remove([path]);
    }
  }

  const { error } = await supabase
    .from("notebooks")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
