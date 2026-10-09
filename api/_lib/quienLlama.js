// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  QUIÉN LLAMA — la comprobación de admin, en un solo sitio               ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// Vivía dentro de `api/admin/verificaciones.js`. Sale aquí porque el aviso de
// respuesta de soporte necesita exactamente la misma puerta, y una segunda
// copia de un control de acceso es una segunda copia que algún día se arregla
// sólo en uno de los dos sitios.
//
// Probado a fondo contra producción: sin token 401 · token falsificado con el
// `sub` del admin 401 (se valida contra Supabase, no se decodifica) · la clave
// anónima 401 · la clave de servicio 401 · un usuario real sin rol 403 ·
// admin con `disabled` 403 · admin con `auth_user_id` vacío 403.

const BASE = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
const SERVICIO = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const ANONIMA = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

export function hayCredenciales() { return Boolean(BASE && SERVICIO && ANONIMA); }

export async function postgrest(ruta, opciones = {}) {
  const r = await fetch(`${BASE}/rest/v1/${ruta}`, {
    ...opciones,
    headers: {
      apikey: SERVICIO, Authorization: `Bearer ${SERVICIO}`,
      'Content-Type': 'application/json', ...(opciones.headers || {}),
    },
  });
  if (!r.ok) throw new Error(`PostgREST ${r.status}: ${(await r.text()).slice(0, 180)}`);
  return r.status === 204 ? null : r.json();
}

export async function quienLlama(req) {
  const cabecera = req.headers?.authorization || '';
  const token = /^Bearer\s+(.+)$/i.exec(cabecera)?.[1]?.trim() || '';
  if (!token) return { ok: false, estado: 401, error: 'sin_sesion' };

  // 1. ¿El token es auténtico? Lo dice Supabase, no nosotros.
  let auth;
  try {
    const r = await fetch(`${BASE}/auth/v1/user`, {
      headers: { apikey: ANONIMA, Authorization: `Bearer ${token}` },
    });
    if (!r.ok) return { ok: false, estado: 401, error: 'sesion_invalida' };
    auth = await r.json();
  } catch {
    return { ok: false, estado: 503, error: 'no_se_pudo_validar_la_sesion' };
  }
  const uid = typeof auth?.id === 'string' ? auth.id : '';
  if (!uid) return { ok: false, estado: 401, error: 'sesion_invalida' };

  // 2. ¿Ese uid es admin? Se busca SÓLO por `auth_user_id`, nunca por
  //    `users.id`: cuatro filas de `users` tienen un `id` distinto de su
  //    `auth_user_id`, así que cruzar por `id` sería cruzar dos espacios de
  //    identificadores distintos y podría dar el rol de otra persona.
  let filas;
  try {
    filas = await postgrest(`users?select=id,email,role,disabled&auth_user_id=eq.${encodeURIComponent(uid)}&limit=2`);
  } catch (e) {
    console.error('[admin/verificaciones] fallo al comprobar el rol:', e.message);
    return { ok: false, estado: 503, error: 'no_se_pudo_comprobar_el_rol' };
  }
  // Una sesión válida sin ficha en `public.users`, o con el rol de siempre, no
  // es un error del que informar con detalle: es un no.
  const admin = filas.find((u) => u?.role === 'admin' && u.disabled !== true);
  if (!admin) return { ok: false, estado: 403, error: 'no_autorizado' };

  return { ok: true, admin: { uid, id: admin.id, email: admin.email || null } };
}
