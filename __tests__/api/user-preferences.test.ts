import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

const mockSupabase = vi.hoisted(() => ({
  auth: {
    getUser: vi.fn(),
    updateUser: vi.fn(),
  },
}));

vi.mock("@/lib/auth", () => ({ authenticateRequest: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue(mockSupabase),
}));
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: vi.fn() }));

describe("PATCH /api/user/preferences", () => {
  let PATCH: (req: Request) => Promise<NextResponse>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("@/app/api/user/preferences/route");
    PATCH = mod.PATCH;
  });

  it("returns 401 if not authenticated", async () => {
    const { authenticateRequest } = await import("@/lib/auth");
    vi.mocked(authenticateRequest).mockResolvedValue(null);

    const req = new Request("http://localhost/api/user/preferences", {
      method: "PATCH",
      body: JSON.stringify({ ai_style: "concise" }),
    });
    const res = await PATCH(req);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toBe("Unauthorized");
  });

  it("returns 401 if user not found", async () => {
    const { authenticateRequest } = await import("@/lib/auth");
    vi.mocked(authenticateRequest).mockResolvedValue({ userId: "user-123" });
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

    const req = new Request("http://localhost/api/user/preferences", {
      method: "PATCH",
      body: JSON.stringify({ ai_style: "concise" }),
    });
    const res = await PATCH(req);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toBe("Unauthorized");
  });

  it("returns 429 if rate limited", async () => {
    const { authenticateRequest } = await import("@/lib/auth");
    const { checkRateLimit } = await import("@/lib/rate-limit");
    vi.mocked(authenticateRequest).mockResolvedValue({ userId: "user-123" });
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-123", user_metadata: {} } },
    });
    vi.mocked(checkRateLimit).mockReturnValue(false);

    const req = new Request("http://localhost/api/user/preferences", {
      method: "PATCH",
      body: JSON.stringify({ ai_style: "concise" }),
    });
    const res = await PATCH(req);
    const json = await res.json();

    expect(res.status).toBe(429);
    expect(json.error).toBe("Rate limit exceeded");
    expect(res.headers.get("Retry-After")).toBe("60");
  });

  it("returns 400 if no valid updates provided", async () => {
    const { authenticateRequest } = await import("@/lib/auth");
    const { checkRateLimit } = await import("@/lib/rate-limit");
    vi.mocked(authenticateRequest).mockResolvedValue({ userId: "user-123" });
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-123", user_metadata: {} } },
    });
    vi.mocked(checkRateLimit).mockReturnValue(true);

    const req = new Request("http://localhost/api/user/preferences", {
      method: "PATCH",
      body: JSON.stringify({ invalid_field: "value" }),
    });
    const res = await PATCH(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("No valid updates");
  });

  it("returns 400 if ai_style is invalid", async () => {
    const { authenticateRequest } = await import("@/lib/auth");
    const { checkRateLimit } = await import("@/lib/rate-limit");
    vi.mocked(authenticateRequest).mockResolvedValue({ userId: "user-123" });
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-123", user_metadata: {} } },
    });
    vi.mocked(checkRateLimit).mockReturnValue(true);

    const req = new Request("http://localhost/api/user/preferences", {
      method: "PATCH",
      body: JSON.stringify({ ai_style: "invalid_style" }),
    });
    const res = await PATCH(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("No valid updates");
  });

  it("returns 400 if accent_color is invalid", async () => {
    const { authenticateRequest } = await import("@/lib/auth");
    const { checkRateLimit } = await import("@/lib/rate-limit");
    vi.mocked(authenticateRequest).mockResolvedValue({ userId: "user-123" });
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-123", user_metadata: {} } },
    });
    vi.mocked(checkRateLimit).mockReturnValue(true);

    const req = new Request("http://localhost/api/user/preferences", {
      method: "PATCH",
      body: JSON.stringify({ accent_color: 999 }),
    });
    const res = await PATCH(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("No valid updates");
  });

  it("returns 500 if update fails", async () => {
    const { authenticateRequest } = await import("@/lib/auth");
    const { checkRateLimit } = await import("@/lib/rate-limit");
    vi.mocked(authenticateRequest).mockResolvedValue({ userId: "user-123" });
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-123", user_metadata: {} } },
    });
    vi.mocked(checkRateLimit).mockReturnValue(true);
    mockSupabase.auth.updateUser.mockResolvedValue({
      error: { message: "Update failed" },
    });

    const req = new Request("http://localhost/api/user/preferences", {
      method: "PATCH",
      body: JSON.stringify({ ai_style: "concise" }),
    });
    const res = await PATCH(req);
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toBe("Internal error");
  });

  it("updates ai_style successfully", async () => {
    const { authenticateRequest } = await import("@/lib/auth");
    const { checkRateLimit } = await import("@/lib/rate-limit");
    vi.mocked(authenticateRequest).mockResolvedValue({ userId: "user-123" });
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-123", user_metadata: {} } },
    });
    vi.mocked(checkRateLimit).mockReturnValue(true);
    mockSupabase.auth.updateUser.mockResolvedValue({ error: null });

    const req = new Request("http://localhost/api/user/preferences", {
      method: "PATCH",
      body: JSON.stringify({ ai_style: "detailed" }),
    });
    const res = await PATCH(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(mockSupabase.auth.updateUser).toHaveBeenCalledWith({
      data: { ai_style: "detailed" },
    });
  });

  it("updates full_name successfully", async () => {
    const { authenticateRequest } = await import("@/lib/auth");
    const { checkRateLimit } = await import("@/lib/rate-limit");
    vi.mocked(authenticateRequest).mockResolvedValue({ userId: "user-123" });
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-123", user_metadata: {} } },
    });
    vi.mocked(checkRateLimit).mockReturnValue(true);
    mockSupabase.auth.updateUser.mockResolvedValue({ error: null });

    const req = new Request("http://localhost/api/user/preferences", {
      method: "PATCH",
      body: JSON.stringify({ full_name: "  John Doe  " }),
    });
    const res = await PATCH(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(mockSupabase.auth.updateUser).toHaveBeenCalledWith({
      data: { full_name: "John Doe" },
    });
  });

  it("updates accent_color successfully", async () => {
    const { authenticateRequest } = await import("@/lib/auth");
    const { checkRateLimit } = await import("@/lib/rate-limit");
    vi.mocked(authenticateRequest).mockResolvedValue({ userId: "user-123" });
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-123", user_metadata: {} } },
    });
    vi.mocked(checkRateLimit).mockReturnValue(true);
    mockSupabase.auth.updateUser.mockResolvedValue({ error: null });

    const req = new Request("http://localhost/api/user/preferences", {
      method: "PATCH",
      body: JSON.stringify({ accent_color: 250 }),
    });
    const res = await PATCH(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(mockSupabase.auth.updateUser).toHaveBeenCalledWith({
      data: { accent_color: "250" },
    });
  });

  it("updates multiple fields simultaneously", async () => {
    const { authenticateRequest } = await import("@/lib/auth");
    const { checkRateLimit } = await import("@/lib/rate-limit");
    vi.mocked(authenticateRequest).mockResolvedValue({ userId: "user-123" });
    mockSupabase.auth.getUser.mockResolvedValue({
      data: {
        user: {
          id: "user-123",
          user_metadata: { old_field: "old_value" },
        },
      },
    });
    vi.mocked(checkRateLimit).mockReturnValue(true);
    mockSupabase.auth.updateUser.mockResolvedValue({ error: null });

    const req = new Request("http://localhost/api/user/preferences", {
      method: "PATCH",
      body: JSON.stringify({
        ai_style: "balanced",
        full_name: "Jane Smith",
        accent_color: 155,
      }),
    });
    const res = await PATCH(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(mockSupabase.auth.updateUser).toHaveBeenCalledWith({
      data: {
        old_field: "old_value",
        ai_style: "balanced",
        full_name: "Jane Smith",
        accent_color: "155",
      },
    });
  });

  it("trims full_name to 100 chars", async () => {
    const { authenticateRequest } = await import("@/lib/auth");
    const { checkRateLimit } = await import("@/lib/rate-limit");
    vi.mocked(authenticateRequest).mockResolvedValue({ userId: "user-123" });
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-123", user_metadata: {} } },
    });
    vi.mocked(checkRateLimit).mockReturnValue(true);
    mockSupabase.auth.updateUser.mockResolvedValue({ error: null });

    const longName = "A".repeat(200);
    const req = new Request("http://localhost/api/user/preferences", {
      method: "PATCH",
      body: JSON.stringify({ full_name: longName }),
    });
    const res = await PATCH(req);

    expect(res.status).toBe(200);
    expect(mockSupabase.auth.updateUser).toHaveBeenCalledWith({
      data: { full_name: "A".repeat(100) },
    });
  });

  it("handles malformed JSON body", async () => {
    const { authenticateRequest } = await import("@/lib/auth");
    const { checkRateLimit } = await import("@/lib/rate-limit");
    vi.mocked(authenticateRequest).mockResolvedValue({ userId: "user-123" });
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-123", user_metadata: {} } },
    });
    vi.mocked(checkRateLimit).mockReturnValue(true);

    const req = new Request("http://localhost/api/user/preferences", {
      method: "PATCH",
      body: "invalid json",
    });
    const res = await PATCH(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("No valid updates");
  });

  it("accepts all valid ai_styles", async () => {
    const { authenticateRequest } = await import("@/lib/auth");
    const { checkRateLimit } = await import("@/lib/rate-limit");
    vi.mocked(authenticateRequest).mockResolvedValue({ userId: "user-123" });
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-123", user_metadata: {} } },
    });
    vi.mocked(checkRateLimit).mockReturnValue(true);
    mockSupabase.auth.updateUser.mockResolvedValue({ error: null });

    const validStyles = ["concise", "balanced", "detailed"];
    for (const style of validStyles) {
      const req = new Request("http://localhost/api/user/preferences", {
        method: "PATCH",
        body: JSON.stringify({ ai_style: style }),
      });
      const res = await PATCH(req);
      expect(res.status).toBe(200);
    }
  });

  it("accepts all valid accent_colors", async () => {
    const { authenticateRequest } = await import("@/lib/auth");
    const { checkRateLimit } = await import("@/lib/rate-limit");
    vi.mocked(authenticateRequest).mockResolvedValue({ userId: "user-123" });
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-123", user_metadata: {} } },
    });
    vi.mocked(checkRateLimit).mockReturnValue(true);
    mockSupabase.auth.updateUser.mockResolvedValue({ error: null });

    const validColors = [250, 290, 350, 80, 155, 200];
    for (const color of validColors) {
      const req = new Request("http://localhost/api/user/preferences", {
        method: "PATCH",
        body: JSON.stringify({ accent_color: color }),
      });
      const res = await PATCH(req);
      expect(res.status).toBe(200);
    }
  });
});
