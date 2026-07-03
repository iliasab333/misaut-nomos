/**
 * Helper para generar URLs SEO-friendly de perfiles profesionales.
 * La lógica de slugify vive en @/lib/slugify — este módulo la reexporta
 * por compatibilidad con importadores existentes.
 */

import { slugify } from './slugify';

export { slugify };

/**
 * Devuelve el path SEO-friendly completo de un perfil.
 * Si tiene categoría + ciudad: /autonomo/{categoria-slug}-en-{ciudad-slug}/{nombre-slug}
 * Si falta alguno: /autonomo/{nombre-slug} (formato legacy, sigue funcionando)
 */
export function getProfileSeoUrl(profile) {
  if (!profile) return '/';
  const nameSlug = profile.slug_publico || slugify(profile.business_name || '');
  if (!nameSlug) return '/autonomo';

  const categoria = profile.categories?.[0];
  const ciudad = profile.ciudad;

  if (categoria && ciudad) {
    const catSlug = slugify(categoria);
    const ciudadSlug = slugify(ciudad);
    return `/autonomo/${catSlug}-en-${ciudadSlug}/${nameSlug}`;
  }

  return `/autonomo/${nameSlug}`;
}

/**
 * Devuelve solo el segmento "categoria-en-ciudad" (sin /autonomo/ ni /nombre).
 */
export function getProfileCategorySegment(profile) {
  if (!profile) return null;
  const categoria = profile.categories?.[0];
  const ciudad = profile.ciudad;
  if (!categoria || !ciudad) return null;
  return `${slugify(categoria)}-en-${slugify(ciudad)}`;
}
