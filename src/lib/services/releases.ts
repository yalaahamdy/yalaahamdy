import type { AppEntry } from "../config";
import {
  fetchLatestRelease,
  fetchReleases,
  fetchRepoInfo,
  getRateLimitRemaining,
  GitHubError,
  readCachedRelease,
  type FetchSource,
  type GhRepo,
} from "./github";
import { normalizeRelease, type NormalizedRelease } from "../utils/assets";

export type ReleaseState =
  | { status: "loaded"; source: FetchSource | "stale"; release: NormalizedRelease }
  | { status: "no-releases" }
  | { status: "repo-not-found" }
  | { status: "error"; kind: string; message?: string };

export interface LoadSummary {
  mode: "live" | "cache-only";
  fresh: number;
  stale: number;
  failed: number;
  total: number;
}

async function mapWithConcurrency<T>(items: readonly T[], limit: number, worker: (item: T) => Promise<void>): Promise<void> {
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const item = items[cursor];
      cursor += 1;
      if (item !== undefined) await worker(item);
    }
  });
  await Promise.all(runners);
}

function cachedState(app: AppEntry): ReleaseState {
  const cached = readCachedRelease(app.repository);
  if (cached === undefined) return { status: "error", kind: "rate-limit" };
  if (cached === null) return { status: "no-releases" };
  return { status: "loaded", source: "stale", release: normalizeRelease(cached, app) };
}

/**
 * Load latest releases for many apps with a strict API budget:
 *  1. Probe /rate_limit (free). If remaining quota can't cover one request per
 *     app, degrade to cache-only mode instead of hammering the API.
 *  2. Otherwise fetch with bounded concurrency; every per-app failure is
 *     isolated so one bad repo never breaks the page.
 */
export async function loadAppsReleases(apps: readonly AppEntry[], onResult: (slug: string, state: ReleaseState) => void): Promise<LoadSummary> {
  const summary: LoadSummary = { mode: "live", fresh: 0, stale: 0, failed: 0, total: apps.length };
  const remaining = await getRateLimitRemaining();

  if (remaining !== null && remaining < apps.length) {
    summary.mode = "cache-only";
    for (const app of apps) onResult(app.slug, cachedState(app));
    summary.stale = apps.length;
    return summary;
  }

  await mapWithConcurrency(apps, 4, async (app) => {
    try {
      const { data, source } = await fetchLatestRelease(app.repository);
      onResult(app.slug, { status: "loaded", source, release: normalizeRelease(data, app) });
      summary.fresh += 1;
      return;
    } catch (error) {
      if (error instanceof GitHubError) {
        if (error.kind === "not-found") {
          // GitHub returns 404 for both "no releases" and "no repo"; the grid
          // treats it as no-releases, the detail page double-checks the repo.
          onResult(app.slug, { status: "no-releases" });
          return;
        }
        if (error.kind === "rate-limit" || error.kind === "network") {
          const cached = readCachedRelease(app.repository);
          if (cached !== undefined) {
            onResult(app.slug, cached === null ? { status: "no-releases" } : { status: "loaded", source: "stale", release: normalizeRelease(cached, app) });
            summary.stale += 1;
            return;
          }
        }
        summary.failed += 1;
        onResult(app.slug, { status: "error", kind: error.kind, message: error.message });
        return;
      }
      summary.failed += 1;
      onResult(app.slug, { status: "error", kind: "unknown" });
    }
  });

  return summary;
}

export interface AppDetailSnapshot {
  latest?: { release: NormalizedRelease; source: FetchSource | "stale" };
  repo?: GhRepo | null;
  history?: NormalizedRelease[];
  state?: ReleaseState;
}

export interface AppDetailCallbacks {
  onSnapshot: (snapshot: AppDetailSnapshot) => void;
}

/** Full detail-page load: latest release first, then repo info + history in parallel. */
export async function loadAppDetail(app: AppEntry, callbacks: AppDetailCallbacks): Promise<void> {
  let latest: AppDetailSnapshot["latest"];
  let terminalState: ReleaseState | null = null;

  try {
    const { data, source } = await fetchLatestRelease(app.repository);
    latest = { release: normalizeRelease(data, app), source };
    callbacks.onSnapshot({ latest });
  } catch (error) {
    if (error instanceof GitHubError && error.kind === "not-found") {
      // Distinguish "repo missing" from "no releases" with one repo lookup.
      try {
        await fetchRepoInfo(app.repository);
        terminalState = { status: "no-releases" };
      } catch (repoError) {
        terminalState =
          repoError instanceof GitHubError && repoError.kind === "not-found"
            ? { status: "repo-not-found" }
            : { status: "error", kind: repoError instanceof GitHubError ? repoError.kind : "unknown" };
      }
    } else if (error instanceof GitHubError && (error.kind === "rate-limit" || error.kind === "network")) {
      const cached = readCachedRelease(app.repository);
      if (cached === undefined) {
        terminalState = { status: "error", kind: error.kind, message: error.message };
      } else if (cached === null) {
        terminalState = { status: "no-releases" };
      } else {
        latest = { release: normalizeRelease(cached, app), source: "stale" };
        callbacks.onSnapshot({ latest });
      }
    } else if (error instanceof GitHubError) {
      terminalState = { status: "error", kind: error.kind, message: error.message };
    } else {
      terminalState = { status: "error", kind: "unknown" };
    }
    if (terminalState) {
      callbacks.onSnapshot({ state: terminalState });
      // "no-releases" still benefits from repo info / history enrichment below.
      if (terminalState.status !== "no-releases") return;
    }
  }

  // Optional enrichment — failures here never block the page.
  const [repoResult, historyResult] = await Promise.allSettled([fetchRepoInfo(app.repository), fetchReleases(app.repository, 8)]);
  if (repoResult.status === "fulfilled") {
    callbacks.onSnapshot({ repo: repoResult.value.data });
  }
  if (historyResult.status === "fulfilled") {
    const releases = historyResult.value.data
      .filter((release) => !release.draft)
      .map((release) => normalizeRelease(release, app));
    callbacks.onSnapshot({ history: releases });
  }
}
