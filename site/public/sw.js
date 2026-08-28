const BUILD_ASSETS = [];
const CACHE = `rda-shell-v2:${BUILD_ASSETS.join('|')}`;
const PAGES = ['/', '/privacy/', '/terms/'];
const SHELL = [...PAGES, ...BUILD_ASSETS, '/mark.svg', '/art/restore-proof-press-720.webp', '/art/restore-proof-press-1200.webp'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => Promise.all(SHELL.map(async path => {
    const response = await fetch(new Request(path, { cache: 'reload' }));
    if (!response.ok) throw new Error(`Could not precache ${path}: ${response.status}`);
    await cache.put(path, response);
  }))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(fetch(event.request).then(response => {
    const copy = response.clone();
    event.waitUntil(caches.open(CACHE).then(cache => cache.put(event.request, copy)));
    return response;
  }).catch(() => caches.match(event.request).then(match => match || caches.match('/'))));
});
