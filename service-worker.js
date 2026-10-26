/* StudyMats offline-first service worker for web and installed mobile/desktop apps. */
const CACHE_NAME = "studymats-pwa-v8";
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./quiz.html",
  "./test-bank-builder.html",
  "./test-bank-builder-v2.html",
  "./style.css",
  "./navigation-redesign.css",
  "./navigation-redesign.js",
  "./mobile-minimal.css",
  "./theme.js",
  "./app.js",
  "./dashboard.js",
  "./question-search.js",
  "./offline-status.js",
  "./subjects.json",
  "./manifest.json",
  "./assets/studymats-mark.svg"
];

const absolute = (path) => new URL(path, self.registration.scope).href;

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);

    // Cache each shell file independently so one optional missing file cannot
    // prevent the entire app from becoming available offline.
    await Promise.allSettled(CORE_ASSETS.map(async (path) => {
      const response = await fetch(absolute(path), { cache: "reload" });
      if (response.ok) await cache.put(absolute(path), response);
    }));

    // Pre-cache every published question bank, not just the app shell.
    try {
      const response = await fetch(absolute("./subjects.json"), { cache: "reload" });
      if (response.ok) {
        await cache.put(absolute("./subjects.json"), response.clone());
        const subjects = await response.clone().json();
        if (Array.isArray(subjects)) {
          await Promise.allSettled(subjects
            .map(subject => subject && subject.data)
            .filter(path => typeof path === "string" && path.length)
            .map(async (path) => {
              const url = absolute(path);
              const dataResponse = await fetch(url, { cache: "reload" });
              if (dataResponse.ok) await cache.put(url, dataResponse);
            }));
        }
      }
    } catch (error) {
      // The shell remains installable; data is retried when requested online.
      console.warn("StudyMats question banks could not all be pre-cached:", error);
    }

    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter(key => key.startsWith("studymats-pwa-") && key !== CACHE_NAME)
      .map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Pages and JSON use network-first so updates appear when connected, while
  // cached copies keep navigation and question loading working offline.
  const isPage = request.mode === "navigate";
  const isJson = url.pathname.endsWith(".json");

  if (isPage || isJson) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const response = await fetch(request);
        if (response && response.ok) {
          await cache.put(request, response.clone());
        }
        return response;
      } catch (error) {
        const cached = await caches.match(request, { ignoreSearch: true });
        if (cached) return cached;

        if (isPage) {
          const pageName = url.pathname.split("/").pop() || "index.html";
          const fallback = await caches.match(absolute("./" + pageName))
            || await caches.match(absolute("./index.html"));
          if (fallback) return fallback;
        }
        return new Response(
          JSON.stringify({ error: "offline", message: "This content is not cached yet. Reconnect and open it once to save it for offline use." }),
          { status: 503, headers: { "Content-Type": "application/json; charset=utf-8" } }
        );
      }
    })());
    return;
  }

  // Cache-first for styles, scripts, icons and other same-origin assets.
  event.respondWith((async () => {
    // Asset query strings are used for cache-busting; the installed shell
    // stores canonical paths, so ignore search params when matching assets.
    const cached = await caches.match(request, { ignoreSearch: true });
    if (cached) return cached;
    try {
      const response = await fetch(request);
      if (response.ok && (response.type === "basic" || response.type === "default")) {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(request, response.clone());
      }
      return response;
    } catch (error) {
      return new Response("StudyMats is offline and this asset is not cached yet.", {
        status: 503,
        headers: { "Content-Type": "text/plain; charset=utf-8" }
      });
    }
  })());
});
