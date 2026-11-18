// Notifications Web Push (clés VAPID) — abonnements stockés dans Netlify Blobs
import webpush from 'web-push';
import { env, store } from './common.mjs';

const KEY = 'subscriptions';

export function vapidReady() {
  return !!(env('VAPID_PUBLIC_KEY') && env('VAPID_PRIVATE_KEY'));
}

export async function getSubs() {
  const list = await store('push').get(KEY, { type: 'json' });
  return Array.isArray(list) ? list : [];
}
async function setSubs(list) { await store('push').setJSON(KEY, list); }

export async function addSub(sub, label = '') {
  if (!sub || typeof sub.endpoint !== 'string' || !/^https:\/\//.test(sub.endpoint) || !sub.keys?.p256dh || !sub.keys?.auth)
    throw new Error('Abonnement invalide');
  const list = (await getSubs()).filter(s => s.endpoint !== sub.endpoint);
  list.push({ endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth }, label: String(label).slice(0, 80), addedAt: new Date().toISOString() });
  await setSubs(list.slice(-10));
  return list.length;
}
export async function removeSub(endpoint) {
  const list = await getSubs();
  const next = list.filter(s => s.endpoint !== endpoint);
  if (next.length !== list.length) await setSubs(next);
}

// Envoie à tous les appareils abonnés ; supprime les abonnements expirés
export async function sendAll(payload) {
  if (!vapidReady()) throw new Error('Clés VAPID non configurées sur Netlify');
  webpush.setVapidDetails('https://nhcutz.ch', env('VAPID_PUBLIC_KEY'), env('VAPID_PRIVATE_KEY'));
  const list = await getSubs();
  const body = JSON.stringify(payload);
  let sent = 0;
  const dead = [];
  await Promise.all(list.map(async s => {
    try {
      await webpush.sendNotification(s, body, { TTL: 60 * 60 * 12, urgency: 'high' });
      sent++;
    } catch (e) {
      if (e.statusCode === 404 || e.statusCode === 410) dead.push(s.endpoint);
      else console.error('push échoué', e.statusCode, e.body || e.message);
    }
  }));
  if (dead.length) await setSubs(list.filter(s => !dead.includes(s.endpoint)));
  await store('push').setJSON('last', { at: new Date().toISOString(), sent, title: payload.title, body: payload.body });
  return { sent, total: list.length, removed: dead.length };
}
