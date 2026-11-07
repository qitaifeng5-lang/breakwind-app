const cacheName = 'breakwind-shell-v1';
const shell = ['./','./index.html','./app.js','./model.js','./engine.js','./styles.css','./hero.jpg','./icon.svg','./icon-192.png','./icon-512.png','./manifest.webmanifest'];
const urls = new Set(shell.map(path => new URL(path,self.registration.scope).href));
self.addEventListener('install', event => {
  event.waitUntil(caches.open(cacheName).then(cache => cache.addAll(shell)));
});
self.addEventListener('activate', event => {
  event.waitUntil(Promise.all([
    caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('breakwind-shell-') && key !== cacheName).map(key => caches.delete(key)))),
    self.clients.claim()
  ]));
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || !urls.has(event.request.url)) return;
  event.respondWith(caches.open(cacheName).then(async cache => {
    const cached = await cache.match(event.request);
    return cached || fetch(event.request);
  }));
});
