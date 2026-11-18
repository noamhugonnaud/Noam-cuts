// Tests unitaires (sans serveur) : textes des notifs, heure suisse, résumé du soir
// node --test tests/unit.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { serviceName, fmtWhen, zurichParts } from '../netlify/lib/cal.mjs';
import { message, verify } from '../netlify/functions/webhook-cal.mjs';
import { summarize } from '../netlify/functions/evening-summary.mjs';
import { validate } from '../netlify/functions/cal-schedule.mjs';

test('nom de la prestation depuis le titre Cal.com', () => {
  assert.equal(serviceName('Coupe - 20 CHF between Noam and Lucas'), 'Coupe');
  assert.equal(serviceName('Coupe + barbe – 25 CHF entre Noam et Yanis'), 'Coupe + barbe');
  assert.equal(serviceName('', 'contours-10-chf'), 'Contours');
  assert.equal(serviceName('Rendez-vous spécial'), 'Rendez-vous spécial');
});

test('texte de la notification (format demandé)', () => {
  const m = message({ triggerEvent: 'BOOKING_CREATED', payload: { title: 'Coupe - 20 CHF between Noam and Lucas', startTime: '2026-11-19T13:00:00Z', attendees: [{ name: 'Lucas' }] } });
  assert.equal(m.body, 'Nouveau RDV : Lucas · Coupe · jeu. 19 nov. 14:00');
  assert.equal(m.url, '/?tab=agenda&sync=1');
  assert.match(message({ triggerEvent: 'BOOKING_CANCELLED', payload: { startTime: '2026-07-02T08:30:00Z', attendees: [{ name: 'Zoé' }], title: 'Contours - 10 CHF' } }).body, /^RDV annulé : Zoé · Contours · jeu\. 2 juil\. 10:30$/);
  assert.equal(message({ triggerEvent: 'MEETING_STARTED' }), null);
});

test('heure suisse : été (UTC+2) et hiver (UTC+1)', () => {
  assert.deepEqual(zurichParts(new Date('2026-07-15T18:00:00Z')), { day: '2026-07-15', hour: 20 });
  assert.deepEqual(zurichParts(new Date('2026-01-15T19:00:00Z')), { day: '2026-01-15', hour: 20 });
  assert.equal(zurichParts(new Date('2026-01-15T18:00:00Z')).hour, 19); // hiver : le passage de 18h UTC ne fait rien
  assert.equal(zurichParts(new Date('2026-07-15T19:00:00Z')).hour, 21); // été : le passage de 19h UTC ne fait rien
  // jours du changement d'heure
  assert.equal(zurichParts(new Date('2026-03-29T18:00:00Z')).hour, 20);
  assert.equal(zurichParts(new Date('2026-10-25T19:00:00Z')).hour, 20);
  assert.equal(fmtWhen('2026-03-29T12:00:00Z'), 'dim. 29 mars 14:00');
});

test('résumé du soir', () => {
  const list = [
    { start: '2026-11-19T15:30:00Z', status: 'accepted' },
    { start: '2026-11-19T13:00:00Z', status: 'accepted' },
    { start: '2026-11-19T09:00:00Z', status: 'cancelled' },
    { start: '2026-11-19T23:30:00Z', status: 'accepted' }, // = 20 nov. 00:30 à Zurich
    { start: '2026-11-21T10:00:00Z', status: 'accepted' },
  ];
  assert.equal(summarize(list, '2026-11-19').body, 'Demain : 2 RDV · premier à 14h00');
  assert.equal(summarize(list, '2026-11-22'), null, 'pas de notif s’il n’y a rien');
});

test('signature webhook hex et base64', () => {
  const raw = '{"a":1}';
  const hex = createHmac('sha256', 's').update(raw).digest('hex');
  assert.ok(verify(raw, hex, 's'));
  assert.ok(verify(raw, createHmac('sha256', 's').update(raw).digest('base64'), 's'));
  assert.ok(!verify(raw, hex, 'autre'));
  assert.ok(!verify(raw + ' ', hex, 's'));
  assert.ok(!verify(raw, '', 's'));
});

test('validation des dispos', () => {
  assert.equal(validate({ availability: [], overrides: [{ date: '2026-12-24', startTime: '00:00', endTime: '00:00' }] }), null);
  assert.ok(validate({ availability: [{ days: ['Monday'], startTime: '9:00', endTime: '12:00' }], overrides: [] }));
  assert.ok(validate({ availability: [], overrides: [{ date: '24.12.2026', startTime: '10:00', endTime: '12:00' }] }));
});
