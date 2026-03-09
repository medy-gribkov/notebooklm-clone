import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

const mockSupabase = vi.hoisted(() => ({
  auth: {
    getUser: vi.fn(),
    updateUser: vi.fn(),
  },
  storage: {
    from: vi.fn(),
  },
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue(mockSupabase),
}));
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: vi.fn() }));

describe("POST /api/user/avatar", () => {
  let POST: (req: Request) => Promise<NextResponse>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("@/app/api/user/avatar/route");
    POST = mod.POST;
  });

  it("returns 401 if not authenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

    const formData = new FormData();
    formData.append("avatar", new File([], "test.jpg"));
    const req = new Request("http://localhost/api/user/avatar", {
      method: "POST",
      body: formData,
    });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toBe("Unauthorized");
  });

  it("returns 429 if rate limited", async () => {
    const { checkRateLimit } = await import("@/lib/rate-limit");
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-123", user_metadata: {} } },
    });
    vi.mocked(checkRateLimit).mockReturnValue(false);

    const formData = new FormData();
    formData.append("avatar", new File([], "test.jpg"));
    const req = new Request("http://localhost/api/user/avatar", {
      method: "POST",
      body: formData,
    });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(429);
    expect(json.error).toBe("Rate limit exceeded");
    expect(res.headers.get("Retry-After")).toBe("60");
  });

  it("returns 400 if form data is invalid", async () => {
    const { checkRateLimit } = await import("@/lib/rate-limit");
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-123", user_metadata: {} } },
    });
    vi.mocked(checkRateLimit).mockReturnValue(true);

    const req = new Request("http://localhost/api/user/avatar", {
      method: "POST",
      body: "not form data",
    });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("Invalid form data");
  });

  it("returns 400 if no file provided", async () => {
    const { checkRateLimit } = await import("@/lib/rate-limit");
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-123", user_metadata: {} } },
    });
    vi.mocked(checkRateLimit).mockReturnValue(true);

    const formData = new FormData();
    const req = new Request("http://localhost/api/user/avatar", {
      method: "POST",
      body: formData,
    });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("No file provided");
  });

  it("returns 400 if file type is not allowed", async () => {
    const { checkRateLimit } = await import("@/lib/rate-limit");
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-123", user_metadata: {} } },
    });
    vi.mocked(checkRateLimit).mockReturnValue(true);

    const formData = new FormData();
    const file = new File(["content"], "test.gif", { type: "image/gif" });
    formData.append("avatar", file);
    const req = new Request("http://localhost/api/user/avatar", {
      method: "POST",
      body: formData,
    });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("Only JPEG, PNG, and WebP images are allowed");
  });

  it("returns 400 if file size exceeds 2MB", async () => {
    const { checkRateLimit } = await import("@/lib/rate-limit");
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-123", user_metadata: {} } },
    });
    vi.mocked(checkRateLimit).mockReturnValue(true);

    const formData = new FormData();
    const largeContent = new Uint8Array(3 * 1024 * 1024); // 3MB
    const file = new File([largeContent], "large.jpg", { type: "image/jpeg" });
    Object.defineProperty(file, "size", { value: 3 * 1024 * 1024 });
    formData.append("avatar", file);

    const req = new Request("http://localhost/api/user/avatar", {
      method: "POST",
      body: formData,
    });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("File must be under 2 MB");
  });

  it("returns 500 if upload fails", async () => {
    const { checkRateLimit } = await import("@/lib/rate-limit");
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-123", user_metadata: {} } },
    });
    vi.mocked(checkRateLimit).mockReturnValue(true);

    const mockStorageChain = {
      remove: vi.fn().mockResolvedValue({}),
      upload: vi
        .fn()
        .mockResolvedValue({ error: { message: "Upload failed" } }),
    };
    mockSupabase.storage.from.mockReturnValue(mockStorageChain);

    const formData = new FormData();
    const file = new File(["content"], "test.jpg", { type: "image/jpeg" });
    formData.append("avatar", file);

    const req = new Request("http://localhost/api/user/avatar", {
      method: "POST",
      body: formData,
    });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toContain("Upload failed");
  });

  it("returns 500 if user update fails", async () => {
    const { checkRateLimit } = await import("@/lib/rate-limit");
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-123", user_metadata: {} } },
    });
    vi.mocked(checkRateLimit).mockReturnValue(true);

    const mockStorageChain = {
      remove: vi.fn().mockResolvedValue({}),
      upload: vi.fn().mockResolvedValue({ error: null }),
      getPublicUrl: vi
        .fn()
        .mockReturnValue({ data: { publicUrl: "http://url.com/avatar.jpg" } }),
    };
    mockSupabase.storage.from.mockReturnValue(mockStorageChain);
    mockSupabase.auth.updateUser.mockResolvedValue({
      error: { message: "Update failed" },
    });

    const formData = new FormData();
    const file = new File(["content"], "test.jpg", { type: "image/jpeg" });
    formData.append("avatar", file);

    const req = new Request("http://localhost/api/user/avatar", {
      method: "POST",
      body: formData,
    });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toBe("Failed to update profile");
  });

  it("uploads JPEG avatar successfully", async () => {
    const { checkRateLimit } = await import("@/lib/rate-limit");
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-123", user_metadata: {} } },
    });
    vi.mocked(checkRateLimit).mockReturnValue(true);

    const mockStorageChain = {
      remove: vi.fn().mockResolvedValue({}),
      upload: vi.fn().mockResolvedValue({ error: null }),
      getPublicUrl: vi
        .fn()
        .mockReturnValue({ data: { publicUrl: "http://cdn.com/user-123/avatar.jpg" } }),
    };
    mockSupabase.storage.from.mockReturnValue(mockStorageChain);
    mockSupabase.auth.updateUser.mockResolvedValue({ error: null });

    const formData = new FormData();
    const file = new File(["jpeg content"], "avatar.jpg", { type: "image/jpeg" });
    formData.append("avatar", file);

    const req = new Request("http://localhost/api/user/avatar", {
      method: "POST",
      body: formData,
    });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.avatar_url).toBe("http://cdn.com/user-123/avatar.jpg");
    expect(json.path).toBe("user-123/avatar.jpg");
    expect(mockStorageChain.upload).toHaveBeenCalledWith(
      "user-123/avatar.jpg",
      expect.any(Buffer),
      { contentType: "image/jpeg", upsert: true }
    );
    expect(mockSupabase.auth.updateUser).toHaveBeenCalledWith({
      data: { avatar_url: "user-123/avatar.jpg" },
    });
  });

  it("uploads PNG avatar successfully", async () => {
    const { checkRateLimit } = await import("@/lib/rate-limit");
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-456", user_metadata: {} } },
    });
    vi.mocked(checkRateLimit).mockReturnValue(true);

    const mockStorageChain = {
      remove: vi.fn().mockResolvedValue({}),
      upload: vi.fn().mockResolvedValue({ error: null }),
      getPublicUrl: vi
        .fn()
        .mockReturnValue({ data: { publicUrl: "http://cdn.com/user-456/avatar.png" } }),
    };
    mockSupabase.storage.from.mockReturnValue(mockStorageChain);
    mockSupabase.auth.updateUser.mockResolvedValue({ error: null });

    const formData = new FormData();
    const file = new File(["png content"], "avatar.png", { type: "image/png" });
    formData.append("avatar", file);

    const req = new Request("http://localhost/api/user/avatar", {
      method: "POST",
      body: formData,
    });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.path).toBe("user-456/avatar.png");
  });

  it("uploads WebP avatar successfully", async () => {
    const { checkRateLimit } = await import("@/lib/rate-limit");
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-789", user_metadata: {} } },
    });
    vi.mocked(checkRateLimit).mockReturnValue(true);

    const mockStorageChain = {
      remove: vi.fn().mockResolvedValue({}),
      upload: vi.fn().mockResolvedValue({ error: null }),
      getPublicUrl: vi
        .fn()
        .mockReturnValue({ data: { publicUrl: "http://cdn.com/user-789/avatar.webp" } }),
    };
    mockSupabase.storage.from.mockReturnValue(mockStorageChain);
    mockSupabase.auth.updateUser.mockResolvedValue({ error: null });

    const formData = new FormData();
    const file = new File(["webp content"], "avatar.webp", { type: "image/webp" });
    formData.append("avatar", file);

    const req = new Request("http://localhost/api/user/avatar", {
      method: "POST",
      body: formData,
    });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.path).toBe("user-789/avatar.webp");
  });

  it("deletes old avatar before uploading new one", async () => {
    const { checkRateLimit } = await import("@/lib/rate-limit");
    mockSupabase.auth.getUser.mockResolvedValue({
      data: {
        user: {
          id: "user-123",
          user_metadata: { avatar_url: "user-123/old-avatar.jpg" },
        },
      },
    });
    vi.mocked(checkRateLimit).mockReturnValue(true);

    const mockStorageChain = {
      remove: vi.fn().mockResolvedValue({}),
      upload: vi.fn().mockResolvedValue({ error: null }),
      getPublicUrl: vi
        .fn()
        .mockReturnValue({ data: { publicUrl: "http://cdn.com/user-123/avatar.jpg" } }),
    };
    mockSupabase.storage.from.mockReturnValue(mockStorageChain);
    mockSupabase.auth.updateUser.mockResolvedValue({ error: null });

    const formData = new FormData();
    const file = new File(["content"], "new.jpg", { type: "image/jpeg" });
    formData.append("avatar", file);

    const req = new Request("http://localhost/api/user/avatar", {
      method: "POST",
      body: formData,
    });
    await POST(req);

    expect(mockStorageChain.remove).toHaveBeenCalledWith(["user-123/old-avatar.jpg"]);
  });

  it("does not delete old avatar if it does not belong to user", async () => {
    const { checkRateLimit } = await import("@/lib/rate-limit");
    mockSupabase.auth.getUser.mockResolvedValue({
      data: {
        user: {
          id: "user-123",
          user_metadata: { avatar_url: "other-user/avatar.jpg" },
        },
      },
    });
    vi.mocked(checkRateLimit).mockReturnValue(true);

    const mockStorageChain = {
      remove: vi.fn().mockResolvedValue({}),
      upload: vi.fn().mockResolvedValue({ error: null }),
      getPublicUrl: vi
        .fn()
        .mockReturnValue({ data: { publicUrl: "http://cdn.com/user-123/avatar.jpg" } }),
    };
    mockSupabase.storage.from.mockReturnValue(mockStorageChain);
    mockSupabase.auth.updateUser.mockResolvedValue({ error: null });

    const formData = new FormData();
    const file = new File(["content"], "new.jpg", { type: "image/jpeg" });
    formData.append("avatar", file);

    const req = new Request("http://localhost/api/user/avatar", {
      method: "POST",
      body: formData,
    });
    await POST(req);

    expect(mockStorageChain.remove).not.toHaveBeenCalled();
  });
});

describe("DELETE /api/user/avatar", () => {
  let DELETE: (req: Request) => Promise<NextResponse>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("@/app/api/user/avatar/route");
    DELETE = mod.DELETE;
  });

  it("returns 401 if not authenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

    const req = new Request("http://localhost/api/user/avatar", {
      method: "DELETE",
    });
    const res = await DELETE(req);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toBe("Unauthorized");
  });

  it("returns 429 if rate limited", async () => {
    const { checkRateLimit } = await import("@/lib/rate-limit");
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-123", user_metadata: {} } },
    });
    vi.mocked(checkRateLimit).mockReturnValue(false);

    const req = new Request("http://localhost/api/user/avatar", {
      method: "DELETE",
    });
    const res = await DELETE(req);
    const json = await res.json();

    expect(res.status).toBe(429);
    expect(json.error).toBe("Rate limit exceeded");
    expect(res.headers.get("Retry-After")).toBe("60");
  });

  it("returns 500 if user update fails", async () => {
    const { checkRateLimit } = await import("@/lib/rate-limit");
    mockSupabase.auth.getUser.mockResolvedValue({
      data: {
        user: {
          id: "user-123",
          user_metadata: { avatar_url: "user-123/avatar.jpg" },
        },
      },
    });
    vi.mocked(checkRateLimit).mockReturnValue(true);

    const mockStorageChain = {
      remove: vi.fn().mockResolvedValue({}),
    };
    mockSupabase.storage.from.mockReturnValue(mockStorageChain);
    mockSupabase.auth.updateUser.mockResolvedValue({
      error: { message: "Update failed" },
    });

    const req = new Request("http://localhost/api/user/avatar", {
      method: "DELETE",
    });
    const res = await DELETE(req);
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toBe("Internal error");
  });

  it("deletes avatar successfully", async () => {
    const { checkRateLimit } = await import("@/lib/rate-limit");
    mockSupabase.auth.getUser.mockResolvedValue({
      data: {
        user: {
          id: "user-123",
          user_metadata: { avatar_url: "user-123/avatar.jpg" },
        },
      },
    });
    vi.mocked(checkRateLimit).mockReturnValue(true);

    const mockStorageChain = {
      remove: vi.fn().mockResolvedValue({}),
    };
    mockSupabase.storage.from.mockReturnValue(mockStorageChain);
    mockSupabase.auth.updateUser.mockResolvedValue({ error: null });

    const req = new Request("http://localhost/api/user/avatar", {
      method: "DELETE",
    });
    const res = await DELETE(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(mockStorageChain.remove).toHaveBeenCalledWith(["user-123/avatar.jpg"]);
    expect(mockSupabase.auth.updateUser).toHaveBeenCalledWith({
      data: { avatar_url: null },
    });
  });

  it("succeeds even if no avatar exists", async () => {
    const { checkRateLimit } = await import("@/lib/rate-limit");
    mockSupabase.auth.getUser.mockResolvedValue({
      data: {
        user: {
          id: "user-123",
          user_metadata: {},
        },
      },
    });
    vi.mocked(checkRateLimit).mockReturnValue(true);

    const mockStorageChain = {
      remove: vi.fn().mockResolvedValue({}),
    };
    mockSupabase.storage.from.mockReturnValue(mockStorageChain);
    mockSupabase.auth.updateUser.mockResolvedValue({ error: null });

    const req = new Request("http://localhost/api/user/avatar", {
      method: "DELETE",
    });
    const res = await DELETE(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(mockStorageChain.remove).not.toHaveBeenCalled();
    expect(mockSupabase.auth.updateUser).toHaveBeenCalledWith({
      data: { avatar_url: null },
    });
  });

  it("does not delete avatar if path does not belong to user", async () => {
    const { checkRateLimit } = await import("@/lib/rate-limit");
    mockSupabase.auth.getUser.mockResolvedValue({
      data: {
        user: {
          id: "user-123",
          user_metadata: { avatar_url: "other-user/avatar.jpg" },
        },
      },
    });
    vi.mocked(checkRateLimit).mockReturnValue(true);

    const mockStorageChain = {
      remove: vi.fn().mockResolvedValue({}),
    };
    mockSupabase.storage.from.mockReturnValue(mockStorageChain);
    mockSupabase.auth.updateUser.mockResolvedValue({ error: null });

    const req = new Request("http://localhost/api/user/avatar", {
      method: "DELETE",
    });
    const res = await DELETE(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(mockStorageChain.remove).not.toHaveBeenCalled();
  });
});
