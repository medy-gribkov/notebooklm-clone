import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

const { mockFrom, mockSupabase } = vi.hoisted(() => {
  const mockFrom = vi.fn();
  const mockSupabase = {
    auth: { getUser: vi.fn() },
    from: mockFrom,
  };
  return { mockFrom, mockSupabase };
});

vi.mock("@/lib/auth", () => ({ authenticateRequest: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue(mockSupabase),
}));
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: vi.fn() }));
vi.mock("@/lib/validate", () => ({
  isValidUUID: vi.fn((id) => id !== "invalid-uuid"),
  sanitizeText: vi.fn((text) => text),
}));

describe("GET /api/notebooks/[id]/notes", () => {
  let GET: (
    req: Request,
    context: { params: Promise<{ id: string }> }
  ) => Promise<NextResponse>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import(
      "@/app/api/notebooks/[id]/notes/route"
    );
    GET = mod.GET;
  });

  it("returns 401 if not authenticated", async () => {
    const { authenticateRequest } = await import("@/lib/auth");
    vi.mocked(authenticateRequest).mockResolvedValue(null);

    const req = new Request("http://localhost/api/notebooks/test-id/notes");
    const res = await GET(req, { params: Promise.resolve({ id: "test-id" }) });
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toBe("Unauthorized");
  });

  it("returns 400 if ID is invalid", async () => {
    const { authenticateRequest } = await import("@/lib/auth");
    vi.mocked(authenticateRequest).mockResolvedValue({ userId: "user-123" });

    const req = new Request("http://localhost/api/notebooks/invalid-uuid/notes");
    const res = await GET(req, {
      params: Promise.resolve({ id: "invalid-uuid" }),
    });
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("Invalid ID");
  });

  it("returns 401 if user not found", async () => {
    const { authenticateRequest } = await import("@/lib/auth");
    vi.mocked(authenticateRequest).mockResolvedValue({ userId: "user-123" });
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

    const req = new Request("http://localhost/api/notebooks/test-id/notes");
    const res = await GET(req, { params: Promise.resolve({ id: "test-id" }) });
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toBe("Unauthorized");
  });

  it("returns 429 if rate limited", async () => {
    const { authenticateRequest } = await import("@/lib/auth");
    const { checkRateLimit } = await import("@/lib/rate-limit");
    vi.mocked(authenticateRequest).mockResolvedValue({ userId: "user-123" });
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
    });
    vi.mocked(checkRateLimit).mockReturnValue(false);

    const req = new Request("http://localhost/api/notebooks/test-id/notes");
    const res = await GET(req, { params: Promise.resolve({ id: "test-id" }) });
    const json = await res.json();

    expect(res.status).toBe(429);
    expect(json.error).toBe("Rate limit exceeded");
    expect(res.headers.get("Retry-After")).toBe("60");
  });

  it("returns 500 if database query fails", async () => {
    const { authenticateRequest } = await import("@/lib/auth");
    const { checkRateLimit } = await import("@/lib/rate-limit");
    vi.mocked(authenticateRequest).mockResolvedValue({ userId: "user-123" });
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
    });
    vi.mocked(checkRateLimit).mockReturnValue(true);

    const mockChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: null, error: { message: "DB error" } }),
    };
    mockFrom.mockReturnValue(mockChain);

    const req = new Request("http://localhost/api/notebooks/test-id/notes");
    const res = await GET(req, { params: Promise.resolve({ id: "test-id" }) });
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toBe("Internal error");
  });

  it("returns 200 with notes list", async () => {
    const { authenticateRequest } = await import("@/lib/auth");
    const { checkRateLimit } = await import("@/lib/rate-limit");
    vi.mocked(authenticateRequest).mockResolvedValue({ userId: "user-123" });
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
    });
    vi.mocked(checkRateLimit).mockReturnValue(true);

    const mockNotes = [
      { id: "note-1", title: "First note", content: "Content 1" },
      { id: "note-2", title: "Second note", content: "Content 2" },
    ];
    const mockChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: mockNotes, error: null }),
    };
    mockFrom.mockReturnValue(mockChain);

    const req = new Request("http://localhost/api/notebooks/test-id/notes");
    const res = await GET(req, { params: Promise.resolve({ id: "test-id" }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual(mockNotes);
    expect(mockChain.eq).toHaveBeenCalledWith("notebook_id", "test-id");
    expect(mockChain.eq).toHaveBeenCalledWith("user_id", "user-123");
  });
});

describe("POST /api/notebooks/[id]/notes", () => {
  let POST: (
    req: Request,
    context: { params: Promise<{ id: string }> }
  ) => Promise<NextResponse>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import(
      "@/app/api/notebooks/[id]/notes/route"
    );
    POST = mod.POST;
  });

  it("returns 401 if not authenticated", async () => {
    const { authenticateRequest } = await import("@/lib/auth");
    vi.mocked(authenticateRequest).mockResolvedValue(null);

    const req = new Request("http://localhost/api/notebooks/test-id/notes", {
      method: "POST",
      body: JSON.stringify({ title: "New note" }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: "test-id" }) });
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toBe("Unauthorized");
  });

  it("returns 400 if ID is invalid", async () => {
    const { authenticateRequest } = await import("@/lib/auth");
    vi.mocked(authenticateRequest).mockResolvedValue({ userId: "user-123" });

    const req = new Request("http://localhost/api/notebooks/invalid-uuid/notes", {
      method: "POST",
      body: JSON.stringify({ title: "New note" }),
    });
    const res = await POST(req, {
      params: Promise.resolve({ id: "invalid-uuid" }),
    });
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("Invalid ID");
  });

  it("returns 429 if rate limited", async () => {
    const { authenticateRequest } = await import("@/lib/auth");
    const { checkRateLimit } = await import("@/lib/rate-limit");
    vi.mocked(authenticateRequest).mockResolvedValue({ userId: "user-123" });
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
    });
    vi.mocked(checkRateLimit).mockReturnValue(false);

    const req = new Request("http://localhost/api/notebooks/test-id/notes", {
      method: "POST",
      body: JSON.stringify({ title: "New note" }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: "test-id" }) });
    const json = await res.json();

    expect(res.status).toBe(429);
    expect(json.error).toBe("Rate limit exceeded");
  });

  it("returns 404 if notebook not found", async () => {
    const { authenticateRequest } = await import("@/lib/auth");
    const { checkRateLimit } = await import("@/lib/rate-limit");
    vi.mocked(authenticateRequest).mockResolvedValue({ userId: "user-123" });
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
    });
    vi.mocked(checkRateLimit).mockReturnValue(true);

    const mockNotebookChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    mockFrom.mockReturnValue(mockNotebookChain);

    const req = new Request("http://localhost/api/notebooks/test-id/notes", {
      method: "POST",
      body: JSON.stringify({ title: "New note" }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: "test-id" }) });
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error).toBe("Notebook not found");
  });

  it("returns 500 if insert fails", async () => {
    const { authenticateRequest } = await import("@/lib/auth");
    const { checkRateLimit } = await import("@/lib/rate-limit");
    vi.mocked(authenticateRequest).mockResolvedValue({ userId: "user-123" });
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
    });
    vi.mocked(checkRateLimit).mockReturnValue(true);

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // First call: notebook verification
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { id: "test-id" }, error: null }),
        };
      }
      // Second call: insert note
      return {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { message: "Insert failed" } }),
      };
    });

    const req = new Request("http://localhost/api/notebooks/test-id/notes", {
      method: "POST",
      body: JSON.stringify({ title: "New note" }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: "test-id" }) });
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toBe("Internal error");
  });

  it("returns 201 with created note", async () => {
    const { authenticateRequest } = await import("@/lib/auth");
    const { checkRateLimit } = await import("@/lib/rate-limit");
    vi.mocked(authenticateRequest).mockResolvedValue({ userId: "user-123" });
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
    });
    vi.mocked(checkRateLimit).mockReturnValue(true);

    const createdNote = {
      id: "note-123",
      notebook_id: "test-id",
      title: "Test note",
      content: "Test content",
      created_at: "2026-03-02T00:00:00Z",
      updated_at: "2026-03-02T00:00:00Z",
    };

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { id: "test-id" }, error: null }),
        };
      }
      return {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: createdNote, error: null }),
      };
    });

    const req = new Request("http://localhost/api/notebooks/test-id/notes", {
      method: "POST",
      body: JSON.stringify({ title: "Test note", content: "Test content" }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: "test-id" }) });
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json).toEqual(createdNote);
  });

  it("uses defaults when title/content missing", async () => {
    const { authenticateRequest } = await import("@/lib/auth");
    const { checkRateLimit } = await import("@/lib/rate-limit");
    const { sanitizeText } = await import("@/lib/validate");
    vi.mocked(authenticateRequest).mockResolvedValue({ userId: "user-123" });
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
    });
    vi.mocked(checkRateLimit).mockReturnValue(true);

    const createdNote = { id: "note-123", title: "New note", content: "" };

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { id: "test-id" }, error: null }),
        };
      }
      return {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: createdNote, error: null }),
      };
    });

    const req = new Request("http://localhost/api/notebooks/test-id/notes", {
      method: "POST",
      body: JSON.stringify({}),
    });
    await POST(req, { params: Promise.resolve({ id: "test-id" }) });

    expect(sanitizeText).toHaveBeenCalledWith("New note");
    expect(sanitizeText).toHaveBeenCalledWith("");
  });
});

describe("PATCH /api/notebooks/[id]/notes/[noteId]", () => {
  let PATCH: (
    req: Request,
    context: { params: Promise<{ id: string; noteId: string }> }
  ) => Promise<NextResponse>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import(
      "@/app/api/notebooks/[id]/notes/[noteId]/route"
    );
    PATCH = mod.PATCH;
  });

  it("returns 401 if not authenticated", async () => {
    const { authenticateRequest } = await import("@/lib/auth");
    vi.mocked(authenticateRequest).mockResolvedValue(null);

    const req = new Request("http://localhost/api/notebooks/nb-1/notes/note-1", {
      method: "PATCH",
      body: JSON.stringify({ title: "Updated" }),
    });
    const res = await PATCH(req, {
      params: Promise.resolve({ id: "nb-1", noteId: "note-1" }),
    });
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toBe("Unauthorized");
  });

  it("returns 400 if ID is invalid", async () => {
    const { authenticateRequest } = await import("@/lib/auth");
    vi.mocked(authenticateRequest).mockResolvedValue({ userId: "user-123" });

    const req = new Request("http://localhost/api/notebooks/invalid/notes/note-1", {
      method: "PATCH",
      body: JSON.stringify({ title: "Updated" }),
    });
    const res = await PATCH(req, {
      params: Promise.resolve({ id: "invalid-uuid", noteId: "note-1" }),
    });
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("Invalid ID");
  });

  it("returns 404 if note not found", async () => {
    const { authenticateRequest } = await import("@/lib/auth");
    vi.mocked(authenticateRequest).mockResolvedValue({ userId: "user-123" });
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
    });

    const mockChain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    mockFrom.mockReturnValue(mockChain);

    const req = new Request("http://localhost/api/notebooks/nb-1/notes/note-1", {
      method: "PATCH",
      body: JSON.stringify({ title: "Updated" }),
    });
    const res = await PATCH(req, {
      params: Promise.resolve({ id: "nb-1", noteId: "note-1" }),
    });
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error).toBe("Note not found");
  });

  it("returns 500 if update fails", async () => {
    const { authenticateRequest } = await import("@/lib/auth");
    vi.mocked(authenticateRequest).mockResolvedValue({ userId: "user-123" });
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
    });

    const mockChain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { message: "Update failed" } }),
    };
    mockFrom.mockReturnValue(mockChain);

    const req = new Request("http://localhost/api/notebooks/nb-1/notes/note-1", {
      method: "PATCH",
      body: JSON.stringify({ title: "Updated" }),
    });
    const res = await PATCH(req, {
      params: Promise.resolve({ id: "nb-1", noteId: "note-1" }),
    });
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toBe("Internal error");
  });

  it("returns 200 with updated note", async () => {
    const { authenticateRequest } = await import("@/lib/auth");
    vi.mocked(authenticateRequest).mockResolvedValue({ userId: "user-123" });
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
    });

    const updatedNote = {
      id: "note-1",
      notebook_id: "nb-1",
      title: "Updated title",
      content: "Original content",
      created_at: "2026-03-01T00:00:00Z",
      updated_at: "2026-03-02T00:00:00Z",
    };

    const mockChain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: updatedNote, error: null }),
    };
    mockFrom.mockReturnValue(mockChain);

    const req = new Request("http://localhost/api/notebooks/nb-1/notes/note-1", {
      method: "PATCH",
      body: JSON.stringify({ title: "Updated title" }),
    });
    const res = await PATCH(req, {
      params: Promise.resolve({ id: "nb-1", noteId: "note-1" }),
    });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual(updatedNote);
    expect(mockChain.eq).toHaveBeenCalledWith("id", "note-1");
    expect(mockChain.eq).toHaveBeenCalledWith("notebook_id", "nb-1");
    expect(mockChain.eq).toHaveBeenCalledWith("user_id", "user-123");
  });
});

describe("DELETE /api/notebooks/[id]/notes/[noteId]", () => {
  let DELETE: (
    req: Request,
    context: { params: Promise<{ id: string; noteId: string }> }
  ) => Promise<NextResponse>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import(
      "@/app/api/notebooks/[id]/notes/[noteId]/route"
    );
    DELETE = mod.DELETE;
  });

  it("returns 401 if not authenticated", async () => {
    const { authenticateRequest } = await import("@/lib/auth");
    vi.mocked(authenticateRequest).mockResolvedValue(null);

    const req = new Request("http://localhost/api/notebooks/nb-1/notes/note-1", {
      method: "DELETE",
    });
    const res = await DELETE(req, {
      params: Promise.resolve({ id: "nb-1", noteId: "note-1" }),
    });
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toBe("Unauthorized");
  });

  it("returns 400 if IDs are invalid", async () => {
    const { authenticateRequest } = await import("@/lib/auth");
    vi.mocked(authenticateRequest).mockResolvedValue({ userId: "user-123" });

    const req = new Request("http://localhost/api/notebooks/invalid/notes/also-invalid", {
      method: "DELETE",
    });
    const res = await DELETE(req, {
      params: Promise.resolve({ id: "invalid-uuid", noteId: "also-invalid" }),
    });
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("Invalid ID");
  });

  it("returns 500 if delete fails", async () => {
    const { authenticateRequest } = await import("@/lib/auth");
    vi.mocked(authenticateRequest).mockResolvedValue({ userId: "user-123" });
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
    });

    const mockChain = {
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
    };
    // Last eq call returns error
    mockChain.eq = vi.fn()
      .mockReturnValueOnce(mockChain)
      .mockReturnValueOnce(mockChain)
      .mockResolvedValue({ error: { message: "Delete failed" } });
    mockFrom.mockReturnValue(mockChain);

    const req = new Request("http://localhost/api/notebooks/nb-1/notes/note-1", {
      method: "DELETE",
    });
    const res = await DELETE(req, {
      params: Promise.resolve({ id: "nb-1", noteId: "note-1" }),
    });
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toBe("Internal error");
  });

  it("returns 200 on successful deletion", async () => {
    const { authenticateRequest } = await import("@/lib/auth");
    vi.mocked(authenticateRequest).mockResolvedValue({ userId: "user-123" });
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
    });

    const mockChain = {
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
    };
    // Last eq call returns success
    mockChain.eq = vi.fn()
      .mockReturnValueOnce(mockChain)
      .mockReturnValueOnce(mockChain)
      .mockResolvedValue({ error: null });
    mockFrom.mockReturnValue(mockChain);

    const req = new Request("http://localhost/api/notebooks/nb-1/notes/note-1", {
      method: "DELETE",
    });
    const res = await DELETE(req, {
      params: Promise.resolve({ id: "nb-1", noteId: "note-1" }),
    });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(mockChain.eq).toHaveBeenCalledWith("id", "note-1");
    expect(mockChain.eq).toHaveBeenCalledWith("notebook_id", "nb-1");
    expect(mockChain.eq).toHaveBeenCalledWith("user_id", "user-123");
  });
});
