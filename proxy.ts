import { getOrigin } from "@/lib/origin";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const origin = getOrigin(request);

  // Check for Supabase session cookie (any chunk means logged in)
  const hasSession = request.cookies
    .getAll()
    .some((c) => c.name.startsWith("sb-") && c.name.includes("-auth-token"));

  // Redirect unauthenticated users away from protected routes
  if (
    !hasSession &&
    (pathname.startsWith("/notebook") || pathname.startsWith("/settings"))
  ) {
    return NextResponse.redirect(new URL(`${origin}/login`));
  }

  // Redirect authenticated users away from auth pages
  if (hasSession && (pathname === "/login" || pathname === "/")) {
    return NextResponse.redirect(new URL(`${origin}/dashboard`));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|auth/callback|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
