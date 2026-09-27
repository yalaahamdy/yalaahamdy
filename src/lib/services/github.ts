import { GITHUB_API } from "../config";
import { cacheGet, cacheSet, cacheTouch } from "./cache";

/**
 * GitHub REST API layer — the ONLY place in the codebase that talks to
 * api.github.com. All requests are:
 *  - unauthenticated (public data only, no tokens in the frontend)
 *  - conditionally revalidated with ETags (a 304 does not count against the
 *    unauthenticated rate limit, so repeat visits are nearly free)
 *  - cached in localStorage with bounded size
 *  - timed out and retried once on transient network/server failures
 */

export type GitHubErrorKind = "not-found" | "rate-limit" | "forbidden" | "network" | "http";

export class GitHubError extends Error {
  readonly kind: GitHubErrorKind;
  readonly status?: number;

  constructor(kind: GitHubErrorKind, message: string, status?: number) {
    super(message);
    this.name = "GitHubError";
    this.kind = kind;
    this.status = status;
  }
}

export interface GhAsset {
  name: string;
  size: number;
  download_count: number;
  browser_download_url: string;
  content_type?: string;
}

export interface GhRelease {
  tag_name: string;
  name: string | null;
  body: string | null;
  html_url: string;
  published_at: string | null;
  prerelease: boolean;
  draft: boolean;
  assets: GhAsset[];
}

export interface GhRepo {
  full_name: string;
  description: string | null;
  html_url: string;
  homepage: string | null;
  stargazers_count: number;
  open_issues_count: number;
  pushed_at: string | null;
}

/** Where a payload came from — "revalidated" means a 304 against a fresh cache. */
export type FetchSource = "live" | "revalidated";

export interface FetchResult<T> {
  data: T;
  source: FetchSource;
}

const TIMEOUT_MS = 12_000;
const RETRY_DELAY_MS = 500;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

interface RawResponse<T> {
  status: number;
  data: T | null;
  etag: string | null;
  rateRemaining: string | null;
}

async function request<T>(url: string, etag: string | null): Promise<RawResponse<T>> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
  };
  if (etag) headers["If-None-Match"] = etag;

  for (let attempt = 0; ; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await fetch(url, { headers, signal: controller.signal, cache: "no-store" });
      const rateRemaining = response.headers.get("x-ratelimit-remaining");

      if (response.status === 304) {
        return { status: 304, data: null, etag, rateRemaining };
      }

      if (response.status === 403 || response.status === 429) {
        throw new GitHubError(
          rateRemaining === "0" ? "rate-limit" : "forbidden",
          rateRemaining === "0" ? "GitHub API rate limit exceeded" : "Request forbidden by GitHub",
          response.status,
        );
      }

      if (response.status === 404) {
        throw new GitHubError("not-found", "GitHub resource not found", 404);
      }

      if (response.status >= 500) {
        if (attempt < 1) {
          await sleep(RETRY_DELAY_MS);
          continue;
        }
        throw new GitHubError("http", `GitHub API server error (${response.status})`, response.status);
      }

      if (!response.ok) {
        throw new GitHubError("http", `GitHub API error (${response.status})`, response.status);
      }

      const data = (await response.json()) as T;
      const etagHeader = response.headers.get("etag");
      return { status: 200, data, etag: etagHeader, rateRemaining };
    } catch (error) {
      if (error instanceof GitHubError) throw error;
      if (attempt < 1) {
        await sleep(RETRY_DELAY_MS);
        continue;
      }
      const message = error instanceof Error && error.name === "AbortError" ? "Request timed out" : "Network request failed";
      throw new GitHubError("network", message);
    } finally {
      clearTimeout(timer);
    }
  }
}

async function getCachedJson<T>(path: string, cacheKey: string): Promise<FetchResult<T>> {
  const cached = cacheGet<T>(cacheKey);
  const response = await request<T>(GITHUB_API + path, cached?.etag ?? null);

  if (response.status === 304 && cached) {
    cacheTouch(cacheKey);
    return { data: cached.data, source: "revalidated" };
  }

  const data = response.data as T;
  cacheSet(cacheKey, data, response.etag);
  return { data, source: "live" };
}

export function releaseCacheKey(repo: string): string {
  return `release:${repo}`;
}

/**
 * Latest non-prerelease, non-draft release. GitHub answers 404 here both when
 * the repo is missing and when no releases exist — callers decide which
 * interpretation fits (see releases.ts).
 */
export async function fetchLatestRelease(repo: string): Promise<FetchResult<GhRelease>> {
  try {
    return await getCachedJson<GhRelease>(`/repos/${repo}/releases/latest`, releaseCacheKey(repo));
  } catch (error) {
    // Negative caching — remember "no releases" so rate-limited fallbacks can
    // still render an accurate state instead of an error.
    if (error instanceof GitHubError && error.kind === "not-found") {
      cacheSet<GhRelease | null>(releaseCacheKey(repo), null, null);
    }
    throw error;
  }
}

/** Read whatever is cached for this repo: undefined = never fetched, null = known to have no releases. */
export function readCachedRelease(repo: string): GhRelease | null | undefined {
  return cacheGet<GhRelease>(releaseCacheKey(repo))?.data;
}

export async function fetchReleases(repo: string, perPage = 8): Promise<FetchResult<GhRelease[]>> {
  return getCachedJson<GhRelease[]>(`/repos/${repo}/releases?per_page=${perPage}`, `releases:${repo}:${perPage}`);
}

export async function fetchRepoInfo(repo: string): Promise<FetchResult<GhRepo>> {
  return getCachedJson<GhRepo>(`/repos/${repo}`, `repo:${repo}`);
}

/**
 * The /rate_limit endpoint is free — it never counts against the limit.
 * Returns remaining core requests, or null when the check itself fails.
 */
export async function getRateLimitRemaining(): Promise<number | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6_000);
    try {
      const response = await fetch(`${GITHUB_API}/rate_limit`, {
        headers: { Accept: "application/vnd.github+json" },
        signal: controller.signal,
        cache: "no-store",
      });
      if (!response.ok) return null;
      const payload = (await response.json()) as { resources?: { core?: { remaining?: number } } };
      const remaining = payload.resources?.core?.remaining;
      return typeof remaining === "number" ? remaining : null;
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return null;
  }
}
