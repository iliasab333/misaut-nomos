// Miniaturas servidas por Supabase Storage.
//
// Lo que este fichero decía, y por qué era falso
// ──────────────────────────────────────────────
// Hasta hoy, esta función devolvía la URL ORIGINAL y se tragaba las opciones
// de tamaño que le pasaban las cinco pantallas que la llaman. El comentario
// que lo justificaba decía que el plan de Supabase no tenía activadas las
// transformaciones de imagen y que `/render/image/` respondía 403
// (FeatureNotEnabled). Eso dejó de ser cierto en algún momento y nadie lo
// volvió a comprobar: medido hoy contra el proyecto, las 30 `imagen_principal`
// responden 200 por el endpoint de render.
//
// Lo que costaba. Cada avatar de 56 px del buscador se descargaba entero:
// 571.862 bytes de media, 2.837.614 el mayor (una foto de 3840×2160 para
// pintarla del tamaño de un sello). Las mismas treinta imágenes, pedidas a
// 112 px, suman 72.916 bytes — 235 veces menos. Y hay una segunda mejora que
// no se ve en los bytes: el objeto original sale con `cache-control:
// no-cache`, así que el navegador lo revalida en CADA visita; la versión
// transformada sale con `max-age=3600` y la sirve el borde (`cf-cache-status:
// HIT`).
//
// La red de seguridad. Si el servicio de render volviera a caerse o a
// desactivarse, `InitialsAvatar` reintenta con el ORIGINAL antes de rendirse a
// las iniciales (ver allí): una foto pesada es mejor que ningún rostro. Por
// eso existe `supabaseImageOriginal`.

const PUBLIC_SEGMENT = '/storage/v1/object/public/';
const RENDER_SEGMENT = '/storage/v1/render/image/public/';

// `true` sólo para una URL pública del Storage de este proyecto. Las de
// `blob:`, `data:`, las externas y las que ya vienen transformadas se
// devuelven intactas: quien llama no tiene por qué saber de dónde salió la
// imagen.
function isPublicStorageUrl(url) {
  return typeof url === 'string' && url.includes(PUBLIC_SEGMENT);
}

/**
 * Miniatura del tamaño pedido. Las opciones ya NO se ignoran.
 *
 * `width` es el ancho en píxeles REALES a descargar, no el del CSS: quien
 * llama pide el doble del tamaño en pantalla para que se vea nítido en
 * pantallas retina (un avatar de 56 px pide 128).
 */
export function optimizeSupabaseImage(url, { width, height, quality = 75, resize = 'cover' } = {}) {
  if (!url || typeof url !== 'string') return url;
  const clean = url.split('?')[0];
  if (!isPublicStorageUrl(clean)) return clean;
  // Sin ancho ni alto no hay miniatura que pedir: devolvemos el original en
  // vez de inventar un tamaño.
  if (!width && !height) return clean;

  const params = [];
  if (width) params.push(`width=${Math.round(width)}`);
  if (height) params.push(`height=${Math.round(height)}`);
  params.push(`resize=${resize}`, `quality=${quality}`);
  return `${clean.replace(PUBLIC_SEGMENT, RENDER_SEGMENT)}?${params.join('&')}`;
}

/**
 * El original del que salió una miniatura. Sirve de reintento cuando el
 * servicio de render falla, y para el visor a pantalla completa, donde la
 * foto grande es justamente lo que se quiere ver.
 */
export function supabaseImageOriginal(url) {
  if (!url || typeof url !== 'string') return url;
  return url.split('?')[0].replace(RENDER_SEGMENT, PUBLIC_SEGMENT);
}
