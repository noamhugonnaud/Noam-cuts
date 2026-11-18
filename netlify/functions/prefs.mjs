// /api/prefs — préférences côté serveur (résumé du soir)
import { json, err, requireSecret, readBody, store } from '../lib/common.mjs';

export default async req => {
  const denied = requireSecret(req); if (denied) return denied;
  const s = store('prefs');
  const cur = (await s.get('prefs', { type: 'json' })) || {};
  if (req.method === 'GET') return json({ eveningSummary: cur.eveningSummary !== false });
  if (req.method === 'POST') {
    const b = await readBody(req) || {};
    if (typeof b.eveningSummary !== 'boolean') return err(400, 'Valeur invalide');
    const next = { ...cur, eveningSummary: b.eveningSummary };
    await s.setJSON('prefs', next);
    return json({ eveningSummary: next.eveningSummary });
  }
  return err(405, 'Méthode non autorisée');
};
export const config = { path: '/api/prefs' };
