// Faux Cal.com (http://localhost:9911/v2) + faux service push (https://localhost:9443)
// Usage : node tests/fake-services.mjs <cert.pem> <key.pem>
import http from 'node:http';
import https from 'node:https';
import { readFileSync, writeFileSync } from 'node:fs';

const [cert, key, logFile = '/dev/null'] = process.argv.slice(2);
const log = (...a) => { const l = new Date().toISOString() + ' ' + a.join(' ') + '\n'; process.stdout.write(l); try { writeFileSync(logFile, l, { flag: 'a' }); } catch {} };

const iso = (days, h, m = 0) => { const d = new Date(); d.setDate(d.getDate() + days); d.setHours(h, m, 0, 0); return d.toISOString(); };
let schedule = {
  id: 254, ownerId: 1, name: 'Horaire NH CUTZ', timeZone: 'Europe/Zurich', isDefault: true,
  availability: [
    { days: ['Tuesday', 'Wednesday', 'Thursday', 'Friday'], startTime: '13:30', endTime: '19:00' },
    { days: ['Saturday'], startTime: '09:00', endTime: '12:00' },
    { days: ['Saturday'], startTime: '13:00', endTime: '17:00' },
  ],
  overrides: [{ date: '2026-12-24', startTime: '00:00', endTime: '00:00' }],
};
const bookings = [
  { uid: 'bk-1', start: iso(1, 14), end: iso(1, 14, 30), title: 'Coupe - 20 CHF between Noam and Lucas Martin', status: 'accepted', eventType: { slug: 'coupe-20-chf' }, attendees: [{ name: 'Lucas Martin', email: 'l@x.ch' }] },
  { uid: 'bk-2', start: iso(1, 16), end: iso(1, 16, 30), title: 'Coupe + barbe - 25 CHF between Noam and Yanis', status: 'accepted', eventType: { slug: 'coupe-barbe-25-chf' }, attendees: [{ name: 'Yanis', email: 'y@x.ch' }] },
  { uid: 'bk-3', start: iso(3, 10), end: iso(3, 10, 30), title: 'Contours - 10 CHF between Noam and Karim', status: 'accepted', eventType: { slug: 'contours-10-chf' }, attendees: [{ name: 'Karim', email: 'k@x.ch' }] },
];
const cancelled = [{ uid: 'bk-old', start: iso(2, 11), title: 'Coupe - 20 CHF between Noam and Zoé', status: 'cancelled', attendees: [{ name: 'Zoé' }] }];

http.createServer((req, res) => {
  let body = '';
  req.on('data', c => body += c);
  req.on('end', () => {
    const u = new URL(req.url, 'http://x');
    const send = (s, j) => { res.writeHead(s, { 'content-type': 'application/json' }); res.end(JSON.stringify(j)); };
    log('CAL', req.method, u.pathname + u.search, 'v=' + req.headers['cal-api-version'], 'auth=' + (req.headers.authorization || '').slice(0, 14));
    if (req.headers.authorization !== 'Bearer cal_test_fake') return send(401, { status: 'error' });
    if (u.pathname === '/v2/bookings') {
      if (req.headers['cal-api-version'] !== '2026-05-01') return send(400, { error: { message: 'bad version' } });
      const st = u.searchParams.get('status');
      const list = st === 'cancelled' ? cancelled : bookings;
      // pagination par curseur : 2 par page
      const start = Number(u.searchParams.get('cursor') || 0);
      const page = list.slice(start, start + 2);
      return send(200, { status: 'success', data: page, pagination: { hasMore: start + 2 < list.length, nextCursor: start + 2 < list.length ? String(start + 2) : null } });
    }
    if (u.pathname.startsWith('/v2/schedules')) {
      if (req.headers['cal-api-version'] !== '2024-06-11') return send(400, { error: { message: 'bad version' } });
      if (req.method === 'GET' && (u.pathname === '/v2/schedules/default')) return send(200, { status: 'success', data: schedule });
      if (req.method === 'GET' && u.pathname === '/v2/schedules') return send(200, { status: 'success', data: [schedule] });
      if (req.method === 'PATCH' && u.pathname === '/v2/schedules/254') {
        const b = JSON.parse(body);
        schedule = { ...schedule, ...b }; // remplacement des tableaux
        log('CAL PATCH body', body);
        return send(200, { status: 'success', data: schedule });
      }
    }
    send(404, { status: 'error' });
  });
}).listen(9911, () => log('faux Cal.com sur :9911'));

https.createServer({ cert: readFileSync(cert), key: readFileSync(key) }, (req, res) => {
  let n = 0; req.on('data', c => n += c.length);
  req.on('end', () => {
    log('PUSH', req.method, req.url, 'bytes=' + n, 'enc=' + req.headers['content-encoding'], 'auth=' + String(req.headers.authorization || '').slice(0, 12), 'ttl=' + req.headers.ttl);
    if (req.url.includes('gone')) { res.writeHead(410); return res.end(); }
    res.writeHead(201); res.end();
  });
}).listen(9443, () => log('faux service push sur :9443'));
