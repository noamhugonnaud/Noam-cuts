// Résumé du soir — tous les jours à 20h00, heure suisse
// Netlify planifie en UTC : on se réveille à 18:00 ET 19:00 UTC et on n'envoie
// que si il est 20h à Zurich (19:00 UTC en hiver, 18:00 UTC en été).
import { store } from '../lib/common.mjs';
import { listBookings, zurichParts, fmtHour } from '../lib/cal.mjs';
import { sendAll } from '../lib/push.mjs';

export function summarize(bookings, tomorrow) {
  const list = bookings
    .filter(b => b?.start && !/cancel|reject/i.test(b.status || ''))
    .filter(b => zurichParts(new Date(b.start)).day === tomorrow)
    .sort((a, b) => a.start.localeCompare(b.start));
  if (!list.length) return null;
  const n = list.length;
  return {
    title: 'NH CUTZ',
    body: `Demain : ${n} RDV · premier à ${fmtHour(list[0].start)}`,
    url: '/?tab=agenda&sync=1',
    tag: 'evening-' + tomorrow,
  };
}

export default async (req) => {
  const now = new Date();
  const { hour } = zurichParts(now);
  let force = false;
  try { force = new URL(req.url).searchParams.get('force') === '1' && process.env.NETLIFY_DEV === 'true'; } catch {}
  if (hour !== 20 && !force) return new Response('pas 20h à Zurich (' + hour + 'h)');
  const prefs = (await store('prefs').get('prefs', { type: 'json' })) || {};
  if (prefs.eveningSummary === false) return new Response('résumé désactivé');
  const tomorrow = zurichParts(new Date(now.getTime() + 24 * 3600e3)).day;
  // Évite un double envoi le même soir
  const sent = await store('prefs').get('evening-last', { type: 'json' });
  if (sent?.day === tomorrow && !force) return new Response('déjà envoyé');
  const msg = summarize(await listBookings('upcoming'), tomorrow);
  await store('prefs').setJSON('evening-last', { day: tomorrow, at: now.toISOString(), count: msg ? 1 : 0 });
  if (!msg) return new Response('aucun RDV demain');
  const r = await sendAll(msg);
  return new Response('envoyé : ' + JSON.stringify(r));
};
export const config = { schedule: '0 18,19 * * *' };
