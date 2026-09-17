#!/usr/bin/env node
// Coteja los `rewrites` de vercel.json con las rutas que App.jsx declara.
//
// Los rewrites de una SPA existen para que una recarga en /mi-perfil sirva
// index.html en vez de dar 404 en el CDN. Si la ruta desaparece del router y
// el rewrite se queda, Vercel sigue sirviendo la app y el usuario acaba en la
// pantalla de 404 del cliente: no rompe nada, pero es configuración que dice
// que existe algo que no existe, y la siguiente persona que la lea se lo cree.
//
// Al revés es peor: una ruta del router SIN rewrite da 404 de verdad al
// recargar o al entrar por un enlace externo.
//
// Uso:  node scripts/check-vercel-routes.mjs [--strict]

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const app = readFileSync(join(ROOT, 'src/App.jsx'), 'utf8');
const vercel = JSON.parse(readFileSync(join(ROOT, 'vercel.json'), 'utf8'));

// Rutas del router, normalizadas a su primer segmento: /clientes/:id → /clientes
const routes = new Set();
for (const m of app.matchAll(/<Route\s+path="([^"]+)"/g)) {
  const p = m[1];
  if (p === '*' || p === '/') continue;
  routes.add('/' + p.split('/').filter(Boolean)[0]);
}

// Rewrites que apuntan a index.html, normalizados igual.
const rewrites = [];
for (const r of vercel.rewrites || []) {
  if (r.destination !== '/index.html') continue;
  const base = '/' + r.source.split('/').filter(Boolean)[0].replace(/\(.*/, '');
  rewrites.push({ source: r.source, base });
}

const dead = rewrites.filter((r) => !routes.has(r.base));
const uniqueDeadBases = [...new Set(dead.map((r) => r.base))].sort();

// Y al revés: rutas sin rewrite. Pero un rewrite no es la única forma de
// estar cubierto:
//   - Las páginas PRERENDERIZADAS tienen su propio dist/<ruta>/index.html, que
//     Vercel sirve directamente. /buscar, /ayuda, /blog y las legales van así.
//   - Algunas rutas tienen un `redirect` en vez de un rewrite (/autonomo y
//     /categoria redirigen a /buscar).
// Sin esto la comprobación marcaba 11 rutas sanas, y una guarda que grita sin
// motivo se deja de leer.
const covered = new Set(rewrites.map((r) => r.base));
for (const r of vercel.redirects || []) {
  covered.add('/' + r.source.split('/').filter(Boolean)[0].replace(/[:(].*/, ''));
}
const prerendered = (() => {
  try {
    return new Set(
      readdirSync(join(ROOT, 'dist'), { withFileTypes: true })
        .filter((d) => d.isDirectory() && existsSync(join(ROOT, 'dist', d.name, 'index.html')))
        .map((d) => '/' + d.name),
    );
  } catch { return new Set(); }
})();
const uncovered = [...routes].filter((p) => !covered.has(p) && !prerendered.has(p)).sort();

console.log(`rutas en App.jsx: ${routes.size} · rewrites a index.html: ${rewrites.length}`);

let bad = false;
if (dead.length) {
  bad = true;
  console.error(`\n✗ ${dead.length} rewrite(s) hacia ${uniqueDeadBases.length} ruta(s) que el router ya no declara:`);
  for (const b of uniqueDeadBases) {
    console.error(`    ${b}  (${dead.filter((r) => r.base === b).map((r) => r.source).join(', ')})`);
  }
}
if (uncovered.length) {
  console.error(`\n⚠ ${uncovered.length} ruta(s) del router sin rewrite — sin rewrite, sin redirect y sin HTML prerenderizado: recargar ahí da 404:`);
  for (const p of uncovered) console.error(`    ${p}`);
}
if (!bad && !uncovered.length) console.log('OK: vercel.json y App.jsx dicen lo mismo.');
process.exit(bad && process.argv.includes('--strict') ? 1 : 0);
