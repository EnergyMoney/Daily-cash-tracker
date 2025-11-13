self.addEventListener('install', event => {
  event.waitUntil(
    caches.open('life-tools-cache').then(cache => {
      return cache.addAll([
        '/index.html',
        '/money-management.html',
        '/mind-glow.html',
        '/manifest.json'
      ]);
    })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
