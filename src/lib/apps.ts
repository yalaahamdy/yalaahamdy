import { config, type AppEntry } from "./config";

export const PLATFORM_ORDER = ["Android", "Windows", "macOS", "Linux", "Web", "iOS", "Other"] as const;
export type KnownPlatform = (typeof PLATFORM_ORDER)[number];

/** Canonical, immutable app registry — sourced from data/apps.json at build time. */
export const allApps: AppEntry[] = config.apps;

export const appsBySlug: ReadonlyMap<string, AppEntry> = new Map(allApps.map((app) => [app.slug, app]));

export function getApp(slug: string): AppEntry | undefined {
  return appsBySlug.get(slug);
}

export function getFeaturedApps(): AppEntry[] {
  return allApps.filter((app) => app.featured);
}

export function getCategories(): string[] {
  return Array.from(new Set(allApps.map((app) => app.category))).sort((a, b) => a.localeCompare(b));
}

/** All declared platforms across apps, in a stable display order. */
export function getPlatforms(): string[] {
  const declared = new Set(allApps.flatMap((app) => app.platforms));
  return PLATFORM_ORDER.filter((p) => declared.has(p));
}

export function repoUrl(app: Pick<AppEntry, "repository">): string {
  return `https://github.com/${app.repository}`;
}

export function releasesUrl(app: Pick<AppEntry, "repository">): string {
  return `${repoUrl(app)}/releases`;
}

export function repoOwner(app: Pick<AppEntry, "repository">): string {
  return app.repository.split("/")[0] ?? "";
}

export function repoName(app: { repository: string; name?: string }): string {
  return app.repository.split("/")[1] ?? app.name ?? "";
}

export function appDetailPath(slug: string): string {
  return `/apps/${slug}/`;
}
