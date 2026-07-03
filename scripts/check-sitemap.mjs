// scripts/check-sitemap.mjs
// Verifica que todas las URLs del sitemap responden 200 en producción.
// Uso:
//   node scripts/check-sitemap.mjs
//   SITEMAP_URL=https://misautonomos.es/sitemap.xml node scripts/check-sitemap.mjs
//   node scripts/check-sitemap.mjs --local   (usa el archivo local dist/api/sitemap simulado)
//
// Salida:
//   - exit 0 si todas las URLs responden 200
//   - exit 1 si alguna falla, lista las fallidas
//
// Post-condición estructural adicional (siempre): ninguna URL puede contener
// acentos, comas, guiones colgantes o `http://` — si algo así aparece, salta
// como error de generación.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const args = new Set(process.argv.slice(2));
const SITEMAP_URL = process.env.SITEMAP_URL || 'https://misautonomos.es/sitemap.xml';
const CONCURRENCY = Number(process.env.CHECK_CONCURRENCY || 12);
const TIMEOUT_MS = Number(process.env.CHECK_TIMEOUT_MS || 15_000);

// Cargar .env.local si existe (Node no lo hace solo).
for (const envFile of ['.env.local', '.env']) {
  const p = path.resolve(envFile);
  if (!existsSync(p)) continue;
  for (const line of readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"#]*)"?\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

// Validador de forma canónica.
const HAS_ACCENT = /[À-ÿ]/;
const HAS_HTTP = /http:\/\//;
const HAS_COMMA = /,/;
const TRAILING_DASH = /-(?:\/|$)/;

function structuralViolation(url) {
  if (HAS_ACCENT.test(url)) return 'acentos';
  if (HAS_HTTP.test(url)) return 'http:// no canónico';
  if (HAS_COMMA.test(url)) return 'coma';
  if (TRAILING_DASH.test(url)) return 'guión colgante';
  if (/\s/.test(url)) return 'whitespace';
  return null;
}

// Genera el sitemap en local invocando el handler serverless con un mock
// mínimo de req/res. Se vuelca a dist/sitemap.local.xml para ser inspeccionable
// tras el build sin tener que desplegar.
async function generateLocalSitemap() {
  const mod = await import(path.resolve('api/sitemap.xml.js'));
  const handler = mod.default;
  let statusCode = 200;
  const headers = {};
  let body = '';
  const req = { url: '/api/sitemap.xml', method: 'GET', headers: {} };
  const res = {
    setHeader(k, v) { headers[k] = v; },
    status(code) { statusCode = code; return res; },
    send(b) { body = b; return res; },
    end(b) { if (b) body = b; return res; },
  };
  await handler(req, res);
  if (statusCode !== 200) {
    throw new Error(`local sitemap handler returned ${statusCode}`);
  }
  const outPath = path.resolve('dist/sitemap.local.xml');
  writeFileSync(outPath, body, 'utf8');
  console.log(`[check-sitemap] Sitemap local generado en ${outPath} (${body.length} bytes)`);
  return body;
}

async function fetchSitemapText() {
  if (args.has('--generate') || args.has('--local')) {
    return await generateLocalSitemap();
  }
  const res = await fetch(SITEMAP_URL, { redirect: 'manual' });
  if (res.status !== 200) {
    throw new Error(`sitemap URL respondió ${res.status} (${SITEMAP_URL})`);
  }
  return await res.text();
}

function extractLocs(xml) {
  const out = [];
  const re = /<loc>([^<]+)<\/loc>/g;
  let m;
  while ((m = re.exec(xml)) !== null) {
    // xml-unescape básico
    const url = m[1]
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'");
    out.push(url);
  }
  return out;
}

async function headCheck(url) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      redirect: 'manual',
      signal: ctl.signal,
    });
    return { url, status: res.status };
  } catch (err) {
    return { url, status: 0, error: err.name === 'AbortError' ? 'timeout' : String(err.message || err) };
  } finally {
    clearTimeout(timer);
  }
}

// Cuando corremos --generate localmente, hacer HEAD contra prod es falso-positivo
// (prod aún no tiene el fix). Verificamos en su lugar que cada URL tiene su
// HTML prerenderizado en dist/, que es lo que Vercel servirá tras el deploy.
function localFileCheck(url) {
  const rel = url.replace(/^https:\/\/misautonomos\.es/, '');
  const pathname = rel === '/' ? '/index.html' : `${rel}/index.html`;
  const filePath = path.resolve('dist' + pathname);
  const exists = existsSync(filePath);
  return { url, status: exists ? 200 : 404, error: exists ? undefined : 'no prerender file' };
}

async function pool(items, workers, fn) {
  const results = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: workers }, async () => {
      while (true) {
        const idx = i++;
        if (idx >= items.length) return;
        results[idx] = await fn(items[idx], idx);
      }
    }),
  );
  return results;
}

async function main() {
  console.log(`[check-sitemap] Leyendo ${SITEMAP_URL}`);
  const xml = await fetchSitemapText();
  const urls = extractLocs(xml);
  console.log(`[check-sitemap] ${urls.length} URLs en el sitemap`);

  // 1) Validación estructural (defensa contra regresiones del generador)
  const structural = [];
  for (const u of urls) {
    const reason = structuralViolation(u);
    if (reason) structural.push({ url: u, reason });
  }
  if (structural.length > 0) {
    console.error(`\n❌ ${structural.length} URLs con problema estructural (no llegan a HEAD):`);
    for (const { url, reason } of structural.slice(0, 50)) {
      console.error(`   [${reason}] ${url}`);
    }
    if (structural.length > 50) console.error(`   … y ${structural.length - 50} más`);
    process.exit(1);
  }
  console.log('[check-sitemap] ✔ Validación estructural OK');

  // 2) Verificación de existencia por URL.
  //    --generate/--local: comprobar contra archivos prerender en dist/,
  //    porque prod aún no tiene el fix aplicado (falso positivo).
  //    Modo por defecto (post-deploy): HEAD contra producción.
  const useLocalFiles = args.has('--generate') || args.has('--local');
  const checker = useLocalFiles ? localFileCheck : headCheck;
  const mode = useLocalFiles ? 'archivos dist/' : `HEAD ${SITEMAP_URL.replace('/sitemap.xml', '')}`;
  console.log(`[check-sitemap] Comprobando existencia contra ${mode} (concurrency=${CONCURRENCY})…`);
  const results = useLocalFiles
    ? urls.map(checker)
    : await pool(urls, CONCURRENCY, checker);

  const failed = results.filter((r) => r.status !== 200);
  if (failed.length === 0) {
    console.log(`\n✅ Todas las ${urls.length} URLs responden 200`);
    return;
  }

  console.error(`\n❌ ${failed.length} URLs no devuelven 200:`);
  for (const { url, status, error } of failed) {
    console.error(`   [${status || 'ERR'}]${error ? ` (${error})` : ''} ${url}`);
  }
  process.exit(1);
}

// Entry
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    console.error('[check-sitemap] FAIL', e);
    process.exit(1);
  });
}
