import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client for server-only operations.
 * Bypasses RLS. Do NOT use in client components.
 * Cached as a module-level singleton (stateless, no cookies/user context).
 */
let cached: SupabaseClient | null = null;

export function getServiceClient() {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL is required");
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is required");
  cached = createClient(url, key);
  return cached;
}
