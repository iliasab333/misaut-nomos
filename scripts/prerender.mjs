// scripts/prerender.mjs
// Prerender estático post-build: genera dist/<ruta>/index.html para todas las
// rutas SEO con <title>, meta description, canonical, OG, JSON-LD y contenido
// real (H1 + intro + listing snippet) renderizado en HTML, manteniendo el
// bundle SPA para hidratación cliente.
//
// Lee el template dist/index.html (output de vite build), saca datos en vivo
// de Supabase (anon key) y escribe HTMLs derivados.
//
// Tipos de ruta cubiertos:
//   - Estáticas: /, /buscar, /preguntas-frecuentes, /ayuda, /blog,
//     /para-autonomos, /privacidad, /terminos, /cookies, /aviso-legal, /contacto
//   - /categoria/{slug}                       (17 categorías)
//   - /autonomo/{cat-en-ciudad}/{slug}        (profiles con visible_en_busqueda)
//   - /blog/{slug}                            (blog_posts published)
//   - /categoria/{slug}/{ciudad-slug}         (CITY × CATEGORY, candado ≥3)
//
// Candado de densidad: combinaciones ciudad×categoría con < N pros no se
// prerenderizan, para evitar doorway pages. N = MIN_PROS_POR_CIUDAD_CATEGORIA.

import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { slugify } from '../src/lib/slugify.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

// Cargar .env.local si existe (Node no lo hace solo).
// En Vercel las vars vienen ya en process.env, así que este bloque solo
// añade lo que falte sin pisar.
for (const envFile of ['.env.local', '.env']) {
  const p = path.join(ROOT, envFile);
  if (!fs.existsSync(p)) continue;
  for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"#]*)"?\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Configuración
// ──────────────────────────────────────────────────────────────────────────
const SITE = 'https://misautonomos.es';
const SITE_NAME = 'MisAutónomos';
const OG_IMAGE = 'https://misautonomos.es/og-image.png';
const MIN_PROS_POR_CIUDAD_CATEGORIA = 3;

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  'https://dquxsethatxtptfviiwd.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_ANON_KEY) {
  console.error('[prerender] Falta VITE_SUPABASE_ANON_KEY — abort');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ──────────────────────────────────────────────────────────────────────────
// Utils HTML
// ──────────────────────────────────────────────────────────────────────────
const escapeHtml = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));

const stripHtml = (s) => String(s ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

const truncate = (s, n) => {
  const t = stripHtml(s);
  if (t.length <= n) return t;
  return t.slice(0, n - 1).replace(/\s+\S*$/, '') + '…';
};

// Limpia un slug heredado que pueda tener caracteres no-ASCII o guiones colgantes.
// Si el slug normalizado difiere del original, devolvemos ambos para crear 301.
function normalizeSlug(raw) {
  const clean = slugify(raw || '').replace(/-+$/, '').replace(/^-+/, '');
  return { clean, changed: clean !== raw, original: raw };
}

// ──────────────────────────────────────────────────────────────────────────
// Template loader: inserta meta/title/OG/JSON-LD/contenido en el index.html
// ──────────────────────────────────────────────────────────────────────────

function loadTemplate() {
  const tplPath = path.join(DIST, 'index.html');
  if (!fs.existsSync(tplPath)) {
    console.error('[prerender] No existe dist/index.html — ¿ejecutaste vite build?');
    process.exit(1);
  }
  return fs.readFileSync(tplPath, 'utf8');
}

/**
 * Aplica meta SEO + first-paint HTML al template.
 * @param {string} tpl  Template HTML (dist/index.html).
 * @param {object} cfg  Config de la ruta.
 *   {title, description, canonical, image, ogType, jsonLd, h1, intro, listingHtml, noindex}
 */
function renderTemplate(tpl, cfg) {
  let html = tpl;

  const title = cfg.title || `${SITE_NAME}`;
  const desc = cfg.description || 'Encuentra autónomos verificados en España.';
  const canonical = cfg.canonical;
  const image = cfg.image || OG_IMAGE;
  const ogType = cfg.ogType || 'website';

  // <title>
  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(title)}</title>`);

  // <meta name="description">
  html = html.replace(
    /<meta\s+name="description"[^>]*>/i,
    `<meta name="description" content="${escapeHtml(desc)}" />`,
  );

  // <link rel="canonical">
  html = html.replace(
    /<link\s+rel="canonical"[^>]*>/i,
    `<link rel="canonical" href="${escapeHtml(canonical)}" />`,
  );

  // OG / Twitter — sustitución por nombre de property
  const ogPairs = {
    'og:title': title,
    'og:description': desc,
    'og:url': canonical,
    'og:image': image,
    'og:type': ogType,
    'twitter:title': title,
    'twitter:description': desc,
    'twitter:image': image,
  };
  for (const [prop, val] of Object.entries(ogPairs)) {
    const attr = prop.startsWith('twitter:') ? 'name' : 'property';
    const re = new RegExp(`<meta\\s+${attr}="${prop}"[^>]*>`, 'i');
    const tag = `<meta ${attr}="${prop}" content="${escapeHtml(val)}" />`;
    if (re.test(html)) html = html.replace(re, tag);
    else html = html.replace(/<\/head>/, `${tag}\n  </head>`);
  }

  // robots noindex
  if (cfg.noindex) {
    if (/<meta\s+name="robots"/i.test(html)) {
      html = html.replace(
        /<meta\s+name="robots"[^>]*>/i,
        '<meta name="robots" content="noindex,nofollow" />',
      );
    } else {
      html = html.replace(
        /<\/head>/,
        '<meta name="robots" content="noindex,nofollow" />\n  </head>',
      );
    }
  }

  // JSON-LD
  if (cfg.jsonLd) {
    const ld = `<script type="application/ld+json">${JSON.stringify(cfg.jsonLd)}</script>`;
    html = html.replace(/<\/head>/, `${ld}\n  </head>`);
  }

  // Contenido server-rendered dentro de #root: H1 + intro + listing.
  // React (createRoot.render) reemplazará este contenido al hidratar, pero
  // Googlebot y herramientas de IA leen el HTML inicial.
  const initial = [
    cfg.h1 ? `<h1>${escapeHtml(cfg.h1)}</h1>` : '',
    cfg.intro ? `<div data-prerender="intro">${cfg.intro}</div>` : '',
    cfg.listingHtml ? `<div data-prerender="listing">${cfg.listingHtml}</div>` : '',
  ].filter(Boolean).join('\n      ');

  if (initial) {
    // Quitamos el h1 oculto que añadimos antes en index.html (solo home), si
    // existe, y dejamos el contenido propio de la ruta. El estilo "sr-only"
    // lo aplicamos para que no se vea durante el split de hidratación.
    html = html.replace(/<div id="root">[\s\S]*?<\/div>/, () =>
      `<div id="root"><div data-prerender="content" style="position:absolute;left:-9999px;top:0;width:1px;height:1px;overflow:hidden;">
      ${initial}
    </div></div>`,
    );
  }

  return html;
}

function writeRoute(routePath, html) {
  // routePath = '/categoria/abogado' → dist/categoria/abogado/index.html
  // routePath = '/' → dist/index.html
  const rel = routePath === '/' ? 'index.html' : path.join(routePath.replace(/^\//, ''), 'index.html');
  const out = path.join(DIST, rel);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, html, 'utf8');
}

// ──────────────────────────────────────────────────────────────────────────
// Generadores por tipo de ruta
// ──────────────────────────────────────────────────────────────────────────

const STATIC_ROUTES = [
  {
    path: '/',
    title: 'MisAutónomos · Encuentra autónomos verificados en tu zona',
    description: 'Marketplace de autónomos y profesionales verificados en España. Contacto directo, sin comisiones, 100% gratis para clientes.',
    h1: 'Encuentra al autónomo que necesitas cerca de ti',
    intro:
      '<p>MisAutónomos te conecta directamente con autónomos verificados de toda España: electricistas, fontaneros, carpinteros, abogados, gestorías, jardineros, pintores y muchos más. Filtra por servicio y ciudad, compara perfiles con fotos reales, valoraciones verificadas y precios orientativos, y contacta al profesional por chat, WhatsApp o teléfono. Sin intermediarios y sin comisiones por trabajo.</p>',
  },
  {
    path: '/buscar',
    title: 'Buscar autónomos verificados en España | MisAutónomos',
    description: 'Filtra por servicio y zona. Compara perfiles verificados con valoraciones reales y contacta directamente. 100% gratis para clientes.',
    h1: 'Buscar autónomos por servicio y ciudad',
    intro:
      '<p>Directorio de autónomos verificados en toda España. Filtra por categoría (electricista, fontanero, carpintero, abogado…) y por provincia o ciudad. Cada perfil incluye fotos de trabajos reales, valoraciones de clientes que ya le han contactado, zona de cobertura y formas de pago aceptadas.</p>',
  },
  {
    path: '/para-autonomos',
    title: 'Hazte autónomo · Aparece en tu zona sin comisiones | MisAutónomos',
    description: 'Cómo darte de alta como autónomo en MisAutónomos. Identidad verificada, contacto directo con clientes y cero comisiones por trabajo.',
    h1: 'Aparece donde te busca tu cliente. Sin comisiones.',
    intro:
      '<p>MisAutónomos te pone delante de quien necesita tu oficio en tu zona. Validamos DNI/NIE, teléfono y oficio antes de publicar tu perfil. Los clientes te escriben directamente por chat, WhatsApp o teléfono. Sin intermediarios, sin comisiones por trabajo, sin permanencia.</p>',
  },
  {
    path: '/preguntas-frecuentes',
    title: 'Preguntas frecuentes sobre autónomos en España | MisAutónomos',
    description: 'Respuestas a las dudas más comunes sobre la cuota de autónomos, tarifa plana, IVA trimestral, facturación, contratación y uso de la plataforma.',
    h1: 'Preguntas frecuentes',
    intro: '<p>Respuestas claras a las dudas más habituales de autónomos y de clientes que buscan profesionales: cuotas, facturación, contratación, formas de pago y funcionamiento de la plataforma.</p>',
  },
  {
    path: '/ayuda',
    title: 'Centro de ayuda · Soporte | MisAutónomos',
    description: 'Soporte para clientes y autónomos registrados en MisAutónomos. Resolvemos dudas de cuenta, suscripción, perfiles y verificación.',
    h1: 'Centro de ayuda',
    intro: '<p>Si tienes alguna duda con tu cuenta, suscripción, perfil o verificación, en esta sección encontrarás respuestas paso a paso. Si no encuentras lo que buscas, puedes escribirnos.</p>',
  },
  {
    path: '/blog',
    title: 'Blog para autónomos y clientes | MisAutónomos',
    description: 'Guías prácticas, comparativas y artículos sobre alta de autónomos, facturación, contratación de profesionales y vida laboral.',
    h1: 'Blog · MisAutónomos',
    intro: '<p>Artículos prácticos para autónomos (alta, facturación, IVA, presupuestos, cobros, herramientas) y para clientes que buscan contratar profesionales con criterio.</p>',
  },
  {
    path: '/contacto',
    title: 'Contacto | MisAutónomos',
    description: 'Contacta con el equipo de MisAutónomos. Te respondemos por email en menos de 24 h en días laborables.',
    h1: 'Contacto',
    intro: '<p>Si tienes una consulta sobre la plataforma, una propuesta de colaboración o una incidencia, escríbenos y te respondemos en menos de 24 h en días laborables.</p>',
  },
  // Legales — noindex
  { path: '/privacidad', title: 'Política de privacidad | MisAutónomos', description: 'Tratamiento de datos personales en MisAutónomos.', h1: 'Política de privacidad', intro: '<p>Información sobre el tratamiento de tus datos personales, base legal, conservación y derechos del usuario.</p>' },
  { path: '/terminos', title: 'Términos y condiciones | MisAutónomos', description: 'Condiciones de uso de la plataforma MisAutónomos.', h1: 'Términos y condiciones', intro: '<p>Condiciones de uso de la plataforma para clientes y autónomos.</p>' },
  { path: '/cookies', title: 'Política de cookies | MisAutónomos', description: 'Cookies y tecnologías de seguimiento que utiliza MisAutónomos.', h1: 'Política de cookies', intro: '<p>Tipos de cookies que usa la plataforma, finalidades y cómo gestionarlas.</p>' },
  { path: '/aviso-legal', title: 'Aviso legal | MisAutónomos', description: 'Titularidad y datos del responsable del sitio MisAutónomos.', h1: 'Aviso legal', intro: '<p>Datos identificativos del responsable del sitio y información legal preceptiva.</p>' },
];

function buildStatic(tpl, route) {
  const html = renderTemplate(tpl, {
    title: route.title,
    description: route.description,
    canonical: SITE + route.path,
    image: OG_IMAGE,
    h1: route.h1,
    intro: route.intro,
  });
  writeRoute(route.path, html);
}

// Categoría: 120-200 palabras únicas por categoría + listing de profesionales reales
function buildCategoryIntro(cat, prosCount) {
  const baseDesc = (cat.description || '').trim();
  const baseExtra = baseDesc
    ? `<p>${escapeHtml(baseDesc)}</p>`
    : `<p>Encuentra ${cat.name.toLowerCase()} verificados en tu zona, con contacto directo y sin comisiones por trabajo.</p>`;
  const second =
    `<p>En MisAutónomos puedes filtrar perfiles de ${cat.name.toLowerCase()} por provincia y ciudad. Cada autónomo muestra fotos de trabajos reales, valoraciones de clientes que sí han contactado, formas de pago aceptadas y zona de cobertura. Verificamos DNI/NIE, teléfono y oficio antes de publicar el perfil.</p>`;
  const third =
    prosCount > 0
      ? `<p>Actualmente hay ${prosCount} ${prosCount === 1 ? 'profesional disponible' : 'profesionales disponibles'} en la categoría <strong>${escapeHtml(cat.name)}</strong>. Contacta directamente por chat interno, WhatsApp o teléfono — sin intermediarios.</p>`
      : `<p>Próximamente sumaremos más profesionales en la categoría <strong>${escapeHtml(cat.name)}</strong>. Si eres autónomo en este sector, puedes darte de alta gratis y aparecer en las búsquedas de tu zona.</p>`;
  return baseExtra + second + third;
}

function buildCategoryListingHtml(profs) {
  if (!profs.length) return '<p>No hay profesionales publicados en esta categoría todavía.</p>';
  const items = profs.slice(0, 12).map((p) => {
    const slug = (p.slug_publico || slugify(p.business_name || '')).replace(/-+$/, '');
    const url = profileUrl(p);
    return `<li><a href="${escapeHtml(url)}">${escapeHtml(p.business_name || 'Profesional')}</a>${p.ciudad ? ` · ${escapeHtml(p.ciudad)}` : ''}</li>`;
  }).join('\n        ');
  return `<ul>\n        ${items}\n      </ul>`;
}

function profileUrl(p) {
  const cat = Array.isArray(p.categories) ? p.categories[0] : null;
  const nameSlug = (p.slug_publico || slugify(p.business_name || '')).replace(/-+$/, '');
  if (cat && p.ciudad) {
    return `${SITE}/autonomo/${slugify(cat)}-en-${slugify(p.ciudad)}/${nameSlug}`;
  }
  return `${SITE}/autonomo/${nameSlug}`;
}

function buildCategory(tpl, cat, profs) {
  const title = `${cat.name} cerca de ti · Profesionales verificados | ${SITE_NAME}`;
  const description = truncate(
    `${cat.name}: directorio de autónomos verificados en España. ${cat.description || ''} Contacto directo, sin comisiones.`,
    160,
  );
  const canonical = `${SITE}/categoria/${cat.slug}`;
  const intro = buildCategoryIntro(cat, profs.length);
  const listingHtml = buildCategoryListingHtml(profs);

  const html = renderTemplate(tpl, {
    title,
    description,
    canonical,
    image: OG_IMAGE,
    h1: `${cat.name} cerca de ti`,
    intro,
    listingHtml,
  });
  writeRoute(`/categoria/${cat.slug}`, html);
}

function buildCityCategory(tpl, cat, ciudad, ciudadSlug, profs) {
  const title = `${cat.name} en ${ciudad} · Profesionales verificados | ${SITE_NAME}`;
  const description = truncate(
    `${cat.name} en ${ciudad}: ${profs.length} profesionales verificados en tu zona. Contacto directo, sin comisiones.`,
    160,
  );
  const canonical = `${SITE}/categoria/${cat.slug}/${ciudadSlug}`;
  const intro = `
    <p>${escapeHtml(cat.name)} en <strong>${escapeHtml(ciudad)}</strong>. Encuentra autónomos verificados con valoraciones reales y contacto directo, sin intermediarios.</p>
    <p>${escapeHtml(cat.description || `Profesionales de ${cat.name.toLowerCase()} listos para atender tu consulta en ${ciudad} y alrededores.`)}</p>
    <p>Actualmente ${profs.length} ${profs.length === 1 ? 'profesional disponible' : 'profesionales disponibles'} en <strong>${escapeHtml(cat.name)}</strong> dentro de <strong>${escapeHtml(ciudad)}</strong>. Compara perfiles, valoraciones y formas de pago, y contacta al que mejor se ajuste a tu trabajo.</p>
  `;
  const listingHtml = buildCategoryListingHtml(profs);

  const html = renderTemplate(tpl, {
    title,
    description,
    canonical,
    image: OG_IMAGE,
    h1: `${cat.name} en ${ciudad}`,
    intro,
    listingHtml,
  });
  writeRoute(`/categoria/${cat.slug}/${ciudadSlug}`, html);
}

// ──────────────────────────────────────────────────────────────────────────
// GUÍAS EDITORIALES LOCALES (8 páginas con allowlist)
// 4 gremios × 2 ciudades = 8. Contenido EDITORIAL único por combinación,
// NO clonado entre ciudades. Cada página tiene precios orientativos
// locales, cómo elegir, errores comunes y FAQ con FAQPage JSON-LD.
// El candado de densidad ≥ 3 NO aplica para esta allowlist porque la
// página trae valor por sí misma. Si hay pros reales se listan; si no,
// CTA honesto "¿Eres X en Y? Sé el primero".
// ──────────────────────────────────────────────────────────────────────────

const EDITORIAL_GUIDES = [
  // ─────── FONTANERO ───────
  {
    catSlug: 'fontanero',
    ciudad: 'Sabadell',
    ciudadSlug: 'sabadell',
    intro: `
      <p>Buscar <strong>fontanero en Sabadell</strong> suele ser cosa de urgencia: una fuga, un calentador que no enciende, un atasco que se desborda. Esta guía resume qué deberías pagar de verdad por cada tipo de servicio en la zona, cómo distinguir un buen profesional de un timo, y qué preguntar antes de aceptar un presupuesto. Si al final prefieres ir directo, abajo tienes los autónomos verificados que cubren Sabadell y alrededores.</p>
      <h2>Precios orientativos en Sabadell (2026)</h2>
      <ul>
        <li><strong>Hora de trabajo diurna:</strong> 30–45 €/h (entre semana, horario comercial).</li>
        <li><strong>Urgencia 24h / fin de semana:</strong> 60–90 € la salida + hora; desconfía si te piden 150 € solo por desplazarse en horario normal.</li>
        <li><strong>Atasco con máquina de cable:</strong> 80–140 € presupuesto cerrado.</li>
        <li><strong>Sustitución de calentador (gas atmosférico → estanco):</strong> 600–950 € con material y mano de obra; obligatorio boletín del instalador.</li>
        <li><strong>Cambio de grifería completa:</strong> 60–90 € + el grifo.</li>
      </ul>
      <h2>Qué preguntar antes de aceptar</h2>
      <ul>
        <li>¿Presupuesto cerrado o por horas? Para fugas localizadas, exige cerrado.</li>
        <li>¿Factura con IVA desglosado? Si no la dan, no cuela.</li>
        <li>¿El precio incluye desplazamiento? En Sabadell ciudad debería estar incluido.</li>
        <li>Para calentadores: ¿van a tramitar el cambio en la compañía del gas?</li>
      </ul>
      <h2>Errores comunes</h2>
      <p>Aceptar un “presupuesto” verbal por teléfono sin verlo en escrito. Dejar pasar 24 h una fuga pequeña (los daños por humedad multiplican el coste). Llamar al primer número de Google Ads sin comparar — muchas franquicias derivan a comerciales, no a fontaneros locales.</p>
    `,
    faqs: [
      { q: '¿Cuánto cuesta un fontanero en Sabadell?', a: 'Entre 30 y 45 €/hora en horario normal. Una urgencia nocturna o fin de semana sube a 60–90 € por desplazamiento más la hora. Un atasco con máquina suele cerrarse en 80–140 €.' },
      { q: '¿Es obligatorio el boletín del fontanero al cambiar el calentador?', a: 'Sí. Cualquier sustitución de calentador de gas requiere certificado del instalador autorizado y comunicación a la compañía. Si te lo ofrecen sin boletín, no lo aceptes.' },
      { q: '¿Cómo evito el timo de la urgencia?', a: 'Pide presupuesto antes de cualquier intervención. Desconfía si te dan un precio muy bajo por teléfono y luego suben en casa. Llama a un autónomo local antes que a una franquicia 24h con número 900.' },
    ],
  },
  {
    catSlug: 'fontanero',
    ciudad: 'Terrassa',
    ciudadSlug: 'terrassa',
    intro: `
      <p>En Terrassa, el grueso del trabajo de un fontanero es fugas en pisos antiguos del centro y averías de calentadores en zonas residenciales (Can Boada, Sant Pere Nord). Esta guía cubre precios reales 2026, qué pedir siempre y los líos típicos cuando vives en piso de comunidad.</p>
      <h2>Precios orientativos en Terrassa (2026)</h2>
      <ul>
        <li><strong>Hora diurna:</strong> 30–45 €/h.</li>
        <li><strong>Urgencia fuera de horario:</strong> 60–90 € desplazamiento + hora.</li>
        <li><strong>Localización de fuga sin obra:</strong> 90–180 € (con cámara endoscópica).</li>
        <li><strong>Reparación de bajante comunitaria:</strong> ojo, suele ir por cuenta de la comunidad, NO la tuya. Pide siempre que el fontanero confirme el origen antes de pagar.</li>
        <li><strong>Termo eléctrico nuevo (80–100 L) instalado:</strong> 280–450 €.</li>
      </ul>
      <h2>Pisos antiguos del centro: lo que pasa de verdad</h2>
      <p>Mucho edificio anterior a 1970 en el centro de Terrassa lleva plomo o hierro galvanizado. Una reparación puntual puede revelar una instalación entera al borde del colapso. Pide al fontanero que te confirme el material y, si recomienda cambio integral, pide al menos 2 presupuestos antes de decidir.</p>
      <h2>Errores comunes</h2>
      <p>Pagar al fontanero por una avería que era de la comunidad (bajantes generales, tuberías de pared maestra). No avisar al presidente cuando la fuga afecta al vecino de abajo — luego se complica el seguro. Aceptar “material original” sin marca: el latón chino se rompe en 2 años.</p>
    `,
    faqs: [
      { q: '¿La fuga es mía o de la comunidad?', a: 'Si el agua viene de bajantes generales, tuberías comunitarias o conducciones empotradas en paredes maestras del edificio, normalmente es responsabilidad de la comunidad de propietarios. El fontanero debería confirmarlo por escrito.' },
      { q: '¿Cuánto cobra un fontanero en Terrassa por una visita?', a: 'En horario normal, entre 30 y 45 € la hora. Una localización de fuga con cámara va de 90 a 180 € presupuesto cerrado, sin obra incluida.' },
      { q: '¿Qué hago si el fontanero se va sin terminar y no quiere cobrar nada?', a: 'Pide igualmente un albarán firmado con la fecha y los trabajos hechos. Si vuelve a haber fuga en 30 días, tienes que poder demostrar que ya pagó por intervenir antes.' },
    ],
  },

  // ─────── ELECTRICISTA ───────
  {
    catSlug: 'electricista',
    ciudad: 'Sabadell',
    ciudadSlug: 'sabadell',
    intro: `
      <p>Necesitas <strong>electricista en Sabadell</strong>: cambiar el cuadro general, montar puntos de luz nuevos, instalar el cargador del coche eléctrico, o resolver un fallo que va saltando el diferencial. Esta guía resume tarifas reales 2026, cuándo necesitas Boletín y qué pedir siempre.</p>
      <h2>Precios orientativos en Sabadell (2026)</h2>
      <ul>
        <li><strong>Hora suelta:</strong> 30–45 €/h.</li>
        <li><strong>Cambio de diferencial / magnetotérmico:</strong> 50–90 € incluido material.</li>
        <li><strong>Renovación cuadro general (vivienda media):</strong> 350–600 € + Boletín Eléctrico (CIE).</li>
        <li><strong>Punto de luz nuevo con interruptor:</strong> 70–120 €.</li>
        <li><strong>Instalación cargador VE 7,4 kW monofásico:</strong> 700–1.200 € (sin tirar línea desde cuadro lejano).</li>
      </ul>
      <h2>Cuándo necesitas Boletín de Instalación (CIE)</h2>
      <p>Para vivienda con más de 20 años sin reformar al solicitar contrato eléctrico nuevo, para ampliar potencia, o tras renovación del cuadro. En Sabadell lo emite el instalador autorizado (categoría IBT o IBTE) y lo tramita en Endesa o tu comercializadora. El Boletín cuesta 80–120 € aparte de la obra.</p>
      <h2>Qué preguntar antes de aceptar</h2>
      <ul>
        <li>¿Está dado de alta como instalador autorizado (REA)? Sin esa autorización no puede emitir Boletín y la instalación queda ilegal.</li>
        <li>¿El presupuesto incluye papeleo + canon de Boletín?</li>
        <li>Para cargador de VE: ¿necesitamos protección magnetotérmica + diferencial dedicada? (sí — obligatorio por ITC-BT-52).</li>
      </ul>
    `,
    faqs: [
      { q: '¿Cuánto cuesta un electricista en Sabadell?', a: 'En horario normal, 30–45 € la hora. Cambios pequeños (un diferencial, un interruptor) se cierran en 50–90 €. Un cuadro completo en vivienda de tamaño medio: 350–600 € + el Boletín Eléctrico (CIE).' },
      { q: '¿Puedo cambiar yo el diferencial?', a: 'Legalmente sí en tu propia vivienda, pero si la compañía pide un Boletín al instalar contrato o ampliar potencia, ese trabajo solo lo certifica un instalador autorizado. Por seguridad y por papeleo, es mejor encargarlo.' },
      { q: '¿Cuánto cuesta instalar un cargador de coche eléctrico en Sabadell?', a: 'Entre 700 y 1.200 € la instalación estándar de 7,4 kW monofásico, sin tirada larga de cable. Trifásico de 11–22 kW sube de 1.500 € en adelante. Hay subvenciones MOVES III activas — pide al electricista que las tramite.' },
    ],
  },
  {
    catSlug: 'electricista',
    ciudad: 'Terrassa',
    ciudadSlug: 'terrassa',
    intro: `
      <p>En Terrassa, los encargos típicos de un electricista mezclan vivienda antigua del centro (instalaciones de aluminio o sin toma de tierra completa) con vivienda nueva en Sant Pere Nord y Can Anglada con todo a punto. Esta guía cubre precios 2026, cuándo es obligatorio Boletín y cómo no pagar de más por trabajos sencillos.</p>
      <h2>Precios orientativos en Terrassa (2026)</h2>
      <ul>
        <li><strong>Hora diurna:</strong> 30–45 €/h.</li>
        <li><strong>Sustitución de toma de tierra:</strong> 80–150 € si hay arqueta accesible.</li>
        <li><strong>Cuadro nuevo en vivienda 60–90 m²:</strong> 400–700 € + Boletín.</li>
        <li><strong>Instalación punto cocina (vitro + horno):</strong> 90–160 € con cable de 2,5 mm² nuevo.</li>
        <li><strong>Reparación cortocircuito puntual:</strong> 40–90 € cerrado si se identifica en menos de 1 h.</li>
      </ul>
      <h2>Casco antiguo de Terrassa: lo que cuesta de verdad</h2>
      <p>En pisos del Centre o Sant Pere antiguos verás cableado de aluminio (años 80) o sin toma de tierra. Si te piden cambiar el cuadro pero NO el cableado horizontal, en 2 años saltará el diferencial sin parar. Pide siempre al electricista que evalúe el cableado existente con un megóhmetro antes de presupuestar solo el cuadro.</p>
      <h2>Avisa antes de:</h2>
      <ul>
        <li>Ampliar potencia (cambiará el ICP y posiblemente el cuadro).</li>
        <li>Instalar aire acondicionado split (necesita línea dedicada).</li>
        <li>Pasar de gas a inducción (la línea de cocina nueva debe ser 2,5 mm² mínimo, 6 mm² recomendado).</li>
      </ul>
    `,
    faqs: [
      { q: '¿Necesito Boletín si solo cambio el diferencial?', a: 'No para una sustitución puntual de un dispositivo de protección, sí para cambio del cuadro completo o ampliación de potencia. Si tu comercializadora te lo exige al firmar contrato nuevo, es obligatorio independientemente.' },
      { q: '¿Cuánto cuesta cambiar el cuadro eléctrico en Terrassa?', a: 'Una vivienda de 60–90 m² ronda 400–700 € + el CIE (80–120 €). Si el cableado existente está degradado (típico en pisos del centro), añadir cableado nuevo puede duplicar el presupuesto.' },
      { q: '¿Por qué salta el diferencial todo el rato?', a: 'Lo más habitual: un electrodoméstico con fuga a tierra (lavadora vieja, calentador eléctrico), humedad en una caja de conexión o cableado degradado. Un electricista mide derivaciones con multímetro en 30–60 min para identificarlo.' },
    ],
  },

  // ─────── CERRAJERO ───────
  {
    catSlug: 'cerrajero',
    ciudad: 'Sabadell',
    ciudadSlug: 'sabadell',
    intro: `
      <p>El sector de los <strong>cerrajeros en Sabadell</strong> está plagado de empresas-pantalla con número 900 que cobran 300–500 € por una apertura que no debería pasar de 80 €. Esta guía es honesta: tarifas reales, qué desconfiar y cómo elegir bien.</p>
      <h2>Precios orientativos en Sabadell (2026)</h2>
      <ul>
        <li><strong>Apertura de puerta con resbalón (cerrada de golpe, no echada con llave):</strong> 50–80 €.</li>
        <li><strong>Apertura con bombín echado (sin destruir):</strong> 80–150 € si el cerrajero usa técnica de impresión / ganzúa.</li>
        <li><strong>Apertura con bombín echado (destructiva, si no abre limpio):</strong> 90–130 € + bombín nuevo (40–90 €).</li>
        <li><strong>Cambio de bombín antibumping:</strong> 90–180 € puesto.</li>
        <li><strong>Refuerzo puerta blindada / cerradura adicional:</strong> 200–500 € según modelo.</li>
      </ul>
      <h2>Cómo evitar el timo de los falsos cerrajeros</h2>
      <p>El fraude clásico: llamas al número 900 de “cerrajero urgente Sabadell”, viene un operario que dice que “la cerradura tiene seguridad” y que solo puede abrir destrozándola (cobrando 300 €) y vendiéndote otra antibumping (otros 200 €). Cuando un cerrajero LEGÍTIMO siempre te dirá si puede entrar sin romper. Pide:</p>
      <ul>
        <li>Presupuesto cerrado por teléfono ANTES de que venga.</li>
        <li>Factura con su NIF y dirección física (NO una franquicia).</li>
        <li>Que intente apertura NO destructiva primero.</li>
      </ul>
      <h2>Errores comunes</h2>
      <p>Pagar en efectivo sin recibo. Aceptar que “el bombín está roto” sin que te lo enseñen físicamente. Comprar el bombín que te traiga el cerrajero sin saber la marca — exige Tesa o Lince con tarjeta de seguridad si vas a invertir en uno antibumping.</p>
    `,
    faqs: [
      { q: '¿Cuánto cuesta un cerrajero para abrir la puerta en Sabadell?', a: 'Una apertura por puerta cerrada de golpe (sin llave echada) ronda 50–80 €. Con llave echada y técnica no destructiva, 80–150 €. Si te piden más de 200 € “porque tu cerradura es especial”, sospecha.' },
      { q: '¿Cómo distingo un cerrajero legítimo de una franquicia 900?', a: 'Un cerrajero local tiene dirección física en Sabadell, un número fijo o móvil propio (no un 900) y da presupuesto cerrado por teléfono. Si te derivan a un call-center y no pueden confirmar precio, no contrates.' },
      { q: '¿El seguro del hogar cubre la apertura de puerta?', a: 'Si tu póliza incluye “asistencia en cerrajería”, sí — y suele cubrir hasta 80–150 €. Llama antes a tu seguro y pide que ELLOS te manden a uno. Te ahorras la sorpresa de la factura.' },
    ],
  },
  {
    catSlug: 'cerrajero',
    ciudad: 'Terrassa',
    ciudadSlug: 'terrassa',
    intro: `
      <p>Terrassa tiene mucho piso con puerta blindada antigua y cerraduras de 30+ años que se quedan atascadas cuando hace frío. Esta guía cubre lo que cuesta de verdad un <strong>cerrajero en Terrassa</strong> en 2026, qué garantías exigir y cómo evitar los timos clásicos de la urgencia nocturna.</p>
      <h2>Precios orientativos en Terrassa (2026)</h2>
      <ul>
        <li><strong>Apertura simple (puerta cerrada de golpe):</strong> 50–80 €.</li>
        <li><strong>Apertura con llave echada, no destructiva:</strong> 80–150 €.</li>
        <li><strong>Sustitución de bombín estándar:</strong> 60–100 € + bombín (30–80 €).</li>
        <li><strong>Bombín antibumping con tarjeta:</strong> 90–180 € puesto.</li>
        <li><strong>Reparación cerradura embutida (vieja, no abre del todo):</strong> 80–150 €.</li>
        <li><strong>Persianas: cambio de cinta + capuchino:</strong> 50–110 €.</li>
      </ul>
      <h2>Por qué se atasca tu cerradura</h2>
      <p>En pisos antiguos de Terrassa el problema típico es óxido + desgaste del bombín tras décadas + dilatación por humedad invernal. Antes de tirar de cerrajero, prueba lubricante de grafito en polvo (NO aceite — el aceite atrae polvo y empeora). Si sigue duro, hora de cambiarlo. Un bombín antibumping decente cuesta 30–50 € en cualquier ferretería y se cambia en 20 min.</p>
      <h2>Garantías que tienes que exigir</h2>
      <ul>
        <li>Mínimo 12 meses de garantía sobre el trabajo.</li>
        <li>Factura desglosada: mano de obra + material + IVA.</li>
        <li>Si te ponen bombín nuevo: marca, modelo y tarjeta de seguridad incluida (sin tarjeta, no podrás encargar copias en el futuro).</li>
      </ul>
    `,
    faqs: [
      { q: '¿Cuánto cuesta cambiar el bombín en Terrassa?', a: 'Un bombín estándar puesto sale por 60–100 € + el bombín (30–80 €). Un antibumping con tarjeta de seguridad puesto: 90–180 € total.' },
      { q: '¿Es obligatorio cambiar el bombín al mudarse a un piso de alquiler?', a: 'No es obligatorio por ley, pero es altamente recomendable. El propietario y el inquilino anterior pueden tener copias. Si lo haces tú, son 30–80 € de material y 20 min con una llave allen.' },
      { q: '¿Puedo abrir mi propia puerta con una tarjeta o un destornillador?', a: 'Solo si está cerrada de golpe (resbalón, sin llave echada). Si la llave está echada, no — destrozarás el marco. Llama a un cerrajero local antes que forzar.' },
    ],
  },

  // ─────── ALBAÑIL / REFORMAS ───────
  {
    catSlug: 'albanil-reformas',
    ciudad: 'Sabadell',
    ciudadSlug: 'sabadell',
    intro: `
      <p>Reformar piso en Sabadell sube de precio cada año. Esta guía es directa: qué cuesta de verdad cada partida, cómo elegir albañil sin tirar el dinero y qué papeles vas a necesitar en el Ayuntamiento de Sabadell.</p>
      <h2>Precios orientativos para reformas en Sabadell (2026)</h2>
      <ul>
        <li><strong>Reforma integral de baño (5 m²):</strong> 4.500–8.500 € llave en mano (gres, sanitarios estándar, mampara).</li>
        <li><strong>Reforma de cocina (8–12 m²):</strong> 7.500–18.000 € incluyendo muebles de gama media e instalación.</li>
        <li><strong>Pintura integral piso 70 m²:</strong> 1.500–2.500 € a dos manos plástica mate.</li>
        <li><strong>Tirar tabique no portante (con porte de escombros):</strong> 400–800 €.</li>
        <li><strong>Solado nuevo (porcelánico medio, 50 m²):</strong> 2.500–4.500 € incluyendo retirada del antiguo.</li>
      </ul>
      <h2>Licencia de obras en Sabadell: lo que necesitas</h2>
      <p>Para tirar tabiques, mover instalaciones de fontanería o cambiar la distribución, en Sabadell se tramita <strong>comunicación previa de obra menor</strong> (no requiere proyecto técnico para reformas estándar de vivienda). Tasa orientativa: 0,8 % del presupuesto de obra. Para obra mayor (afectar elementos estructurales, cambiar fachada): licencia de obras + proyecto firmado por arquitecto.</p>
      <h2>Cómo elegir albañil sin pillarte los dedos</h2>
      <ul>
        <li>Pide al menos 3 presupuestos por escrito con desglose por partidas (no solo precio total).</li>
        <li>Comprueba que está dado de alta como autónomo (pide NIF + número de la Seguridad Social).</li>
        <li>Exige seguro de responsabilidad civil — si hay un siniestro durante la obra, sin seguro pagas tú.</li>
        <li>Anticipo máximo 30 %. El resto contra entregas parciales (no al final). Nunca el 100 % por adelantado.</li>
      </ul>
      <h2>Errores comunes</h2>
      <p>Aceptar el presupuesto más barato sin desglose (acaba subiendo un 40 % por “extras imprevistos”). Olvidar la licencia (multa de 600–3.000 € si el Ayuntamiento de Sabadell detecta la obra sin tramitar). Pagar sin factura — pierdes la garantía y la deducción del IRPF si aplica.</p>
    `,
    faqs: [
      { q: '¿Cuánto cuesta reformar un baño en Sabadell?', a: 'Un baño estándar de unos 5 m² llave en mano va de 4.500 a 8.500 € en 2026, con calidad media (gres porcelánico, sanitarios marca conocida, mampara estándar). Subir a gama alta puede llegar a 12.000–15.000 €.' },
      { q: '¿Necesito licencia para tirar un tabique?', a: 'Sí, comunicación previa de obra menor en el Ayuntamiento de Sabadell. Es un trámite sencillo (formulario online + tasa) pero obligatorio. Si te lo saltas y te denuncian, multa.' },
      { q: '¿Cuánto se tarda en reformar un piso entero en Sabadell?', a: 'Una reforma integral de piso de 70–90 m² lleva entre 6 y 12 semanas según alcance. Cocina y baño en paralelo: 4–6 semanas. Pinturas + suelo solo: 2–3 semanas.' },
    ],
  },
  {
    catSlug: 'albanil-reformas',
    ciudad: 'Terrassa',
    ciudadSlug: 'terrassa',
    intro: `
      <p>Reformar en Terrassa tiene un par de particularidades: muchas viviendas son antiguas (Centre, Ca n'Aurell) con tabiques de pluet y forjados delicados, y la disponibilidad de albañiles serios baja entre marzo y junio (alta demanda). Esta guía cubre precios reales 2026, cómo no comerte una sorpresa estructural y qué tramitar.</p>
      <h2>Precios orientativos para reformas en Terrassa (2026)</h2>
      <ul>
        <li><strong>Baño completo (4–6 m²):</strong> 4.500–8.500 €.</li>
        <li><strong>Cocina mediana (10 m²) con muebles gama media:</strong> 8.500–16.000 €.</li>
        <li><strong>Reforma integral piso 80 m² (sin estructural):</strong> 25.000–45.000 € llave en mano.</li>
        <li><strong>Pintura completa (70 m²):</strong> 1.500–2.500 €.</li>
        <li><strong>Cambio de ventanas (PVC RPT, 8 ud):</strong> 3.500–6.000 € puestas con retirada de las viejas.</li>
      </ul>
      <h2>Pisos antiguos del centro: lo que descubres al picar</h2>
      <p>En Centre y Ca n'Aurell verás tabiques de pluet (cañizo y yeso) que se desmenuzan al primer golpe, viguetas de madera con humedad, y muchas veces ausencia de cámara de aire. Cuando un albañil te dice “tiramos este tabique y abrimos al salón”, asegúrate de que evalúa:</p>
      <ul>
        <li>Si el tabique es portante (consulta plano del edificio).</li>
        <li>Estado de las viguetas debajo del solado (descubrir un forjado de madera podrida puede sumar 4.000–8.000 €).</li>
        <li>Aislamiento de fachada exterior — la cámara existe o no.</li>
      </ul>
      <h2>Trámites Ayuntamiento de Terrassa</h2>
      <p>Para reformas estándar: <strong>comunicación previa de obra menor</strong> a través de la sede electrónica. Tasa según presupuesto. Si tocas estructura, fachada o cambias huecos en envolvente: licencia de obra mayor + proyecto. Importante: si vives en edificio catalogado del centro, hay restricciones específicas (ventanas, balcones, color de fachada).</p>
      <h2>Recomendaciones honestas</h2>
      <ul>
        <li>No firmes con el primer albañil que te visite si vienes de Idealista — los presupuestos suelen estar inflados un 20 % en marzo–junio.</li>
        <li>Pide ver al menos 1 obra reciente del albañil en Terrassa.</li>
        <li>Reserva un colchón del 15 % del presupuesto para imprevistos (en piso antiguo, casi seguro que aparece algo).</li>
      </ul>
    `,
    faqs: [
      { q: '¿Cuánto cuesta reformar un piso entero de 80 m² en Terrassa?', a: 'Una reforma integral sin tocar estructura va de 25.000 a 45.000 € en 2026, llave en mano con calidades medias. Si hay que tirar tabiques porque están podridos o el suelo es de madera vieja, súmale 5.000–10.000 € fácilmente.' },
      { q: '¿Necesito licencia para cambiar las ventanas?', a: 'En edificios no catalogados, basta con comunicación previa. En edificios catalogados del centro de Terrassa, necesitas autorización urbanística previa porque afecta a fachada — el modelo y color suele estar reglado.' },
      { q: '¿Cuánto tardan en reformar un piso entero en Terrassa?', a: 'Una reforma integral de 80 m² lleva 8–14 semanas. Si hay sorpresas (viguetas, instalaciones a cambiar), suma 2–4 semanas extra. Marca fechas con penalizaciones de 50 €/día por retraso si te interesa.' },
    ],
  },
];

function buildEditorialGuide(tpl, guide, cat, profs) {
  const title = `${cat.name} en ${guide.ciudad} · Precios, cómo elegir y profesionales | ${SITE_NAME}`;
  const description = truncate(
    `Guía honesta de ${cat.name.toLowerCase()} en ${guide.ciudad}: precios reales 2026, cómo elegir profesional, errores comunes y profesionales verificados de tu zona.`,
    160,
  );
  const canonical = `${SITE}/categoria/${cat.slug}/${guide.ciudadSlug}`;

  // FAQPage JSON-LD
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: guide.faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };

  // Listing real o CTA "sé el primero"
  let listingHtml;
  if (profs.length > 0) {
    listingHtml = `
      <h2>${cat.name} verificados en ${escapeHtml(guide.ciudad)}</h2>
      ${buildCategoryListingHtml(profs)}
    `;
  } else {
    listingHtml = `
      <h2>¿Eres ${escapeHtml(cat.name.toLowerCase())} en ${escapeHtml(guide.ciudad)}?</h2>
      <p>Todavía no tenemos profesionales verificados de esta categoría en ${escapeHtml(guide.ciudad)}. <strong>Sé el primero</strong>: crea tu perfil en 10 minutos, identidad verificada y sin comisiones. <a href="/para-autonomos">Hazte autónomo · Gratis →</a></p>
    `;
  }

  // FAQ visible en la página (no solo en JSON-LD)
  const faqHtml = `
    <h2>Preguntas frecuentes</h2>
    <dl>
      ${guide.faqs.map((f) => `<dt><strong>${escapeHtml(f.q)}</strong></dt><dd>${escapeHtml(f.a)}</dd>`).join('\n      ')}
    </dl>
  `;

  const html = renderTemplate(tpl, {
    title,
    description,
    canonical,
    image: OG_IMAGE,
    h1: `${cat.name} en ${guide.ciudad}: guía 2026`,
    intro: guide.intro + faqHtml,
    listingHtml,
    jsonLd: faqJsonLd,
  });
  writeRoute(`/categoria/${cat.slug}/${guide.ciudadSlug}`, html);
}

function buildProfile(tpl, p) {
  const url = profileUrl(p);
  const path = url.replace(SITE, '');
  const title = `${p.business_name}${p.ciudad ? ` en ${p.ciudad}` : ''} | ${SITE_NAME}`;
  const description = truncate(p.descripcion_corta || p.description || `${p.business_name}: autónomo verificado en MisAutónomos.`, 160);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: p.business_name,
    description,
    url,
    address: p.ciudad ? {
      '@type': 'PostalAddress',
      addressLocality: p.ciudad,
      addressRegion: p.provincia || undefined,
      addressCountry: 'ES',
    } : undefined,
  };
  if (Array.isArray(p.categories) && p.categories[0]) {
    jsonLd.knowsAbout = p.categories;
  }
  if (p.total_reviews > 0 && p.average_rating > 0) {
    jsonLd.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: Number(p.average_rating).toFixed(1),
      reviewCount: p.total_reviews,
    };
  }

  const intro = `
    <p>${escapeHtml(description)}</p>
    ${p.ciudad ? `<p><strong>Zona:</strong> ${escapeHtml(p.ciudad)}${p.provincia && p.ciudad !== p.provincia ? `, ${escapeHtml(p.provincia)}` : ''}</p>` : ''}
    ${Array.isArray(p.categories) && p.categories[0] ? `<p><strong>Servicios:</strong> ${p.categories.map((c) => escapeHtml(c)).join(', ')}</p>` : ''}
    ${p.total_reviews > 0 ? `<p><strong>Valoración:</strong> ${Number(p.average_rating).toFixed(1)} / 5 (${p.total_reviews} reseñas)</p>` : ''}
  `;

  const html = renderTemplate(tpl, {
    title,
    description,
    canonical: url,
    image: p.imagen_principal || OG_IMAGE,
    ogType: 'profile',
    jsonLd,
    h1: p.business_name,
    intro,
  });
  writeRoute(path, html);
}

function buildBlogPost(tpl, post) {
  const title = `${post.title_es || 'Artículo'} | ${SITE_NAME} Blog`;
  const description = truncate(post.excerpt_es || post.meta_description_es || '', 160);
  const canonical = `${SITE}/blog/${post.slug}`;
  const intro = `<p>${escapeHtml(description)}</p>`;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title_es,
    description,
    datePublished: post.publish_date || post.updated_date,
    author: { '@type': 'Organization', name: SITE_NAME },
    image: post.featured_image || OG_IMAGE,
    mainEntityOfPage: canonical,
  };
  const html = renderTemplate(tpl, {
    title,
    description,
    canonical,
    image: post.featured_image || OG_IMAGE,
    ogType: 'article',
    jsonLd,
    h1: post.title_es,
    intro,
  });
  writeRoute(`/blog/${post.slug}`, html);
}

function build404(tpl) {
  const html = renderTemplate(tpl, {
    title: 'Página no encontrada (404) | MisAutónomos',
    description: 'La página solicitada no existe en MisAutónomos.',
    canonical: `${SITE}/404`,
    h1: 'Página no encontrada',
    intro: '<p>La URL que has visitado no existe o ha sido movida. Puedes volver a la <a href="/">página principal</a> o <a href="/buscar">buscar autónomos</a>.</p>',
    noindex: true,
  });
  const out = path.join(DIST, '404.html');
  fs.writeFileSync(out, html, 'utf8');
}

// ──────────────────────────────────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────────────────────────────────

async function main() {
  const tpl = loadTemplate();

  console.log('[prerender] Fetching data from Supabase…');
  const [catsRes, profsRes, postsRes] = await Promise.all([
    supabase.from('service_categories').select('slug, name, description').order('name'),
    supabase
      .from('professional_profiles')
      .select('slug_publico, business_name, descripcion_corta, description, ciudad, municipio, provincia, categories, average_rating, total_reviews, imagen_principal, slug_publico_aliases, estado_perfil, onboarding_completed')
      .eq('visible_en_busqueda', true)
      .eq('onboarding_completed', true),
    supabase
      .from('blog_posts')
      .select('slug, title_es, excerpt_es, meta_description_es, publish_date, updated_date, featured_image')
      .eq('status', 'published'),
  ]);

  if (catsRes.error) throw catsRes.error;
  if (profsRes.error) throw profsRes.error;

  const cats = catsRes.data || [];
  // Excluir perfiles no-indexables (inactivo/suspendido/pendiente). estado_perfil
  // null se acepta por compatibilidad con registros antiguos.
  const profs = (profsRes.data || []).filter((p) => {
    if (!p.business_name) return false;
    return p.estado_perfil == null || p.estado_perfil === 'activo';
  });
  const posts = postsRes.error ? [] : (postsRes.data || []);

  console.log(`[prerender] Data: ${cats.length} categorías · ${profs.length} pros visibles · ${posts.length} blog posts`);

  // ── 1) Rutas estáticas
  let staticCount = 0;
  for (const r of STATIC_ROUTES) {
    buildStatic(tpl, r);
    staticCount++;
  }

  // ── 2) Categorías
  // Mapear nombre → slug usando service_categories.slug
  const catByName = new Map(cats.map((c) => [c.name, c]));
  const catBySlug = new Map(cats.map((c) => [c.slug, c]));

  // Profiles por categoría (nombre → array)
  const profsByCatName = new Map();
  for (const p of profs) {
    const list = Array.isArray(p.categories) ? p.categories : [];
    for (const name of list) {
      if (!profsByCatName.has(name)) profsByCatName.set(name, []);
      profsByCatName.get(name).push(p);
    }
  }

  let categoryCount = 0;
  for (const cat of cats) {
    const list = profsByCatName.get(cat.name) || [];
    buildCategory(tpl, cat, list);
    categoryCount++;
  }

  // ── 3) Profiles
  // Slug dirty detection: si el slug original tiene chars no-ASCII o guion final,
  // generamos el archivo con el slug LIMPIO y registramos el alias para 301.
  const slugRedirects = [];
  let profileCount = 0;
  for (const p of profs) {
    if (!p.business_name) continue;
    const rawSlug = p.slug_publico || slugify(p.business_name);
    const cleanSlug = slugify(rawSlug).replace(/-+$/, '');
    if (cleanSlug !== rawSlug) {
      const dirtyUrl = profileUrl({ ...p, slug_publico: rawSlug }).replace(SITE, '');
      const cleanUrl = profileUrl({ ...p, slug_publico: cleanSlug }).replace(SITE, '');
      if (dirtyUrl !== cleanUrl) slugRedirects.push({ from: dirtyUrl, to: cleanUrl });
    }
    buildProfile(tpl, { ...p, slug_publico: cleanSlug });
    profileCount++;
  }

  // ── 4) Blog posts
  let blogCount = 0;
  for (const post of posts) {
    if (!post.slug) continue;
    buildBlogPost(tpl, post);
    blogCount++;
  }

  // ── 5) City × Category con candado de densidad
  // contar (catSlug, ciudadSlug) → array de profiles
  const cityCatBuckets = new Map();
  for (const p of profs) {
    const cats = Array.isArray(p.categories) ? p.categories : [];
    const ciudad = (p.ciudad || '').trim();
    if (!ciudad) continue;
    const ciudadSlug = slugify(ciudad);
    for (const catName of cats) {
      const cat = catByName.get(catName);
      if (!cat) continue;
      const key = `${cat.slug}::${ciudadSlug}`;
      if (!cityCatBuckets.has(key)) {
        cityCatBuckets.set(key, { cat, ciudad, ciudadSlug, profs: [] });
      }
      cityCatBuckets.get(key).profs.push(p);
    }
  }
  let cityCatCount = 0;
  let cityCatSkipped = 0;
  // Allowlist editorial: estas combinaciones tienen guía propia, NO se
  // generan también como city×category genéricas para evitar duplicación.
  const editorialAllowlist = new Set(
    EDITORIAL_GUIDES.map((g) => `${g.catSlug}::${g.ciudadSlug}`),
  );
  for (const { cat, ciudad, ciudadSlug, profs: list } of cityCatBuckets.values()) {
    const key = `${cat.slug}::${ciudadSlug}`;
    if (editorialAllowlist.has(key)) continue; // se construye con buildEditorialGuide
    if (list.length < MIN_PROS_POR_CIUDAD_CATEGORIA) {
      cityCatSkipped++;
      continue;
    }
    buildCityCategory(tpl, cat, ciudad, ciudadSlug, list);
    cityCatCount++;
  }

  // ── 5b) GUÍAS EDITORIALES (allowlist, sortea el candado de densidad)
  let editorialCount = 0;
  for (const guide of EDITORIAL_GUIDES) {
    const cat = catBySlug.get(guide.catSlug);
    if (!cat) {
      console.warn(`[prerender] Guía editorial: categoría '${guide.catSlug}' no existe en BD, salto`);
      continue;
    }
    // Profesionales reales de esta combinación (si los hay)
    const list = (profsByCatName.get(cat.name) || []).filter(
      (p) => p.ciudad && slugify(p.ciudad) === guide.ciudadSlug,
    );
    buildEditorialGuide(tpl, guide, cat, list);
    editorialCount++;
  }

  // ── 6) 404
  build404(tpl);

  // ── 7) Volcar redirecciones de slugs sucios a un JSON que vercel.json
  //       referenciará (lo aplicaremos como redirects 301 en build).
  const redirectsJson = path.join(DIST, 'slug-redirects.json');
  fs.writeFileSync(redirectsJson, JSON.stringify(slugRedirects, null, 2), 'utf8');

  console.log('');
  console.log('═══════════════════ Prerender summary ═══════════════════');
  console.log(`  ✓ Static:            ${staticCount}`);
  console.log(`  ✓ Categories:        ${categoryCount}`);
  console.log(`  ✓ Profiles:          ${profileCount}`);
  console.log(`  ✓ Blog posts:        ${blogCount}`);
  console.log(`  ✓ City × Category:   ${cityCatCount} (skipped ${cityCatSkipped} con < ${MIN_PROS_POR_CIUDAD_CATEGORIA} pros)`);
  console.log(`  ✓ Editorial guides:  ${editorialCount}`);
  console.log(`  ✓ 404 page:          1`);
  console.log(`  ✓ Slug redirects:    ${slugRedirects.length}`);
  console.log('═════════════════════════════════════════════════════════');
  const total = staticCount + categoryCount + profileCount + blogCount + cityCatCount + editorialCount + 1;
  console.log(`  Total HTML files:    ${total}`);
}

main().catch((e) => {
  console.error('[prerender] FAIL', e);
  process.exit(1);
});
