/**
 * Derive the canonical origin for server-side redirects.
 * Handles Docker/reverse-proxy environments where x-forwarded-proto may be missing.
 */
export function getOrigin(request: Request): string {
  const host = request.headers.get("host") ?? "localhost:3000";
  const isLocal =
    host.startsWith("localhost") || host.startsWith("127.0.0.1");
  const proto =
    request.headers.get("x-forwarded-proto") ?? (isLocal ? "http" : "https");
  return `${proto}://${host}`;
}
