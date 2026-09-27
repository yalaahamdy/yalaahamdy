"use client";

import { useReleasesContext } from "@/components/apps/releases-context";
import { allApps } from "@/lib/apps";
import { formatCount } from "@/lib/utils/format";
import { useI18n } from "@/i18n/provider";

/** Hero stat strip — apps count is config truth; downloads are live API data. */
export function HomeStats() {
  const { states, summary, loading } = useReleasesContext();
  const { t } = useI18n();

  const loaded = Object.values(states).filter((state) => state.status === "loaded");
  const totalDownloads = loaded.reduce((sum, state) => (state.status === "loaded" ? sum + state.release.totalDownloads : sum), 0);
  const stats = [
    { label: t.stats.apps, value: loading ? null : String(allApps.length) },
    { label: t.stats.releasesTracked, value: loading ? null : String(loaded.length) },
    { label: t.stats.totalDownloads, value: loading ? null : formatCount(totalDownloads) },
  ];

  return (
    <div className="mx-auto mt-12 w-full max-w-xl">
      <dl className="grid grid-cols-3 divide-x divide-border rounded-2xl border bg-card/70 py-4 shadow-sm backdrop-blur">
        {stats.map((stat) => (
          <div key={stat.label} className="px-2 text-center">
            <dt className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{stat.label}</dt>
            <dd className="mt-1 font-mono text-xl font-bold tabular-nums">
              {stat.value ?? <span className="skeleton-shimmer inline-block h-6 w-12 rounded" aria-hidden="true" />}
            </dd>
          </div>
        ))}
      </dl>
      {summary?.mode === "cache-only" && <p className="mt-2 text-center text-xs text-muted-foreground">{t.stats.cacheOnlyNote}</p>}
    </div>
  );
}
