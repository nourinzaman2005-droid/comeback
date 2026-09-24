const CACHE_NAME = "comeback-shell-v3";
const SCOPE_PATH = new URL(self.registration.scope).pathname;
const APP_SHELL = [
  SCOPE_PATH,
  `${SCOPE_PATH}manifest.webmanifest`,
  `${SCOPE_PATH}icon.svg`,
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      ),
  );
  self.clients.claim();
});

self.addEventListener("message", (event) => {
  if (event.data?.type !== "CACHE_RESOURCES") return;
  const resources = event.data.resources.filter(
    (resource) => new URL(resource).origin === self.location.origin,
  );
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) =>
        Promise.all(
          resources.map((resource) =>
            cache.add(resource).catch(() => undefined),
          ),
        ),
      ),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          event.waitUntil(
            caches
              .open(CACHE_NAME)
              .then((cache) => cache.put(event.request, copy)),
          );
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        if (event.request.mode === "navigate") return caches.match(SCOPE_PATH);
        return new Response("Offline resource unavailable", { status: 503 });
      }),
  );
});
