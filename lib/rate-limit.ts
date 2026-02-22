interface Entry {
  count: number;
  resetAt: number;
}

const MAX_ENTRIES = 10_000;
const store = new Map<string, Entry>();

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): boolean {
  const now = Date.now();

  // Clean up expired entries on each call
  for (const [k, v] of store) {
    if (v.resetAt <= now) store.delete(k);
  }

  // Prevent unbounded growth: evict oldest 1000 entries instead of clearing all
  if (store.size > MAX_ENTRIES) {
    const toDelete = Array.from(store.keys()).slice(0, 1000);
    for (const k of toDelete) store.delete(k);
  }

  const entry = store.get(key);
  if (!entry || entry.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= limit) return false;

  entry.count++;
  return true;
}
