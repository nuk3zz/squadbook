const CACHE_NAME = "squadbook-shell-v7";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./assets/icons/squadbook-192.png",
  "./assets/icons/squadbook-512.png",
  "./assets/shared-store.js?v=6",
  "./assets/vendor/supabase-2.117.1.min.js",
  "./data/map-metadata.json",
  "./data/bomb-sites.json"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(names => Promise.all(names.filter(name => name.startsWith("squadbook-") && name !== CACHE_NAME).map(name => caches.delete(name))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.endsWith("/data/supabase-config.json")) return;

  if (request.mode === "navigate") {
    event.respondWith(
      caches.match("./index.html").then(cached => {
        const refreshed = fetch(request).then(response => {
          if (response.ok) caches.open(CACHE_NAME).then(cache => cache.put("./index.html", response.clone()));
          return response;
        }).catch(() => cached);
        return cached || refreshed;
      })
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => {
      const refreshed = fetch(request).then(response => {
        if (response.ok) caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone()));
        return response;
      }).catch(() => cached);
      return cached || refreshed;
    })
  );
});
