"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useReleases, type ReleasesLoader } from "@/components/apps/use-releases";
import type { AppEntry } from "@/lib/config";

const ReleasesContext = createContext<ReleasesLoader | null>(null);

/**
 * Provides ONE shared release loader for a whole page so that the hero stats,
 * featured grid and updates preview never duplicate the same API requests.
 */
export function ReleasesProvider({ apps, children }: { apps: readonly AppEntry[]; children: ReactNode }) {
  const loader = useReleases(apps);
  return <ReleasesContext.Provider value={loader}>{children}</ReleasesContext.Provider>;
}

export function useReleasesContext(): ReleasesLoader {
  const loader = useContext(ReleasesContext);
  if (!loader) throw new Error("useReleasesContext must be used within a ReleasesProvider");
  return loader;
}
