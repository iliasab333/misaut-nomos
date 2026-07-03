// Utilidades para generar URLs SEO-friendly.
// La lógica de slugify vive en @/lib/slugify — este módulo la reexporta
// junto con helpers de dominio (perfiles, categorías, ciudades).

export { slugify } from '@/lib/slugify';
import { slugify } from '@/lib/slugify';

/**
 * Genera un slug único para un profesional
 */
export function generateProfessionalSlug(businessName, category) {
  const nameSlug = slugify(businessName);
  const categorySlug = category ? slugify(category) : '';

  if (categorySlug && !nameSlug.includes(categorySlug)) {
    return `${nameSlug}-${categorySlug}`;
  }

  return nameSlug;
}

const PLURAL_MAP = {
  'electricista': 'electricistas',
  'fontanero': 'fontaneros',
  'carpintero': 'carpinteros',
  'pintor': 'pintores',
  'jardinero': 'jardineros',
  'transportista': 'transportistas',
  'cerrajero': 'cerrajeros',
};

/**
 * Genera la URL para una categoría
 */
export function getCategoryUrl(categoryName) {
  const slug = slugify(categoryName);
  return `/${PLURAL_MAP[slug] || slug}`;
}

/**
 * Genera la URL para categoría + ciudad
 */
export function getCategoryLocationUrl(categoryName, ciudad) {
  const categorySlug = slugify(categoryName);
  const ciudadSlug = slugify(ciudad);
  const categoryUrl = PLURAL_MAP[categorySlug] || categorySlug;
  return `/${categoryUrl}/${ciudadSlug}`;
}

/**
 * Genera la URL para un perfil de profesional
 */
export function getProfessionalUrl(profile) {
  if (profile.slug_publico) {
    return `/autonomo/${profile.slug_publico}`;
  }

  const slug = generateProfessionalSlug(
    profile.business_name,
    profile.categories?.[0]
  );

  return `/autonomo/${slug}`;
}

/**
 * Extrae la categoría desde un slug de URL
 */
export function categoryFromSlug(slug) {
  const singularMap = {
    'electricistas': 'Electricista',
    'fontaneros': 'Fontanero',
    'carpinteros': 'Carpintero',
    'pintores': 'Pintor',
    'jardineros': 'Jardinero',
    'transportistas': 'Transportista',
    'cerrajeros': 'Cerrajero',
    'albanil-reformas': 'Albañil / Reformas',
    'autonomo-de-limpieza': 'Autónomo de limpieza',
    'instalador-de-aire-acondicionado': 'Instalador de aire acondicionado',
    'mantenimiento-general': 'Mantenimiento general',
    'mantenimiento-de-piscinas': 'Mantenimiento de piscinas',
    'asesoria-o-gestoria': 'Asesoría o gestoría',
    'empresa-multiservicios': 'Empresa multiservicios',
  };

  return singularMap[slug] || null;
}

/**
 * Extrae la ciudad desde un slug de URL
 */
export function cityFromSlug(slug) {
  return slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Verifica si un slug ya existe y genera uno único
 */
export function generateUniqueSlug(baseSlug, existingSlugs) {
  if (!existingSlugs.includes(baseSlug)) {
    return baseSlug;
  }

  let counter = 2;
  let newSlug = `${baseSlug}-${counter}`;

  while (existingSlugs.includes(newSlug)) {
    counter++;
    newSlug = `${baseSlug}-${counter}`;
  }

  return newSlug;
}
