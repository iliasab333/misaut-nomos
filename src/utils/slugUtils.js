import { slugify } from '@/lib/slugify';

/**
 * Genera un slug limpio y URL-safe a partir de un texto.
 * Alias de la función canónica @/lib/slugify — mantenida por compatibilidad
 * con los importadores existentes que usan `generateSlug`.
 */
export const generateSlug = (text) => slugify(text);

/**
 * Verifica si un slug necesita limpieza (tiene caracteres sucios).
 * Un slug está sucio si difiere del resultado canónico.
 */
export const isSlugDirty = (slug) => {
  if (!slug) return true;
  return slug !== slugify(slug);
};

/**
 * Asegura que el slug sea único por contexto.
 * Si el slug ya existe en otro perfil, añade un sufijo numérico.
 */
export const ensureUniqueSlug = async (baseSlug, existingSlugs = []) => {
  if (!existingSlugs.includes(baseSlug)) {
    return baseSlug;
  }
  for (let i = 2; i <= 10; i++) {
    const newSlug = `${baseSlug}-${i}`;
    if (!existingSlugs.includes(newSlug)) {
      return newSlug;
    }
  }
  return baseSlug;
};
