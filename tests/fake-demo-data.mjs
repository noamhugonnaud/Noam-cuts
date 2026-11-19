// Fausses données réalistes pour l'aperçu du design (jamais utilisées en production).
// Même format que les vraies clés localStorage de l'appli.
export function fakeDemo(now = new Date()) {
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const pick = a => a[Math.floor(rnd() * a.length)];
  const pad = n => String(n).padStart(2, '0');
  const iso = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  const at = (days, h, m = 0) => { const d = new Date(now); d.setDate(d.getDate() + days); d.setHours(h, m, 0, 0); return d; };

  const services = [{ name: 'Coupe', price: 25 }, { name: 'Coupe + barbe', price: 35 }, { name: 'Dégradé', price: 30 }, { name: 'Contours', price: 10 }];
  const names = ['Lucas Martin', 'Yanis B.', 'Karim Haddad', 'Élias', 'Noah Favre', 'Mattéo Rossi', 'Adam K.', 'Liam Dubois', 'Nathan Meier', 'Ilyes', 'Gabriel Santos', 'Rayan M.', 'Théo Bonvin', 'Samuel Keller', 'Enzo', 'Hugo Perret', 'Ayoub', 'Luca Bianchi', 'Kenan Y.', 'Diego Ferreira', 'Malik', 'Jonas Weber', 'Arthur Rey', 'Bilal S.', 'Tom Müller', 'Isaac', 'Leon Schmid', 'Sacha', 'Mohamed A.', 'Maxime Clerc'];
  const notes = ['', '', '', 'Sabot 2 côtés', 'Taper bas', 'Dégradé à 0,5', 'Raie à gauche', 'Barbe courte', 'Ciseaux dessus'];
  const pays = ['TWINT', 'TWINT', 'TWINT', 'Espèces', 'Espèces', 'Carte'];

  const entries = [];
  let id = 1760000000000;
  const cut = (d, client, svc, { due = false, tip } = {}) => {
    const t = tip ?? (rnd() < .25 ? pick([2, 5, 5, 10]) : 0);
    const pay = pick(pays);
    entries.push({ id: id++, type: 'cut', client, price: svc.price, cost: 0, date: iso(d), payment: pay, tip: t, note: svc.name === 'Coupe' ? (pick(notes) || 'Coupe') : svc.name, category: '', payments: due ? [] : [{ amount: svc.price + t, date: d.toISOString(), method: pay }], stamp: true });
  };

  // ~4 mois d'historique, 6 jours sur 7, 2 à 6 coupes par jour
  for (let day = -120; day < 0; day++) {
    const d = at(day, 9);
    if (d.getDay() === 0) continue;
    const n = 2 + Math.floor(rnd() * 5);
    for (let k = 0; k < n; k++) cut(at(day, 10 + k * 1.5 | 0, k % 2 ? 30 : 0), pick(names.slice(0, day > -30 ? 30 : 22)), pick(services));
  }
  // aujourd'hui
  cut(at(0, 9), 'Yanis B.', services[1], { tip: 5 });
  cut(at(0, 10, 30), 'Karim Haddad', services[2]);
  cut(at(0, 11, 30), 'Élias', services[0], { due: true, tip: 0 });
  cut(at(0, 13), 'Gabriel Santos', services[0], { tip: 0 });
  // RDV à venir (dont réservations du site)
  const appt = (d, client, svc, cal) => entries.push({ id: cal ? 'cal-' + cal : id++, type: 'appointment', client, price: svc.price, cost: 0, date: iso(d), payment: '', tip: 0, note: svc.name, category: '', payments: [], ...(cal ? { calUid: cal, source: 'cal' } : {}) });
  appt(at(0, 15), 'Noah Favre', services[2], 'bk-101');
  appt(at(0, 16, 30), 'Mattéo Rossi', services[0]);
  appt(at(0, 18), 'Lucas Martin', services[1], 'bk-102');
  appt(at(1, 10), 'Adam K.', services[0], 'bk-103');
  appt(at(1, 14, 30), 'Liam Dubois', services[2]);
  appt(at(2, 11), 'Théo Bonvin', services[1], 'bk-104');
  appt(at(3, 17), 'Samuel Keller', services[0], 'bk-105');
  appt(at(4, 9, 30), 'Hugo Perret', services[3]);
  appt(at(-1, 17), 'Rayan M.', services[0]); // à valider
  // produits & dépenses
  for (let i = 0; i < 9; i++) entries.push({ id: id++, type: 'product', client: pick(['Cire mate', 'Poudre volume', 'Huile à barbe']), price: pick([15, 18, 22]), cost: 7, date: iso(at(-Math.floor(rnd() * 60), 15)), payment: 'TWINT', tip: 0, note: '', category: '', payments: [{ amount: 18, date: now.toISOString(), method: 'TWINT' }] });
  [['Lames', 32.5, 'Matériel', -4], ['Loyer fauteuil', 350, 'Local', -15], ['Serviettes', 24.9, 'Consommables', -9], ['Tondeuse Wahl', 189, 'Matériel', -40], ['Loyer fauteuil', 350, 'Local', -45]].forEach(([c, p, cat, d]) => entries.push({ id: id++, type: 'expense', client: c, price: p, cost: 0, date: iso(at(d, 12)), payment: '', tip: 0, note: '', category: cat, payments: [] }));

  const today = new Date(now).toISOString();
  return {
    'noamcuts-v1': JSON.stringify(entries),
    'noamcuts-stock-v3': JSON.stringify([{ id: 1, name: 'Poudre volume', qty: 7, alert: 3, cost: 6, price: 15 }, { id: 2, name: 'Cire mate', qty: 2, alert: 3, cost: 7, price: 18 }, { id: 3, name: 'Huile à barbe', qty: 5, alert: 2, cost: 9, price: 22 }]),
    'noamcuts-goal-v3': '4500',
    'noamcuts-settings-v4': JSON.stringify({ cardRate: 1.5, returnDays: 28, services }),
    'noamcuts-clients-v6': JSON.stringify({ 'lucas martin': { phone: '079 123 45 67', note: 'Dégradé à 0,5, raie à gauche' }, 'karim haddad': { phone: '078 555 12 34', note: '' } }),
    'noamcuts-meta-v6': JSON.stringify({ lastBackup: today, lastOnlineBackup: today }),
    'noamcuts-cal-v7': JSON.stringify({ lastSync: today, error: '', ignored: [] }),
  };
}
