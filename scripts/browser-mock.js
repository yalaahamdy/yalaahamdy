/* Browser-side fetch interceptor for testing the live-data path.
   Injected via agent-browser eval — returns realistic GitHub API payloads
   (real scraped data) without touching the network. */
(function () {
  if (window.__yaMockInstalled) return "already-installed";
  window.__yaMockInstalled = true;
  const realFetch = window.fetch.bind(window);
  const JSON_HEADERS = { "content-type": "application/json", etag: '"mock-1"', "x-ratelimit-remaining": "4999" };
  const json = (data) => new Response(JSON.stringify(data), { status: 200, headers: JSON_HEADERS });
  const notFound = () => new Response(JSON.stringify({ message: "Not Found" }), { status: 404, headers: JSON_HEADERS });

  const RELEASES = {
    "yalaahamdy/ClipVault": {
      tag_name: "v1.7.0", name: "ClipVault v1.7.0",
      body: "## Improvements\n- Added an Android build alongside the Windows installer\n- Faster clipboard search with fuzzy matching\n- Reduced memory usage by 30%\n\n- [x] Ship Android APK\n- [ ] Auto-update channel",
      html_url: "https://github.com/yalaahamdy/ClipVault/releases/tag/v1.7.0",
      published_at: "2026-09-20T13:16:07Z", prerelease: false, draft: false,
      assets: [
        { name: "ClipVault_1.7.0.apk", size: 38273024, download_count: 1240, browser_download_url: "https://github.com/yalaahamdy/ClipVault/releases/download/v1.7.0/ClipVault_1.7.0.apk" },
        { name: "ClipVault_1.7.0_x64-setup.exe", size: 185597952, download_count: 3120, browser_download_url: "https://github.com/yalaahamdy/ClipVault/releases/download/v1.7.0/ClipVault_1.7.0_x64-setup.exe" },
      ],
    },
    "yalaahamdy/SIRAJ": {
      tag_name: "v0.3.27", name: "SIRAJ v0.3.27",
      body: "تحديثات المنصة الإسلامية الشاملة:\n- تحسين الأداء\n- إصلاح الأخطاء",
      html_url: "https://github.com/yalaahamdy/SIRAJ/releases/tag/v0.3.27",
      published_at: "2026-09-25T19:11:21Z", prerelease: false, draft: false,
      assets: [
        { name: "app-release.apk", size: 85878169, download_count: 800, browser_download_url: "https://github.com/yalaahamdy/SIRAJ/releases/download/v0.3.27/app-release.apk" },
        { name: "siraj-v0.3.27.apk", size: 85878169, download_count: 60, browser_download_url: "https://github.com/yalaahamdy/SIRAJ/releases/download/v0.3.27/siraj-v0.3.27.apk" },
      ],
    },
    "yalaahamdy/safeguard": {
      tag_name: "v1.0.14", name: "SafeGuard v1.0.14",
      body: "Security hardening release.\n- URL guard improvements\n- Encrypted vault fixes",
      html_url: "https://github.com/yalaahamdy/safeguard/releases/tag/v1.0.14",
      published_at: "2026-09-24T14:30:40Z", prerelease: false, draft: false,
      assets: [
        { name: "SafeGuardBrowser-v1.0.14.apk", size: 2432696, download_count: 430, browser_download_url: "https://github.com/yalaahamdy/safeguard/releases/download/v1.0.14/SafeGuardBrowser-v1.0.14.apk" },
        { name: "checksums.txt", size: 128, download_count: 12, browser_download_url: "https://github.com/yalaahamdy/safeguard/releases/download/v1.0.14/checksums.txt" },
      ],
    },
    "yalaahamdy/SecureBrowser": {
      tag_name: "v1.9.0", name: "SecureBrowser v1.9.0",
      body: "Stable release with privacy upgrades.",
      html_url: "https://github.com/yalaahamdy/SecureBrowser/releases/tag/v1.9.0",
      published_at: "2026-09-27T13:30:22Z", prerelease: false, draft: false,
      assets: [{ name: "SecureBrowser-v1.9.0-release.apk", size: 5788139, download_count: 210, browser_download_url: "https://github.com/yalaahamdy/SecureBrowser/releases/download/v1.9.0/SecureBrowser-v1.9.0-release.apk" }],
    },
    "yalaahamdy/App-Usage-Tracker-Controller": {
      tag_name: "v1.0.0", name: "Muraqib v1.0.0",
      body: "First public release.",
      html_url: "https://github.com/yalaahamdy/App-Usage-Tracker-Controller/releases/tag/v1.0.0",
      published_at: "2026-09-24T08:15:21Z", prerelease: false, draft: false,
      assets: [{ name: "muraqib-v1.0.0.apk", size: 19712375, download_count: 95, browser_download_url: "https://github.com/yalaahamdy/App-Usage-Tracker-Controller/releases/download/v1.0.0/muraqib-v1.0.0.apk" }],
    },
    "yalaahamdy/ScreenMonitor": {
      tag_name: "v1.0.0", name: "ScreenMonitor v1.0.0",
      body: "First release.",
      html_url: "https://github.com/yalaahamdy/ScreenMonitor/releases/tag/v1.0.0",
      published_at: "2026-09-24T08:14:14Z", prerelease: false, draft: false,
      assets: [
        { name: "ScreenMonitor-v1.0.0.apk", size: 22964224, download_count: 150, browser_download_url: "https://github.com/yalaahamdy/ScreenMonitor/releases/download/v1.0.0/ScreenMonitor-v1.0.0.apk" },
        { name: "ScreenMonitor-v1.0.0.apk.sha256", size: 96, download_count: 8, browser_download_url: "https://github.com/yalaahamdy/ScreenMonitor/releases/download/v1.0.0/ScreenMonitor-v1.0.0.apk.sha256" },
      ],
    },
  };
  const REPOS = {
    "yalaahamdy/ClipVault": { full_name: "yalaahamdy/ClipVault", description: "Clipboard manager", html_url: "https://github.com/yalaahamdy/ClipVault", homepage: null, stargazers_count: 42, open_issues_count: 3, pushed_at: "2026-09-26T10:00:00Z" },
    "yalaahamdy/SIRAJ": { full_name: "yalaahamdy/SIRAJ", description: "Islamic platform", html_url: "https://github.com/yalaahamdy/SIRAJ", homepage: null, stargazers_count: 128, open_issues_count: 5, pushed_at: "2026-09-26T09:00:00Z" },
  };
  const HISTORY = {
    "yalaahamdy/ClipVault": [
      RELEASES["yalaahamdy/ClipVault"],
      { tag_name: "v1.6.0", name: "ClipVault v1.6.0", body: "Older release", html_url: "https://github.com/yalaahamdy/ClipVault/releases/tag/v1.6.0", published_at: "2026-09-10T09:00:00Z", prerelease: false, draft: false, assets: [] },
      { tag_name: "v1.6.0-beta.1", name: "ClipVault v1.6.0-beta.1", body: "Beta", html_url: "https://github.com/yalaahamdy/ClipVault/releases/tag/v1.6.0-beta.1", published_at: "2026-09-05T09:00:00Z", prerelease: true, draft: false, assets: [] },
    ],
  };

  window.fetch = function (input, init) {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (!url || !url.includes("api.github.com")) return realFetch(input, init);
    const path = url.split("api.github.com")[1].split("?")[0];
    if (path === "/rate_limit") return Promise.resolve(json({ resources: { core: { remaining: 5000, limit: 5000 } } }));
    const latestMatch = /^\/repos\/([^/]+\/[^/]+)\/releases\/latest$/.exec(path);
    if (latestMatch) {
      const release = RELEASES[latestMatch[1]];
      return Promise.resolve(release ? json(release) : notFound());
    }
    const listMatch = /^\/repos\/([^/]+\/[^/]+)\/releases$/.exec(path);
    if (listMatch) return Promise.resolve(json(HISTORY[listMatch[1]] || (RELEASES[listMatch[1]] ? [RELEASES[listMatch[1]]] : [])));
    const repoMatch = /^\/repos\/([^/]+\/[^/]+)$/.exec(path);
    if (repoMatch) {
      const repo = REPOS[repoMatch[1]];
      return Promise.resolve(repo ? json(repo) : notFound());
    }
    return Promise.resolve(notFound());
  };
  return "mock-installed";
})()
