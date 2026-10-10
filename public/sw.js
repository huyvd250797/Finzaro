const APP_VERSION = new URL(self.location.href).searchParams.get("v") || "unknown";
const CACHE_NAME = `finzaro-static-v${APP_VERSION}`;
const REQUIRED_SHELL = ["/offline", "/pwa-error"];
const OPTIONAL_SHELL = ["/icons/finzaro-v0012-192.png", "/icons/finzaro-v0012-512.png", "/icons/finzaro-v0012-apple.png"];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // Recovery pages are required. Optional artwork must never prevent a new
    // service worker from installing during a deploy or transient CDN miss.
    await cache.addAll(REQUIRED_SHELL);
    await Promise.allSettled(OPTIONAL_SHELL.map((url) => cache.add(url)));
  })());
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") { self.skipWaiting(); return; }
  if (event.data?.type === "GET_VERSION") event.source?.postMessage({ type: "FINZARO_SW_VERSION", version: APP_VERSION });
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter((key) => key.startsWith("finzaro-static-v") && key !== CACHE_NAME)
      .map((key) => caches.delete(key)));
    await self.clients.claim();
    const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of clients) client.postMessage({ type: "FINZARO_SW_ACTIVATED", version: APP_VERSION });
  })());
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/")) return;

  // Never cache authenticated HTML. If the server returns a 5xx to an
  // installed PWA, show a deterministic recovery screen instead of WebKit's
  // generic "This page couldn't load" screen.
  if (event.request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const response = await fetch(event.request, { cache: "no-store" });
        if (response.status >= 500) return (await caches.match("/pwa-error")) || response;
        return response;
      } catch {
        return (await caches.match("/offline")) || Response.error();
      }
    })());
    return;
  }

  const cacheable =
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/manifest.webmanifest";

  if (!cacheable) return;
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
    if (response.ok) {
      const copy = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
    }
    return response;
  })));
});
