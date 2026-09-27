"use client";

import Link from "next/link";
import { AppIcon } from "@/components/apps/app-icon";
import { useReleasesContext } from "@/components/apps/releases-context";
import { allApps, appDetailPath } from "@/lib/apps";
import { formatRelativeTime, markdownExcerpt } from "@/lib/utils/format";
import { Skeleton } from "@/components/ui/skeleton";
import type { ReleaseState } from "@/lib/services/releases";
import { useI18n } from "@/i18n/provider";

interface UpdateEntry {
  slug: string;
  name: string;
  tagName: string;
  publishedAt: string | null;
  excerpt: string;
}

type LoadedState = Extract<ReleaseState, { status: "loaded" }>;

/** Compact "latest updates" feed for the home page (top 4 across all apps). */
export function UpdatesPreview() {
  const { states, loading } = useReleasesContext();
  const { locale, t } = useI18n();

  const entries: UpdateEntry[] = Object.entries(states)
    .filter((entry): entry is [string, LoadedState] => entry[1].status === "loaded")
    .map(([slug, state]) => {
      const app = allApps.find((item) => item.slug === slug);
      return {
        slug,
        name: app?.name ?? slug,
        tagName: state.release.tagName,
        publishedAt: state.release.publishedAt,
        excerpt: markdownExcerpt(state.release.notes, 110) || state.release.name,
      };
    })
    .sort((a, b) => Date.parse(b.publishedAt ?? "0") - Date.parse(a.publishedAt ?? "0"))
    .slice(0, 4);

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="card-surface flex items-center gap-4 p-4">
            <Skeleton className="size-12 rounded-xl" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3.5 w-64 max-w-full" />
            </div>
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return <div className="card-surface p-6 text-center text-sm text-muted-foreground">{t.updates.noReleasesDesc}</div>;
  }

  return (
    <ul className="space-y-3">
      {entries.map((entry) => {
        const app = allApps.find((item) => item.slug === entry.slug);
        return (
          <li key={entry.slug}>
            <Link href={appDetailPath(entry.slug)} className="card-surface flex items-center gap-4 p-4 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md">
              {app && <AppIcon app={app} />}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{entry.name}</span>
                  <span className="version-tag">{entry.tagName}</span>
                </div>
                {entry.excerpt && (
                  <p dir="auto" className="mt-0.5 line-clamp-1 text-start text-sm text-muted-foreground">
                    {entry.excerpt}
                  </p>
                )}
              </div>
              <time dateTime={entry.publishedAt ?? undefined} className="whitespace-nowrap text-xs text-muted-foreground">
                {formatRelativeTime(entry.publishedAt, locale)}
              </time>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
