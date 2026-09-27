/**
 * Tiny localStorage-backed cache for GitHub API payloads.
 *
 * - Versioned keys (`ya-gh:v1:`) so old payloads never leak across deploys.
 * - Graceful degradation to in-memory storage when localStorage is blocked
 *   (private browsing, disabled storage, SSR).
 * - Bounded size with oldest-first pruning.
 */

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  key(index: number): string | null;
  readonly length: number;
}

const PREFIX = "ya-gh:v1:";
const MAX_ENTRIES = 120;

let override: StorageLike | null | undefined;
let memory: Map<string, string> | null = null;

/** Tests may inject a storage implementation (or null to force in-memory). */
export function configureStorage(storage: StorageLike | null | undefined): void {
  override = storage;
}

function mapStorage(map: Map<string, string>): StorageLike {
  return {
    getItem: (key) => (map.has(key) ? (map.get(key) as string) : null),
    setItem: (key, value) => void map.set(key, value),
    removeItem: (key) => void map.delete(key),
    key: (index) => Array.from(map.keys())[index] ?? null,
    get length() {
      return map.size;
    },
  };
}

function resolveStorage(): StorageLike {
  if (override !== undefined) return override ?? mapStorage((memory ??= new Map()));
  try {
    const storage = globalThis.localStorage;
    if (!storage) throw new Error("unavailable");
    const probe = "__ya_probe__";
    storage.setItem(probe, "1");
    storage.removeItem(probe);
    return storage;
  } catch {
    return mapStorage((memory ??= new Map()));
  }
}

export interface CacheEntry<T> {
  data: T;
  etag: string | null;
  fetchedAt: number;
}

function fullKey(key: string): string {
  return `${PREFIX}${key}`;
}

export function cacheGet<T>(key: string): CacheEntry<T> | null {
  const storage = resolveStorage();
  let raw: string | null = null;
  try {
    raw = storage.getItem(fullKey(key));
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<CacheEntry<T>>;
    if (typeof parsed.fetchedAt !== "number" || !("data" in parsed)) throw new Error("malformed entry");
    return { data: parsed.data as T, etag: typeof parsed.etag === "string" ? parsed.etag : null, fetchedAt: parsed.fetchedAt };
  } catch {
    try {
      storage.removeItem(fullKey(key));
    } catch {
      /* ignore */
    }
    return null;
  }
}

export function cacheSet<T>(key: string, data: T, etag: string | null, now = Date.now()): void {
  const storage = resolveStorage();
  try {
    pruneCache(storage);
    storage.setItem(fullKey(key), JSON.stringify({ data, etag, fetchedAt: now } satisfies CacheEntry<T>));
  } catch {
    /* storage full or unavailable — cache is best-effort */
  }
}

/** Refresh `fetchedAt` without altering the payload (used on 304 responses). */
export function cacheTouch<T>(key: string, now = Date.now()): void {
  const entry = cacheGet<T>(key);
  if (entry) cacheSet(key, entry.data, entry.etag, now);
}

export function cacheAgeMinutes(entry: CacheEntry<unknown>, now = Date.now()): number {
  return Math.max(0, Math.round((now - entry.fetchedAt) / 60000));
}

function pruneCache(storage: StorageLike, max = MAX_ENTRIES): void {
  const keys: { key: string; fetchedAt: number }[] = [];
  for (let i = 0; i < storage.length; i += 1) {
    const storageKey = storage.key(i);
    if (!storageKey || !storageKey.startsWith(PREFIX)) continue;
    try {
      const parsed = JSON.parse(storage.getItem(storageKey) ?? "") as Partial<CacheEntry<unknown>>;
      keys.push({ key: storageKey, fetchedAt: typeof parsed.fetchedAt === "number" ? parsed.fetchedAt : 0 });
    } catch {
      keys.push({ key: storageKey, fetchedAt: 0 });
    }
  }
  if (keys.length < max) return;
  keys.sort((a, b) => a.fetchedAt - b.fetchedAt);
  for (const stale of keys.slice(0, keys.length - max + 1)) {
    try {
      storage.removeItem(stale.key);
    } catch {
      /* ignore */
    }
  }
}
