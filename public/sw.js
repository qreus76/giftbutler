const CACHE_NAME = "giftbutler-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});

// Network-first: pass all requests through, satisfies Chrome's PWA criteria
self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});
