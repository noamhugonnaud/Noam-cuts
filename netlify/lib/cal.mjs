// Accès à l'API Cal.com v2 (la clé reste côté serveur : CAL_API_KEY)
import { env } from './common.mjs';

// CAL_API_BASE sert seulement aux tests locaux (faux Cal.com)
const base = () => env('CAL_API_BASE') || 'https://api.cal.com/v2';
// Versions vérifiées dans la doc officielle Cal.com API v2 :
export const V_SCHEDULES = '2024-06-11';
export const V_BOOKINGS = '2026-05-01';

export class CalError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

export async function calFetch(pathname, { method = 'GET', version, body, query } = {}) {
  const key = env('CAL_API_KEY');
  if (!key) throw new CalError(503, 'CAL_API_KEY n’est pas configurée sur Netlify');
  const url = new URL(base() + pathname);
  if (query) for (const [k, v] of Object.entries(query)) if (v != null && v !== '') url.searchParams.set(k, v);
  const r = await fetch(url, {
    method,
    headers: {
      Authorization: 'Bearer ' + key,
      'cal-api-version': version,
      ...(body ? { 'content-type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let j = null;
  try { j = await r.json(); } catch { /* réponse vide */ }
  if (r.status === 401 || r.status === 403) throw new CalError(502, 'Cal.com refuse la clé API (CAL_API_KEY)');
  if (!r.ok) {
    const msg = j?.error?.message || j?.message || ('Cal.com répond ' + r.status);
    throw new CalError(502, String(msg).slice(0, 300));
  }
  return j;
}

// Toutes les réservations d'un statut (pagination par curseur, max ~500)
export async function listBookings(status, extra = {}) {
  const out = [];
  let cursor = '';
  for (let page = 0; page < 10; page++) {
    const j = await calFetch('/bookings', {
      version: V_BOOKINGS,
      query: { status, limit: 100, cursor, ...extra },
    });
    const d = j?.data;
    const list = Array.isArray(d) ? d : Array.isArray(d?.bookings) ? d.bookings : [];
    out.push(...list);
    const p = j?.pagination;
    if (!p?.hasMore || !p?.nextCursor) break;
    cursor = p.nextCursor;
  }
  return out;
}

// « Coupe - 20 CHF between Noam and Lucas » → « Coupe »
export function serviceName(title, slug) {
  const t = String(title || '').split(/\s+(?:between|entre)\s+/i)[0];
  const m = t.match(/^(.*?)\s*[-–—·]\s*\d+(?:[.,]\d+)?\s*CHF/i);
  if (m) return m[1].trim();
  const s = String(slug || '').match(/^(.*?)-\d+-chf$/i);
  if (s) { const raw = s[1].replace(/-/g, ' '); return raw.charAt(0).toUpperCase() + raw.slice(1); }
  return t.trim() || 'Rendez-vous';
}

const TZ = 'Europe/Zurich';
// « jeu. 21 nov. 14:00 »
export function fmtWhen(iso) {
  const d = new Date(iso);
  const date = d.toLocaleDateString('fr-CH', { timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short' });
  const time = d.toLocaleTimeString('fr-CH', { timeZone: TZ, hour: '2-digit', minute: '2-digit' });
  return date + ' ' + time;
}
export function fmtHour(iso) {
  return new Date(iso).toLocaleTimeString('fr-CH', { timeZone: TZ, hour: '2-digit', minute: '2-digit' }).replace(':', 'h');
}
// Date « AAAA-MM-JJ » et heure à Zurich (gère le changement d'heure)
export function zurichParts(date = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23',
  }).formatToParts(date).map(x => [x.type, x.value]));
  return { day: `${p.year}-${p.month}-${p.day}`, hour: Number(p.hour) };
}
