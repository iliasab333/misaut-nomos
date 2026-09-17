// Vercel Serverless Function: sitemap dinámico
// Responde a /api/sitemap.xml. Un redirect en vercel.json reescribe
// /sitemap.xml → /api/sitemap.xml para servirlo desde la raíz.
//
// Cache 6 h en CDN y navegador (sitemap dinámico, pero no caro de regenerar).

import { createClient } from '@supabase/supabase-js';
import { slugify } from '../src/lib/slugify.js';

const SITE = 'https://misautonomos.es';

const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL ||
  'https://dquxsethatxtptfviiwd.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

// Rutas estáticas indexables. (Privadas/admin se excluyen aquí y en robots.txt.)
const STATIC_PATHS = [
  { path: '/', priority: 1.0, changefreq: 'daily' },
  { path: '/buscar', priority: 0.95, changefreq: 'daily' },
  { path: '/preguntas-frecuentes', priority: 0.7, changefreq: 'monthly' },
  { path: '/ayuda', priority: 0.6, changefreq: 'monthly' },
  { path: '/blog', priority: 0.7, changefreq: 'weekly' },
  { path: '/privacidad', priority: 0.3, changefreq: 'yearly' },
  { path: '/terminos', priority: 0.3, changefreq: 'yearly' },
  { path: '/cookies', priority: 0.3, changefreq: 'yearly' },
  { path: '/aviso-legal', priority: 0.3, changefreq: 'yearly' },
  { path: '/para-autonomos', priority: 0.9, changefreq: 'monthly' },
];

function xmlEscape(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function urlEntry({ loc, lastmod, changefreq, priority }) {
  const parts = [
    `  <url>`,
    `    <loc>${xmlEscape(loc)}</loc>`,
    lastmod ? `    <lastmod>${lastmod}</lastmod>` : null,
    changefreq ? `    <changefreq>${changefreq}</changefreq>` : null,
    priority != null ? `    <priority>${priority.toFixed(2)}</priority>` : null,
    `  </url>`,
  ].filter(Boolean);
  return parts.join('\n');
}

// Un perfil solo entra al sitemap si su estado permite indexación pública.
// 'pendiente', 'inactivo' y 'suspendido' se excluyen aunque estén visibles
// por error (defensa en profundidad frente a borrados/incidencias).
const INDEXABLE_STATES = new Set(['activo']);

function isIndexableProfile(p) {
  if (!p) return false;
  if (!p.business_name) return false;
  if (p.visible_en_busqueda !== true) return false;
  if (p.onboarding_completed !== true) return false;
  // estado_perfil puede ser null en registros antiguos → asumir 'activo'.
  if (p.estado_perfil != null && !INDEXABLE_STATES.has(p.estado_perfil)) return false;
  return true;
}

// El slug canónico debe ser exactamente lo que slugify() produce ahora.
// Si el slug_publico en BD estaba sucio (guiones colgantes, acentos), lo
// re-normalizamos aquí para no emitir la variante rota.
function canonicalNameSlug(p) {
  const raw = p.slug_publico || p.business_name || '';
  return slugify(raw);
}

// Sanity check: un <loc> válido solo contiene [a-z0-9/:.-] tras el dominio.
// Nunca debería haber acentos, comas, guiones colgantes ni esquemas mixtos.
const URL_SAFE = /^https:\/\/misautonomos\.es(\/[a-z0-9/-]*)?$/;
function isSafeUrl(loc) {
  if (typeof loc !== 'string') return false;
  if (!URL_SAFE.test(loc)) return false;
  if (loc.includes('//', 8)) return false;      // dobles slash tras dominio
  if (/-\//.test(loc)) return false;            // guión seguido de /
  if (/\/-/.test(loc)) return false;            // / seguido de guión
  if (loc.endsWith('-')) return false;          // guión final
  return true;
}

async function fetchAll(supabase) {
  const out = { profiles: [], categories: [], blog: [] };
  if (!supabase) return out;

  const [profilesRes, categoriesRes, blogRes] = await Promise.all([
    supabase
      .from('professional_profiles')
      .select('slug_publico, business_name, categories, ciudad, updated_date, visible_en_busqueda, onboarding_completed, estado_perfil')
      .eq('visible_en_busqueda', true)
      .eq('onboarding_completed', true)
      .limit(5000),
    supabase
      .from('service_categories')
      .select('name, slug, updated_date')
      .limit(500),
    supabase
      .from('blog_posts')
      .select('slug, updated_date, published')
      .eq('published', true)
      .limit(2000),
  ]);

  if (!profilesRes.error && Array.isArray(profilesRes.data)) {
    out.profiles = profilesRes.data.filter(isIndexableProfile);
  }
  if (!categoriesRes.error && Array.isArray(categoriesRes.data)) out.categories = categoriesRes.data;
  if (!blogRes.error && Array.isArray(blogRes.data)) out.blog = blogRes.data;
  return out;
}

export default async function handler(req, res) {
  let supabase = null;
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
      supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
    } catch (_e) { /* sigue con solo estáticas */ }
  }

  const data = await fetchAll(supabase).catch(() => ({ profiles: [], categories: [], blog: [] }));

  const urls = [];

  // Estáticas
  for (const p of STATIC_PATHS) {
    urls.push(urlEntry({
      loc: `${SITE}${p.path}`,
      changefreq: p.changefreq,
      priority: p.priority,
    }));
  }

  // Categorías: /categoria/:slug
  for (const c of data.categories) {
    const slug = c.slug || slugify(c.name);
    if (!slug) continue;
    urls.push(urlEntry({
      loc: `${SITE}/categoria/${slug}`,
      lastmod: c.updated_date ? new Date(c.updated_date).toISOString().slice(0, 10) : undefined,
      changefreq: 'weekly',
      priority: 0.7,
    }));
  }

  // City × Category con candado de densidad: solo se indexan combinaciones
  // con ≥ MIN_PROS_POR_CIUDAD_CATEGORIA perfiles visibles. Mismo umbral que
  // scripts/prerender.mjs para no generar doorway pages.
  const MIN_PROS = 3;
  const catByName = new Map(data.categories.map((c) => [c.name, c]));
  const buckets = new Map();
  for (const p of data.profiles) {
    const cats = Array.isArray(p.categories) ? p.categories : [];
    const ciudad = (p.ciudad || '').trim();
    if (!ciudad) continue;
    const ciudadSlug = slugify(ciudad);
    for (const catName of cats) {
      const cat = catByName.get(catName);
      if (!cat) continue;
      const catSlug = cat.slug || slugify(cat.name);
      if (!catSlug) continue;
      const key = `${catSlug}::${ciudadSlug}`;
      if (!buckets.has(key)) buckets.set(key, { catSlug, ciudadSlug, count: 0, lastmod: null });
      const b = buckets.get(key);
      b.count++;
      if (p.updated_date && (!b.lastmod || p.updated_date > b.lastmod)) b.lastmod = p.updated_date;
    }
  }
  for (const { catSlug, ciudadSlug, count, lastmod } of buckets.values()) {
    if (count < MIN_PROS) continue;
    urls.push(urlEntry({
      loc: `${SITE}/categoria/${catSlug}/${ciudadSlug}`,
      lastmod: lastmod ? new Date(lastmod).toISOString().slice(0, 10) : undefined,
      changefreq: 'weekly',
      priority: 0.75,
    }));
  }

  // Guías editoriales: 8 páginas con contenido único en el Vallès. Saltan el
  // candado de densidad porque tienen valor por sí mismas (precios locales,
  // FAQ, cómo elegir). Si crece la oferta, conviven con el listing real.
  const EDITORIAL = [
    { catSlug: 'fontanero',         ciudadSlug: 'sabadell' },
    { catSlug: 'fontanero',         ciudadSlug: 'terrassa' },
    { catSlug: 'electricista',      ciudadSlug: 'sabadell' },
    { catSlug: 'electricista',      ciudadSlug: 'terrassa' },
    { catSlug: 'cerrajero',         ciudadSlug: 'sabadell' },
    { catSlug: 'cerrajero',         ciudadSlug: 'terrassa' },
    { catSlug: 'albanil-reformas',  ciudadSlug: 'sabadell' },
    { catSlug: 'albanil-reformas',  ciudadSlug: 'terrassa' },
  ];
  for (const { catSlug, ciudadSlug } of EDITORIAL) {
    urls.push(urlEntry({
      loc: `${SITE}/categoria/${catSlug}/${ciudadSlug}`,
      changefreq: 'weekly',
      priority: 0.8,
    }));
  }

  // Perfiles públicos: /autonomo/:cityCategory/:slug (formato SEO canónico).
  // Cada segmento pasa por slugify() para eliminar acentos, comas y guiones
  // colgantes. La URL final se valida con isSafeUrl() antes de emitirla.
  let profileSkipped = 0;
  for (const p of data.profiles) {
    const nameSlug = canonicalNameSlug(p);
    if (!nameSlug) { profileSkipped++; continue; }
    const cat = Array.isArray(p.categories) ? p.categories[0] : null;
    const ciudad = p.ciudad || '';
    let loc;
    if (cat && ciudad) {
      const catSlug = slugify(cat);
      const ciudadSlug = slugify(ciudad);
      if (!catSlug || !ciudadSlug) { profileSkipped++; continue; }
      loc = `${SITE}/autonomo/${catSlug}-en-${ciudadSlug}/${nameSlug}`;
    } else {
      loc = `${SITE}/autonomo/${nameSlug}`;
    }
    if (!isSafeUrl(loc)) { profileSkipped++; continue; }
    urls.push(urlEntry({
      loc,
      lastmod: p.updated_date ? new Date(p.updated_date).toISOString().slice(0, 10) : undefined,
      changefreq: 'weekly',
      priority: 0.8,
    }));
  }

  // Blog: /blog/:slug
  for (const post of data.blog) {
    if (!post.slug) continue;
    const loc = `${SITE}/blog/${post.slug}`;
    if (!isSafeUrl(loc)) continue;
    urls.push(urlEntry({
      loc,
      lastmod: post.updated_date ? new Date(post.updated_date).toISOString().slice(0, 10) : undefined,
      changefreq: 'monthly',
      priority: 0.6,
    }));
  }

  if (profileSkipped > 0) {
    console.log(`[sitemap] Skipped ${profileSkipped} perfiles con slug/URL no canónica`);
  }

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.join('\n') +
    `\n</urlset>\n`;

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  // CDN: 6 h con stale-while-revalidate generoso para sobrevivir despliegues.
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=21600, stale-while-revalidate=86400');
  res.status(200).send(xml);
}
