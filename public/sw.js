/*
 * Minimal service worker for the GitHub Pages deployment.
 *
 * Strategy (deliberately simple, per project requirements):
 *  - Navigations: network-first, cached copy as offline fallback. The user
 *    always gets fresh HTML (and therefore fresh release data) when online.
 *  - Static assets under /_next/static/: cache-first (they are content-hashed).
 *  - Other same-origin GETs (icons, manifest, og image): stale-while-revalidate.
 *  - Cross-origin requests (api.github.com) are NEVER intercepted — release
 *    freshness is handled by the app layer, not the service worker.
 */
const VERSION = "ya-v1";
const PAGES_CACHE = `${VERSION}-pages`;
const ASSETS_CACHE = `${VERSION}-assets`;

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(names.filter((name) => !name.startsWith(VERSION)).map((name) => caches.delete(name)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          const cache = await caches.open(PAGES_CACHE);
          cache.put(request, response.clone());
          return response;
        } catch {
          const cached = await caches.match(request);
          return cached || caches.match(new URL("/", self.location.origin));
        }
      })(),
    );
    return;
  }

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) {
          const cache = await caches.open(ASSETS_CACHE);
          cache.put(request, response.clone());
        }
        return response;
      })(),
    );
    return;
  }

  event.respondWith(
    (async () => {
      const cached = await caches.match(request);
      const fetchPromise = fetch(request)
        .then((response) => {
          if (response.ok) {
            caches.open(ASSETS_CACHE).then((cache) => cache.put(request, response.clone()));
          }
          return response;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })(),
  );
});
