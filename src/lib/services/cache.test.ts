import { beforeEach, describe, expect, it } from "vitest";
import { cacheGet, cacheSet, cacheTouch, configureStorage, type StorageLike } from "./cache";

function memoryStorage(): StorageLike & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (key) => (map.has(key) ? (map.get(key) as string) : null),
    setItem: (key, value) => void map.set(key, value),
    removeItem: (key) => void map.delete(key),
    key: (index) => Array.from(map.keys())[index] ?? null,
    get length() {
      return map.size;
    },
  };
}

describe("cache", () => {
  beforeEach(() => {
    configureStorage(memoryStorage());
  });

  it("round-trips payloads with etags", () => {
    cacheSet("release:a/b", { tag: "v1" }, '"etag-1"');
    const entry = cacheGet<{ tag: string }>("release:a/b");
    expect(entry?.data).toEqual({ tag: "v1" });
    expect(entry?.etag).toBe('"etag-1"');
    expect(typeof entry?.fetchedAt).toBe("number");
  });

  it("returns null for missing or corrupted entries (and removes corruption)", () => {
    expect(cacheGet("missing")).toBeNull();
    cacheSet("broken", { ok: true }, null);
    const storage = memoryStorage();
    configureStorage(storage);
    storage.map.clear();
    storage.map.set("ya-gh:v1:broken", "{not json");
    expect(cacheGet("broken")).toBeNull();
    expect(storage.map.has("ya-gh:v1:broken")).toBe(false);
  });

  it("touches refresh the timestamp without changing data", () => {
    cacheSet("k", 42, null, 1000);
    cacheTouch("k", 5000);
    const entry = cacheGet<number>("k");
    expect(entry?.data).toBe(42);
    expect(entry?.fetchedAt).toBe(5000);
  });

  it("degrades to in-memory storage when localStorage is unavailable", () => {
    configureStorage(null);
    cacheSet("mem", "value", null);
    expect(cacheGet<string>("mem")?.data).toBe("value");
  });
});
