"use client";

import { AlertTriangle, RotateCcw, Search, SearchX } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AppCard } from "@/components/apps/app-card";
import { useReleases } from "@/components/apps/use-releases";
import { allApps, getCategories, getPlatforms } from "@/lib/apps";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/provider";
import { categoryLabel, platformLabel } from "@/i18n/labels";

type SortKey = "newest" | "name" | "downloads";

const CATEGORIES = ["All", ...getCategories()];
const PLATFORMS = ["All", ...getPlatforms()];

/**
 * Searchable, filterable, sortable app explorer. Filter state is mirrored to
 * the URL query string so filtered views can be shared or bookmarked.
 */
export function AppsExplorer() {
  const { t, tf, locale } = useI18n();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [platform, setPlatform] = useState("All");
  const [sort, setSort] = useState<SortKey>("newest");
  const [restored, setRestored] = useState(false);
  const { states, summary, loading, retry } = useReleases(allApps);

  const SORT_OPTIONS: { value: SortKey; label: string }[] = [
    { value: "newest", label: t.explorer.sortNewest },
    { value: "name", label: t.explorer.sortName },
    { value: "downloads", label: t.explorer.sortDownloads },
  ];

  // Restore filters from the URL once on mount.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get("q");
    const c = params.get("category");
    const p = params.get("platform");
    const s = params.get("sort");
    if (q) setQuery(q);
    if (c && CATEGORIES.includes(c)) setCategory(c);
    if (p && PLATFORMS.includes(p)) setPlatform(p);
    if (s && ["newest", "name", "downloads"].includes(s)) setSort(s as SortKey);
    setRestored(true);
  }, []);

  // Mirror filter state back to the URL (replace — no history spam).
  useEffect(() => {
    if (!restored) return;
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (category !== "All") params.set("category", category);
    if (platform !== "All") params.set("platform", platform);
    if (sort !== "newest") params.set("sort", sort);
    const queryString = params.toString();
    const url = queryString ? `${window.location.pathname}?${queryString}` : window.location.pathname;
    window.history.replaceState(null, "", url);
  }, [query, category, platform, sort, restored]);

  const visibleApps = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = allApps.filter((app) => {
      if (category !== "All" && app.category !== category) return false;
      if (platform !== "All" && !app.platforms.includes(platform)) return false;
      if (!needle) return true;
      const haystack = [app.name, app.description, app.descriptionAr ?? "", app.category, app.platforms.join(" "), app.repository].join(" ").toLowerCase();
      return haystack.includes(needle);
    });

    const publishTime = (slug: string): number => {
      const state = states[slug];
      if (state?.status === "loaded" && state.release.publishedAt) return Date.parse(state.release.publishedAt);
      return -1; // apps without release data sort last
    };

    return [...filtered].sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name, locale === "ar" ? "ar" : "en");
      if (sort === "downloads") {
        const downloads = (slug: string) => {
          const state = states[slug];
          return state?.status === "loaded" ? state.release.totalDownloads : -1;
        };
        return downloads(b.slug) - downloads(a.slug) || publishTime(b.slug) - publishTime(a.slug);
      }
      return publishTime(b.slug) - publishTime(a.slug);
    });
  }, [query, category, platform, sort, states, locale]);

  const hasActiveFilters = query.trim() !== "" || category !== "All" || platform !== "All";
  const hasError = summary ? summary.failed > 0 : false;

  return (
    <div>
      <div className="card-surface p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t.explorer.searchPlaceholder}
              aria-label={t.explorer.searchAria}
              className="ps-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="apps-sort" className="hidden text-sm text-muted-foreground sm:inline">
              {t.explorer.sort}
            </label>
            <select
              id="apps-sort"
              value={sort}
              onChange={(event) => setSort(event.target.value as SortKey)}
              className="h-10 rounded-lg border border-input bg-card px-3 text-sm shadow-sm focus-visible:outline-2 focus-visible:outline-ring"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 space-y-2.5">
          <FilterChipGroup label={t.explorer.category} ariaLabel={t.explorer.filterByCategory} options={CATEGORIES} labelFor={(value) => categoryLabel(t, value)} active={category} onSelect={setCategory} allLabel={t.explorer.all} />
          <FilterChipGroup label={t.explorer.platform} ariaLabel={t.explorer.filterByPlatform} options={PLATFORMS} labelFor={(value) => platformLabel(t, value)} active={platform} onSelect={setPlatform} allLabel={t.explorer.all} />
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground" role="status">
          {loading ? t.explorer.loading : tf(t.explorer.count, { visible: visibleApps.length, total: allApps.length })}
        </p>
        {hasError && (
          <Button variant="ghost" size="sm" onClick={retry}>
            <RotateCcw aria-hidden />
            {t.explorer.retryFailed}
          </Button>
        )}
      </div>

      {hasError && (
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-300" role="alert">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <p>{summary?.mode === "cache-only" ? t.explorer.partialErrorCache : t.explorer.partialErrorLive}</p>
        </div>
      )}

      {visibleApps.length > 0 ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleApps.map((app) => (
            <AppCard key={app.slug} app={app} state={states[app.slug]} />
          ))}
        </div>
      ) : (
        <div className="card-surface mt-4 flex flex-col items-center gap-3 p-10 text-center">
          <SearchX className="size-8 text-muted-foreground" aria-hidden />
          <p className="font-semibold">{t.explorer.noMatchTitle}</p>
          <p className="max-w-sm text-sm text-muted-foreground">{t.explorer.noMatchDesc}</p>
          {hasActiveFilters && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setQuery("");
                setCategory("All");
                setPlatform("All");
              }}
            >
              <RotateCcw aria-hidden />
              {t.explorer.clearFilters}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function FilterChipGroup({
  label,
  ariaLabel,
  options,
  labelFor,
  active,
  onSelect,
  allLabel,
}: {
  label: string;
  ariaLabel: string;
  options: readonly string[];
  labelFor: (value: string) => string;
  active: string;
  onSelect: (value: string) => void;
  allLabel: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-16 shrink-0 text-xs font-medium text-muted-foreground">{label}</span>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label={ariaLabel}>
        {options.map((option) => {
          const selected = option === active;
          const display = option === "All" ? allLabel : labelFor(option);
          return (
            <button
              key={option}
              type="button"
              onClick={() => onSelect(option)}
              aria-pressed={selected}
              className={cn(
                "rounded-full border px-3 py-1 text-[12.5px] font-medium transition-colors",
                selected ? "border-primary bg-primary text-primary-foreground shadow-sm" : "bg-secondary/60 text-secondary-foreground hover:border-primary/40 hover:text-foreground",
              )}
            >
              {display}
            </button>
          );
        })}
      </div>
    </div>
  );
}
