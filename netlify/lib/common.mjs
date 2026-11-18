// Outils partagés par les Netlify Functions de Noam Cuts
import { timingSafeEqual, createHash } from 'node:crypto';
import { getStore } from '@netlify/blobs';

export const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
  });

export const err = (status, message) => json({ error: message }, status);

const env = k => (globalThis.Netlify?.env?.get?.(k) ?? process.env[k] ?? '').trim();
export { env };

// Compare deux chaînes sans fuite de temps (on compare des empreintes de même longueur)
export function safeEqual(a, b) {
  const ha = createHash('sha256').update(String(a)).digest();
  const hb = createHash('sha256').update(String(b)).digest();
  return timingSafeEqual(ha, hb) && String(a).length === String(b).length;
}

// Toutes les functions (sauf le webhook) exigent le code secret APP_SECRET
// envoyé par l'appli dans l'en-tête « x-app-secret ».
export function requireSecret(req) {
  const secret = env('APP_SECRET');
  if (!secret) return err(503, 'APP_SECRET n’est pas configuré sur Netlify');
  const given = req.headers.get('x-app-secret') || '';
  if (!given || !safeEqual(given, secret)) return err(401, 'Code secret incorrect');
  return null;
}

// Netlify Blobs (consistance forte : on relit juste après avoir écrit)
export const store = name => getStore({ name, consistency: 'strong' });

export async function readBody(req) {
  try { return await req.json(); } catch { return null; }
}
