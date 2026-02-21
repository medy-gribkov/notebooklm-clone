import { authenticateRequest } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getServiceClient } from "@/lib/supabase/service";
import { checkRateLimit } from "@/lib/rate-limit";
import { isValidUUID } from "@/lib/validate";
import { NextResponse } from "next/server";

// GET /api/notebooks/[id]/members - list members
export async function GET(
  request: Request,
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

  // Check ownership or membership
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

  const { data: members } = await serviceClient
    .from("notebook_members")
    .select("id, user_id, role, created_at")
    .eq("notebook_id", notebookId)
    .order("created_at", { ascending: true });

  // Fetch user emails for display
  const memberList = [];
  for (const member of members ?? []) {
    const { data: userData } = await serviceClient.auth.admin.getUserById(member.user_id);
    memberList.push({
      ...member,
      email: userData?.user?.email ?? "Unknown",
      display_name: userData?.user?.user_metadata?.display_name ?? userData?.user?.email ?? "Unknown",
    });
  }

  return NextResponse.json({
    members: memberList,
    isOwner,
  });
}

// POST /api/notebooks/[id]/members - invite a member
export async function POST(
  request: Request,
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

  if (!checkRateLimit(user.id + ":members", 20, 3_600_000)) {
    return NextResponse.json(
      { error: "Too many invitations. Try again later." },
      { status: 429, headers: { "Retry-After": "3600" } }
    );
  }

  // Verify ownership
  const { data: notebook } = await supabase
    .from("notebooks")
    .select("id")
    .eq("id", notebookId)
    .eq("user_id", user.id)
    .single();

  if (!notebook) {
    return NextResponse.json({ error: "Notebook not found" }, { status: 404 });
  }

  let body: { email?: string; role?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.email || typeof body.email !== "string") {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const role = body.role === "editor" ? "editor" : "viewer";

  // Look up user by email
  const serviceClient = getServiceClient();
  const { data: userList } = await serviceClient.auth.admin.listUsers();
  const invitedUser = userList?.users?.find(
    (u: { email?: string }) => u.email?.toLowerCase() === body.email?.toLowerCase()
  );

  if (!invitedUser) {
    return NextResponse.json(
      { error: "User not found. They must sign up first." },
      { status: 404 }
    );
  }

  if (invitedUser.id === user.id) {
    return NextResponse.json(
      { error: "You cannot invite yourself" },
      { status: 400 }
    );
  }

  // Insert membership
  const { error } = await serviceClient
    .from("notebook_members")
    .upsert(
      {
        notebook_id: notebookId,
        user_id: invitedUser.id,
        role,
        invited_by: user.id,
      },
      { onConflict: "notebook_id,user_id" }
    );

  if (error) {
    console.error("[members] Failed to add member:", error.message);
    return NextResponse.json(
      { error: "Failed to add member" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    member: {
      user_id: invitedUser.id,
      email: invitedUser.email,
      role,
    },
  }, { status: 201 });
}

// DELETE /api/notebooks/[id]/members - remove a member
export async function DELETE(
  request: Request,
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

  // Verify ownership
  const { data: notebook } = await supabase
    .from("notebooks")
    .select("id")
    .eq("id", notebookId)
    .eq("user_id", user.id)
    .single();

  if (!notebook) {
    return NextResponse.json({ error: "Notebook not found" }, { status: 404 });
  }

  let body: { userId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.userId || !isValidUUID(body.userId)) {
    return NextResponse.json({ error: "Valid userId is required" }, { status: 400 });
  }

  const serviceClient = getServiceClient();
  const { error } = await serviceClient
    .from("notebook_members")
    .delete()
    .eq("notebook_id", notebookId)
    .eq("user_id", body.userId);

  if (error) {
    console.error("[members] Failed to remove member:", error.message);
    return NextResponse.json(
      { error: "Failed to remove member" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
