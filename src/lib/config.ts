import rawConfig from "../../data/apps.json";

export interface SiteConfig {
  name: string;
  shortName: string;
  tagline: string;
  description: string;
  owner: string;
  githubProfile: string;
  url: string;
  version: string;
  keywords: string[];
}

export interface Screenshot {
  src: string;
  alt: string;
}

export interface AssetOverride {
  /** Regex tested against the release asset file name. */
  match: string;
  platform: string;
  label?: string;
}

export interface AppEntry {
  slug: string;
  name: string;
  repository: string;
  description: string;
  /** Arabic description shown when the site language is Arabic. */
  descriptionAr?: string;
  platforms: string[];
  category: string;
  featured?: boolean;
  /** Icon source: "/path" (site asset), "http…" (absolute), or a repo file path. */
  icon?: string;
  screenshots?: Screenshot[];
  assetOverrides?: AssetOverride[];
}

export interface AppConfig {
  site: SiteConfig;
  apps: AppEntry[];
}

export const config = rawConfig as unknown as AppConfig;
export const site = config.site;

export const SITE_URL = site.url.replace(/\/+$/, "");
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** Prefix an in-site path with the configured base path (project-pages deploys). */
export function withBasePath(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${BASE_PATH}${normalized}`;
}

export const GITHUB_API = "https://api.github.com";

/** How long a cached release payload is considered fresh before revalidation. */
export const CACHE_TTL_MS = 30 * 60 * 1000;
