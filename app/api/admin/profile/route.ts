import { createClient } from "@/lib/supabase/server";
import { getServiceClient } from "@/lib/supabase/service";
import { sanitizeText } from "@/lib/validate";
import { NextResponse } from "next/server";

const ADMIN_USER_ID = process.env.ADMIN_USER_ID;

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !ADMIN_USER_ID || user.id !== ADMIN_USER_ID) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const serviceClient = getServiceClient();
  const { data: profile } = await serviceClient
    .from("admin_profile")
    .select("bio_text, display_name, contact_info, updated_at")
    .eq("user_id", user.id)
    .single();

  return NextResponse.json({ profile: profile ?? null });
}

export async function PUT(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !ADMIN_USER_ID || user.id !== ADMIN_USER_ID) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { bio_text?: string; display_name?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const bioText = body.bio_text;
  if (!bioText || typeof bioText !== "string" || bioText.trim().length < 10) {
    return NextResponse.json({ error: "Bio text must be at least 10 characters" }, { status: 400 });
  }

  const sanitized = sanitizeText(bioText);
  const displayName = body.display_name?.trim().slice(0, 100) ?? null;

  const serviceClient = getServiceClient();
  const { data: existing } = await serviceClient
    .from("admin_profile")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (existing) {
    const { error } = await serviceClient
      .from("admin_profile")
      .update({
        bio_text: sanitized,
        display_name: displayName,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
    }
  } else {
    const { error } = await serviceClient
      .from("admin_profile")
      .insert({
        user_id: user.id,
        bio_text: sanitized,
        display_name: displayName,
      });

    if (error) {
      return NextResponse.json({ error: "Failed to create profile" }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}
