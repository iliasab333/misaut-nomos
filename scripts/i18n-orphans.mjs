#!/usr/bin/env node
// Claves huérfanas: llamadas t('clave') en el código cuya clave no existe
// ni en src/i18n/locales/es.json ni en ninguna parte de src/i18n/parts/.
//
// Herramienta de la migración. Una clave huérfana pinta la clave cruda en
// pantalla ("myProfile.toasts.saved" en vez de "Guardado"). Aparecen cuando
// el JSX se convierte a t() pero la parte JSON no llega a escribirse — es
// exactamente lo que dejó la primera oleada de agentes al cortarse la
// cuota. Este script las lista para poder reconstruirlas.
//
// Consciente de plurales: si el código llama t('x.count', { count }) y el
// JSON tiene x.count_one / x.count_other, NO es huérfana.
// Ignora claves dinámicas (con ${…}) y categories.* (vienen de la BD).
//
// Uso:
//   node scripts/i18n-orphans.mjs                      # todo src/
//   node scripts/i18n-orphans.mjs --files a.jsx b.jsx  # sólo esos
//   node scripts/i18n-orphans.mjs --json                # salida JSON
// Sale con 1 si hay alguna huérfana.

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const asJson = args.includes('--json');
const filesIdx = args.indexOf('--files');
const only = filesIdx >= 0
  ? args.slice(filesIdx + 1).filter((a) => !a.startsWith('--')).map((f) => join(ROOT, f.replace(/^\.\//, '')))
  : null;

function flatten(obj, prefix = '', out = new Set()) {
  for (const [k, v] of Object.entries(obj || {})) {
    const p = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, p, out);
    else out.add(p);
  }
  return out;
}

// Las dos mitades del locale fuente: el público y el de aplicación. Una clave
// existe si está en cualquiera de las dos — el reparto es una cuestión de
// cuándo se descarga, no de si la clave existe.
const known = new Set();
for (const f of ['src/i18n/locales/es.json', 'src/i18n/locales/es.app.json']) {
  const file = join(ROOT, f);
  if (!existsSync(file)) continue;
  for (const k of flatten(JSON.parse(readFileSync(file, 'utf8')))) known.add(k);
}
// Las partes pendientes de fusionar cuentan como claves conocidas: durante la
// extracción es normal que una clave viva en su parte y todavía no en el
// locale.
//
// Pero eso deja un agujero que ya costó un pie de página roto: el código
// llamaba a t('footer.copyright'), la clave estaba en parts/resto.json, este
// script decía «0 huérfanas»… y la app pintaba la clave cruda, porque en
// runtime sólo se cargan los locales. Una parte sin fusionar es un locale
// incompleto. Así que se avisa, fuerte, y `--strict` lo convierte en fallo
// (es lo que debe usar el build).
const partsDir = join(ROOT, 'src/i18n/parts');
const pendingParts = [];
if (existsSync(partsDir)) {
  for (const f of readdirSync(partsDir).filter((f) => f.endsWith('.json'))) {
    pendingParts.push(f);
    try {
      const j = JSON.parse(readFileSync(join(partsDir, f), 'utf8'));
      for (const k of flatten(j.es)) known.add(k);
    } catch (e) {
      console.error(`(parte ${f} no parsea: ${e.message})`);
    }
  }
}
const isKnown = (k) => known.has(k) || known.has(`${k}_one`) || known.has(`${k}_other`) || known.has(`${k}_zero`);

function walk(dir, out = []) {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(jsx?|tsx?)$/.test(n)) out.push(p);
  }
  return out;
}

// t('clave') / t("clave") / t(`clave`) — sin interpolación dentro.
// También i18n.t('clave').
const KEY_RE = /\b(?:i18n\.)?t\(\s*(['"`])([^'"`$\n]+)\1/g;

// Los comentarios NO cuentan: los ficheros del sistema de diseño enseñan su
// uso con ejemplos (`<Modal title={t('…')}>` en la cabecera de Modal.jsx) y
// esos no son claves que nadie vaya a resolver en runtime. Quitamos el
// contenido de los comentarios conservando la longitud de la línea, para que
// los números de línea del informe sigan siendo los del fichero.
function stripComments(lines) {
  let inBlock = false;
  return lines.map((line) => {
    let out = '';
    for (let i = 0; i < line.length; i++) {
      if (inBlock) {
        if (line[i] === '*' && line[i + 1] === '/') { inBlock = false; out += '  '; i++; }
        else out += ' ';
        continue;
      }
      if (line[i] === '/' && line[i + 1] === '*') { inBlock = true; out += '  '; i++; continue; }
      if (line[i] === '/' && line[i + 1] === '/') { out += ' '.repeat(line.length - i); break; }
      out += line[i];
    }
    return out;
  });
}

const result = {};
let total = 0;
for (const file of only || walk(join(ROOT, 'src'))) {
  if (!existsSync(file)) { console.error(`(no existe: ${relative(ROOT, file)})`); continue; }
  const src = readFileSync(file, 'utf8');
  const lines = stripComments(src.split('\n'));
  const found = [];
  lines.forEach((line, i) => {
    for (const m of line.matchAll(KEY_RE)) {
      const key = m[2];
      if (key.startsWith('categories.') || isKnown(key)) continue;
      found.push({ key, line: i + 1 });
    }
  });
  if (found.length) { result[relative(ROOT, file)] = found; total += found.length; }
}

const strict = args.includes('--strict');

if (asJson) {
  console.log(JSON.stringify({ total, pendingParts, files: result }, null, 2));
} else if (!total) {
  console.log(`OK: 0 claves huérfanas${only ? ` en ${only.length} fichero(s)` : ''}.`);
} else {
  console.log(`${total} clave(s) huérfana(s) en ${Object.keys(result).length} fichero(s):`);
  for (const [f, list] of Object.entries(result)) {
    console.log(`\n  ${f} (${list.length})`);
    for (const { key, line } of list) console.log(`    L${line}  ${key}`);
  }
}
if (pendingParts.length && !asJson) {
  console.error(
    `\n⚠ ${pendingParts.length} parte(s) sin fusionar en src/i18n/parts/: ${pendingParts.join(', ')}\n` +
      '  Sus claves cuentan aquí como conocidas, pero en runtime NO existen: la app\n' +
      '  pintará la clave cruda. Ejecuta `npm run i18n:merge` (y después `i18n:split`).',
  );
}

process.exit(total || (strict && pendingParts.length) ? 1 : 0);
