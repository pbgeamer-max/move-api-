// Tiny in-memory TTL cache (per stack policy: local memory caching only)
type Entry = { value: unknown; expires: number };

const store = new Map<string, Entry>();

export function cacheGet<T>(key: string): T | null {
  const hit = store.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expires) {
    store.delete(key);
    return null;
  }
  return hit.value as T;
}

export function cacheSet(key: string, value: unknown, ttlMs: number): void {
  store.set(key, { value, expires: Date.now() + ttlMs });
  if (store.size > 200) {
    const oldest = store.keys().next().value;
    if (oldest) store.delete(oldest);
  }
}

export function cacheInvalidate(prefix: string): void {
  for (const k of store.keys()) if (k.startsWith(prefix)) store.delete(k);
}
