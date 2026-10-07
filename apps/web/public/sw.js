// Uplift service worker: offline-safe app shell. Same-origin only — the API
// lives on another origin (Render) so its requests always pass through.
const CACHE = 'uplift-v1';
const CORE = [
  '/', '/index.html', '/manifest.webmanifest',
  '/icons/icon-192.png', '/icons/icon-512.png', '/icons/icon-maskable-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // API + third-party: network only
  if (request.mode === 'navigate') {
    e.respondWith(fetch(request).catch(() => caches.match('/index.html')));
    return;
  }
  e.respondWith(
    caches.match(request).then(
      (hit) =>
        hit ||
        fetch(request).then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(request, copy));
          return res;
        }),
    ),
  );
});
