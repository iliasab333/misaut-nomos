#!/usr/bin/env node
// Páginas declaradas que NINGUNA ruta renderiza.
//
// Por qué no basta el grafo de imports: `pages.config.js` importa TODAS las
// páginas para construir su mapa `PAGES`, así que cualquier detector de
// ficheros inalcanzables las da por vivas. Pero una página sólo existe para
// el usuario si hay un `<Route>` que la pinta. Home.jsx llevaba así desde
// antes de la refonte: 189 líneas, importada, sin ruta y sin un solo enlace.
//
// Uso:  node scripts/check-routes.mjs [--strict]

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const app = readFileSync(join(ROOT, 'src/App.jsx'), 'utf8');
const cfg = readFileSync(join(ROOT, 'src/pages.config.js'), 'utf8');

// Lo declarado: `const X = lazyApp(...)` en App.jsx y en pages.config.js.
const declared = new Set();
for (const src of [app, cfg]) {
  for (const m of src.matchAll(/^const\s+([A-Z]\w*)\s*=\s*lazy(?:App|WithRetry)\(/gm)) declared.add(m[1]);
}

// Lo enrutado: TODOS los componentes que aparecen dentro de un `element={…}`,
// no sólo el primero. Muchas rutas envuelven la página en un <Suspense>
// —`element={<Suspense fallback={<PageLoader />}><AdminUsuarios /></Suspense>}`—
// y quedarse con el primer nombre en mayúscula daba «Suspense» y marcaba
// como huérfanas 22 páginas que sí están enrutadas.
const routed = new Set();
for (const line of app.split('\n')) {
  if (!line.includes('<Route')) continue;
  for (const m of line.matchAll(/<(?:Pages\.)?([A-Z]\w*)\b/g)) routed.add(m[1]);
}

const orphan = [...declared].filter((p) => !routed.has(p)).sort();

console.log(`páginas declaradas: ${declared.size} · con ruta: ${[...declared].filter((p) => routed.has(p)).length}`);
if (!orphan.length) {
  console.log('OK: todas las páginas declaradas tienen al menos una ruta.');
  process.exit(0);
}
console.error(`\n✗ ${orphan.length} página(s) declarada(s) que ninguna ruta renderiza:`);
for (const p of orphan) console.error(`    ${p}`);
console.error('\n  O les falta su <Route>, o son código muerto y deben borrarse.');
process.exit(process.argv.includes('--strict') ? 1 : 0);
