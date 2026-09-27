"use client";

import { ArrowDownToLine, ExternalLink, Star } from "lucide-react";
import Link from "next/link";
import { AppIcon } from "@/components/apps/app-icon";
import { platformIcon } from "@/components/apps/platform-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { appDetailPath, releasesUrl, repoUrl } from "@/lib/apps";
import type { AppEntry } from "@/lib/config";
import { formatBytes, formatRelativeTime } from "@/lib/utils/format";
import { pickPrimaryAsset, type NormalizedRelease } from "@/lib/utils/assets";
import type { ReleaseState } from "@/lib/services/releases";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/provider";
import { appDescription, assetLabel, categoryLabel, platformLabel } from "@/i18n/labels";

interface AppCardProps {
  app: AppEntry;
  state?: ReleaseState;
  featured?: boolean;
}

function VersionMeta({ state }: { state?: ReleaseState }) {
  const { t, locale } = useI18n();
  if (!state) {
    return (
      <div className="flex items-center gap-2" aria-hidden="true">
        <span className="skeleton-shimmer h-5 w-20 rounded-md" />
        <span className="skeleton-shimmer h-4 w-16 rounded" />
      </div>
    );
  }
  if (state.status === "loaded") {
    return (
      <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1">
        <span className="version-tag">{state.release.tagName}</span>
        {state.source === "stale" && (
          <span className="text-[11px] text-muted-foreground" title={t.card.cachedTitle}>
            {t.card.cached}
          </span>
        )}
        <time dateTime={state.release.publishedAt ?? undefined} className="text-xs text-muted-foreground">
          {formatRelativeTime(state.release.publishedAt, locale)}
        </time>
      </div>
    );
  }
  if (state.status === "no-releases") {
    return <span className="text-xs text-muted-foreground">{t.card.noReleasesYet}</span>;
  }
  if (state.status === "repo-not-found") {
    return <span className="text-xs text-destructive">{t.card.repoUnavailable}</span>;
  }
  return (
    <span className="text-xs text-muted-foreground" title={t.card.releaseInfoTitle}>
      {t.card.releaseInfoUnavailable}
    </span>
  );
}

export function AppCard({ app, state, featured = false }: AppCardProps) {
  const { t, tf, locale } = useI18n();
  const release: NormalizedRelease | null = state?.status === "loaded" ? state.release : null;
  const primary = release ? pickPrimaryAsset(release.assets, app.platforms) : null;

  return (
    <article
      className={cn(
        "card-surface group relative flex flex-col gap-4 p-5 transition-all duration-200",
        "hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/30",
        featured && "md:flex-row md:items-center md:gap-7 md:p-6",
      )}
    >
      {/* Stretched link makes the whole card clickable; interactive children opt out with relative z-index. */}
      <Link href={appDetailPath(app.slug)} className="absolute inset-0 rounded-2xl focus-visible:outline-2" aria-label={tf(t.card.viewDetailsAria, { name: app.name })}>
        <span className="sr-only">{tf(t.card.viewDetailsAria, { name: app.name })}</span>
      </Link>

      <div className={cn("flex min-w-0 items-start gap-4", featured && "md:w-64 md:shrink-0 md:flex-col md:items-start")}>
        <AppIcon app={app} size={featured ? "lg" : "md"} />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className={cn("font-bold tracking-tight transition-colors group-hover:text-primary", featured ? "text-lg" : "text-[16.5px]")}>
              {app.name}
            </h3>
            {featured && (
              <Badge className="border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400">
                <Star aria-hidden /> {t.card.featured}
              </Badge>
            )}
          </div>
          <p className={cn("mt-1.5 text-sm leading-relaxed text-muted-foreground", featured ? "line-clamp-3" : "line-clamp-2")}>
            {appDescription(app, locale)}
          </p>
        </div>
      </div>

      <div className={cn("flex min-w-0 flex-1 flex-col gap-3", featured && "md:gap-4")}>
        {app.platforms.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {app.platforms.map((platform) => {
              const Icon = platformIcon(platform);
              return (
                <span key={platform} className="chip">
                  <Icon className="size-3.5" aria-hidden />
                  {platformLabel(t, platform)}
                </span>
              );
            })}
            <span className="chip opacity-80">{categoryLabel(t, app.category)}</span>
          </div>
        )}
        {app.platforms.length === 0 && <span className="chip w-fit opacity-80">{categoryLabel(t, app.category)}</span>}

        <VersionMeta state={state} />

        <div className="relative z-10 mt-auto flex flex-wrap items-center gap-2">
          {primary ? (
            <Button asChild size="sm">
              <a href={primary.url} title={`${tf(t.card.download, { label: assetLabel(t, primary.label) })} — ${primary.name}`}>
                <ArrowDownToLine aria-hidden />
                {tf(t.card.download, { label: assetLabel(t, primary.label) })}
                <span className="font-normal opacity-70">· {formatBytes(primary.size)}</span>
              </a>
            </Button>
          ) : release ? (
            <Button asChild size="sm" variant="secondary">
              <a href={release.url} target="_blank" rel="noopener noreferrer">
                {t.card.viewRelease}
                <ExternalLink aria-hidden />
              </a>
            </Button>
          ) : state?.status === "no-releases" || state?.status === "repo-not-found" ? (
            <Button asChild size="sm" variant="secondary">
              <a href={state.status === "repo-not-found" ? repoUrl(app) : releasesUrl(app)} target="_blank" rel="noopener noreferrer">
                {t.card.viewOnGithub}
                <ExternalLink aria-hidden />
              </a>
            </Button>
          ) : null}
          <Button asChild size="sm" variant="ghost">
            <Link href={appDetailPath(app.slug)}>{t.card.details}</Link>
          </Button>
        </div>
      </div>
    </article>
  );
}
