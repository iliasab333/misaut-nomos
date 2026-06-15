// Helper de tracking del lado cliente. Llama al RPC `track_profile_metric` de
// Supabase con (p_professional_id, p_type).
//
// IMPORTANTE: `professional_id` debe ser el **id de professional_profiles**,
// NO el `user_id`. El RPC ya lo agrega en `public.profile_metrics`.
//
// Tipos válidos:
//   - 'profile_view'        ←  visita a /autonomo/...
//   - 'search_appearance'   ←  el profesional aparece en una página de
//                              resultados (una vez por sesión y página)
//   - 'contact_click'       ←  clic en Contactar / Llamar / WhatsApp
//   - 'message_received'    ←  lo dispara el backend al crear el mensaje
//
// Dedupe por (profile.id + type) durante 5 min por pestaña para no inflar
// contadores en re-renders.

const RECENT = new Map();
const DEDUPE_WINDOW_MS = 5 * 60 * 1000;

function shouldFire(key) {
  const last = RECENT.get(key);
  const now = Date.now();
  if (last && now - last < DEDUPE_WINDOW_MS) return false;
  RECENT.set(key, now);
  return true;
}

export function trackMetric(professional_profile_id, type) {
  if (!professional_profile_id || !type) return Promise.resolve(null);
  const key = `${professional_profile_id}|${type}`;
  if (!shouldFire(key)) return Promise.resolve(null);

  return import('@/api/supabaseClient')
    .then(({ supabase }) =>
      supabase.rpc('track_profile_metric', {
        p_professional_id: professional_profile_id,
        p_type: type,
      })
    )
    .then((r) => (r?.error ? null : r?.data ?? null))
    .catch(() => null);
}

// Disparo en bloque para listados (una llamada por id).
export function trackSearchAppearance(professionalProfileIds = []) {
  if (!Array.isArray(professionalProfileIds) || professionalProfileIds.length === 0) return;
  for (const id of professionalProfileIds) trackMetric(id, 'search_appearance');
}
