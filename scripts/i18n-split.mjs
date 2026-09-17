#!/usr/bin/env node
// Parte cada locale en dos: público y aplicación.
//
//   locales/<lang>.json      → namespaces públicos + claves planas heredadas
//   locales/<lang>.app.json  → namespaces de pantallas internas
//
// El reparto lo decide src/i18n/namespaces.js, que es la fuente de verdad.
// Este script es idempotente: si <lang>.app.json ya existe, lo funde con lo
// que encuentre en <lang>.json antes de volver a repartir, así que se puede
// ejecutar después de cada `i18n:merge` sin pensarlo.
//
// Uso:  node scripts/i18n-split.mjs [--dry-run]

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LANGS } from '../src/i18n/langs.js';
import { APP_NAMESPACES, PUBLIC_NAMESPACES, isLegacyFlat } from '../src/i18n/namespaces.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(ROOT, 'src', 'i18n', 'locales');
const DRY = process.argv.includes('--dry-run');

const kb = (o) => (Buffer.byteLength(JSON.stringify(o), 'utf8') / 1024).toFixed(1);
const countLeaves = (o) =>
  o && typeof o === 'object' ? Object.values(o).reduce((n, v) => n + countLeaves(v), 0) : 1;

const known = new Set([...APP_NAMESPACES, ...PUBLIC_NAMESPACES]);
const overlap = APP_NAMESPACES.filter((n) => PUBLIC_NAMESPACES.includes(n));
if (overlap.length) {
  console.error(`✗ namespaces en las dos listas: ${overlap.join(', ')}`);
  process.exit(1);
}

let failed = false;
for (const { code, ready } of LANGS) {
  const pubFile = join(DIR, `${code}.json`);
  const appFile = join(DIR, `${code}.app.json`);
  if (!existsSync(pubFile)) {
    if (ready) { console.error(`✗ ${code}: falta ${code}.json y está marcado ready`); failed = true; }
    continue;
  }

  // Funde lo que ya estuviera separado, para poder reejecutar sin perder nada.
  const merged = { ...JSON.parse(readFileSync(pubFile, 'utf8')) };
  if (existsSync(appFile)) Object.assign(merged, JSON.parse(readFileSync(appFile, 'utf8')));

  const pub = {};
  const app = {};
  const unclassified = [];
  for (const [ns, value] of Object.entries(merged)) {
    if (isLegacyFlat(value)) { pub[ns] = value; continue; }
    if (APP_NAMESPACES.includes(ns)) { app[ns] = value; continue; }
    if (PUBLIC_NAMESPACES.includes(ns)) { pub[ns] = value; continue; }
    unclassified.push(ns);
  }

  if (unclassified.length) {
    console.error(
      `✗ ${code}: ${unclassified.length} namespace(s) sin clasificar en src/i18n/namespaces.js: ${unclassified.join(', ')}`,
    );
    failed = true;
    continue;
  }

  console.log(
    `${code}: público ${kb(pub)} kB (${countLeaves(pub)} claves) · app ${kb(app)} kB (${countLeaves(app)} claves)`,
  );
  if (!DRY) {
    writeFileSync(pubFile, JSON.stringify(pub, null, 2) + '\n');
    writeFileSync(appFile, JSON.stringify(app, null, 2) + '\n');
  }
}

if (failed) {
  console.error('\ni18n-split: FALLO. No se ha escrito nada nuevo.');
  process.exit(1);
}
console.log(DRY ? '\n--dry-run: no se ha escrito nada.' : '\ni18n-split: OK.');
