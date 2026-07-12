// scripts/seed-blog-topics.mjs
// Siembra blog_topic_queue con ideas evergreen. Antes de insertar, descarta
// cualquier tema cuyo enfoque ya esté cubierto por un post existente en
// blog_posts (compara por similitud léxica simple).
//
// Uso:
//   SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed-blog-topics.mjs
//   ...con flags:
//     --dry-run    (no escribe, solo loguea)

import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

for (const envFile of ['.env.local', '.env']) {
  const p = path.join(ROOT, envFile);
  if (!fs.existsSync(p)) continue;
  for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"#]*)"?\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('[seed-topics] Falta SUPABASE_SERVICE_ROLE_KEY — abort');
  process.exit(1);
}

const DRY_RUN = process.argv.includes('--dry-run');
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ── Catálogo inicial de temas evergreen ──────────────────────────────────
// Cada uno con angle (enfoque editorial) y categoría compatible con la enum
// de blog_posts.category: autonomos | clientes | legal_fiscal | herramientas | actualidad.
const CANDIDATES = [
  {
    title_hint: 'Cómo conseguir más reseñas siendo autónomo (y por qué multiplican clientes)',
    angle: 'Estrategias prácticas para pedir reseñas (momento, canal, plantillas), gestión de reseñas negativas, e impacto en la decisión de compra del cliente.',
    category: 'autonomos',
    audience: 'autonomos',
    priority: 100,
  },
  {
    title_hint: 'Cómo poner precio a un presupuesto sin perder al cliente',
    angle: 'Diferencia entre precio cerrado y por horas, costes ocultos a incluir, anchoring, comunicación del valor y manejo de objeciones.',
    category: 'autonomos',
    audience: 'autonomos',
    priority: 95,
  },
  {
    title_hint: 'Los errores más comunes al captar clientes por WhatsApp',
    angle: 'Velocidad de respuesta, tono, exceso de información, falta de seguimiento, mezclar lo personal con lo profesional, y cómo profesionalizar el canal.',
    category: 'autonomos',
    audience: 'autonomos',
    priority: 90,
  },
  {
    title_hint: 'Herramientas digitales gratis imprescindibles para autónomos',
    angle: 'Categorías clave (agenda, facturación, presupuestos, almacenamiento, firma electrónica, comunicación) con criterios para elegir, sin recomendar marcas concretas.',
    category: 'herramientas',
    audience: 'autonomos',
    priority: 85,
  },
  {
    title_hint: 'Cómo destacar frente a la competencia en tu zona',
    angle: 'Posicionamiento, especialización vs generalismo, presencia local, gestión de identidad de marca personal del autónomo.',
    category: 'autonomos',
    audience: 'autonomos',
    priority: 80,
  },
  {
    title_hint: 'Cómo evitar la morosidad y asegurarte de cobrar',
    angle: 'Anticipos, condiciones de pago claras, contratos sencillos, seguimiento educado de impagos, y herramientas para reducir el riesgo.',
    category: 'autonomos',
    audience: 'autonomos',
    priority: 75,
  },
  {
    title_hint: 'Cómo tener trabajo todo el año pese a la estacionalidad',
    angle: 'Diversificación de servicios, fidelización, packs de mantenimiento, planificación anticipada de huecos, ofertas de temporada baja.',
    category: 'autonomos',
    audience: 'autonomos',
    priority: 70,
  },
  {
    title_hint: 'Curiosidades: de dónde vienen los oficios (fontanero, electricista, albañil)',
    angle: 'Origen histórico y etimológico de los oficios manuales, evolución hasta hoy, datos curiosos sin inventar estadísticas.',
    category: 'autonomos',
    audience: 'ambos',
    priority: 65,
  },
  {
    title_hint: 'Cómo redactar una ficha profesional que genere confianza',
    angle: 'Estructura ideal (nombre, descripción, servicios, fotos, valoraciones), errores típicos, qué incluir y qué evitar, copy honesto.',
    category: 'autonomos',
    audience: 'autonomos',
    priority: 60,
  },
  {
    title_hint: 'La oportunidad de las reformas y la eficiencia energética para el gremio',
    angle: 'Tendencia general hacia eficiencia (sin citar reformas concretas), perfiles que más demanda generan, cómo formarse y presentarse para ese mercado.',
    category: 'autonomos',
    audience: 'autonomos',
    priority: 55,
  },
];

// ── Detección de cobertura previa por similitud léxica simple ───────────
const STOPWORDS = new Set([
  'de','la','el','los','las','y','o','u','a','en','que','del','con','por','para','un','una','unos','unas',
  'al','lo','si','no','se','sus','su','tu','tus','mi','mis','es','son','ser','estar','este','esta','estos','estas',
  'cómo','como','qué','qué','los','las','más','mas','muy','ya','aún','aun','también','tambien','tras','sin',
  'sobre','entre','hasta','desde','según','segun','así','asi','por','porque','aunque','si','sino','sin','siempre',
  'cuando','dónde','donde','quién','quien','cuál','cual','autónomo','autonomo','autónomos','autonomos','autonóma','autonoma',
  'cliente','clientes','el','la','una','y','que','del','de',
]);

function tokenize(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !STOPWORDS.has(w));
}

function jaccard(a, b) {
  const sa = new Set(a);
  const sb = new Set(b);
  let intersect = 0;
  for (const x of sa) if (sb.has(x)) intersect++;
  const union = sa.size + sb.size - intersect;
  return union === 0 ? 0 : intersect / union;
}

function isCovered(candidate, existingTitles) {
  const tc = tokenize(candidate.title_hint);
  if (tc.length === 0) return false;
  for (const t of existingTitles) {
    const tt = tokenize(t);
    const sim = jaccard(tc, tt);
    if (sim >= 0.4) return { covered: true, by: t, sim };
  }
  return { covered: false };
}

async function main() {
  console.log('[seed-topics] Cargando títulos existentes de blog_posts…');
  const { data: existingPosts, error: e1 } = await supabase
    .from('blog_posts')
    .select('title_es, title_en')
    .limit(500);
  if (e1) throw e1;
  const existingTitles = (existingPosts || []).flatMap((p) => [p.title_es, p.title_en]).filter(Boolean);
  console.log(`[seed-topics] ${existingTitles.length} títulos existentes.`);

  console.log('[seed-topics] Cargando temas existentes en la cola…');
  const { data: existingTopics, error: e2 } = await supabase
    .from('blog_topic_queue')
    .select('title_hint')
    .limit(500);
  if (e2) throw e2;
  const existingHints = new Set((existingTopics || []).map((t) => t.title_hint.toLowerCase()));

  const stats = { inserted: 0, skipped_covered: 0, skipped_in_queue: 0 };
  const toInsert = [];

  for (const c of CANDIDATES) {
    if (existingHints.has(c.title_hint.toLowerCase())) {
      console.log(`  ⏭  ya en cola: "${c.title_hint}"`);
      stats.skipped_in_queue++;
      continue;
    }
    const check = isCovered(c, existingTitles);
    if (check.covered) {
      console.log(`  ⏭  cubierto por post existente (sim=${check.sim.toFixed(2)}): "${c.title_hint}"`);
      console.log(`       similar a: "${check.by}"`);
      stats.skipped_covered++;
      continue;
    }
    console.log(`  ✓  añadir: "${c.title_hint}"`);
    toInsert.push({
      title_hint: c.title_hint,
      angle: c.angle,
      category: c.category,
      audience: c.audience,
      priority: c.priority,
      status: 'nuevo',
    });
  }

  if (DRY_RUN) {
    console.log(`\n[seed-topics] DRY-RUN — sin escribir. Se insertarían ${toInsert.length} temas.`);
    return;
  }

  if (toInsert.length === 0) {
    console.log('\n[seed-topics] No hay temas nuevos que añadir.');
    return;
  }

  const { error: e3 } = await supabase.from('blog_topic_queue').insert(toInsert);
  if (e3) throw e3;
  stats.inserted = toInsert.length;

  console.log('');
  console.log('═══════════════════ Seed-topics summary ═══════════════════');
  console.log(`  Insertados:        ${stats.inserted}`);
  console.log(`  Saltados (en cola): ${stats.skipped_in_queue}`);
  console.log(`  Saltados (cubiertos): ${stats.skipped_covered}`);
  console.log('═══════════════════════════════════════════════════════════');
}

main().catch((e) => {
  console.error('[seed-topics] FAIL', e);
  process.exit(1);
});
