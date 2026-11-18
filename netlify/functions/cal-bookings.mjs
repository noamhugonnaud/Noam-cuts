// GET /api/cal/bookings — réservations Cal.com (à venir + annulées récentes)
import { json, err, requireSecret } from '../lib/common.mjs';
import { listBookings, CalError } from '../lib/cal.mjs';

const slim = b => ({
  uid: b.uid, start: b.start, end: b.end, title: b.title, status: b.status,
  eventType: b.eventType ? { slug: b.eventType.slug } : null,
  attendees: (b.attendees || []).slice(0, 1).map(a => ({ name: a.name })),
  rescheduledFromUid: b.rescheduledFromUid || null,
});

export default async req => {
  const denied = requireSecret(req); if (denied) return denied;
  try {
    const since = new Date(Date.now() - 30 * 864e5).toISOString();
    const [upcoming, cancelled] = await Promise.all([
      listBookings('upcoming'),
      listBookings('cancelled', { afterStart: since }).catch(() => []),
    ]);
    return json({ upcoming: upcoming.map(slim), cancelled: cancelled.map(slim) });
  } catch (e) {
    return err(e instanceof CalError ? e.status : 500, e.message);
  }
};
export const config = { path: '/api/cal/bookings' };
