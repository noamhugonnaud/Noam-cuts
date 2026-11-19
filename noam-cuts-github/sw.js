/* Noam Cuts — service worker V8
   « Cache d'abord » : l'appli s'affiche tout de suite depuis le cache,
   puis se met à jour en arrière-plan (stale-while-revalidate). */
const VERSION = 'v81';
const CACHE = 'noamcuts-' + VERSION;
const SHELL = [
  '/index.html', '/manifest.json?v=80',
  '/logo-white.png?v=80', '/logo-black.png?v=80',
  '/apple-touch-icon.png?v=80', '/icon-192.png?v=80', '/icon-512.png?v=80',
  '/favicon.png?v=80', '/badge-96.png?v=80',
];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' })))).catch(() => {}));
});

self.addEventListener('activate', e => {
  e.waitUntil(Promise.all([
    self.clients.claim(),
    caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('noamcuts-') && k !== CACHE).map(k => caches.delete(k)))),
    self.registration.navigationPreload ? self.registration.navigationPreload.disable().catch(() => {}) : null,
  ]));
});

async function notifyUpdate() {
  const list = await self.clients.matchAll({ type: 'window' });
  list.forEach(c => c.postMessage({ type: 'update-available' }));
}

// Page de l'appli : toujours servie depuis le cache (quelle que soit l'adresse : /, /?tab=…)
async function serveShell(e) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match('/index.html');
  const network = fetch('/index.html', { cache: 'no-cache' }).then(async r => {
    if (r.ok && r.status === 200 && (r.headers.get('content-type') || '').includes('text/html')) {
      const fresh = await r.clone().text();
      const old = cached ? await cached.clone().text() : null;
      await cache.put('/index.html', r.clone());
      if (old !== null && old !== fresh) notifyUpdate();
    }
    return r;
  });
  if (cached) { e.waitUntil(network.catch(() => {})); return cached; }
  try { return await network; }
  catch { return new Response('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><body style="font:17px -apple-system;background:#000;color:#fff;display:grid;place-items:center;height:100vh;margin:0">Hors connexion — réessaie dans un instant.</body>', { headers: { 'content-type': 'text/html; charset=utf-8' } }); }
}

// Autres fichiers du site : cache d'abord + mise à jour en arrière-plan
async function staleWhileRevalidate(e) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(e.request);
  const network = fetch(e.request).then(r => { if (r.ok && r.type === 'basic') cache.put(e.request, r.clone()); return r; });
  if (cached) { e.waitUntil(network.catch(() => {})); return cached; }
  return network;
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/.netlify/')) return; // toujours le réseau
  if (url.pathname === '/sw.js') return;
  if (req.mode === 'navigate' || url.pathname === '/' || url.pathname === '/index.html') { e.respondWith(serveShell(e)); return; }
  e.respondWith(staleWhileRevalidate(e));
});

self.addEventListener('message', e => {
  if (e.data && e.data.type === 'check-update') e.waitUntil(fetch('/index.html', { cache: 'no-cache' }).then(async r => {
    if (!r.ok) return;
    const cache = await caches.open(CACHE);
    const old = await cache.match('/index.html');
    const fresh = await r.clone().text();
    if (old && (await old.text()) !== fresh) { await cache.put('/index.html', r); notifyUpdate(); }
  }).catch(() => {}));
});

/* ---------- Notifications push ---------- */
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.title || 'NH CUTZ', {
    body: d.body || '',
    icon: '/icon-192.png?v=80',
    badge: '/badge-96.png?v=80',
    tag: d.tag || undefined,
    data: { url: d.url || '/?tab=agenda&sync=1' },
  }));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const target = (e.notification.data && e.notification.data.url) || '/?tab=agenda&sync=1';
  e.waitUntil((async () => {
    const list = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of list) {
      if (new URL(c.url).origin === self.location.origin) {
        c.postMessage({ type: 'open', url: target });
        return c.focus();
      }
    }
    return self.clients.openWindow(target);
  })());
});
