// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  Lo que los resúmenes preguntan a la base, en un solo sitio             ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// Se lee con la clave de servicio, desde el servidor. NUNCA desde el
// navegador: estas consultas tocan correos y teléfonos de personas.
//
// No se usa el cliente de Supabase sino `fetch` contra PostgREST: una
// dependencia menos en una función serverless, y las consultas se leen tal
// cual se envían.

const BASE = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
const CLAVE = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export function hayBase() { return Boolean(BASE && CLAVE); }

async function pedir(ruta, { contar = false } = {}) {
  const cab = { apikey: CLAVE, Authorization: `Bearer ${CLAVE}` };
  if (contar) cab.Prefer = 'count=exact';
  const r = await fetch(`${BASE}/rest/v1/${ruta}`, { headers: cab });
  if (!r.ok) throw new Error(`PostgREST ${r.status} en ${ruta.slice(0, 90)}: ${(await r.text()).slice(0, 180)}`);
  if (contar) {
    const rango = r.headers.get('content-range') || '';
    const n = Number(rango.split('/')[1]);
    return Number.isFinite(n) ? n : 0;
  }
  return r.json();
}

export const cuenta = (tabla, filtro = '') => pedir(`${tabla}?select=id&limit=1${filtro ? `&${filtro}` : ''}`, { contar: true });
export const filas = (ruta) => pedir(ruta);

/** Fecha ISO de hace n días, a medianoche UTC. Las comparaciones de los
 *  resúmenes son por día natural, no por ventana rodante: un informe diario
 *  que dice «las últimas 24 h» a las 7:00 cuenta media tarde de ayer. */
export function desde(dias) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - dias);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

export function hoyISO() {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

/**
 * Las métricas agregadas de una ventana [desde, hasta). `profile_metrics`
 * guarda una fila por ficha y día, así que esto es la suma — y de paso
 * devuelve las fichas más vistas, que es lo que convierte un número en algo
 * accionable.
 *
 * `hastaFecha` es OBLIGATORIO en la práctica y antes no existía. Sin tope por
 * arriba, `metricas(ayer)` sumaba ayer Y HOY, y el informe diario titulaba
 * «61 visitas» un día que había tenido 59 porque le colaba las 2 de hoy. Peor
 * que la cifra: el apartado «las más vistas de ayer» se reordenaba según iba
 * entrando el tráfico de la mañana, así que dos ejecuciones del mismo informe
 * daban listas distintas. Medido contra producción el 9 de octubre: el correo
 * de las 10:28 decía 67 visitas del día 8 y la misma consulta a las 13:00
 * decía 61, con el día 8 cerrado e inmóvil en 59.
 *
 * Y se pagina. `limit=5000` no sube el techo de PostgREST: Supabase devuelve
 * 1.000 filas y se calla el resto. Hoy una ventana de dos días son 93 filas,
 * pero es el mismo fallo silencioso contra el que ya se protegen los resúmenes
 * semanal y mensual, y aquí faltaba.
 */
export async function metricas(desdeFecha, hastaFecha) {
  const d = desdeFecha.slice(0, 10);
  const h = hastaFecha ? `&date=lt.${hastaFecha.slice(0, 10)}` : '';
  const f = [];
  const TAMANO = 1000;
  for (let salto = 0; salto < 200000; salto += TAMANO) {
    // `order=id.asc` y no por fecha: con fechas repetidas el orden entre
    // páginas no está garantizado y se duplicarían unas filas y se perderían
    // otras, que es peor que una suma corta porque no se nota.
    const trozo = await filas(
      'profile_metrics?select=professional_id,date,profile_views,search_appearances,contact_clicks'
      + `&date=gte.${d}${h}&order=id.asc&limit=${TAMANO}&offset=${salto}`,
    );
    f.push(...trozo);
    if (trozo.length < TAMANO) break;
  }
  const tot = { visitas: 0, apariciones: 0, contactos: 0, filas: f.length };
  const porFicha = new Map();
  for (const r of f) {
    const v = Number(r.profile_views || 0), a = Number(r.search_appearances || 0), c = Number(r.contact_clicks || 0);
    tot.visitas += v; tot.apariciones += a; tot.contactos += c;
    const p = porFicha.get(r.professional_id) || { visitas: 0, contactos: 0 };
    p.visitas += v; p.contactos += c;
    porFicha.set(r.professional_id, p);
  }
  return { ...tot, porFicha, dias: new Set(f.map((r) => r.date)).size };
}

/** Nombre y ciudad de un puñado de fichas, para que el correo diga «Luis,
 *  pintor en Esplugues» y no un identificador de 24 caracteres. */
export async function nombresDeFichas(ids) {
  const lista = [...new Set(ids)].filter(Boolean).slice(0, 60);
  if (!lista.length) return new Map();
  const f = await filas(
    `professional_profiles?select=id,business_name,ciudad,categories,slug_publico&id=in.(${lista.map(encodeURIComponent).join(',')})`,
  );
  return new Map(f.map((p) => [p.id, p]));
}

/** El enlace público de una ficha, en su forma CANÓNICA.
 *
 *  `slug_publico` no se usa tal cual: 19 de las 56 fichas lo tienen acabado en
 *  guion («oleksandr-») y alguna lleva guiones dobles
 *  («alberto---carpintero-evanista»). Esas direcciones responden 301 hacia la
 *  limpia —las recogen las redirecciones de `vercel.json`— y acaban en 200,
 *  así que no se rompe nada; pero mandar en un correo un enlace que rebota es
 *  gastar un salto y publicar una dirección que no es la buena. Se pasa el
 *  slug guardado por la misma limpieza que el nombre.
 */
export function urlFicha(p) {
  const limpia = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const nombre = limpia(p?.slug_publico) || limpia(p?.business_name);
  if (!nombre) return 'https://misautonomos.es/buscar';
  const cat = p?.categories?.[0], ciudad = p?.ciudad;
  return cat && ciudad
    ? `https://misautonomos.es/autonomo/${limpia(cat)}-en-${limpia(ciudad)}/${nombre}`
    : `https://misautonomos.es/autonomo/${nombre}`;
}
