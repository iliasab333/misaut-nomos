// Vercel Serverless Function: sitemap dinámico
// Responde a /api/sitemap.xml. Un redirect en vercel.json reescribe
// /sitemap.xml → /api/sitemap.xml para servirlo desde la raíz.
//
// Cache 6 h en CDN y navegador (sitemap dinámico, pero no caro de regenerar).

import { createClient } from '@supabase/supabase-js';

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
  { path: '/precios', priority: 0.85, changefreq: 'monthly' },
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

function slugify(text) {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
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

async function fetchAll(supabase) {
  const out = { profiles: [], categories: [], blog: [] };
  if (!supabase) return out;

  const [profilesRes, categoriesRes, blogRes] = await Promise.all([
    supabase
      .from('professional_profiles')
      .select('slug_publico, business_name, categories, ciudad, updated_date, visible_en_busqueda, onboarding_completed')
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

  if (!profilesRes.error && Array.isArray(profilesRes.data)) out.profiles = profilesRes.data;
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

  // Perfiles públicos: /autonomo/:cityCategory/:slug (formato SEO canónico)
  for (const p of data.profiles) {
    const nameSlug = p.slug_publico || slugify(p.business_name || '');
    if (!nameSlug) continue;
    const cat = Array.isArray(p.categories) ? p.categories[0] : null;
    const ciudad = p.ciudad || '';
    let loc;
    if (cat && ciudad) {
      loc = `${SITE}/autonomo/${slugify(cat)}-en-${slugify(ciudad)}/${nameSlug}`;
    } else {
      loc = `${SITE}/autonomo/${nameSlug}`;
    }
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
    urls.push(urlEntry({
      loc: `${SITE}/blog/${post.slug}`,
      lastmod: post.updated_date ? new Date(post.updated_date).toISOString().slice(0, 10) : undefined,
      changefreq: 'monthly',
      priority: 0.6,
    }));
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
