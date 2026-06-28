// scripts/seed-leads.mjs
// Pipeline de descubrimiento de leads: Google Places API (New) → outbound_leads.
//
// REGLA DURA: los datos de Places SOLO se usan como leads internos para outreach.
// NUNCA se publican como perfiles públicos. Esa línea no se cruza.
//
// Uso:
//   GOOGLE_PLACES_API_KEY=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed-leads.mjs
//   ...con flags opcionales:
//     --cities=sabadell,terrassa,rubi
//     --gremios=fontanero,electricista
//     --dry-run        (no escribe, solo loguea)
//
// Hace dedupe por place_id (upsert) y NUNCA pisa leads ya 'contactado',
// 'respondido' o 'convertido'.

import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

// Cargar .env.local si existe
for (const envFile of ['.env.local', '.env']) {
  const p = path.join(ROOT, envFile);
  if (!fs.existsSync(p)) continue;
  for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"#]*)"?\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!GOOGLE_PLACES_API_KEY) {
  console.error('[seed-leads] Falta GOOGLE_PLACES_API_KEY — abort');
  process.exit(1);
}
if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('[seed-leads] Falta SUPABASE_SERVICE_ROLE_KEY — abort');
  console.error('  (la anon key no puede escribir en outbound_leads por RLS)');
  process.exit(1);
}

// ──────────────────────────────────────────────────────────────────────────
// Matriz por defecto: Vallès Occidental × gremios de alta intención local.
// Sobreescribible con --cities y --gremios.
// ──────────────────────────────────────────────────────────────────────────

const DEFAULT_CITIES = [
  'Sabadell',
  'Terrassa',
  'Rubí',
  'Cerdanyola del Vallès',
  'Sant Cugat del Vallès',
  'Mollet del Vallès',
  'Barberà del Vallès',
  'Castellar del Vallès',
  'Ripollet',
];

// Términos de búsqueda y slug oficial (debe matchear service_categories.slug).
const DEFAULT_GREMIOS = [
  { searchTerm: 'fontanero',                slug: 'fontanero' },
  { searchTerm: 'electricista',             slug: 'electricista' },
  { searchTerm: 'cerrajero',                slug: 'cerrajero' },
  { searchTerm: 'reformas albañil',         slug: 'albanil-reformas' },
  { searchTerm: 'pintor',                   slug: 'pintor' },
  { searchTerm: 'carpintero',               slug: 'carpintero' },
  { searchTerm: 'empresa de limpieza',      slug: 'autonomo-limpieza' },
  { searchTerm: 'aire acondicionado',       slug: 'climatizacion-calefaccion' },
];

const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.internationalPhoneNumber',
  'places.nationalPhoneNumber',
  'places.websiteUri',
  'places.rating',
  'places.userRatingCount',
  'places.businessStatus',
  'places.types',
].join(',');

// ──────────────────────────────────────────────────────────────────────────
// CLI args
// ──────────────────────────────────────────────────────────────────────────

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    return m ? [m[1], m[2] ?? true] : [a, true];
  }),
);
const DRY_RUN = !!args['dry-run'];

const cities = args.cities
  ? String(args.cities).split(',').map((s) => s.trim()).filter(Boolean)
  : DEFAULT_CITIES;

const gremios = args.gremios
  ? String(args.gremios).split(',').map((s) => s.trim()).filter(Boolean).map((slug) => {
      const found = DEFAULT_GREMIOS.find((g) => g.slug === slug);
      return found || { searchTerm: slug, slug };
    })
  : DEFAULT_GREMIOS;

// ──────────────────────────────────────────────────────────────────────────
// Cliente Supabase con SERVICE ROLE (server-side, NO se filtra al cliente)
// ──────────────────────────────────────────────────────────────────────────

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ──────────────────────────────────────────────────────────────────────────
// Places API (New) searchText: 1 call por (ciudad × gremio).
// Coste estimado: ~$0.032 por searchText con Pro fieldmask. Estamos
// pidiendo solo lo esencial (≤ "Place Details (Pro)" tier).
// ──────────────────────────────────────────────────────────────────────────

async function placesSearchText(textQuery) {
  const url = 'https://places.googleapis.com/v1/places:searchText';
  const body = {
    textQuery,
    languageCode: 'es',
    regionCode: 'es',
    maxResultCount: 20,
  };
  const r = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
      'X-Goog-FieldMask': FIELD_MASK,
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const err = await r.text();
    throw new Error(`Places searchText ${r.status}: ${err.slice(0, 300)}`);
  }
  return r.json();
}

// ──────────────────────────────────────────────────────────────────────────
// Upsert seguro: NO pisa leads que ya han avanzado en el pipeline.
// ──────────────────────────────────────────────────────────────────────────

const PROTECTED_STATUSES = new Set(['contactado', 'pending_wa', 'respondido', 'convertido']);

async function upsertLead(lead) {
  // Comprueba si existe y en qué estado.
  const { data: existing } = await supabase
    .from('outbound_leads')
    .select('id, status, opt_out')
    .eq('place_id', lead.place_id)
    .maybeSingle();

  if (existing) {
    if (existing.opt_out) return { action: 'skip_opt_out' };
    if (PROTECTED_STATUSES.has(existing.status)) return { action: 'skip_in_pipeline' };

    // Solo refrescamos datos descubribles, NO el status si ya hay outreach.
    const { error } = await supabase
      .from('outbound_leads')
      .update({
        business_name: lead.business_name,
        category_slug: lead.category_slug,
        city: lead.city,
        phone: lead.phone,
        website: lead.website,
        rating: lead.rating,
        user_ratings_total: lead.user_ratings_total,
        address: lead.address,
      })
      .eq('id', existing.id);
    if (error) throw error;
    return { action: 'updated' };
  }

  const { error } = await supabase.from('outbound_leads').insert(lead);
  if (error) throw error;
  return { action: 'inserted' };
}

// ──────────────────────────────────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`[seed-leads] ${cities.length} ciudades × ${gremios.length} gremios = ${cities.length * gremios.length} searchText calls`);
  console.log(`[seed-leads] coste estimado: ~$${(cities.length * gremios.length * 0.032).toFixed(2)}`);
  if (DRY_RUN) console.log('[seed-leads] DRY-RUN: no se escribe en BD');

  const stats = { inserted: 0, updated: 0, skipped_in_pipeline: 0, skipped_opt_out: 0, failed: 0 };
  const byCityGremio = {};

  for (const city of cities) {
    for (const gremio of gremios) {
      const query = `${gremio.searchTerm} en ${city}`;
      const key = `${city}::${gremio.slug}`;
      byCityGremio[key] = 0;

      let resp;
      try {
        resp = await placesSearchText(query);
      } catch (e) {
        console.warn(`  ✗ "${query}": ${e.message}`);
        stats.failed++;
        continue;
      }

      const places = Array.isArray(resp?.places) ? resp.places : [];
      console.log(`  → "${query}": ${places.length} resultados`);

      for (const p of places) {
        if (!p.id) continue;
        // Filtra placeholders y negocios cerrados.
        if (p.businessStatus && p.businessStatus !== 'OPERATIONAL') continue;

        const lead = {
          place_id: p.id,
          business_name: (p.displayName?.text || '').slice(0, 200),
          category_slug: gremio.slug,
          city,
          phone: p.internationalPhoneNumber || p.nationalPhoneNumber || null,
          website: p.websiteUri || null,
          rating: typeof p.rating === 'number' ? p.rating : null,
          user_ratings_total: typeof p.userRatingCount === 'number' ? p.userRatingCount : null,
          address: p.formattedAddress || null,
          source: 'google_places',
          status: 'nuevo',
        };

        if (DRY_RUN) {
          stats.inserted++;
          byCityGremio[key]++;
          continue;
        }

        try {
          const { action } = await upsertLead(lead);
          if (action === 'inserted') { stats.inserted++; byCityGremio[key]++; }
          else if (action === 'updated') stats.updated++;
          else if (action === 'skip_in_pipeline') stats.skipped_in_pipeline++;
          else if (action === 'skip_opt_out') stats.skipped_opt_out++;
        } catch (e) {
          console.warn(`    ! upsert ${p.id}: ${e.message}`);
          stats.failed++;
        }
      }

      // Pausa cortés entre queries (Places permite alto QPS pero seamos buenos)
      await new Promise((r) => setTimeout(r, 250));
    }
  }

  console.log('');
  console.log('═══════════════════ Seed-leads summary ═══════════════════');
  for (const [key, count] of Object.entries(byCityGremio).filter(([, n]) => n > 0)) {
    const [city, slug] = key.split('::');
    console.log(`  ${city.padEnd(25)} · ${slug.padEnd(28)} → ${count} nuevos`);
  }
  console.log('  ────────────────────────────────────────────────────────');
  console.log(`  Insertados:           ${stats.inserted}`);
  console.log(`  Refrescados:          ${stats.updated}`);
  console.log(`  Saltados (pipeline):  ${stats.skipped_in_pipeline}`);
  console.log(`  Saltados (opt-out):   ${stats.skipped_opt_out}`);
  console.log(`  Fallos:               ${stats.failed}`);
  console.log('═════════════════════════════════════════════════════════════');
}

main().catch((e) => {
  console.error('[seed-leads] FAIL', e);
  process.exit(1);
});
