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
  // AÑADIDO: el handler pone `X-Sitemap-Errores` cuando una de sus tres
  // consultas ha fallado. Antes no existía esa cabecera y una consulta rota
  // producía un sitemap válido al que le faltaba un tipo entero de URL — que
  // es exactamente lo que pasó con los 25 artículos del blog. Un sitemap al
  // que le falta una clase de página no es un sitemap «casi bien»: es una
  // promesa falsa a Google, y se tiene que caer aquí.
  if (headers['X-Sitemap-Errores']) {
    throw new Error(`el generador de sitemap ha fallado al leer la base: ${headers['X-Sitemap-Errores']}`);
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

// Verifica que www.misautonomos.es hace 3xx a la variante apex.
// Si se salta y devuelve 200, Google elegirá canónicas divergentes.
// Solo se ejecuta en modo remoto (post-deploy) o si CHECK_WWW=1.
async function checkWwwRedirect() {
  const target = 'https://www.misautonomos.es/';
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(target, { method: 'GET', redirect: 'manual', signal: ctl.signal });
    const location = res.headers.get('location') || '';
    if (res.status < 300 || res.status >= 400) {
      console.error(`\n❌ www.misautonomos.es devolvió ${res.status} (esperaba 3xx).`);
      console.error(`   Google marcará el subdominio www como URL alternativa y podría`);
      console.error(`   elegir canónicas divergentes. Revisa vercel.json o el dominio en Vercel.`);
      return false;
    }
    if (!/^https:\/\/misautonomos\.es\/?/.test(location)) {
      console.error(`\n❌ www redirige a Location="${location}" — se esperaba https://misautonomos.es/`);
      return false;
    }
    console.log(`[check-sitemap] ✔ www.misautonomos.es → ${res.status} → ${location}`);
    return true;
  } catch (err) {
    console.error(`\n❌ Fallo al comprobar www: ${err.name === 'AbortError' ? 'timeout' : err.message || err}`);
    return false;
  } finally {
    clearTimeout(timer);
  }
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

  // 1 bis) COMPLETITUD — la comprobación que faltaba, y la que habría cazado
  // lo del blog.
  //
  // Los pasos 1 y 2 sólo saben mirar las URLs que ESTÁN en el sitemap: validan
  // su forma y comprueban que respondan 200. Un sitemap al que le falta un
  // tipo entero de página pasa los dos con sobresaliente — las 90 URLs que
  // había respondían 200 y tenían forma correcta. Lo que nadie comprobaba era
  // si faltaba alguna.
  //
  // Esto cuenta en la base lo que debería estar y lo compara con lo que hay.
  // No exige igualdad exacta: un perfil puede quedar fuera por slug no
  // canónico y eso es correcto. Exige que ninguna clase esté VACÍA teniendo
  // filas en la base, y avisa cuando falta más de la cuarta parte.
  const conteo = {
    '/autonomo/': urls.filter((u) => u.includes('/autonomo/')).length,
    '/categoria/': urls.filter((u) => u.includes('/categoria/')).length,
    '/blog/': urls.filter((u) => /\/blog\/[^/]+$/.test(u)).length,
  };
  console.log(`[check-sitemap] por clase: ${Object.entries(conteo).map(([k, v]) => `${k} ${v}`).join(' · ')}`);

  const SB_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const SB_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (!SB_URL || !SB_KEY) {
    console.warn('[check-sitemap] ⚠ sin claves de Supabase: NO se ha comprobado la completitud.');
    console.warn('[check-sitemap]   Un tipo de página que falte entero pasaría sin que nadie lo vea.');
  } else {
    const cuenta = async (tabla, filtro) => {
      const res = await fetch(`${SB_URL}/rest/v1/${tabla}?select=id&limit=1${filtro ? `&${filtro}` : ''}`, {
        headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, Prefer: 'count=exact' },
      });
      if (!res.ok) return null;
      const rango = res.headers.get('content-range') || '';
      const n = Number(rango.split('/')[1]);
      return Number.isFinite(n) ? n : null;
    };
    const esperado = {
      '/autonomo/': await cuenta('professional_profiles', 'visible_en_busqueda=eq.true&onboarding_completed=eq.true'),
      '/categoria/': await cuenta('service_categories'),
      '/blog/': await cuenta('blog_posts', 'status=eq.published'),
    };
    const huecos = [];
    for (const clase of Object.keys(conteo)) {
      const hay = conteo[clase];
      const debe = esperado[clase];
      if (debe === null || debe === undefined) {
        console.warn(`[check-sitemap] ⚠ ${clase}: no se ha podido contar en la base`);
        continue;
      }
      if (debe > 0 && hay === 0) {
        huecos.push(`${clase}: la base tiene ${debe} y el sitemap NINGUNA`);
      } else if (debe > 0 && hay < debe * 0.75) {
        huecos.push(`${clase}: la base tiene ${debe} y el sitemap sólo ${hay}`);
      } else {
        console.log(`[check-sitemap] ✔ ${clase} ${hay}/${debe}`);
      }
    }
    if (huecos.length > 0) {
      console.error('\n❌ El sitemap está INCOMPLETO. Falta un tipo de página entero o casi:');
      for (const h of huecos) console.error(`   ${h}`);
      console.error('\n   Esto no se ve en los otros dos pasos: las URLs que sí están responden 200.');
      console.error('   Mira los logs del generador — una consulta que falla deja su clase vacía.');
      process.exit(1);
    }
    console.log('[check-sitemap] ✔ Completitud OK: ninguna clase de página falta');
  }

  // 1 ter) ¿LAS RENDERIZA ALGUIEN?
  //
  // Los pasos anteriores comprueban que la URL responda 200 y que no falte
  // ninguna clase de página. Ninguno de los dos ve el fallo que se encontró el
  // 2026-10-08 en las 8 guías locales, que es de otra especie:
  //
  //     servidor → 200 con la página entera, prerenderizada
  //     React hidrata → no encuentra ruta → pinta «404 Page Not Found»
  //
  // Google veía una página buena y la persona un 404. Un `curl` no lo nota
  // —el HTML es correcto— y el navegador sí. Ocho páginas con prioridad 0.8,
  // las de más intención de compra del sitio, perdidas sin un solo error.
  //
  // No hace falta un navegador para cazarlo: basta cruzar lo que el sitemap
  // PUBLICA con lo que el router de React sabe PINTAR. Se leen los
  // `<Route path="…">` de App.jsx y se comprueba que cada URL del sitemap
  // encaje en alguno. El comodín `path="*"` se excluye a propósito: es
  // justamente el que pinta el 404.
  {
    const appJsx = readFileSync(path.resolve('src/App.jsx'), 'utf8');
    const rutas = [...appJsx.matchAll(/<Route\s+path="([^"]+)"/g)]
      .map((m) => m[1])
      .filter((r) => r !== '*' && r !== '/*');
    if (rutas.length === 0) {
      console.warn('[check-sitemap] ⚠ no se ha podido leer ninguna ruta de App.jsx; salto esta comprobación');
    } else {
      const matchers = rutas.map((r) => {
        const re = r
          .replace(/[.+?^${}()|[\]\\]/g, '\\$&')  // literales
          .replace(/:[A-Za-z0-9_]+/g, '[^/]+')      // :slug
          .replace(/\*/g, '.*');
        return { ruta: r, re: new RegExp(`^${re}/?$`) };
      });
      const huerfanas = [];
      for (const u of urls) {
        let ruta;
        try { ruta = decodeURIComponent(new URL(u).pathname); } catch { continue; }
        if (!matchers.some((m) => m.re.test(ruta))) huerfanas.push(ruta);
      }
      if (huerfanas.length > 0) {
        console.error(`\n❌ ${huerfanas.length} URLs del sitemap que NINGUNA ruta de React pinta:`);
        for (const h of huerfanas.slice(0, 30)) console.error(`   ${h}`);
        if (huerfanas.length > 30) console.error(`   … y ${huerfanas.length - 30} más`);
        console.error('\n   Responden 200 porque están prerenderizadas, pero en cuanto carga el');
        console.error('   JavaScript la persona ve el 404. Falta un <Route> en src/App.jsx,');
        console.error('   o el sitemap está publicando una forma de URL que la app no usa.');
        process.exit(1);
      }
      console.log(`[check-sitemap] ✔ las ${urls.length} URLs encajan en alguna de las ${rutas.length} rutas de React`);
    }
  }

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
  if (failed.length > 0) {
    console.error(`\n❌ ${failed.length} URLs no devuelven 200:`);
    for (const { url, status, error } of failed) {
      console.error(`   [${status || 'ERR'}]${error ? ` (${error})` : ''} ${url}`);
    }
    process.exit(1);
  }
  console.log(`\n✅ Todas las ${urls.length} URLs responden 200`);

  // 3) Check www → apex. Solo en modo remoto (o forzado con CHECK_WWW=1),
  //    porque local files no puede simular el redirect de host.
  const shouldCheckWww = !useLocalFiles || process.env.CHECK_WWW === '1';
  if (shouldCheckWww) {
    const ok = await checkWwwRedirect();
    if (!ok) process.exit(1);
  } else {
    console.log('[check-sitemap] (skip check www en modo local — usa CHECK_WWW=1 para forzar)');
  }
}

// Entry
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    console.error('[check-sitemap] FAIL', e);
    process.exit(1);
  });
}
