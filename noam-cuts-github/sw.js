const CACHE='noamcuts-v62';
const ASSETS=['./','./index.html','./manifest.json?v=50','./apple-touch-icon.png?v=50','./apple-touch-icon-180x180.png?v=50','./icon-192.png?v=50','./icon-512.png?v=50','./icon-192.png','./apple-touch-icon.png'];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).catch(()=>{}))});
self.addEventListener('activate',e=>e.waitUntil(Promise.all([self.clients.claim(),caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k))))])));
// Réseau d'abord (toujours la dernière version), cache si hors ligne
self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||new URL(e.request.url).origin!==self.location.origin)return;e.respondWith(fetch(e.request).then(r=>{const x=r.clone();caches.open(CACHE).then(c=>c.put(e.request,x));return r}).catch(()=>caches.match(e.request,{ignoreSearch:false}).then(m=>m||caches.match('./index.html'))))});
