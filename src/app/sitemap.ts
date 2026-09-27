import type { MetadataRoute } from "next";
import { allApps, appDetailPath } from "@/lib/apps";
import { BASE_PATH, SITE_URL } from "@/lib/config";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = `${SITE_URL}${BASE_PATH}`;
  const now = new Date();

  const staticPages = ["", "/apps/", "/updates/"].map((path) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency: "daily" as const,
    priority: path === "" ? 1 : 0.8,
  }));

  const appPages = allApps.map((app) => ({
    url: `${base}${appDetailPath(app.slug)}`,
    lastModified: now,
    changeFrequency: "daily" as const,
    priority: 0.7,
  }));

  return [...staticPages, ...appPages];
}
