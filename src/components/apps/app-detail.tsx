"use client";

import { ArrowDownToLine, ChevronRight, ExternalLink, Github } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AppIcon } from "@/components/apps/app-icon";
import { DownloadsPanel } from "@/components/apps/downloads-panel";
import { platformIcon } from "@/components/apps/platform-icon";
import { ReleaseNotes } from "@/components/apps/release-notes";
import { ScreenshotsGallery } from "@/components/apps/screenshots-gallery";
import { StatePanel } from "@/components/states/panels";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { releasesUrl, repoUrl } from "@/lib/apps";
import type { AppEntry } from "@/lib/config";
import { loadAppDetail, type AppDetailSnapshot } from "@/lib/services/releases";
import { formatBytes, formatCount, formatDate, formatRelativeTime } from "@/lib/utils/format";
import { pickPrimaryAsset } from "@/lib/utils/assets";
import { useI18n } from "@/i18n/provider";
import { appDescription, assetLabel, categoryLabel, platformLabel } from "@/i18n/labels";

export function AppDetail({ app }: { app: AppEntry }) {
  const { t, tf, locale } = useI18n();
  const [snapshot, setSnapshot] = useState<AppDetailSnapshot>({});
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setSnapshot({});

    loadAppDetail(app, {
      onSnapshot: (partial) => {
        if (!cancelled) setSnapshot((prev) => ({ ...prev, ...partial }));
      },
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [app, nonce]);

  const retry = useCallback(() => setNonce((value) => value + 1), []);

  const latest = snapshot.latest?.release ?? null;
  const latestSource = snapshot.latest?.source ?? null;
  const primary = latest ? pickPrimaryAsset(latest.assets, app.platforms) : null;
  const state = snapshot.state;

  const hero = (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
      <AppIcon app={app} size="xl" />
      <div className="min-w-0 flex-1">
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{app.name}</h1>
        <p dir="auto" className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
          {appDescription(app, locale)}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {app.platforms.map((platform) => {
            const Icon = platformIcon(platform);
            return (
              <span key={platform} className="chip">
                <Icon className="size-3" aria-hidden />
                {platformLabel(t, platform)}
              </span>
            );
          })}
          <span className="chip opacity-80">{categoryLabel(t, app.category)}</span>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {primary ? (
            <Button asChild>
              <a href={primary.url} title={`${tf(t.card.download, { label: assetLabel(t, primary.label) })} — ${primary.name}`}>
                <ArrowDownToLine aria-hidden />
                {tf(t.card.download, { label: assetLabel(t, primary.label) })}
                <span className="font-normal opacity-70">· {formatBytes(primary.size)}</span>
              </a>
            </Button>
          ) : latest ? (
            <Button asChild variant="secondary">
              <a href={latest.url} target="_blank" rel="noopener noreferrer">
                {t.card.viewRelease}
                <ExternalLink aria-hidden />
              </a>
            </Button>
          ) : null}
          <Button asChild variant="secondary">
            <a href={repoUrl(app)} target="_blank" rel="noopener noreferrer">
              <Github aria-hidden />
              {t.detail.sourceRepository}
            </a>
          </Button>
          <Button asChild variant="ghost">
            <a href={releasesUrl(app)} target="_blank" rel="noopener noreferrer">
              {t.detail.recentReleases}
              <ExternalLink aria-hidden />
            </a>
          </Button>
        </div>
      </div>
    </div>
  );

  if (!loading && state?.status === "repo-not-found") {
    return (
      <div className="space-y-10">
        {hero}
        <StatePanel icon="missing" title={t.detail.repoMissingTitle} description={t.detail.repoMissingDesc}>
          <Button asChild variant="secondary">
            <a href={`https://github.com/${app.repository.split("/")[0] ?? ""}`} target="_blank" rel="noopener noreferrer">
              {t.detail.openOwnerProfile}
            </a>
          </Button>
        </StatePanel>
      </div>
    );
  }

  if (!loading && state?.status === "error") {
    return (
      <div className="space-y-10">
        {hero}
        <StatePanel title={t.detail.loadFailedTitle} description={errorMessageForKind(state.kind, t)} onRetry={retry} />
      </div>
    );
  }

  if (!loading && state?.status === "no-releases" && !latest) {
    return (
      <div className="space-y-10">
        {hero}
        <StatePanel icon="package" tone="neutral" title={t.detail.noReleasesTitle} description={t.detail.noReleasesDesc}>
          <Button asChild>
            <a href={repoUrl(app)} target="_blank" rel="noopener noreferrer">
              <Github aria-hidden />
              {t.detail.viewProjectOnGithub}
            </a>
          </Button>
        </StatePanel>
        {app.screenshots && app.screenshots.length > 0 && (
          <div className="pt-2">
            <ScreenshotsGallery screenshots={app.screenshots} heading={t.detail.screenshots} />
          </div>
        )}
      </div>
    );
  }

  const repo = snapshot.repo;
  const history = snapshot.history ?? [];

  return (
    <div className="space-y-10">
      <nav aria-label="Breadcrumb" className="mb-6">
        <ol className="flex flex-wrap items-center gap-1 text-[13px] text-muted-foreground">
          <li>
            <Link href="/" className="rounded transition-colors hover:text-foreground">
              {t.detail.breadcrumbHome}
            </Link>
          </li>
          <li aria-hidden="true">
            <ChevronRight className="size-3.5 rtl:-scale-x-100" />
          </li>
          <li>
            <Link href="/apps/" className="rounded transition-colors hover:text-foreground">
              {t.detail.breadcrumbApps}
            </Link>
          </li>
          <li aria-hidden="true">
            <ChevronRight className="size-3.5 rtl:-scale-x-100" />
          </li>
          <li aria-current="page" className="font-medium text-foreground">
            {app.name}
          </li>
        </ol>
      </nav>

      {hero}

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label={t.detail.statsAria}>
        <Stat label={t.detail.latestVersion} mono value={latest ? latest.tagName : undefined} loading={!latest && loading} />
        <Stat
          label={t.detail.released}
          value={latest ? formatRelativeTime(latest.publishedAt, locale) : undefined}
          title={latest?.publishedAt ? formatDate(latest.publishedAt, locale) : undefined}
          loading={!latest && loading}
        />
        <Stat label={t.detail.totalDownloads} value={latest ? formatCount(latest.totalDownloads) : undefined} loading={!latest && loading} />
        <Stat label={t.detail.githubStars} value={repo ? formatCount(repo.stargazers_count) : undefined} loading={!latest && loading && !repo} />
      </dl>

      {latest && (
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-w-0 space-y-10">
            <section id="downloads" className="scroll-mt-24" aria-labelledby="downloads-heading">
              <h2 id="downloads-heading" className="section-title text-xl">
                {t.detail.downloads}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {tf(t.detail.downloadsFrom, { tag: latest.tagName, date: formatDate(latest.publishedAt, locale) })}
                {latest.totalDownloads > 0 && tf(t.detail.downloadsSoFar, { count: formatCount(latest.totalDownloads) })}
              </p>
              <div className="mt-4">
                <DownloadsPanel release={latest} />
              </div>
            </section>

            {latest.notes && (
              <section aria-labelledby="notes-heading">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 id="notes-heading" className="section-title text-xl">
                    {tf(t.detail.whatsNew, { tag: latest.tagName })}
                  </h2>
                  {latest.prerelease && <Badge variant="outline">{t.detail.preRelease}</Badge>}
                </div>
                <div className="card-surface mt-3 p-5" dir="auto">
                  <ReleaseNotes source={latest.notes} />
                </div>
                <a
                  href={latest.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                >
                  {t.detail.readFullRelease}
                  <ExternalLink className="size-3.5" aria-hidden />
                </a>
              </section>
            )}

            {history.length > 1 && (
              <section aria-labelledby="history-heading">
                <h2 id="history-heading" className="section-title text-xl">
                  {t.detail.recentReleases}
                </h2>
                <ol className="mt-3 space-y-2">
                  {history.map((release, index) => (
                    <li key={release.url}>
                      <a
                        href={release.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3 transition-colors hover:border-primary/40"
                      >
                        <span className="flex min-w-0 items-center gap-2.5">
                          <span className="version-tag">{release.tagName}</span>
                          {index === 0 && !release.prerelease && <Badge variant="success">{t.detail.latest}</Badge>}
                          {release.prerelease && <Badge variant="outline">{t.detail.preRelease}</Badge>}
                          <span dir="auto" className="hidden truncate text-sm text-muted-foreground sm:inline">
                            {release.name}
                          </span>
                        </span>
                        <time dateTime={release.publishedAt ?? undefined} className="whitespace-nowrap text-xs text-muted-foreground">
                          {formatDate(release.publishedAt, locale)}
                        </time>
                      </a>
                    </li>
                  ))}
                </ol>
              </section>
            )}

            {app.screenshots && app.screenshots.length > 0 && (
              <ScreenshotsGallery screenshots={app.screenshots} heading={t.detail.screenshots} />
            )}
          </div>

          <aside className="space-y-5">
            {latestSource === "stale" && (
              <p className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-800 dark:text-amber-300">
                {t.detail.cachedNote}
              </p>
            )}

            <div className="card-surface p-5">
              <h2 className="text-sm font-semibold">{t.detail.about}</h2>
              <dl className="mt-3 space-y-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">{t.detail.category}</dt>
                  <dd className="font-medium">{categoryLabel(t, app.category)}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">{t.detail.platforms}</dt>
                  <dd className="text-end font-medium">
                    {app.platforms.length > 0 ? app.platforms.map((platform) => platformLabel(t, platform)).join("، ") : t.detail.seeReleaseAssets}
                  </dd>
                </div>
                {repo && (
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">{t.detail.stars}</dt>
                    <dd className="inline-flex items-center gap-1.5 font-medium">
                      <span aria-hidden="true">★</span>
                      {formatCount(repo.stargazers_count)}
                    </dd>
                  </div>
                )}
                {repo?.pushed_at && (
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">{t.detail.lastCodePush}</dt>
                    <dd className="font-medium">{formatRelativeTime(repo.pushed_at, locale)}</dd>
                  </div>
                )}
              </dl>
              <div className="mt-4 space-y-1.5 border-t pt-3 text-sm">
                <a href={repoUrl(app)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 rounded text-primary hover:underline">
                  <Github className="size-3.5" aria-hidden />
                  {t.detail.sourceRepository}
                </a>
                {latest && (
                  <a href={latest.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 rounded text-primary hover:underline">
                    <ExternalLink className="size-3.5" aria-hidden />
                    {t.detail.latestRelease}
                  </a>
                )}
                {repo?.homepage && (
                  <a href={repo.homepage} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 rounded text-primary hover:underline">
                    <ExternalLink className="size-3.5" aria-hidden />
                    {t.detail.website}
                  </a>
                )}
              </div>
            </div>

            {repo && (
              <div className="card-surface p-5">
                <h2 className="text-sm font-semibold">{t.detail.repository}</h2>
                <p dir="ltr" className="mt-2 break-all text-start font-mono text-[12.5px] text-muted-foreground">
                  {repo.full_name}
                </p>
                {repo.description && repo.description !== app.description && repo.description !== app.descriptionAr && (
                  <p dir="auto" className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
                    {repo.description}
                  </p>
                )}
              </div>
            )}
          </aside>
        </div>
      )}

      {loading && !latest && <DetailSkeleton />}
    </div>
  );
}

function Stat({ label, value, mono = false, loading, title }: { label: string; value?: string; mono?: boolean; loading?: boolean; title?: string }) {
  return (
    <div className="card-surface px-4 py-3.5" title={title}>
      <dt className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</dt>
      <dd className={`mt-1 truncate text-[15px] font-bold ${mono ? "font-mono" : ""}`}>
        {loading ? <span className="skeleton-shimmer inline-block h-5 w-20 rounded" aria-hidden="true" /> : (value ?? "—")}
      </dd>
    </div>
  );
}

function DetailSkeleton() {
  const { t } = useI18n();
  return (
    <div className="space-y-10" role="status" aria-label={t.detail.loadingAria}>
      <div className="flex gap-5">
        <Skeleton className="h-20 w-20 rounded-2xl" />
        <div className="flex-1 space-y-3 pt-1">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-full max-w-lg" />
          <Skeleton className="h-4 w-40" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-[70px] rounded-2xl" />
        ))}
      </div>
      <div className="space-y-3">
        <Skeleton className="h-6 w-36" />
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
      </div>
    </div>
  );
}

/** Localized error copy for a GitHubError kind. */
export function errorMessageForKind(kind: string | undefined, t: ReturnType<typeof useI18n>["t"]): string {
  switch (kind) {
    case "rate-limit":
      return t.states.rateLimit;
    case "network":
    case "forbidden":
      return t.states.network;
    default:
      return t.states.generic;
  }
}
