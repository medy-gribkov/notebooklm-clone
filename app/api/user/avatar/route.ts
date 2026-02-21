import { checkRateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const MAX_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

// POST /api/user/avatar - upload avatar image
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const postLimited = checkRateLimit(`avatar-post:${user.id}`, 5, 60_000);
  if (!postLimited) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429, headers: { "Retry-After": "60" } });
  }

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("avatar") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Only JPEG, PNG, and WebP images are allowed" },
      { status: 400 }
    );
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "File must be under 2 MB" },
      { status: 400 }
    );
  }

  const ext = file.type.split("/")[1] === "jpeg" ? "jpg" : file.type.split("/")[1];
  const path = `${user.id}/avatar.${ext}`;

  // Delete old avatar if exists
  const oldUrl = user.user_metadata?.avatar_url as string | undefined;
  if (oldUrl?.startsWith(`${user.id}/`)) {
    await supabase.storage.from("avatars").remove([oldUrl]);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, buffer, {
      contentType: file.type,
      upsert: true,
    });

  if (uploadError) {
    return NextResponse.json(
      { error: "Upload failed: " + uploadError.message },
      { status: 500 }
    );
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from("avatars")
    .getPublicUrl(path);

  // Store path in user metadata
  const { error: updateError } = await supabase.auth.updateUser({
    data: { ...user.user_metadata, avatar_url: path },
  });

  if (updateError) {
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    avatar_url: urlData.publicUrl,
    path,
  });
}

// DELETE /api/user/avatar - remove avatar
export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const delLimited = checkRateLimit(`avatar-delete:${user.id}`, 5, 60_000);
  if (!delLimited) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429, headers: { "Retry-After": "60" } });
  }

  const avatarPath = user.user_metadata?.avatar_url as string | undefined;
  if (avatarPath?.startsWith(`${user.id}/`)) {
    await supabase.storage.from("avatars").remove([avatarPath]);
  }

  const { error } = await supabase.auth.updateUser({
    data: { ...user.user_metadata, avatar_url: null },
  });

  if (error) {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
