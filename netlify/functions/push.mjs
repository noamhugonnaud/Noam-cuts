// POST /api/push — { action: "subscribe" | "unsubscribe" | "test" }
import { json, err, requireSecret, readBody } from '../lib/common.mjs';
import { addSub, removeSub, sendAll, vapidReady } from '../lib/push.mjs';

export default async req => {
  const denied = requireSecret(req); if (denied) return denied;
  if (req.method !== 'POST') return err(405, 'Méthode non autorisée');
  if (!vapidReady()) return err(503, 'Clés VAPID non configurées sur Netlify');
  const b = await readBody(req) || {};
  try {
    if (b.action === 'subscribe') return json({ ok: true, devices: await addSub(b.subscription, b.label) });
    if (b.action === 'unsubscribe') { await removeSub(b.endpoint); return json({ ok: true }); }
    if (b.action === 'test') {
      const r = await sendAll({ title: 'NH CUTZ', body: 'Notification test ✓ Tout fonctionne.', url: '/?tab=agenda', tag: 'test' });
      return json({ ok: true, ...r });
    }
    return err(400, 'Action inconnue');
  } catch (e) {
    return err(400, e.message);
  }
};
export const config = { path: '/api/push' };
