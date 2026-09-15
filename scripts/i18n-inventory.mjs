#!/usr/bin/env node
// Inventario de cadenas visibles escritas a mano en el JSX.
//
// Herramienta de la migración: recorre src/ con el parser de Babel y cuenta
// los textos que un usuario ve pero que no pasan por t(). Sirve para medir
// el trabajo de extracción y para saber, fichero a fichero, qué queda.
//
// Cuenta:
//   - JSXText con letras (no sólo espacios/puntuación)
//   - literales en props visibles: placeholder, title, aria-label, alt,
//     label, description, helperText, subtitle, tooltip, emptyText
//   - literales directos en {'...'} dentro de JSX
//
// No cuenta (a propósito): className, href, src, data-*, claves de objeto,
// llamadas t('...') (ya extraídas), console.*, throw new Error(...).
//
// Uso:  node scripts/i18n-inventory.mjs [--json salida.json] [--top 30]
//       node scripts/i18n-inventory.mjs --files src/pages/CRM.jsx src/pages/ClientDetail.jsx
//         (sólo esos ficheros; imprime cada cadena restante con su tipo —
//          es lo que usa cada agente de extracción para verificar que
//          su lote ha quedado a cero)

import { readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { readdirSync, statSync } from 'node:fs';
import { parse } from '@babel/parser';
import traverseMod from '@babel/traverse';

const traverse = traverseMod.default || traverseMod;
const ROOT = process.cwd();
const SRC = join(ROOT, 'src');

const args = process.argv.slice(2);
const jsonOut = args.includes('--json') ? args[args.indexOf('--json') + 1] : null;
const top = args.includes('--top') ? Number(args[args.indexOf('--top') + 1]) : 25;
const filesIdx = args.indexOf('--files');
const onlyFiles = filesIdx >= 0
  ? new Set(args.slice(filesIdx + 1).filter((a) => !a.startsWith('--')).map((f) => join(ROOT, f.replace(/^\.\//, ''))))
  : null;

const VISIBLE_PROPS = new Set([
  'placeholder', 'title', 'aria-label', 'alt', 'label', 'description',
  'helperText', 'subtitle', 'tooltip', 'emptyText', 'emptyMessage',
  'confirmText', 'cancelText', 'submitText', 'buttonText', 'heading',
]);

// Un texto "cuenta" si tiene al menos dos letras seguidas. Deja fuera
// "·", "—", "€", "%" y similares, y también identificadores tipo "ES".
const HAS_WORD = /\p{L}{2,}/u;
const IS_IDENT = /^[A-Z0-9_]+$/; // constantes, códigos: no son texto

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (/\.(jsx?|tsx?)$/.test(name)) out.push(p);
  }
  return out;
}

function countable(s) {
  const t = s.replace(/\s+/g, ' ').trim();
  if (!t || !HAS_WORD.test(t) || IS_IDENT.test(t)) return null;
  return t;
}

const perFile = [];
const all = new Map(); // texto -> nº apariciones

for (const file of walk(SRC)) {
  if (onlyFiles && !onlyFiles.has(file)) continue;
  const code = readFileSync(file, 'utf8');
  let ast;
  try {
    ast = parse(code, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript', 'decorators-legacy'],
      errorRecovery: true,
    });
  } catch (e) {
    console.error(`  (no se pudo parsear ${relative(ROOT, file)}: ${e.message})`);
    continue;
  }

  const found = [];
  const add = (s, kind) => {
    const t = countable(s);
    if (!t) return;
    found.push({ text: t, kind });
    all.set(t, (all.get(t) || 0) + 1);
  };

  traverse(ast, {
    JSXText(path) { add(path.node.value, 'text'); },
    JSXAttribute(path) {
      const name = path.node.name?.name;
      if (!VISIBLE_PROPS.has(name)) return;
      const v = path.node.value;
      if (!v) return;
      if (v.type === 'StringLiteral') add(v.value, `prop:${name}`);
      else if (v.type === 'JSXExpressionContainer') {
        const e = v.expression;
        if (e.type === 'StringLiteral') add(e.value, `prop:${name}`);
        else if (e.type === 'TemplateLiteral' && e.expressions.length === 0) {
          add(e.quasis.map((q) => q.value.cooked).join(''), `prop:${name}`);
        }
      }
    },
    JSXExpressionContainer(path) {
      // {'texto'} directo en el árbol JSX (no dentro de un atributo)
      if (path.parent.type === 'JSXAttribute') return;
      const e = path.node.expression;
      if (e.type === 'StringLiteral') add(e.value, 'expr');
      else if (e.type === 'TemplateLiteral' && e.expressions.length === 0) {
        add(e.quasis.map((q) => q.value.cooked).join(''), 'expr');
      }
    },
  });

  if (found.length) perFile.push({ file: relative(ROOT, file), count: found.length, strings: found });
}

perFile.sort((a, b) => b.count - a.count);

if (onlyFiles) {
  const total = perFile.reduce((n, f) => n + f.count, 0);
  if (!total) {
    console.log(`OK: 0 cadenas a mano en ${onlyFiles.size} fichero(s).`);
    process.exit(0);
  }
  console.log(`Quedan ${total} cadena(s) a mano:`);
  for (const f of perFile) {
    console.log(`\n  ${f.file} (${f.count})`);
    for (const s of f.strings) console.log(`    [${s.kind}] ${JSON.stringify(s.text)}`);
  }
  process.exit(1);
}

const totalOcc = perFile.reduce((n, f) => n + f.count, 0);

const isUi = (f) => f.file.startsWith('src/components/ui/');
const uiFiles = perFile.filter(isUi);
const appFiles = perFile.filter((f) => !isUi(f));

console.log(`Ficheros con cadenas a mano: ${perFile.length}`);
console.log(`Apariciones totales:         ${totalOcc}`);
console.log(`Cadenas únicas:              ${all.size}`);
console.log(`  · en components/ui (shadcn, se reescribe): ${uiFiles.length} ficheros, ${uiFiles.reduce((n, f) => n + f.count, 0)} apariciones`);
console.log(`  · resto de la app:                         ${appFiles.length} ficheros, ${appFiles.reduce((n, f) => n + f.count, 0)} apariciones`);
console.log(`\nTop ${top} ficheros:`);
for (const f of perFile.slice(0, top)) {
  console.log(`  ${String(f.count).padStart(4)}  ${f.file}`);
}

if (jsonOut) {
  writeFileSync(jsonOut, JSON.stringify({ totalOcc, unique: all.size, files: perFile }, null, 2));
  console.log(`\nDetalle escrito en ${jsonOut}`);
}
