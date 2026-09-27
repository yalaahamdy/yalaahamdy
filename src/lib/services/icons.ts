import { cacheGet, cacheSet } from "./cache";
import type { AppEntry } from "../config";

/**
 * App icon resolution — three professional sources, in order:
 *
 *  1. `icon` from data/apps.json:
 *       - "/path"  → a site asset shipped in /public (optimized copies of the
 *                    real repository icons, see scripts/sync_app_icons.py)
 *       - "http…"  → an absolute URL, used as-is
 *       - "a/b.png"→ a file inside the app repository, rendered live from
 *                    raw.githubusercontent.com
 *  2. Automatic discovery inside the repository (git trees API), cached 24h —
 *     so apps that only ship an icon file still show their real icon with
 *     zero configuration.
 *  3. A deterministic letter-mark rendered locally — never a random web image.
 */

const ICON_HIT_TTL_MS = 24 * 60 * 60 * 1000;
const ICON_MISS_TTL_MS = 6 * 60 * 60 * 1000;
const TREE_TIMEOUT_MS = 12_000;

interface CachedIcon {
  url: string | null;
}

function iconCacheKey(repo: string): string {
  return `icon:${repo}`;
}

/** Resolve the configured icon (site asset / absolute URL / repo file) to a URL. */
export function resolveConfiguredIcon(app: AppEntry): string | null {
  const icon = app.icon?.trim();
  if (!icon) return null;
  if (/^https?:\/\//i.test(icon)) return icon;
  if (icon.startsWith("/")) return icon; // site asset — basePath applied by AppIcon
  return `https://raw.githubusercontent.com/${app.repository}/HEAD/${icon.replace(/^\/+/, "")}`;
}

/** File paths that plausibly hold an app icon, scored by desirability. */
const EXT_SCORE: Record<string, number> = { ".svg": 5, ".png": 4, ".webp": 3, ".jpg": 2, ".jpeg": 2, ".ico": 1 };
const DENSITY_SCORE: Record<string, number> = { xxxhdpi: 5, xxhdpi: 4, xhdpi: 3, hdpi: 2, mdpi: 1 };

export function scoreIconPath(path: string): number {
  const lower = path.toLowerCase();
  const file = lower.split("/").pop() ?? "";
  const dot = file.lastIndexOf(".");
  const ext = dot >= 0 ? file.slice(dot) : "";
  let score = (EXT_SCORE[ext] ?? 0) * 10;
  if (/(^|\/)(icon|app[-_]?icon|ic_launcher)/.test(lower)) score += 4;
  if (/logo/.test(lower)) score += 2;
  for (const [density, value] of Object.entries(DENSITY_SCORE)) {
    if (lower.includes(density)) {
      score += value;
      break;
    }
  }
  score += Math.max(0, 3 - path.split("/").length); // prefer shallower paths
  return score;
}

const ICON_FILE_PATTERN =
  /(^|\/)(icon|logo|app[-_]?icon|appicon|ic_launcher[^/]*|apple-touch-icon|android-chrome-\d+|favicon(-\d+x\d+)?)\.(png|svg|webp|jpe?g|ico)$/i;

export function bestIconPath(paths: readonly string[]): string | null {
  const candidates = paths.filter((path) => ICON_FILE_PATTERN.test(path));
  if (candidates.length === 0) return null;
  return candidates.reduce((best, path) => (scoreIconPath(path) > scoreIconPath(best) ? path : best));
}

interface TreeEntry {
  path?: string;
  type?: string;
}

const inflight = new Map<string, Promise<string | null>>();

/**
 * Discover an icon inside the repository via the git trees API.
 * Results (including misses) are cached with a TTL; concurrent calls share
 * one request. Failures are silent — icons are cosmetic and must never break
 * the page or consume the visitor's API budget on every render.
 */
export async function discoverRepoIcon(repo: string): Promise<string | null> {
  const key = iconCacheKey(repo);
  const cached = cacheGet<CachedIcon>(key);
  if (cached) {
    const ttl = cached.data.url ? ICON_HIT_TTL_MS : ICON_MISS_TTL_MS;
    if (Date.now() - cached.fetchedAt < ttl) return cached.data.url;
  }

  const existing = inflight.get(repo);
  if (existing) return existing;

  const task = (async (): Promise<string | null> => {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TREE_TIMEOUT_MS);
      try {
        const response = await fetch(`https://api.github.com/repos/${repo}/git/trees/HEAD?recursive=1`, {
          headers: { Accept: "application/vnd.github+json" },
          signal: controller.signal,
          cache: "no-store",
        });
        if (!response.ok) {
          cacheSet<CachedIcon>(key, { url: null }, null);
          return null;
        }
        const payload = (await response.json()) as { tree?: TreeEntry[] };
        const paths = (payload.tree ?? [])
          .filter((entry) => entry.type === "blob")
          .map((entry) => entry.path ?? "");
        const best = bestIconPath(paths);
        const url = best ? `https://raw.githubusercontent.com/${repo}/HEAD/${best}` : null;
        cacheSet<CachedIcon>(key, { url }, null);
        return url;
      } finally {
        clearTimeout(timer);
      }
    } catch {
      return null; // network / rate limit / abort — icon stays a letter-mark
    }
  })();

  inflight.set(repo, task);
  try {
    return await task;
  } finally {
    inflight.delete(repo);
  }
}
