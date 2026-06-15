// Helpers de rol centralizados.
//
// Convenciones reales en la BD (verificadas):
//   - users.role       ∈ {'admin', 'user'}
//   - users.user_type  ∈ {'professionnel' (legacy francés), 'profesional', 'professional',
//                          'client', 'cliente', null}
//   - users.app_role   ∈ NULL para todos → NO USAR
//
// Nunca dependas de app_role. Nunca asumas que un campo es la fuente única.

const PRO_TYPES = new Set(['professionnel', 'profesional', 'professional', 'pro']);
const CLIENT_TYPES = new Set(['client', 'cliente']);

export function isAdmin(user) {
  return !!user && user.role === 'admin';
}

export function isProfessional(user) {
  if (!user) return false;
  const t = typeof user.user_type === 'string' ? user.user_type.toLowerCase() : '';
  return PRO_TYPES.has(t);
}

export function isClient(user) {
  if (!user) return false;
  const t = typeof user.user_type === 'string' ? user.user_type.toLowerCase() : '';
  return CLIENT_TYPES.has(t);
}

// Destino canónico tras login para un usuario YA en sesión, según su rol.
// Si no se reconoce el tipo, va al buscador (experiencia cliente neutra).
// IMPORTANTE: NUNCA devuelve '/' para un usuario autenticado.
export function defaultDestinationFor(user, { hasProfessionalProfile = null } = {}) {
  if (!user) return '/login';
  if (isAdmin(user)) return '/admin';
  if (isProfessional(user)) {
    // Si sabemos a ciencia cierta que NO tiene ficha, le llevamos al alta.
    // Si no lo sabemos (null) o sí la tiene, al dashboard.
    if (hasProfessionalProfile === false) return '/completar-perfil';
    return '/dashboard';
  }
  if (isClient(user)) return '/buscar';
  // user_type === null o desconocido: cliente por defecto (NO landing).
  return '/buscar';
}
