import { jwtVerify } from "jose";

/**
 * JWT authentication for API consumers using Authorization: Bearer headers.
 *
 * Returns:
 * - { userId: string } if Bearer token is valid
 * - "skip" if no Authorization header (browser/cookie request, let Supabase handle it)
 * - null if Authorization header is present but token is invalid (reject with 401)
 */
export async function authenticateRequest(
  request: Request
): Promise<{ userId: string } | "skip" | null> {
  const authHeader = request.headers.get("authorization");

  // No Bearer header = browser request with cookies.
  // Skip JWT verification, let Supabase SSR cookie auth handle it downstream.
  if (!authHeader?.startsWith("Bearer ")) {
    return "skip";
  }

  const token = authHeader.slice(7);
  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!secret) {
    console.error("[auth] SUPABASE_JWT_SECRET is not set");
    return null;
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(secret),
      {
        algorithms: ["HS256"],
        ...(supabaseUrl && {
          issuer: `${supabaseUrl}/auth/v1`,
        }),
      }
    );

    const userId = payload.sub;
    if (!userId || typeof userId !== "string") return null;

    return { userId };
  } catch {
    return null;
  }
}
