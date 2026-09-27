import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AppDetail } from "@/components/apps/app-detail";
import { allApps, getApp } from "@/lib/apps";
import { SITE_URL, site } from "@/lib/config";

export const dynamicParams = false;

export function generateStaticParams() {
  return allApps.map((app) => ({ slug: app.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const app = getApp(slug);
  if (!app) return {};

  const description = app.descriptionAr ?? app.description;
  const title = `${app.name} — تنزيل أحدث إصدار`;
  const platformSummary = app.platforms.length > 0 ? ` متاح لأجهزة ${app.platforms.join(" و")}.` : "";
  return {
    title: app.name,
    description: `${description}${platformSummary}`,
    alternates: { canonical: `/apps/${app.slug}/` },
    openGraph: {
      title,
      description,
      url: `/apps/${app.slug}/`,
      type: "website",
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function AppDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const app = getApp(slug);
  if (!app) notFound();

  const description = app.descriptionAr ?? app.description;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: app.name,
    description,
    applicationCategory: app.category,
    operatingSystem: app.platforms.length > 0 ? app.platforms.join(", ") : "See release assets",
    url: `${SITE_URL}/apps/${app.slug}/`,
    author: { "@type": "Person", name: site.owner, url: site.githubProfile },
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  };

  return (
    <div className="container-page py-8 sm:py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <AppDetail app={app} />
    </div>
  );
}
