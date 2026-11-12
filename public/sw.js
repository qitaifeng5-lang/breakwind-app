const cacheName = 'breakwind-shell-v29';
const cacheNamespace = cacheName.startsWith('breakwind-preview-') ? 'breakwind-preview-' : 'breakwind-shell-';
const shell = ['./completion.js','./workout-detail.js','./page-host.js','./training-workbench.js','./training-structure.js','./','./index.html','./app.js','./model.js','./running.js','./fuel.js','./engine.js','./pb-library.js','./workout.js','./workout-ui.js','./program.js','./program-ui.js','./membership.js','./coach-plan.js','./coach-ui.js','./knowledge.js','./styles.css','./hero.jpg','./icon.svg','./icon-192.png','./icon-512.png','./manifest.webmanifest'];
const urls = new Set(shell.map(path => new URL(path,self.registration.scope).href));
self.addEventListener('install', event => {
  const requests=cacheNamespace==='breakwind-preview-'?shell.map(path=>new Request(new URL(path,self.registration.scope),{cache:'reload'})):shell;
  event.waitUntil(caches.open(cacheName).then(cache => cache.addAll(requests)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(Promise.all([
    caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith(cacheNamespace) && key !== cacheName).map(key => caches.delete(key)))),
    self.clients.claim()
  ]));
});
self.addEventListener('fetch', event => {
  const resource = new URL(event.request.url);
  resource.hash = '';
  if (event.request.method !== 'GET' || !urls.has(resource.href)) return;
  event.respondWith(caches.open(cacheName).then(async cache => {
    if (event.request.mode === 'navigate' && cacheNamespace === 'breakwind-preview-') {
      try {
        const online=await fetch(event.request,{cache:'no-store'});
        if (online.ok) return online;
      } catch { /* Read the installed shell when offline. */ }
    }
    const cached = await cache.match(resource.href);
    return cached || fetch(event.request);
  }));
});
