/* global self, caches, URL, fetch */

const CACHE_NAME = "velaris-static-v1";
const STATIC_ASSETS = [
  "/",
  "/manifest.webmanifest",
  "/icons/icon.svg",
  "/icons/maskable-icon.svg",
];
const SENSITIVE_PREFIXES = [
  "/api/",
  "/admin",
  "/app",
  "/cliente",
  "/acompanhar",
  "/recuperar",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  if (url.origin !== self.location.origin || isSensitivePath(url.pathname)) {
    return;
  }

  if (isStaticRequest(request)) {
    event.respondWith(cacheFirst(request));
  }
});

function isSensitivePath(pathname) {
  return SENSITIVE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function isStaticRequest(request) {
  return ["font", "image", "manifest", "script", "style"].includes(request.destination);
}

async function cacheFirst(request) {
  const cached = await caches.match(request);

  if (cached) {
    return cached;
  }

  const response = await fetch(request);

  if (response.ok) {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, response.clone());
  }

  return response;
}
