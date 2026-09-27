"use client";

import { AppCard } from "@/components/apps/app-card";
import { useReleasesContext } from "@/components/apps/releases-context";
import type { AppEntry } from "@/lib/config";
import { cn } from "@/lib/utils";

interface AppCardGridProps {
  apps: readonly AppEntry[];
  columns?: 2 | 3;
  /** When true, apps flagged `featured` in data/apps.json render in the wide layout. */
  featuredLayout?: boolean;
}

export function AppCardGrid({ apps, columns = 3, featuredLayout = false }: AppCardGridProps) {
  const { states } = useReleasesContext();
  if (featuredLayout) {
    // Featured apps render as full-width horizontal rows — premium "store" feel.
    return (
      <div className="flex flex-col gap-4">
        {apps.map((app) => (
          <AppCard key={app.slug} app={app} state={states[app.slug]} featured />
        ))}
      </div>
    );
  }
  return (
    <div className={cn("grid gap-4", columns === 3 ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2")}>
      {apps.map((app) => (
        <AppCard key={app.slug} app={app} state={states[app.slug]} />
      ))}
    </div>
  );
}
