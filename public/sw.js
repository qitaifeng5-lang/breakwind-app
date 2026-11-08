const cacheName = 'breakwind-shell-v7';
const cacheNamespace = cacheName.startsWith('breakwind-preview-') ? 'breakwind-preview-' : 'breakwind-shell-';
const shell = ['./','./index.html','./app.js','./model.js','./running.js','./fuel.js','./engine.js','./knowledge.js','./styles.css','./hero.jpg','./icon.svg','./icon-192.png','./icon-512.png','./manifest.webmanifest'];
const urls = new Set(shell.map(path => new URL(path,self.registration.scope).href));
self.addEventListener('install', event => {
  event.waitUntil(caches.open(cacheName).then(cache => cache.addAll(shell)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(Promise.all([
    caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith(cacheNamespace) && key !== cacheName).map(key => caches.delete(key)))),
    self.clients.claim()
  ]));
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || !urls.has(event.request.url)) return;
  event.respondWith(caches.open(cacheName).then(async cache => {
    if (event.request.mode === 'navigate' && cacheNamespace === 'breakwind-preview-') {
      try {
        const online=await fetch(event.request);
        if (online.ok) return online;
      } catch { /* Read the installed shell when offline. */ }
    }
    const cached = await cache.match(event.request);
    return cached || fetch(event.request);
  }));
});
