// Offline shell. Bump CACHE whenever any app file changes, or phones keep the old version.
const CACHE = 'mdl-8';
const FILES = ['./', 'index.html', 'app.css', 'app.js', 'counts.js', 'merge.js', 'manifest.json', 'icon.svg', 'fonts/newsreader-latin-opsz-normal.woff2', 'fonts/public-sans-latin-400-normal.woff2', 'fonts/public-sans-latin-600-normal.woff2'];

self.addEventListener('install', (e) => e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting())));
self.addEventListener('activate', (e) => e.waitUntil(
  caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
));
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return; // never touch Firebase traffic
  // ponytail: sync code is cached on first use only, so people who never sync never download it.
  const lazy = /\/(vendor\/firebase-sync|sync-config)\.js$/.test(e.request.url);
  e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request).then((r) => {
    if (lazy && r.ok) { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
    return r;
  })));
});
