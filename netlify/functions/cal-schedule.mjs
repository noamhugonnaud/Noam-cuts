// /api/cal/schedule — lire (GET) et modifier (PUT) l'horaire Cal.com par défaut
import { json, err, requireSecret, readBody } from '../lib/common.mjs';
import { calFetch, V_SCHEDULES, CalError } from '../lib/cal.mjs';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

async function defaultSchedule() {
  const j = await calFetch('/schedules/default', { version: V_SCHEDULES });
  if (j?.data) return j.data;
  const all = await calFetch('/schedules', { version: V_SCHEDULES });
  const list = Array.isArray(all?.data) ? all.data : [];
  return list.find(s => s.isDefault) || list[0] || null;
}

export function validate(body) {
  if (!body || typeof body !== 'object') return 'Données manquantes';
  const { availability, overrides } = body;
  if (!Array.isArray(availability) || !Array.isArray(overrides)) return 'Format invalide';
  if (availability.length > 50 || overrides.length > 400) return 'Trop de plages';
  for (const a of availability) {
    if (!Array.isArray(a.days) || !a.days.length || a.days.some(d => !DAYS.includes(d))) return 'Jour invalide';
    if (!TIME.test(a.startTime) || !TIME.test(a.endTime) || a.startTime >= a.endTime) return 'Plage horaire invalide (' + a.startTime + '–' + a.endTime + ')';
  }
  for (const o of overrides) {
    if (!DATE.test(o.date) || !TIME.test(o.startTime) || !TIME.test(o.endTime)) return 'Exception invalide';
    // 00:00–00:00 = journée fermée ; sinon la fin doit être après le début
    const closed = o.startTime === '00:00' && o.endTime === '00:00';
    if (!closed && o.startTime >= o.endTime) return 'Exception invalide (' + o.date + ')';
  }
  return null;
}

export default async req => {
  const denied = requireSecret(req); if (denied) return denied;
  try {
    if (req.method === 'GET') {
      const s = await defaultSchedule();
      if (!s) return err(404, 'Aucun horaire trouvé sur Cal.com');
      return json({ schedule: s });
    }
    if (req.method === 'PUT') {
      const body = await readBody(req);
      const problem = validate(body);
      if (problem) return err(400, problem);
      const s = await defaultSchedule();
      if (!s) return err(404, 'Aucun horaire trouvé sur Cal.com');
      if (body.id != null && String(body.id) !== String(s.id)) return err(409, 'L’horaire a changé, recharge l’écran');
      // On envoie toujours les listes COMPLÈTES (remplacement, pas fusion)
      const j = await calFetch('/schedules/' + encodeURIComponent(s.id), {
        method: 'PATCH', version: V_SCHEDULES,
        body: { availability: body.availability, overrides: body.overrides },
      });
      return json({ schedule: j?.data || null });
    }
    return err(405, 'Méthode non autorisée');
  } catch (e) {
    return err(e instanceof CalError ? e.status : 500, e.message);
  }
};
export const config = { path: '/api/cal/schedule' };
