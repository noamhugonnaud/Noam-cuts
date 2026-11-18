// Faux jeu de données au format V7.1 (anciennes clés) pour tester la mise à jour V8
export function fakeV71(now = new Date()) {
  const pad = n => String(n).padStart(2, '0');
  const at = (days, h, m = 0) => { const d = new Date(now); d.setDate(d.getDate() + days); d.setHours(h, m, 0, 0); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes()); };
  const paid = (p, t = 0, m = 'TWINT') => [{ amount: p + t, date: new Date(now).toISOString(), method: m }];
  const entries = [];
  let id = 1700000000000;
  // 9 coupes tamponnées pour Lucas Martin → la 10e est offerte
  for (let i = 0; i < 9; i++) entries.push({ id: id++, type: 'cut', client: 'Lucas Martin', price: 20, cost: 0, date: at(-60 + i * 6, 14), payment: 'TWINT', tip: i % 3 ? 0 : 2, note: 'Coupe', category: '', payments: paid(20, i % 3 ? 0 : 2), stamp: true });
  // anciennes coupes (avant la carte fidélité, sans tampon)
  entries.push({ id: id++, type: 'cut', client: 'Yanis', price: 25, cost: 0, date: at(-45, 11), payment: 'Espèces', tip: 0, note: 'Coupe + barbe', category: '', payments: paid(25, 0, 'Espèces') });
  entries.push({ id: id++, type: 'cut', client: 'Karim B.', price: 20, cost: 0, date: at(-35, 16), payment: 'Carte', tip: 5, note: 'Coupe', category: '', payments: paid(20, 5, 'Carte') });
  entries.push({ id: id++, type: 'cut', client: 'Élias', price: 20, cost: 0, date: at(0, 10), payment: 'TWINT', tip: 0, note: 'Coupe', category: '', payments: [], stamp: true }); // à payer
  entries.push({ id: id++, type: 'cut', client: 'Yanis', price: 25, cost: 0, date: at(0, 9), payment: 'Espèces', tip: 3, note: 'Coupe + barbe', category: '', payments: paid(25, 3, 'Espèces'), stamp: true });
  entries.push({ id: id++, type: 'product', client: 'Poudre volume', price: 15, cost: 6, date: at(-3, 15), payment: 'TWINT', tip: 0, note: '', category: '', payments: paid(15) });
  entries.push({ id: id++, type: 'expense', client: 'Lames', price: 32.5, cost: 0, date: at(-2, 12), payment: '', tip: 0, note: '', category: 'Matériel', payments: [] });
  entries.push({ id: id++, type: 'appointment', client: 'Noah', price: 20, cost: 0, date: at(2, 15), payment: '', tip: 0, note: 'Coupe', category: '', payments: [] });
  entries.push({ id: id++, type: 'appointment', client: 'Karim B.', price: 20, cost: 0, date: at(-1, 17), payment: '', tip: 0, note: 'Coupe', category: '', payments: [] }); // à valider
  entries.push({ id: 'cal-bk-1', type: 'appointment', client: 'Lucas Martin', price: 20, cost: 0, date: at(1, 14), payment: '', tip: 0, note: 'Coupe', category: '', payments: [], calUid: 'bk-1', source: 'cal' });
  return {
    'noamcuts-v1': JSON.stringify(entries),
    'noamcuts-stock-v3': JSON.stringify([{ id: 1, name: 'Poudre volume', qty: 7, alert: 3, cost: 6, price: 15 }, { id: 2, name: 'Cire mate', qty: 2, alert: 3, cost: 5, price: 14 }]),
    'noamcuts-goal-v3': '2500',
    'noamcuts-settings-v4': JSON.stringify({ cardRate: 1.5, returnDays: 28, services: [{ name: 'Coupe', price: 20 }, { name: 'Coupe + barbe', price: 25 }, { name: 'Contours', price: 10 }] }),
    'noamcuts-clients-v6': JSON.stringify({ 'lucas martin': { phone: '079 123 45 67', note: 'Dégradé à 0,5' } }),
    'noamcuts-meta-v6': JSON.stringify({ lastBackup: new Date(now.getTime() - 20 * 864e5).toISOString() }),
    'noamcuts-cal-v7': JSON.stringify({ apiKey: 'cal_live_ANCIENNE_CLE', lastSync: new Date(now.getTime() - 864e5).toISOString(), error: '', ignored: [] }),
    'noamcuts-snapshot-avant-v6': JSON.stringify({ date: '2026-03-01T10:00:00.000Z', 'noamcuts-v1': '[]' }),
  };
}
