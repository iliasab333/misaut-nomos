// URL de un artículo del centro de ayuda.
//
// La ruta declarada es /preguntas-frecuentes/:slug, pero los enlaces que
// llevaban a ella construían /preguntas-frecuentes?id=<uuid>, que es la ruta
// de la LISTA: pulsar «Leer más» dejaba al visitante en el índice, sin
// explicación. Y quien llegara con la URL de slug caía en «Artículo no
// encontrado», porque la página sólo leía `?id=`. Dos caminos, los dos rotos.
//
// Aquí vive la única forma de construir esa dirección, para que no se pueda
// volver a escribir a mano de dos maneras distintas.

import { slugify } from '@/lib/slugify';

export function faqSlug(faq) {
  if (!faq) return '';
  // El título español es la fuente del slug aunque la interfaz esté en otro
  // idioma: la URL de un artículo no puede cambiar al cambiar de idioma, o
  // los enlaces compartidos dejan de funcionar.
  return slugify(faq.title_es || faq.title_en || faq.id || '');
}

export function faqUrl(faq) {
  const slug = faqSlug(faq);
  return slug ? `/preguntas-frecuentes/${slug}` : '/preguntas-frecuentes';
}
