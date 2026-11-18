// Tests de bout en bout des Netlify Functions (lancer d'abord : netlify dev + tests/fake-services.mjs)
// node --test tests/api.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac, createECDH, randomBytes } from 'node:crypto';

const BASE = process.env.TEST_BASE || 'http://localhost:8888';
const SECRET = 'test-secret-local';
const WH = 'whsec-test-local';
const call = (path, { method = 'GET', body, secret = SECRET, headers = {} } = {}) =>
  fetch(BASE + path, { method, headers: { ...(secret ? { 'x-app-secret': secret } : {}), ...(body ? { 'content-type': 'application/json' } : {}), ...headers }, body: body ? JSON.stringify(body) : undefined })
    .then(async r => ({ status: r.status, json: await r.json().catch(() => null) }));

test('toutes les functions refusent sans code secret ou avec un mauvais code', async () => {
  for (const p of ['/api/status', '/api/cal/bookings', '/api/cal/schedule', '/api/backup', '/api/prefs']) {
    assert.equal((await call(p, { secret: '' })).status, 401, p + ' sans code');
    assert.equal((await call(p, { secret: 'mauvais' })).status, 401, p + ' mauvais code');
  }
  assert.equal((await call('/api/push', { method: 'POST', body: { action: 'test' }, secret: 'x' })).status, 401);
});

test('status : configuration complète', async () => {
  const r = await call('/api/status');
  assert.equal(r.status, 200);
  assert.equal(r.json.cal, true); assert.equal(r.json.push, true); assert.equal(r.json.webhook, true);
  assert.match(r.json.vapidPublicKey, /^B/);
});

test('bookings : passe par le serveur, pagination par curseur, champs réduits', async () => {
  const r = await call('/api/cal/bookings');
  assert.equal(r.status, 200);
  assert.equal(r.json.upcoming.length, 3, '3 RDV sur 2 pages');
  assert.equal(r.json.cancelled.length, 1);
  const b = r.json.upcoming[0];
  assert.deepEqual(Object.keys(b).sort(), ['attendees', 'end', 'eventType', 'rescheduledFromUid', 'start', 'status', 'title', 'uid']);
  assert.equal(b.attendees[0].email, undefined, 'pas d’e-mail renvoyé au téléphone');
});

test('dispos : lecture + validation + enregistrement (listes complètes)', async () => {
  const g = await call('/api/cal/schedule');
  assert.equal(g.status, 200);
  assert.equal(g.json.schedule.id, 254);
  const bad = await call('/api/cal/schedule', { method: 'PUT', body: { id: 254, availability: [{ days: ['Lundi'], startTime: '09:00', endTime: '12:00' }], overrides: [] } });
  assert.equal(bad.status, 400);
  const bad2 = await call('/api/cal/schedule', { method: 'PUT', body: { id: 254, availability: [{ days: ['Monday'], startTime: '12:00', endTime: '09:00' }], overrides: [] } });
  assert.equal(bad2.status, 400);
  const body = {
    id: 254,
    availability: [{ days: ['Tuesday', 'Friday'], startTime: '09:00', endTime: '12:00' }, { days: ['Tuesday'], startTime: '13:30', endTime: '18:00' }],
    overrides: [{ date: '2026-12-24', startTime: '00:00', endTime: '00:00' }, { date: '2026-12-28', startTime: '10:00', endTime: '14:00' }],
  };
  const p = await call('/api/cal/schedule', { method: 'PUT', body });
  assert.equal(p.status, 200);
  assert.deepEqual(p.json.schedule.availability, body.availability);
  assert.deepEqual(p.json.schedule.overrides, body.overrides);
  const wrongId = await call('/api/cal/schedule', { method: 'PUT', body: { ...body, id: 999 } });
  assert.equal(wrongId.status, 409);
});

test('préférences : résumé du soir on/off', async () => {
  assert.equal((await call('/api/prefs', { method: 'POST', body: { eveningSummary: false } })).json.eveningSummary, false);
  assert.equal((await call('/api/prefs')).json.eveningSummary, false);
  assert.equal((await call('/api/prefs', { method: 'POST', body: { eveningSummary: true } })).json.eveningSummary, true);
  assert.equal((await call('/api/prefs', { method: 'POST', body: { eveningSummary: 'oui' } })).status, 400);
});

test('sauvegardes en ligne : envoi, liste, lecture, 30 maximum', async () => {
  const data = { version: 8, entries: [{ id: 1, type: 'cut', client: 'Test', price: 20, date: '2026-11-18T10:00' }], stock: [], goal: 2000, settings: {}, clients: {} };
  assert.equal((await call('/api/backup', { method: 'POST', body: { data: { nope: 1 } } })).status, 400);
  for (let i = 0; i < 32; i++) {
    const r = await call('/api/backup', { method: 'POST', body: { data: { ...data, n: i }, reason: 'auto' } });
    assert.equal(r.status, 200);
  }
  const l = await call('/api/backup');
  assert.equal(l.json.backups.length, 30, 'garde les 30 dernières');
  const first = l.json.backups[0];
  const one = await call('/api/backup?id=' + encodeURIComponent(first.id));
  assert.equal(one.json.data.n, 31, 'la plus récente en premier');
  assert.equal((await call('/api/backup?id=inconnu')).status, 404);
  assert.ok((await call('/api/status')).json.lastBackup);
});

const sign = raw => createHmac('sha256', WH).update(raw).digest('hex');
const hook = (obj, sig) => { const raw = JSON.stringify(obj); return fetch(BASE + '/api/webhook-cal', { method: 'POST', headers: { 'content-type': 'application/json', 'x-cal-signature-256': sig ?? sign(raw) }, body: raw }).then(async r => ({ status: r.status, json: await r.json() })); };

test('push : abonnement, notif test reçue par le service push', async () => {
  const ecdh = createECDH('prime256v1'); ecdh.generateKeys();
  const sub = { endpoint: 'https://localhost:9443/push/iphone-1', keys: { p256dh: ecdh.getPublicKey('base64url'), auth: randomBytes(16).toString('base64url') } };
  assert.equal((await call('/api/push', { method: 'POST', body: { action: 'subscribe', subscription: { endpoint: 'http://pas-https', keys: sub.keys } } })).status, 400);
  const s = await call('/api/push', { method: 'POST', body: { action: 'subscribe', subscription: sub, label: 'iPhone' } });
  assert.equal(s.status, 200);
  const t = await call('/api/push', { method: 'POST', body: { action: 'test' } });
  assert.equal(t.status, 200);
  assert.equal(t.json.sent, 1);
  // abonnement expiré → supprimé automatiquement
  await call('/api/push', { method: 'POST', body: { action: 'subscribe', subscription: { ...sub, endpoint: 'https://localhost:9443/push/gone' } } });
  const t2 = await call('/api/push', { method: 'POST', body: { action: 'test' } });
  assert.equal(t2.json.removed, 1);
  const st = await call('/api/status');
  assert.equal(st.json.devices.length, 1);
});

test('webhook Cal.com : signature vérifiée, notif envoyée', async () => {
  const evt = { triggerEvent: 'BOOKING_CREATED', createdAt: new Date().toISOString(), payload: { uid: 'bk-9', title: 'Coupe - 20 CHF between Noam and Lucas', type: 'coupe-20-chf', startTime: '2026-11-19T13:00:00Z', attendees: [{ name: 'Lucas' }] } };
  assert.equal((await hook(evt, 'deadbeef')).status, 401, 'mauvaise signature');
  assert.equal((await hook(evt, '')).status, 401, 'sans signature');
  const ok = await hook(evt);
  assert.equal(ok.status, 200);
  assert.equal(ok.json.sent, 1);
  assert.equal((await hook({ triggerEvent: 'PING', payload: {} })).json.ping, true);
  assert.equal((await hook({ triggerEvent: 'MEETING_ENDED', payload: {} })).json.ignored, 'MEETING_ENDED');
  for (const t of ['BOOKING_RESCHEDULED', 'BOOKING_CANCELLED']) assert.equal((await hook({ ...evt, triggerEvent: t })).json.sent, 1, t);
  // signature en base64 acceptée aussi
  const raw = JSON.stringify(evt);
  const b64 = createHmac('sha256', WH).update(raw).digest('base64');
  assert.equal((await hook(evt, b64)).status, 200);
});
