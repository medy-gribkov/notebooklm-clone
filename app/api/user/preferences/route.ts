import { authenticateRequest } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const VALID_AI_STYLES = ["concise", "balanced", "detailed"];
const VALID_ACCENT_HUES = [250, 290, 350, 80, 155, 200];

// PATCH /api/user/preferences - update user metadata
export async function PATCH(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limited = checkRateLimit(`preferences-patch:${user.id}`, 10, 60_000);
  if (!limited) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429, headers: { "Retry-After": "60" } });
  }

  const body = await request.json().catch(() => ({}));
  const updates: Record<string, string> = {};

  if (body.ai_style && VALID_AI_STYLES.includes(body.ai_style)) {
    updates.ai_style = body.ai_style;
  }

  if (typeof body.full_name === "string") {
    const trimmed = body.full_name.trim().slice(0, 100);
    updates.full_name = trimmed;
  }

  if (typeof body.accent_color === "number" && VALID_ACCENT_HUES.includes(body.accent_color)) {
    updates.accent_color = String(body.accent_color);
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid updates" }, { status: 400 });
  }

  const { error } = await supabase.auth.updateUser({
    data: { ...user.user_metadata, ...updates },
  });

  if (error) return NextResponse.json({ error: "Internal error" }, { status: 500 });
  return NextResponse.json({ success: true });
}
