interface Entry {
  count: number;
  resetAt: number;
}

const MAX_ENTRIES = 10_000;
const CLEANUP_INTERVAL = 60_000;
const store = new Map<string, Entry>();
let lastCleanup = Date.now();

/**
 * Check whether a request is within the rate limit for a given key.
 * Uses an in-memory sliding window. Returns false when the limit is exceeded.
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): boolean {
  const now = Date.now();

  // Periodic sweep (once per minute, not per call)
  if (now - lastCleanup > CLEANUP_INTERVAL) {
    lastCleanup = now;
    for (const [k, v] of store) {
      if (v.resetAt <= now) store.delete(k);
    }
    if (store.size > MAX_ENTRIES) {
      const toDelete = Array.from(store.keys()).slice(0, 1000);
      for (const k of toDelete) store.delete(k);
    }
  }

  const entry = store.get(key);
  if (!entry || entry.resetAt <= now) {
    if (entry) store.delete(key);
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= limit) return false;

  entry.count++;
  return true;
}
