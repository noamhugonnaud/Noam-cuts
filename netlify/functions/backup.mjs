// /api/backup — sauvegardes en ligne dans Netlify Blobs (30 dernières)
//   GET            → liste
//   GET ?id=…      → contenu d'une sauvegarde
//   POST {data, reason} → nouvelle sauvegarde
import { json, err, requireSecret, readBody, store } from '../lib/common.mjs';

const KEEP = 30;

export default async req => {
  const denied = requireSecret(req); if (denied) return denied;
  const s = store('backups');
  const index = (await s.get('index', { type: 'json' })) || [];
  const url = new URL(req.url);

  if (req.method === 'GET') {
    const id = url.searchParams.get('id');
    if (!id) return json({ backups: index });
    if (!index.some(b => b.id === id)) return err(404, 'Sauvegarde introuvable');
    const data = await s.get('b/' + id, { type: 'json' });
    if (!data) return err(404, 'Sauvegarde introuvable');
    return json({ data });
  }

  if (req.method === 'POST') {
    const b = await readBody(req);
    const d = b?.data;
    if (!d || !Array.isArray(d.entries)) return err(400, 'Sauvegarde invalide');
    const at = new Date().toISOString();
    const id = at.replace(/[:.]/g, '-');
    const raw = JSON.stringify(d);
    await s.set('b/' + id, raw);
    const item = { id, at, reason: b.reason === 'auto' ? 'auto' : 'manuelle', entries: d.entries.length, size: raw.length };
    const next = [item, ...index].sort((x, y) => y.at.localeCompare(x.at));
    const old = next.splice(KEEP);
    await s.setJSON('index', next);
    await Promise.all(old.map(o => s.delete('b/' + o.id).catch(() => {})));
    return json({ ok: true, backup: item, count: next.length });
  }
  return err(405, 'Méthode non autorisée');
};
export const config = { path: '/api/backup' };
