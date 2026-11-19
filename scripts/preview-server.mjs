// Serveur d'APERÇU du design (ordinateur + iPhone sur le même Wi-Fi). Jamais en production.
// node scripts/preview-server.mjs  →  http://<ip-du-mac>:8081/demo
// - sert noam-cuts-github/ tel quel, SANS service worker (pour voir chaque modif tout de suite)
// - /demo remplit l'appli avec de fausses données (uniquement sur cette adresse d'aperçu)
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { networkInterfaces } from 'node:os';
import { fakeDemo } from '../tests/fake-demo-data.mjs';

const ROOT = new URL('../noam-cuts-github/', import.meta.url).pathname;
const PORT = Number(process.env.PORT || 8081);
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.txt': 'text/plain; charset=utf-8' };

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/sw.js') { res.writeHead(404); return res.end(); }
  if (url.pathname.startsWith('/api/')) { res.writeHead(503, { 'content-type': 'application/json' }); return res.end('{"error":"Aperçu : serveur non branché"}'); }
  if (url.pathname === '/demo') {
    const data = JSON.stringify(fakeDemo()).replace(/</g, '\\u003c');
    const accent = JSON.stringify(url.searchParams.get('accent') || '');
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
    return res.end(`<!doctype html><meta charset="utf-8"><script>const d=${data};localStorage.clear();for(const[k,v]of Object.entries(d))localStorage.setItem(k,v);const a=${accent};location.replace('/'+(a?'?accent='+a:''))</script>`);
  }
  const p = normalize(join(ROOT, url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname)));
  if (!p.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  try {
    const body = await readFile(p);
    res.writeHead(200, { 'content-type': TYPES[extname(p)] || 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(body);
  } catch { res.writeHead(404); res.end('404'); }
}).listen(PORT, '0.0.0.0', () => {
  const ips = Object.values(networkInterfaces()).flat().filter(i => i && i.family === 'IPv4' && !i.internal).map(i => i.address);
  console.log(`Aperçu prêt :\n  Mac    : http://localhost:${PORT}/demo`);
  ips.forEach(ip => console.log(`  iPhone : http://${ip}:${PORT}/demo`));
});
