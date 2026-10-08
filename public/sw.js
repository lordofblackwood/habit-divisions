// These two markers are populated after Vite builds the production assets.
const BUILD_ID = '__BUILD_ID__';
const PRECACHE_PATHS = /* PRECACHE_START */ ['index.html', 'manifest.webmanifest'] /* PRECACHE_END */;
const SCOPE = new URL(self.registration.scope);
const CACHE_PREFIX = `habit-divisions::${SCOPE.href}::`;
const CACHE_NAME = `${CACHE_PREFIX}${BUILD_ID}`;
const PRECACHE_URLS = PRECACHE_PATHS.map((path) => new URL(path, SCOPE).href);
const PRECACHE_SET = new Set(PRECACHE_URLS);
const SHELL_URL = new URL('index.html', SCOPE).href;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(PRECACHE_URLS.map((url) => new Request(url, { cache: 'reload' }))),
    ),
  );
  // Updated workers wait until the user accepts the update or closes the app.
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
          .map((name) => caches.delete(name)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    event.waitUntil(self.skipWaiting());
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (
    request.method !== 'GET' ||
    url.origin !== SCOPE.origin ||
    !url.pathname.startsWith(SCOPE.pathname)
  ) {
    return;
  }

  if (request.mode === 'navigate') {
    // Always try the live shell so a cached release cannot hide a new release.
    // Preserve the precached shell for a complete, matching offline release.
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          if (response.ok) return response;
        } catch {
          // A failed connection falls back to the release already installed.
        }
        const cache = await caches.open(CACHE_NAME);
        const shell = await cache.match(SHELL_URL);
        return shell || new Response('Habits is not yet available offline. Please reconnect once.', {
          status: 503,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });
      })(),
    );
    return;
  }

  url.search = '';
  url.hash = '';
  if (!PRECACHE_SET.has(url.href)) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(url.href);
      return cached || fetch(request);
    })(),
  );
});
