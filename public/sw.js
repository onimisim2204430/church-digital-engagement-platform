const CACHE_NAME  = 'app-bible-v2';
const BIBLE_CACHE = 'bible-permanent-v2';

// Cache the app shell on install
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_NAME).then(cache =>
        cache.addAll(['/', '/index.html'])
      ),
      caches.open(BIBLE_CACHE).then(cache =>
        cache.addAll(['/bibles/kjv.json'])
      ),
    ])
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', event => {
  const { url } = event.request;

  // Static Bible JSON — Cache Forever
  if (url.includes('/bibles/')) {
    event.respondWith(
      caches.open(BIBLE_CACHE).then(async cache => {
        const cached = await cache.match(event.request);
        if (cached) return cached;
        const response = await fetch(event.request);
        if (response.ok) cache.put(event.request, response.clone());
        return response;
      })
    );
    return;
  }

  // App shell — Cache first, fallback to network
  event.respondWith(
    caches.match(event.request).then(r => r || fetch(event.request))
  );
});
