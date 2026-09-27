import type { Metadata } from "next";
import { HomeView } from "@/components/apps/home-view";
import { SITE_URL, site } from "@/lib/config";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: site.name,
  alternateName: "تطبيقات يالاء",
  url: SITE_URL,
  description: "The official hub for all apps and projects by yalaa — live GitHub Releases, downloads and updates.",
  author: { "@type": "Person", name: site.owner, url: site.githubProfile },
};

export default function HomePage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <HomeView />
    </>
  );
}
