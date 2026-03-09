import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("jose", () => ({
  jwtVerify: vi.fn(),
}));

import { authenticateRequest } from "@/lib/auth";
import { jwtVerify } from "jose";

const mockedJwtVerify = vi.mocked(jwtVerify);

describe("authenticateRequest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SUPABASE_JWT_SECRET = "test-secret-that-is-long-enough-32chars";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
  });

  it("returns 'skip' when no Authorization header", async () => {
    const req = new Request("http://test/api/test");
    expect(await authenticateRequest(req)).toBe("skip");
  });

  it("returns 'skip' when Authorization is not Bearer", async () => {
    const req = new Request("http://test/api/test", {
      headers: { Authorization: "Basic abc123" },
    });
    expect(await authenticateRequest(req)).toBe("skip");
  });

  it("returns { userId } for valid token", async () => {
    mockedJwtVerify.mockResolvedValue({
      payload: { sub: "user-123" },
      protectedHeader: { alg: "HS256" },
    } as never);

    const req = new Request("http://test/api/test", {
      headers: { Authorization: "Bearer valid-token" },
    });
    expect(await authenticateRequest(req)).toEqual({ userId: "user-123" });
  });

  it("returns null when SUPABASE_JWT_SECRET is missing", async () => {
    delete process.env.SUPABASE_JWT_SECRET;
    const req = new Request("http://test/api/test", {
      headers: { Authorization: "Bearer some-token" },
    });
    expect(await authenticateRequest(req)).toBeNull();
  });

  it("returns null when jwt verification throws", async () => {
    mockedJwtVerify.mockRejectedValue(new Error("expired"));
    const req = new Request("http://test/api/test", {
      headers: { Authorization: "Bearer expired-token" },
    });
    expect(await authenticateRequest(req)).toBeNull();
  });

  it("returns null when token has no sub claim", async () => {
    mockedJwtVerify.mockResolvedValue({
      payload: {},
      protectedHeader: { alg: "HS256" },
    } as never);

    const req = new Request("http://test/api/test", {
      headers: { Authorization: "Bearer no-sub-token" },
    });
    expect(await authenticateRequest(req)).toBeNull();
  });

  it("returns null when sub is not a string", async () => {
    mockedJwtVerify.mockResolvedValue({
      payload: { sub: 12345 },
      protectedHeader: { alg: "HS256" },
    } as never);

    const req = new Request("http://test/api/test", {
      headers: { Authorization: "Bearer bad-sub-token" },
    });
    expect(await authenticateRequest(req)).toBeNull();
  });

  it("passes issuer when NEXT_PUBLIC_SUPABASE_URL is set", async () => {
    mockedJwtVerify.mockResolvedValue({
      payload: { sub: "user-456" },
      protectedHeader: { alg: "HS256" },
    } as never);

    const req = new Request("http://test/api/test", {
      headers: { Authorization: "Bearer valid-token" },
    });
    await authenticateRequest(req);

    expect(mockedJwtVerify).toHaveBeenCalledWith(
      "valid-token",
      expect.any(Uint8Array),
      expect.objectContaining({
        algorithms: ["HS256"],
        issuer: "https://test.supabase.co/auth/v1",
      })
    );
  });
});
