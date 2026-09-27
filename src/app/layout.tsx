import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "next-themes";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { SwRegister } from "@/components/site/sw-register";
import { SITE_URL, site } from "@/lib/config";
import { localeNoFlashScript } from "@/i18n/config";
import { I18nProvider } from "@/i18n/provider";
import { ar } from "@/i18n/ar";
import "./globals.css";

// Self-hosted technical typeface — IBM Plex Sans Arabic carries both the
// Arabic and Latin text (its Latin glyphs are IBM Plex Sans), with IBM Plex
// Mono for versions, sizes and code. No external font CDN at runtime.
import "@fontsource/ibm-plex-sans-arabic/400.css";
import "@fontsource/ibm-plex-sans-arabic/500.css";
import "@fontsource/ibm-plex-sans-arabic/600.css";
import "@fontsource/ibm-plex-sans-arabic/700.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "@fontsource/ibm-plex-mono/600.css";

const { brand } = ar;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${site.name} — ${site.tagline}`,
    template: `%s | ${site.name}`,
  },
  description: brand.description,
  keywords: site.keywords,
  applicationName: site.name,
  authors: [{ name: site.owner, url: site.githubProfile }],
  creator: site.owner,
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  openGraph: {
    type: "website",
    siteName: site.name,
    locale: "ar_AR",
    alternateLocale: ["en_US"],
    title: `${site.name} — ${site.tagline}`,
    description: brand.description,
    url: "/",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: site.name }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${site.name} — ${site.tagline}`,
    description: brand.description,
    images: ["/og-image.png"],
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f9f8fc" },
    { media: "(prefers-color-scheme: dark)", color: "#17141f" },
  ],
  colorScheme: "light dark",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // The prerendered shell is Arabic (the site's primary language); a no-flash
    // script applies the visitor's persisted locale before first paint.
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body className="flex min-h-svh flex-col bg-background font-sans text-foreground antialiased">
        <script id="locale-no-flash" dangerouslySetInnerHTML={{ __html: localeNoFlashScript }} />
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <I18nProvider>
            <a href="#main-content" className="skip-link">
              {ar.nav.skipToContent}
            </a>
            <SiteHeader />
            <main id="main-content" className="flex-1">
              {children}
            </main>
            <SiteFooter />
            <SwRegister />
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
