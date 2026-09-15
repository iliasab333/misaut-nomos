#!/usr/bin/env node
// Guarda de i18n — rompe el build antes de publicar un idioma a medias.
//
// Por qué existe
// ──────────────
// El i18n que venía de Base44 tenía `parseMissingKeyHandler`: una clave que
// faltaba no fallaba nunca, devolvía un texto fabricado a partir del nombre
// de la clave. No había forma de saber qué estaba traducido y qué no, porque
// TODO parecía traducido. Este script es lo que sustituye a esa comodidad:
// si `es` tiene una clave que `en` no tiene, el build para aquí.
//
// Qué comprueba, para cada idioma con `ready: true` en src/i18n/langs.js:
//   1. que exista su JSON
//   2. que no le falte ninguna clave respecto a es.json (la fuente de verdad)
//   3. que no tenga claves de más (restos de refactors: peso muerto que
//      además engaña sobre la cobertura real)
//   4. que la forma coincida — una clave que en es es objeto y en en es
//      string revienta en runtime con "key returned an object"
//   5. que ningún valor esté vacío ni sea un TODO/FIXME sin traducir
//
// Uso:  node scripts/check-i18n.mjs [--verbose]
// Sale con código 1 si hay cualquier problema.

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { LANGS, DEFAULT_LANG } from '../src/i18n/langs.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LOCALES_DIR = join(ROOT, 'src', 'i18n', 'locales');
const VERBOSE = process.argv.includes('--verbose');

const localePath = (code) => join(LOCALES_DIR, `${code}.json`);

function readLocale(code) {
  const file = localePath(code);
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch (e) {
    console.error(`✗ ${code}.json no es JSON válido: ${e.message}`);
    process.exit(1);
  }
}

// Aplana a `{ "a.b.c": "valor" }` y anota el tipo, para poder comparar forma
// y no sólo presencia.
function flatten(obj, prefix = '', out = new Map()) {
  for (const [k, v] of Object.entries(obj || {})) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, path, out);
    else out.set(path, v);
  }
  return out;
}

const PLACEHOLDER_RE = /^\s*(TODO|FIXME|XXX|<[^>]*>)?\s*$/i;

// Los marcadores de interpolación deben sobrevivir a la traducción: si `es`
// dice "Hola {{name}}" y `en` dice "Hello {name}", en runtime sale el literal.
const INTERP_RE = /\{\{\s*([\w.]+)\s*\}\}/g;
const interpKeys = (s) =>
  typeof s === 'string'
    ? new Set(Array.from(s.matchAll(INTERP_RE), (m) => m[1]))
    : new Set();

const source = readLocale(DEFAULT_LANG);
if (!source) {
  console.error(`✗ Falta el locale fuente: ${localePath(DEFAULT_LANG)}`);
  process.exit(1);
}
const sourceFlat = flatten(source);

console.log(`i18n: fuente de verdad ${DEFAULT_LANG}.json — ${sourceFlat.size} claves\n`);

const ready = LANGS.filter((l) => l.ready && l.code !== DEFAULT_LANG);
const pending = LANGS.filter((l) => !l.ready);
let failed = false;

for (const { code, label } of ready) {
  const data = readLocale(code);
  if (!data) {
    console.error(`✗ ${code} (${label}): marcado ready pero falta ${code}.json`);
    failed = true;
    continue;
  }

  const flat = flatten(data);
  const missing = [];
  const shapeMismatch = [];
  const empty = [];
  const badInterp = [];

  for (const [key, srcVal] of sourceFlat) {
    if (!flat.has(key)) {
      missing.push(key);
      continue;
    }
    const val = flat.get(key);
    if (typeof val !== typeof srcVal) {
      shapeMismatch.push(`${key} (es: ${typeof srcVal}, ${code}: ${typeof val})`);
      continue;
    }
    if (typeof val === 'string' && PLACEHOLDER_RE.test(val)) empty.push(key);

    const want = interpKeys(srcVal);
    const got = interpKeys(val);
    if (want.size || got.size) {
      const lost = [...want].filter((v) => !got.has(v));
      const invented = [...got].filter((v) => !want.has(v));
      if (lost.length || invented.length) {
        badInterp.push(
          `${key}${lost.length ? ` pierde {{${lost.join('}}, {{')}}}` : ''}` +
            `${invented.length ? ` inventa {{${invented.join('}}, {{')}}}` : ''}`,
        );
      }
    }
  }

  const extra = [...flat.keys()].filter((k) => !sourceFlat.has(k));

  const problems = [
    ['claves que faltan', missing],
    ['claves de más', extra],
    ['tipo distinto al de es', shapeMismatch],
    ['valores vacíos o TODO', empty],
    ['interpolación rota', badInterp],
  ].filter(([, list]) => list.length);

  if (!problems.length) {
    console.log(`✓ ${code} (${label}): ${flat.size} claves, completo`);
    continue;
  }

  failed = true;
  console.error(`✗ ${code} (${label}):`);
  for (const [title, list] of problems) {
    console.error(`    ${list.length} ${title}`);
    const show = VERBOSE ? list : list.slice(0, 10);
    for (const item of show) console.error(`      · ${item}`);
    if (!VERBOSE && list.length > show.length) {
      console.error(`      … y ${list.length - show.length} más (usa --verbose)`);
    }
  }
}

if (pending.length) {
  console.log(
    `\nPendientes (no se ofrecen en el selector todavía): ` +
      pending.map((l) => l.code).join(', '),
  );
  for (const { code } of pending) {
    const data = readLocale(code);
    if (!data) {
      console.log(`  · ${code}: sin fichero`);
      continue;
    }
    const have = flatten(data).size;
    const pct = Math.round((have / sourceFlat.size) * 100);
    console.log(`  · ${code}: ${have}/${sourceFlat.size} claves (${pct}%)`);
  }
}

if (failed) {
  console.error('\ni18n: FALLO. Ningún idioma se publica a medias.');
  process.exit(1);
}
console.log('\ni18n: OK.');
