"use client";

import { useCallback, useEffect, useState } from "react";
import type { AppEntry } from "@/lib/config";
import { loadAppsReleases, type LoadSummary, type ReleaseState } from "@/lib/services/releases";

export interface ReleasesLoader {
  states: Record<string, ReleaseState>;
  summary: LoadSummary | null;
  loading: boolean;
  retry: () => void;
}

/**
 * Loads latest releases for a set of apps, updating state progressively as
 * each result arrives. One shared instance per page keeps API traffic low.
 */
export function useReleases(apps: readonly AppEntry[]): ReleasesLoader {
  const [states, setStates] = useState<Record<string, ReleaseState>>({});
  const [summary, setSummary] = useState<LoadSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    loadAppsReleases(apps, (slug, state) => {
      if (!cancelled) setStates((prev) => ({ ...prev, [slug]: state }));
    })
      .then((result) => {
        if (!cancelled) {
          setSummary(result);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [apps, nonce]);

  const retry = useCallback(() => setNonce((value) => value + 1), []);

  return { states, summary, loading, retry };
}
