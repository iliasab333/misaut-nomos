#!/usr/bin/env node
// Fusiona las partes de extracción en los locales reales.
//
// Vehículo de la migración, no arquitectura: durante la extracción varios
// agentes trabajan en paralelo sobre distintos dominios, y si todos editaran
// es.json/en.json a la vez se pisarían. Cada uno escribe su parte en
// src/i18n/parts/<dominio>.json con esta forma:
//
//   { "es": { "crm": { "clients": { "title": "Clientes" } } },
//     "en": { "crm": { "clients": { "title": "Clients"  } } } }
//
// Este script las funde en src/i18n/locales/es.json y en.json y borra las
// partes. Después, los locales vuelven a ser la única fuente de verdad, como
// en khdemlidaba.
//
// Reglas:
//   - Una clave definida en dos partes con el MISMO valor: vale (dos agentes
//     reutilizaron el mismo texto). Con valor DISTINTO: error, se para todo y
//     se resuelve a mano. Nunca "gana el último".
//   - Una clave que ya existía en el locale: mismo criterio.
//   - Una parte cuya forma en `en` no calque la de `es`: error.
//   - Un valor que no sea string ni objeto (arrays, null): error.
//
// Uso:  node scripts/i18n-merge.mjs [--dry-run] [--keep-parts]

import { readFileSync, writeFileSync, readdirSync, existsSync, unlinkSync, rmdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PARTS_DIR = join(ROOT, 'src', 'i18n', 'parts');
const LOCALES_DIR = join(ROOT, 'src', 'i18n', 'locales');

const DRY = process.argv.includes('--dry-run');
const KEEP = process.argv.includes('--keep-parts');

if (!existsSync(PARTS_DIR)) {
  console.log('No hay src/i18n/parts/ — nada que fusionar.');
  process.exit(0);
}
const partFiles = readdirSync(PARTS_DIR).filter((f) => f.endsWith('.json')).sort();
if (!partFiles.length) {
  console.log('src/i18n/parts/ está vacío — nada que fusionar.');
  process.exit(0);
}

const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));

function flatten(obj, prefix = '', out = new Map()) {
  for (const [k, v] of Object.entries(obj || {})) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, path, out);
    else out.set(path, v);
  }
  return out;
}

// Devuelve null si va bien, o el mensaje del problema. NO lanza: las
// colisiones de forma son un error de datos como cualquier otro y tienen que
// salir junto al resto, no abortar el script a medio camino dejando al que lo
// ejecuta sin ver los demás problemas.
function setPath(obj, path, value) {
  const keys = path.split('.');
  let cur = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    if (cur[k] === undefined) cur[k] = {};
    else if (typeof cur[k] !== 'object' || cur[k] === null) {
      return `"${keys.slice(0, i + 1).join('.')}" ya es texto, pero "${path}" quiere colgar claves debajo. Renombra una de las dos.`;
    }
    cur = cur[k];
  }
  // El caso simétrico: "a.b" existe como objeto y llega "a.b" como string.
  const last = keys[keys.length - 1];
  if (cur[last] !== undefined && typeof cur[last] === 'object' && cur[last] !== null) {
    return `"${path}" ya tiene claves colgando, pero se le quiere asignar texto. Renombra una de las dos.`;
  }
  cur[last] = value;
  return null;
}

const errors = [];
const langs = ['es', 'en'];
const locales = {};
const flatLocales = {};
const origin = {}; // lang -> Map<path, partName> (para el mensaje de conflicto)

for (const lang of langs) {
  const file = join(LOCALES_DIR, `${lang}.json`);
  locales[lang] = existsSync(file) ? readJson(file) : {};
  flatLocales[lang] = flatten(locales[lang]);
  origin[lang] = new Map();
}

let added = 0;
for (const name of partFiles) {
  const part = readJson(join(PARTS_DIR, name));

  for (const lang of langs) {
    if (!part[lang] || typeof part[lang] !== 'object') {
      errors.push(`${name}: falta la rama "${lang}"`);
    }
  }
  if (!part.es || !part.en) continue;

  const flatEs = flatten(part.es);
  const flatEn = flatten(part.en);

  // Forma: en calca a es, exactamente.
  for (const k of flatEs.keys()) if (!flatEn.has(k)) errors.push(`${name}: "${k}" está en es pero no en en`);
  for (const k of flatEn.keys()) if (!flatEs.has(k)) errors.push(`${name}: "${k}" está en en pero no en es`);

  for (const lang of langs) {
    const flat = lang === 'es' ? flatEs : flatEn;
    for (const [path, value] of flat) {
      if (typeof value !== 'string') {
        errors.push(`${name} [${lang}]: "${path}" no es string (${JSON.stringify(value)})`);
        continue;
      }
      if (!value.trim()) {
        errors.push(`${name} [${lang}]: "${path}" está vacío`);
        continue;
      }
      const existing = flatLocales[lang].get(path);
      if (existing !== undefined) {
        if (existing !== value) {
          const from = origin[lang].get(path) || `${lang}.json (ya existía)`;
          errors.push(
            `CONFLICTO [${lang}] "${path}":\n` +
              `      ${from}: ${JSON.stringify(existing)}\n` +
              `      ${name}: ${JSON.stringify(value)}`,
          );
        }
        continue; // mismo valor: nada que hacer
      }
      flatLocales[lang].set(path, value);
      origin[lang].set(path, name);
      if (lang === 'es') added++;
    }
  }
}

if (errors.length) {
  console.error(`✗ ${errors.length} problema(s). No se ha escrito nada.\n`);
  for (const e of errors) console.error(`  · ${e}`);
  process.exit(1);
}

// Reconstruimos los objetos anidados desde el mapa plano fusionado, para que
// el orden sea estable (claves existentes primero, nuevas después, en el
// orden en que llegaron). Aquí aparecen las colisiones de FORMA: una parte
// que cuelga "a.b.c" de una "a.b" que ya es texto. Se recogen todas antes de
// decidir; nada se escribe si hay alguna.
const shapeErrors = [];
for (const lang of langs) {
  const out = {};
  for (const [path, value] of flatLocales[lang]) {
    const problem = setPath(out, path, value);
    if (problem) shapeErrors.push(`[${lang}] ${problem} (la aporta ${origin[lang].get(path) || `${lang}.json`})`);
  }
  locales[lang] = out;
}
if (shapeErrors.length) {
  console.error(`✗ ${shapeErrors.length} colisión(es) de forma. No se ha escrito nada.\n`);
  for (const e of shapeErrors) console.error(`  · ${e}`);
  process.exit(1);
}

console.log(`Partes: ${partFiles.length} (${partFiles.join(', ')})`);
console.log(`Claves nuevas: ${added}`);
for (const lang of langs) console.log(`  ${lang}.json → ${flatLocales[lang].size} claves`);

if (DRY) {
  console.log('\n--dry-run: no se ha escrito nada.');
  process.exit(0);
}

for (const lang of langs) {
  writeFileSync(join(LOCALES_DIR, `${lang}.json`), JSON.stringify(locales[lang], null, 2) + '\n');
}
if (!KEEP) {
  for (const name of partFiles) unlinkSync(join(PARTS_DIR, name));
  try { rmdirSync(PARTS_DIR); } catch (_e) { /* quedan otros ficheros: se deja */ }
  console.log('Partes fusionadas y eliminadas.');
} else {
  console.log('Partes fusionadas (conservadas por --keep-parts).');
}
