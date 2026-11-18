// GET /api/status — vérifie le code secret et donne l'état de la configuration
import { json, requireSecret, env, store } from '../lib/common.mjs';
import { getSubs, vapidReady } from '../lib/push.mjs';

export default async req => {
  const denied = requireSecret(req); if (denied) return denied;
  const [subs, last, prefs, index] = await Promise.all([
    getSubs().catch(() => []),
    store('push').get('last', { type: 'json' }).catch(() => null),
    store('prefs').get('prefs', { type: 'json' }).catch(() => null),
    store('backups').get('index', { type: 'json' }).catch(() => null),
  ]);
  return json({
    ok: true,
    cal: !!env('CAL_API_KEY'),
    webhook: !!env('CAL_WEBHOOK_SECRET'),
    push: vapidReady(),
    vapidPublicKey: env('VAPID_PUBLIC_KEY') || null,
    devices: subs.map(s => ({ endpoint: s.endpoint, label: s.label, addedAt: s.addedAt })),
    lastPush: last,
    prefs: { eveningSummary: prefs?.eveningSummary !== false },
    lastBackup: Array.isArray(index) && index.length ? index[0].at : null,
  });
};
export const config = { path: '/api/status' };
