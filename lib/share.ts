import crypto from "crypto";

/** Generate a cryptographically secure URL-safe share token (32 chars). */
export function generateShareToken(): string {
  return crypto.randomBytes(24).toString("base64url");
}

/** Hash an IP address for anonymous tracking (not storing raw IPs). HMAC with app salt. */
const IP_SALT = process.env.SUPABASE_JWT_SECRET?.slice(0, 16) ?? (() => {
  if (process.env.NODE_ENV === "production") {
    console.warn("[share] SUPABASE_JWT_SECRET not set, using fallback IP salt");
  }
  return "docchat-ip-salt";
})();
export function hashIP(ip: string): string {
  return crypto.createHmac("sha256", IP_SALT).update(ip).digest("hex").slice(0, 16);
}
