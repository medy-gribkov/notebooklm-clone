import { authenticateRequest } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(_request);
  if (auth === null) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify ownership
  const { data: notebook } = await supabase
    .from("notebooks")
    .select("file_url")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!notebook?.file_url) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const serviceClient = getServiceClient();
  const { data, error } = await serviceClient.storage
    .from("pdf-uploads")
    .createSignedUrl(notebook.file_url, 60);

  if (error || !data) {
    console.error("[pdf] Failed to create signed URL:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }

  return NextResponse.json({ url: data.signedUrl });
}
