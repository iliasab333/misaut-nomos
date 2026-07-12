// Vercel Serverless Function: autoposter semanal del blog.
//
// Disparado por Vercel Cron cada lunes 08:00 UTC (configurado en vercel.json).
// Flujo:
//   1) Auth: comprueba Bearer ${CRON_SECRET} (Vercel lo envía automáticamente
//      a los cron jobs cuando CRON_SECRET está en env).
//   2) Idempotencia: si ya hay un post con tag 'auto' en la semana ISO
//      actual → salir sin hacer nada.
//   3) Coge el siguiente tema de blog_topic_queue (status='nuevo'). Si no
//      hay → avisa al admin y sale.
//   4) Genera el post con Anthropic (claude-sonnet-4-6) con system prompt
//      estricto (evergreen, sin estadísticas inventadas, JSON estricto).
//   5) Valida DURO. Si falla → NO publica, avisa, sale.
//   6) Inserta en blog_posts con status='draft' (por defecto) o 'published'
//      según AUTO_PUBLISH. Marca el tema como 'usado'.
//   7) Si AUTO_PUBLISH=true → dispara VERCEL_DEPLOY_HOOK_URL para regenerar
//      el sitio estático (sin esto, el post no aparece ni entra al sitemap).
//   8) Avisa al admin del resultado con enlace.
//
// Env vars requeridas:
//   ANTHROPIC_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
//   VERCEL_DEPLOY_HOOK_URL, CRON_SECRET (opcional pero recomendado).
// Opcionales:
//   AUTO_PUBLISH (default 'false'),
//   ANTHROPIC_MODEL (default 'claude-sonnet-4-6'),
//   AUTOPOST_AUTHOR_ID (default '690076ad86e673c796768de7').

import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import crypto from 'node:crypto';

const SITE = 'https://misautonomos.es';
const ADMIN_AUTHOR_ID = process.env.AUTOPOST_AUTHOR_ID || '690076ad86e673c796768de7';
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';
const AUTO_PUBLISH = String(process.env.AUTO_PUBLISH || 'false').toLowerCase() === 'true';

// ──────────────────────────────────────────────────────────────────────────
// SYSTEM PROMPT — Estricto, fail-safe, sin inventar
// ──────────────────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `Eres "Equipo MisAutónomos", el editor del blog de https://misautonomos.es, una plataforma donde autónomos españoles crean un perfil verificado y reciben clientes directamente, sin intermediarios.

Tu tarea: redactar un artículo de blog COMPLETO y ÚTIL sobre el tema que te indique el usuario.

REGLAS INVIOLABLES:

1. CONTENIDO EVERGREEN.
   - PROHIBIDO citar noticias de actualidad, eventos recientes, años concretos ("en 2026…"), reformas legales con número, ni fechas específicas.
   - PROHIBIDO citar nombres propios de personas reales, empresas, instituciones, marcas comerciales, plataformas o herramientas concretas (ni para alabarlas ni para criticarlas).
   - PROHIBIDO inventar estadísticas, porcentajes, encuestas, estudios o "datos del INE/Eurostat/etc.".
   - Si quieres dar una idea de magnitud, hazlo SOLO de forma cualitativa ("muchos clientes valoran…", "es habitual que…").

2. RESPECTO DE NORMATIVA:
   - PROHIBIDO citar leyes con número, artículos, real decretos, o reformas concretas. Habla en GENERAL ("la normativa fiscal de autónomos en España…", "las obligaciones de facturación…").

3. ESTILO:
   - Español de España. Tuteo. Voz cercana, práctica, honesta, no comercial.
   - Sin frases vacías ("en el mundo de hoy", "como bien sabes", "no es ningún secreto").
   - Sin mayúsculas sostenidas.
   - Sin promesas de resultados ("conseguirás 10 clientes en 1 mes").

4. LONGITUD: el campo content_es debe tener 700-1100 palabras de contenido real (sin contar tags HTML).

5. ESTRUCTURA HTML del content_es y content_en (idénticas en estructura, traducidas):
   - Envuelto en <article>.
   - Primer elemento: <p class="lead">Resumen de 2-3 frases que enganche.</p>
   - 3-5 secciones con <h2> seguidos de uno o dos <p> y, cuando aplique, una <ul><li>...</li></ul>.
   - NO uses <h1> (el H1 lo renderiza la página del post).
   - Sección final tipo "Cómo te ayuda MisAutónomos" cerrando con CTA exacto:
       <p><a href="/registro">Crea tu perfil gratis</a></p>

6. EXCERPT: 150-200 caracteres, sin emojis, frase completa.

7. METAS:
   - meta_title_es / meta_title_en: 55-65 caracteres.
   - meta_description_es / meta_description_en: 140-160 caracteres.

8. TAGS: 3-6 etiquetas en español, minúscula, sin tildes ni espacios (usa guion).

9. SLUG: kebab-case ASCII, 3-7 palabras, sin tildes, sin guion final, sin "el", "la", "los", "y", "para", "como" si puede evitarse.

10. SALIDA — y esto es lo más importante: devuelves SOLO un JSON ESTRICTO con esta forma EXACTA, sin texto antes, sin texto después, sin backticks markdown, sin comentarios:

{
  "title_es": "string",
  "title_en": "string",
  "slug": "string",
  "excerpt_es": "string",
  "excerpt_en": "string",
  "meta_title_es": "string",
  "meta_title_en": "string",
  "meta_description_es": "string",
  "meta_description_en": "string",
  "tags": ["string", "..."],
  "content_es": "string con HTML completo del <article>",
  "content_en": "string con HTML completo del <article>"
}`;

// ──────────────────────────────────────────────────────────────────────────
// Handler principal
// ──────────────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  // 1) Auth Bearer (Vercel Cron envía Authorization: Bearer ${CRON_SECRET})
  const expected = process.env.CRON_SECRET;
  if (expected) {
    const auth = req.headers?.authorization || '';
    if (auth !== `Bearer ${expected}`) {
      return res.status(401).json({ error: 'unauthorized' });
    }
  }

  try {
    const result = await runCron();
    return res.status(200).json(result);
  } catch (e) {
    console.error('[weekly-post] FAIL', e);
    await notifyAdmin('high', '❌ Autoposter ha fallado', `<p>El cron del blog ha tirado una excepción no controlada:</p><pre>${escapeHtml(String(e?.stack || e?.message || e))}</pre>`).catch(() => {});
    return res.status(500).json({ error: 'internal', message: String(e?.message || e) });
  }
}

async function runCron() {
  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase env vars missing (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)');
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 2) Idempotencia — ¿ya hay post auto esta semana ISO?
  const { yearWeek, weekStart, weekEnd } = currentIsoWeek();
  const { data: existingThisWeek, error: e1 } = await supabase
    .from('blog_posts')
    .select('id, slug, title_es, publish_date, tags, status')
    .gte('publish_date', weekStart.toISOString())
    .lte('publish_date', weekEnd.toISOString())
    .contains('tags', ['auto'])
    .limit(1);
  if (e1) throw e1;
  if (existingThisWeek && existingThisWeek.length > 0) {
    const ex = existingThisWeek[0];
    console.log(`[weekly-post] Ya hay post auto en semana ${yearWeek}: ${ex.slug}`);
    return { skipped: 'already_posted_this_week', week: yearWeek, post: { id: ex.id, slug: ex.slug } };
  }

  // 3) Siguiente tema de la cola
  const { data: topics, error: e2 } = await supabase
    .from('blog_topic_queue')
    .select('id, title_hint, angle, category, audience, priority')
    .eq('status', 'nuevo')
    .order('priority', { ascending: false })
    .order('created_date', { ascending: true })
    .limit(1);
  if (e2) throw e2;
  if (!topics || topics.length === 0) {
    await notifyAdmin('medium', '⚠️ Cola de blog vacía', `<p>El autoposter semanal no ha encontrado temas con <code>status='nuevo'</code> en <code>blog_topic_queue</code>. Añade temas con <code>node scripts/seed-blog-topics.mjs</code> o desde el admin.</p>`);
    return { skipped: 'empty_queue', week: yearWeek };
  }
  const topic = topics[0];
  console.log(`[weekly-post] Tema: "${topic.title_hint}"`);

  // 4) Generar post con Anthropic
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const userPrompt = buildUserPrompt(topic);

  let parsed = null;
  let lastError = null;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      console.log(`[weekly-post] Llamando Anthropic (intento ${attempt})…`);
      const resp = await Promise.race([
        anthropic.messages.create({
          model: ANTHROPIC_MODEL,
          max_tokens: 8000,
          temperature: 0.7,
          system: SYSTEM_PROMPT,
          messages: [
            { role: 'user', content: userPrompt + (attempt > 1 ? '\n\nNOTA: el intento anterior no pasó las validaciones. Asegúrate de devolver SOLO el JSON, con content_es y content_en envueltos en <article>, > 500 palabras reales, y sin texto fuera del JSON.' : '') },
          ],
        }),
        timeoutAfter(50_000, 'anthropic_timeout'),
      ]);

      const text = (resp?.content || []).find((b) => b.type === 'text')?.text || '';
      parsed = extractJson(text);
      if (!parsed) {
        lastError = `no_json_in_response (snippet: ${text.slice(0, 200)})`;
        console.warn(`[weekly-post] intento ${attempt}: no se pudo extraer JSON`);
        continue;
      }
      const v = validatePost(parsed);
      if (!v.ok) {
        lastError = `validation_failed: ${v.reason}`;
        console.warn(`[weekly-post] intento ${attempt}: ${v.reason}`);
        parsed = null;
        continue;
      }
      break;
    } catch (e) {
      lastError = e?.message || String(e);
      console.warn(`[weekly-post] intento ${attempt} error: ${lastError}`);
    }
  }

  if (!parsed) {
    await notifyAdmin('high', '❌ Autoposter: contenido inválido', `<p>El modelo no pudo generar un post válido en 2 intentos.</p><p><strong>Tema:</strong> ${escapeHtml(topic.title_hint)}</p><p><strong>Último error:</strong> ${escapeHtml(lastError || 'unknown')}</p><p>No se ha publicado nada. La cola NO se ha modificado, así que el tema seguirá disponible para el próximo run.</p>`);
    return { skipped: 'generation_failed', error: lastError, topic_id: topic.id };
  }

  // 5) Slug único en blog_posts
  const finalSlug = await ensureUniqueSlug(supabase, parsed.slug);

  // 6) Inserción
  const wordCount = countWords(parsed.content_es);
  const readTime = Math.max(3, Math.round(wordCount / 200));
  const id = genId();
  const now = new Date().toISOString();
  const status = AUTO_PUBLISH ? 'published' : 'draft';

  const insertPayload = {
    id,
    status,
    category: topic.category,
    author_name: 'Equipo MisAutónomos',
    slug: finalSlug,
    read_time_minutes: readTime,
    publish_date: now,
    created_date: now,
    updated_date: now,
    created_by_id: ADMIN_AUTHOR_ID,
    title_es: parsed.title_es,
    title_en: parsed.title_en,
    excerpt_es: parsed.excerpt_es,
    excerpt_en: parsed.excerpt_en,
    meta_title_es: parsed.meta_title_es,
    meta_title_en: parsed.meta_title_en,
    meta_description_es: parsed.meta_description_es,
    meta_description_en: parsed.meta_description_en,
    tags: [...new Set([...(parsed.tags || []).map(String), 'auto'])],
    content_es: parsed.content_es,
    content_en: parsed.content_en,
  };

  const { error: e3 } = await supabase.from('blog_posts').insert(insertPayload);
  if (e3) throw e3;

  // Marca el tema como usado
  await supabase
    .from('blog_topic_queue')
    .update({ status: 'usado', used_at: now, used_post_id: id })
    .eq('id', topic.id);

  // 7) Si publicado → trigger Vercel Deploy Hook para regenerar prerender + sitemap
  let deployHookResult = null;
  if (AUTO_PUBLISH) {
    const hookUrl = process.env.VERCEL_DEPLOY_HOOK_URL;
    if (hookUrl) {
      try {
        const r = await fetch(hookUrl, { method: 'POST' });
        deployHookResult = { ok: r.ok, status: r.status };
        console.log(`[weekly-post] Deploy hook: ${r.status}`);
      } catch (e) {
        deployHookResult = { ok: false, error: String(e?.message || e) };
        console.warn('[weekly-post] Deploy hook failed:', e?.message);
      }
    } else {
      console.warn('[weekly-post] AUTO_PUBLISH=true pero VERCEL_DEPLOY_HOOK_URL no configurado');
      deployHookResult = { skipped: 'no_hook_url' };
    }
  }

  // 8) Notifica al admin
  const url = AUTO_PUBLISH ? `${SITE}/blog/${finalSlug}` : `${SITE}/admin/blog`;
  const heading = AUTO_PUBLISH ? '🚀 Post publicado automáticamente' : '📝 Borrador de post pendiente de revisar';
  const stateNote = AUTO_PUBLISH
    ? `<p>Estado: <strong>publicado</strong>. ${deployHookResult?.ok ? 'Rebuild de Vercel disparado, en unos minutos aparecerá en el sitio y en el sitemap.' : 'Sin embargo, no se ha podido disparar el Deploy Hook — revisa.'}</p>`
    : `<p>Estado: <strong>borrador</strong>. Revísalo en el admin y publícalo manualmente si está bien. Tras publicar, recuerda redespliegar para que aparezca en el sitio prerenderizado.</p>`;

  await notifyAdmin('low', heading, `
    ${stateNote}
    <p><strong>Tema (cola):</strong> ${escapeHtml(topic.title_hint)}</p>
    <p><strong>Título:</strong> ${escapeHtml(parsed.title_es)}</p>
    <p><strong>Slug:</strong> <code>${escapeHtml(finalSlug)}</code></p>
    <p><strong>Palabras:</strong> ${wordCount} (~${readTime} min lectura)</p>
    <p><strong>Categoría:</strong> ${escapeHtml(topic.category)}</p>
    <p><strong>Tags:</strong> ${(parsed.tags || []).map(escapeHtml).join(', ')}</p>
    <p><a href="${url}">Abrir</a></p>
  `);

  return {
    ok: true,
    status,
    post_id: id,
    slug: finalSlug,
    title: parsed.title_es,
    word_count: wordCount,
    deploy_hook: deployHookResult,
  };
}

// ──────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────

function buildUserPrompt(topic) {
  return `Tema a desarrollar:

- Idea: ${topic.title_hint}
- Ángulo: ${topic.angle || '(libre)'}
- Categoría: ${topic.category}
- Audiencia: ${topic.audience || 'autonomos'}

Redacta el artículo completo cumpliendo TODAS las reglas del system prompt. Devuelve SOLO el JSON estricto, sin texto fuera ni backticks.`;
}

function extractJson(text) {
  if (!text) return null;
  // Quita posibles backticks/fences que el modelo a veces añade.
  let t = text.trim();
  if (t.startsWith('```')) {
    t = t.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
  }
  // Si hay texto antes del primer '{', recorta.
  const firstBrace = t.indexOf('{');
  if (firstBrace > 0) t = t.slice(firstBrace);
  // Si hay texto después del último '}', recorta.
  const lastBrace = t.lastIndexOf('}');
  if (lastBrace !== -1 && lastBrace < t.length - 1) t = t.slice(0, lastBrace + 1);
  try { return JSON.parse(t); } catch { return null; }
}

function validatePost(p) {
  if (!p || typeof p !== 'object') return { ok: false, reason: 'not_object' };
  const required = ['title_es','title_en','slug','excerpt_es','excerpt_en','meta_title_es','meta_title_en','meta_description_es','meta_description_en','tags','content_es','content_en'];
  for (const k of required) {
    if (p[k] == null || (typeof p[k] === 'string' && !p[k].trim())) {
      return { ok: false, reason: `missing_or_empty:${k}` };
    }
  }
  if (!Array.isArray(p.tags) || p.tags.length === 0) return { ok: false, reason: 'tags_not_array' };

  // Slug kebab-case ASCII
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(p.slug)) return { ok: false, reason: `slug_format:${p.slug}` };

  // content_es validations
  const ce = String(p.content_es);
  if (!/<article[\s>]/i.test(ce) || !/<\/article>/i.test(ce)) return { ok: false, reason: 'no_article_tag' };
  const wc = countWords(ce);
  if (wc < 500) return { ok: false, reason: `too_few_words:${wc}` };
  // No placeholders
  const banned = /lorem ipsum|TODO|\{\{|\[PLACEHOLDER\]|<!--\s*TODO|^Eres ".*MisAutónomos|REGLAS INVIOLABLES/i;
  if (banned.test(ce)) return { ok: false, reason: 'placeholder_or_systemprompt_leak' };
  // CTA al final
  if (!/href="\/registro"/i.test(ce)) return { ok: false, reason: 'missing_registro_cta' };
  // Etiquetas básicas balanceadas (counts simples)
  if (!balancedTags(ce)) return { ok: false, reason: 'html_unbalanced' };

  // content_en también debe tener article y >300 palabras (más laxo en EN)
  const cen = String(p.content_en);
  if (!/<article[\s>]/i.test(cen) || !/<\/article>/i.test(cen)) return { ok: false, reason: 'no_article_tag_en' };
  if (countWords(cen) < 300) return { ok: false, reason: 'too_few_words_en' };

  return { ok: true };
}

function balancedTags(html) {
  const opens = (html.match(/<(\w+)(?:\s[^>]*)?>/g) || []).map((m) => m.match(/<(\w+)/)[1].toLowerCase());
  const closes = (html.match(/<\/(\w+)>/g) || []).map((m) => m.match(/<\/(\w+)/)[1].toLowerCase());
  const voids = new Set(['br','hr','img','input','meta','link','source','track','wbr','area','base','col','embed','param']);
  const opensFiltered = opens.filter((t) => !voids.has(t));
  const counts = {};
  for (const t of opensFiltered) counts[t] = (counts[t] || 0) + 1;
  for (const t of closes) counts[t] = (counts[t] || 0) - 1;
  // Tolera diferencias < 2 para tags pequeños mal escritos por el modelo (raro).
  return Object.values(counts).every((n) => Math.abs(n) <= 1);
}

function countWords(html) {
  const text = String(html).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (!text) return 0;
  return text.split(/\s+/).length;
}

async function ensureUniqueSlug(supabase, slug) {
  let candidate = slug;
  for (let i = 0; i < 5; i++) {
    const { data, error } = await supabase
      .from('blog_posts')
      .select('id')
      .eq('slug', candidate)
      .limit(1);
    if (error) throw error;
    if (!data || data.length === 0) return candidate;
    const suf = crypto.randomBytes(2).toString('hex');
    candidate = `${slug}-${suf}`;
  }
  return candidate;
}

function genId() {
  const ts = Math.floor(Date.now() / 1000).toString(16).padStart(8, '0');
  const rand = crypto.randomBytes(8).toString('hex');
  return (ts + rand).slice(0, 24);
}

function currentIsoWeek() {
  const d = new Date();
  // ISO week: lunes-domingo. weekStart = lunes 00:00:00 UTC, weekEnd = domingo 23:59:59.999 UTC
  const day = d.getUTCDay();
  const diffToMon = (day + 6) % 7; // 0=Sun → 6, 1=Mon → 0
  const weekStart = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - diffToMon, 0, 0, 0, 0));
  const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
  // Year-week label (sencillo)
  const oneJan = new Date(Date.UTC(weekStart.getUTCFullYear(), 0, 1));
  const dayOfYear = Math.floor((weekStart - oneJan) / 86400000);
  const weekNum = Math.ceil((dayOfYear + oneJan.getUTCDay() + 1) / 7);
  const yearWeek = `${weekStart.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
  return { yearWeek, weekStart, weekEnd };
}

function timeoutAfter(ms, reason) {
  return new Promise((_, reject) => setTimeout(() => reject(new Error(reason)), ms));
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

async function notifyAdmin(severity, title, bodyHtml) {
  try {
    await fetch(`${SITE}/api/notify-admin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'blog_autoposter', title, body: bodyHtml, severity }),
    });
  } catch (e) {
    console.warn('[weekly-post] notifyAdmin error:', e?.message);
  }
}
