-- supabase/seeds/test-leads.sql
-- ────────────────────────────────────────────────────────────────────────
-- PASO 0 — Aplica antes la migración (una sola vez):
--   supabase/migrations/20260628120000_outbound_leads.sql
-- ────────────────────────────────────────────────────────────────────────
--
-- Este archivo es opcional y SOLO para probar el motor de outreach sin
-- Google Places API. Edita los teléfonos para usar TUYOS (o de amigos que
-- te dejen probar) y pega el bloque en:
--   https://supabase.com/dashboard/project/dquxsethatxtptfviiwd/sql/new
--
-- SUSTITUYE +34600XXXXXX por números reales tuyos. Lo que escriba el worker
-- te llegará a esos móviles, así que pon tu propio número en al menos uno
-- para auditarte el flujo entero antes de soltar el motor sobre leads
-- reales.
--
-- ⚠️  Place IDs aquí son ficticios (TEST-xxx). Como están en una columna
--     UNIQUE, no chocan con futuros leads reales de Google Places (todos
--     los reales empiezan por "ChIJ...").
-- ────────────────────────────────────────────────────────────────────────

INSERT INTO outbound_leads
  (place_id,      business_name,                 category_slug,         city,       phone,            source,       status)
VALUES
  ('TEST-001',    'Fontanería de Prueba',        'fontanero',           'Sabadell', '+34600000001',   'manual_test', 'nuevo'),
  ('TEST-002',    'Reformas Test',               'albanil-reformas',    'Terrassa', '+34600000002',   'manual_test', 'nuevo'),
  ('TEST-003',    'Cerrajería Demo',             'cerrajero',           'Sabadell', '+34600000003',   'manual_test', 'nuevo'),
  ('TEST-004',    'Electricista Ejemplo',        'electricista',        'Rubí',     '+34600000004',   'manual_test', 'nuevo'),
  ('TEST-005',    'Pintura QA',                  'pintor',              'Mollet del Vallès', '+34600000005', 'manual_test', 'nuevo')
ON CONFLICT (place_id) DO NOTHING;

-- ── Verifica que se insertaron ───────────────────────────────────────────
-- SELECT business_name, city, category_slug, phone, status
-- FROM outbound_leads
-- WHERE source = 'manual_test'
-- ORDER BY discovered_at DESC;

-- ── Cuando quieras limpiarlos ───────────────────────────────────────────
-- DELETE FROM outbound_leads WHERE source = 'manual_test';
