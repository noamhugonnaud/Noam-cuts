// POST /api/webhook-cal — webhook Cal.com → notification push
// Protégé par la signature HMAC-SHA256 (en-tête x-cal-signature-256, secret CAL_WEBHOOK_SECRET)
import { createHmac } from 'node:crypto';
import { json, err, env, safeEqual } from '../lib/common.mjs';
import { sendAll } from '../lib/push.mjs';
import { serviceName, fmtWhen } from '../lib/cal.mjs';

export function verify(raw, signature, secret) {
  if (!secret || !signature) return false;
  const mac = createHmac('sha256', secret).update(raw, 'utf8');
  const hex = mac.digest('hex');
  const b64 = Buffer.from(hex, 'hex').toString('base64');
  const sig = signature.trim().replace(/^sha256=/i, '');
  return safeEqual(sig.toLowerCase(), hex) || safeEqual(sig, b64);
}

const LABEL = {
  BOOKING_CREATED: 'Nouveau RDV',
  BOOKING_RESCHEDULED: 'RDV déplacé',
  BOOKING_CANCELLED: 'RDV annulé',
};

export function message(evt) {
  const p = evt?.payload || {};
  const label = LABEL[evt?.triggerEvent];
  if (!label) return null;
  const who = (p.attendees?.[0]?.name || '').trim() || 'Client';
  const svc = serviceName(p.title, p.type || p.eventType?.slug);
  const when = p.startTime ? fmtWhen(p.startTime) : '';
  return {
    title: 'NH CUTZ',
    body: `${label} : ${[who, svc, when].filter(Boolean).join(' · ')}`,
    url: '/?tab=agenda&sync=1',
    tag: 'cal-' + (p.uid || Date.now()),
  };
}

export default async req => {
  if (req.method !== 'POST') return err(405, 'Méthode non autorisée');
  const secret = env('CAL_WEBHOOK_SECRET');
  if (!secret) return err(503, 'CAL_WEBHOOK_SECRET n’est pas configuré');
  const raw = await req.text();
  if (!verify(raw, req.headers.get('x-cal-signature-256'), secret)) return err(401, 'Signature invalide');
  let evt;
  try { evt = JSON.parse(raw); } catch { return err(400, 'JSON invalide'); }
  if (evt?.triggerEvent === 'PING') return json({ ok: true, ping: true });
  const msg = message(evt);
  if (!msg) return json({ ok: true, ignored: evt?.triggerEvent || null });
  try {
    const r = await sendAll(msg);
    return json({ ok: true, ...r });
  } catch (e) {
    console.error('webhook-cal :', e.message);
    // 200 quand même : Cal.com ne doit pas réessayer en boucle
    return json({ ok: false, error: e.message });
  }
};
export const config = { path: '/api/webhook-cal' };
