// Génère toutes les images de l'appli à partir de logo-nhcutz.png
// Usage : npm run images
import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'noam-cuts-github');
const SRC = path.join(ROOT, 'logo-nhcutz.png');
const out = p => path.join(ROOT, p);

// 1) Logo seul, recadré, en niveaux de gris → sert de masque (blanc = logo)
const { data: grey, info } = await sharp(SRC).greyscale().trim({ threshold: 40 })
  .extend({ top: 8, bottom: 8, left: 8, right: 8, background: '#000' })
  .raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height;
console.log('logo recadré :', W, 'x', H);

function tinted(rgb) {
  const buf = Buffer.alloc(W * H * 4);
  for (let i = 0; i < W * H; i++) {
    buf[i * 4] = rgb[0]; buf[i * 4 + 1] = rgb[1]; buf[i * 4 + 2] = rgb[2];
    buf[i * 4 + 3] = grey[i * info.channels];
  }
  return sharp(buf, { raw: { width: W, height: H, channels: 4 } }).png();
}
const white = await tinted([255, 255, 255]).toBuffer();
const black = await tinted([0, 0, 0]).toBuffer();
// Logos transparents pour l'interface (2× la taille affichée max)
await sharp(white).resize({ width: 900 }).png({ compressionLevel: 9 }).toFile(out('logo-white.png'));
await sharp(black).resize({ width: 900 }).png({ compressionLevel: 9 }).toFile(out('logo-black.png'));

// 2) Icônes : logo complet centré sur fond noir
async function icon(size, ratio, file, bg = '#000000', logo = white) {
  const lw = Math.round(size * ratio);
  const l = await sharp(logo).resize({ width: lw }).toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: bg } })
    .composite([{ input: l, gravity: 'center' }]).flatten({ background: bg })
    .png({ compressionLevel: 9 }).toFile(out(file));
}
await icon(180, 0.80, 'apple-touch-icon.png');
await icon(180, 0.80, 'apple-touch-icon-180x180.png');
await icon(180, 0.80, 'apple-touch-icon-precomposed.png');
await icon(192, 0.80, 'icon-192.png');
await icon(512, 0.80, 'icon-512.png');
await icon(192, 0.62, 'icon-maskable-192.png'); // zone sûre Android (cercle 80 %)
await icon(512, 0.62, 'icon-maskable-512.png');
await icon(192, 0.80, 'favicon.png');
await icon(32, 0.92, 'favicon-32.png');
// Petit badge monochrome pour les notifications
await icon(96, 0.86, 'badge-96.png');

// 3) Écrans de lancement iOS (portrait), clair et sombre
// [largeur CSS, hauteur CSS, ratio]
const DEVICES = [
  [440, 956, 3], // 16 Pro Max, 17 Pro Max
  [402, 874, 3], // 16 Pro, 17, 17 Pro
  [420, 912, 3], // iPhone Air
  [430, 932, 3], // 14 Pro Max, 15 Plus/Pro Max, 16 Plus
  [393, 852, 3], // 14 Pro, 15, 15 Pro, 16
  [428, 926, 3], // 12/13 Pro Max, 14 Plus
  [390, 844, 3], // 12, 13, 14, 12/13 Pro
  [375, 812, 3], // X, XS, 11 Pro, 12/13 mini
  [414, 896, 3], // XS Max, 11 Pro Max
  [414, 896, 2], // XR, 11
  [414, 736, 3], // 6/7/8 Plus
  [375, 667, 2], // SE 2/3, 6/7/8
];
await mkdir(out('splash'), { recursive: true });
const links = [];
for (const [w, h, r] of DEVICES) {
  const pw = w * r, ph = h * r;
  for (const mode of ['dark', 'light']) {
    const bg = mode === 'dark' ? '#000000' : '#ffffff';
    const logo = mode === 'dark' ? white : black;
    const l = await sharp(logo).resize({ width: Math.round(pw * 0.62) }).toBuffer();
    const file = `splash/launch-${pw}x${ph}-${mode}.png`;
    await sharp({ create: { width: pw, height: ph, channels: 4, background: bg } })
      .composite([{ input: l, gravity: 'center' }]).flatten({ background: bg })
      .png({ compressionLevel: 9, palette: true }).toFile(out(file));
    links.push(`<link rel="apple-touch-startup-image" media="(device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${r}) and (orientation: portrait) and (prefers-color-scheme: ${mode})" href="/${file}?v=80">`);
  }
}
await writeFile(path.join(ROOT, '..', 'scripts', 'splash-links.html'), links.join('\n') + '\n');
console.log('OK :', links.length, 'écrans de lancement');
