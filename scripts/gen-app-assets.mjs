// Genera los assets requeridos por @capacitor/assets a partir del logo
// existente en /public/logo-512.png.
// Marca: navy #00255C como fondo, gold #F5C13D para acentos (anillo de marca).
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs/promises';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const SRC_LOGO = path.join(root, 'public', 'logo-512.png');
const OUT = path.join(root, 'assets');
await fs.mkdir(OUT, { recursive: true });

const NAVY = '#00255C';
const GOLD = '#F5C13D';

// ---- ICON ------------------------------------------------------------------
// icon-only.png: foreground transparente (logo en 1024×1024) sin padding extra
// icon-foreground.png: el mismo logo centrado pero con padding del 20%
// icon-background.png: cuadrado navy macizo

const SIZE_ICON = 1024;
const LOGO_INNER = Math.round(SIZE_ICON * 0.6); // 60% de inner para foreground adaptativo
const LOGO_SOLO = Math.round(SIZE_ICON * 0.78); // 78% para icon-only (sin recorte)

const logoBuffer = await fs.readFile(SRC_LOGO);

// icon-only.png — logo sobre fondo navy con anillo gold suave
const innerSolo = await sharp(logoBuffer)
  .resize(LOGO_SOLO, LOGO_SOLO, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .toBuffer();

const ring = Buffer.from(
  `<svg width="${SIZE_ICON}" height="${SIZE_ICON}" xmlns="http://www.w3.org/2000/svg">
    <rect x="0" y="0" width="${SIZE_ICON}" height="${SIZE_ICON}" rx="180" ry="180" fill="${NAVY}"/>
    <rect x="40" y="40" width="${SIZE_ICON - 80}" height="${SIZE_ICON - 80}" rx="150" ry="150" fill="none" stroke="${GOLD}" stroke-width="14" opacity="0.55"/>
  </svg>`
);

await sharp(ring)
  .composite([
    {
      input: innerSolo,
      gravity: 'center',
    },
  ])
  .png()
  .toFile(path.join(OUT, 'icon-only.png'));

// icon-foreground.png — solo el logo (transparente), para adaptive Android
const innerFg = await sharp(logoBuffer)
  .resize(LOGO_INNER, LOGO_INNER, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .toBuffer();

await sharp({
  create: {
    width: SIZE_ICON,
    height: SIZE_ICON,
    channels: 4,
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  },
})
  .composite([{ input: innerFg, gravity: 'center' }])
  .png()
  .toFile(path.join(OUT, 'icon-foreground.png'));

// icon-background.png — navy macizo
await sharp({
  create: {
    width: SIZE_ICON,
    height: SIZE_ICON,
    channels: 3,
    background: { r: 0x00, g: 0x25, b: 0x5c },
  },
})
  .png()
  .toFile(path.join(OUT, 'icon-background.png'));

// ---- SPLASH ----------------------------------------------------------------
const SIZE_SPLASH = 2732; // requerimiento @capacitor/assets
const LOGO_SPLASH = Math.round(SIZE_SPLASH * 0.22);

const splashRing = Buffer.from(
  `<svg width="${SIZE_SPLASH}" height="${SIZE_SPLASH}" xmlns="http://www.w3.org/2000/svg">
    <rect x="0" y="0" width="${SIZE_SPLASH}" height="${SIZE_SPLASH}" fill="${NAVY}"/>
    <circle cx="${SIZE_SPLASH / 2}" cy="${SIZE_SPLASH / 2}" r="${LOGO_SPLASH * 0.85}" fill="none" stroke="${GOLD}" stroke-width="6" opacity="0.35"/>
  </svg>`
);

const logoForSplash = await sharp(logoBuffer)
  .resize(LOGO_SPLASH, LOGO_SPLASH, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .toBuffer();

const splashPath = path.join(OUT, 'splash.png');
await sharp(splashRing)
  .composite([{ input: logoForSplash, gravity: 'center' }])
  .png()
  .toFile(splashPath);

// Dark = igual (la marca es navy en ambos modos)
await fs.copyFile(splashPath, path.join(OUT, 'splash-dark.png'));

console.log('Assets generados en', OUT);
