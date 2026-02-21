import crypto from "crypto";

/** Generate a cryptographically secure URL-safe share token (32 chars). */
export function generateShareToken(): string {
  return crypto.randomBytes(24).toString("base64url");
}

/** Hash an IP address for anonymous tracking (not storing raw IPs). */
export function hashIP(ip: string): string {
  return crypto.createHash("sha256").update(ip).digest("hex").slice(0, 16);
}
