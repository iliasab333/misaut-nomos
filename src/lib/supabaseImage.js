// Helper para imágenes de Supabase Storage.
//
// IMPORTANTE: este proyecto NO tiene activado Image Transformations en su plan
// de Supabase. El endpoint /storage/v1/render/image/... devuelve 403
// (FeatureNotEnabled). Por eso devolvemos la URL TAL CUAL está en la BD,
// sirviéndola desde /storage/v1/object/public/... sin parámetros.
//
// Para no penalizar rendimiento ni CLS, los consumidores deben:
//   - usar <img loading="lazy" decoding="async" width="..." height="...">
//   - meter la imagen en un contenedor con tamaño fijo + object-fit: cover
//   - mantener un onError fallback (lo hace ya InitialsAvatar)
//
// Mantenemos la firma para no romper a los callers; las opciones se ignoran.
export function optimizeSupabaseImage(url, _opts = {}) {
  if (!url || typeof url !== 'string') return url;
  // Quitar cualquier query param de intentos antiguos con render/image.
  return url.split('?')[0];
}
