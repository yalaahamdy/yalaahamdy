"use client";

import { ArrowDownToLine, ExternalLink, RotateCcw, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { AppIcon } from "@/components/apps/app-icon";
import { useReleases } from "@/components/apps/use-releases";
import { StatePanel } from "@/components/states/panels";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { allApps, appDetailPath } from "@/lib/apps";
import { formatBytes, formatRelativeTime, markdownExcerpt } from "@/lib/utils/format";
import { pickPrimaryAsset } from "@/lib/utils/assets";
import type { ReleaseState } from "@/lib/services/releases";
import { useI18n } from "@/i18n/provider";
import { assetLabel } from "@/i18n/labels";

const PAGE_SIZE = 12;

interface FeedEntry {
  appSlug: string;
  appName: string;
  tagName: string;
  publishedAt: string | null;
  excerpt: string;
  releaseName: string;
  releaseUrl: string;
  downloadUrl: string | null;
  downloadLabel: string | null;
  downloadSize: number;
}

type LoadedRelease = Extract<ReleaseState, { status: "loaded" }>["release"];

function toEntry(slug: string, appName: string, release: LoadedRelease): FeedEntry {
  const primary = pickPrimaryAsset(release.assets, []);
  return {
    appSlug: slug,
    appName,
    tagName: release.tagName,
    publishedAt: release.publishedAt,
    excerpt: markdownExcerpt(release.notes, 180),
    releaseName: release.name,
    releaseUrl: release.url,
    downloadUrl: primary?.url ?? null,
    downloadLabel: primary?.label ?? null,
    downloadSize: primary?.size ?? 0,
  };
}

/** Cross-app release feed, newest first, with search and incremental paging. */
export function UpdatesFeed() {
  const { t, tf, locale } = useI18n();
  const { states, summary, loading, retry } = useReleases(allApps);
  const [query, setQuery] = useState("");
  const [visible, setVisible] = useState(PAGE_SIZE);

  const entries = useMemo<FeedEntry[]>(() => {
    const list: FeedEntry[] = [];
    for (const app of allApps) {
      const state = states[app.slug];
      if (state?.status === "loaded") list.push(toEntry(app.slug, app.name, state.release));
    }
    return list.sort((a, b) => Date.parse(b.publishedAt ?? "0") - Date.parse(a.publishedAt ?? "0"));
  }, [states]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return entries;
    return entries.filter((entry) => `${entry.appName} ${entry.tagName} ${entry.excerpt}`.toLowerCase().includes(needle));
  }, [entries, query]);

  const appsWithReleases = entries.length > 0 ? new Set(entries.map((entry) => entry.appSlug)).size : 0;
  const failedApps = summary ? summary.failed : 0;

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground" role="status">
          {loading ? t.explorer.loading : tf(t.updates.summary, { releases: entries.length, apps: appsWithReleases })}
        </p>
        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              type="search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setVisible(PAGE_SIZE);
              }}
              placeholder={t.updates.filterPlaceholder}
              aria-label={t.updates.filterAria}
              className="ps-9"
            />
          </div>
          {failedApps > 0 && (
            <Button variant="ghost" size="icon" onClick={retry} aria-label={t.explorer.retryFailed} title={t.explorer.retryFailed}>
              <RotateCcw aria-hidden />
            </Button>
          )}
        </div>
      </div>

      {failedApps > 0 && !loading && (
        <div className="mt-4 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-300" role="alert">
          {tf(t.updates.failed, { count: failedApps })}
          {summary?.mode === "cache-only" ? t.updates.failedCacheSuffix : t.updates.failedLiveSuffix}
        </div>
      )}

      {loading ? (
        <ul className="mt-6 space-y-4" aria-hidden="true">
          {Array.from({ length: 5 }).map((_, index) => (
            <li key={index} className="card-surface flex gap-4 p-5">
              <span className="skeleton-shimmer size-12 rounded-xl" />
              <div className="flex-1 space-y-2.5">
                <span className="skeleton-shimmer block h-4 w-52 rounded" />
                <span className="skeleton-shimmer block h-3.5 w-full max-w-lg rounded" />
                <span className="skeleton-shimmer block h-3.5 w-72 max-w-full rounded" />
              </div>
            </li>
          ))}
        </ul>
      ) : filtered.length === 0 ? (
        <div className="mt-6">
          <StatePanel
            icon="package"
            tone="neutral"
            title={entries.length === 0 ? t.updates.noReleasesTitle : t.updates.noMatchTitle}
            description={entries.length === 0 ? t.updates.noReleasesDesc : t.updates.noMatchDesc}
          />
        </div>
      ) : (
        <>
          <ol className="mt-6 space-y-4">
            {filtered.slice(0, visible).map((entry) => (
              <li key={`${entry.appSlug}-${entry.tagName}`}>
                <article className="card-surface flex gap-4 p-5">
                  {(() => {
                    const app = allApps.find((item) => item.slug === entry.appSlug);
                    return app ? (
                      <div className="hidden sm:block">
                        <AppIcon app={app} />
                      </div>
                    ) : null;
                  })()}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                      <a href={appDetailPath(entry.appSlug)} className="font-bold tracking-tight hover:text-primary hover:underline">
                        {entry.appName}
                      </a>
                      <span className="version-tag">{entry.tagName}</span>
                      <time dateTime={entry.publishedAt ?? undefined} className="text-xs text-muted-foreground">
                        {formatRelativeTime(entry.publishedAt, locale)}
                      </time>
                    </div>
                    {entry.excerpt ? (
                      <p dir="auto" className="mt-1.5 line-clamp-2 text-start text-sm leading-relaxed text-muted-foreground">
                        {entry.excerpt}
                      </p>
                    ) : (
                      <p dir="auto" className="mt-1.5 text-start text-sm text-muted-foreground">
                        {entry.releaseName}
                      </p>
                    )}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {entry.downloadUrl ? (
                        <Button asChild size="sm">
                          <a href={entry.downloadUrl}>
                            <ArrowDownToLine aria-hidden />
                            {entry.downloadLabel ? tf(t.card.download, { label: assetLabel(t, entry.downloadLabel) }) : t.downloads.viewRelease}
                            {entry.downloadSize > 0 && <span className="font-normal opacity-70">· {formatBytes(entry.downloadSize)}</span>}
                          </a>
                        </Button>
                      ) : (
                        <Badge variant="outline">{t.updates.sourceRelease}</Badge>
                      )}
                      <Button asChild size="sm" variant="ghost">
                        <a href={entry.releaseUrl} target="_blank" rel="noopener noreferrer">
                          {t.updates.releaseNotes}
                          <ExternalLink aria-hidden />
                        </a>
                      </Button>
                    </div>
                  </div>
                </article>
              </li>
            ))}
          </ol>
          {filtered.length > visible && (
            <div className="mt-6 text-center">
              <Button variant="secondary" onClick={() => setVisible((value) => value + PAGE_SIZE)}>
                {tf(t.updates.showMore, { count: Math.min(PAGE_SIZE, filtered.length - visible) })}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
