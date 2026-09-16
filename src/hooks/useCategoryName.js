// Nombre de una categoría en el idioma activo. Método de khdemlidaba.
//
// El problema que resuelve
// ───────────────────────
// Las categorías viven en la base de datos (`service_categories`), con su
// nombre ya escrito en español: «Pintor», «Transportista», «Persianas y
// toldos». El buscador las pintaba con `t(cat.name)` — pasando el VALOR de la
// base de datos como si fuera una clave de traducción.
//
// Funcionaba de casualidad: i18next no encuentra la clave «Pintor», así que
// devuelve «Pintor», que resulta ser el texto correcto. Pero por cada
// categoría y cada render escupía un error de clave ausente: 479 errores en
// la consola sólo al abrir /buscar. Con ese ruido, un error de verdad no se
// ve. Y en inglés seguía diciendo «Pintor», porque nunca hubo nada que
// traducir.
//
// La forma correcta: la clave es el SLUG (estable, ASCII, pensado para esto),
// y el nombre de la base de datos es el fallback. Una categoría traducida usa
// su traducción; una sin traducir usa el nombre de la fila, sin ruido —
// `missingKeyHandler` ignora `categories.*` a propósito (ver src/i18n/index.js).
//
//   const categoryName = useCategoryName();
//   categoryName(cat.slug, cat.name)   → «Painter» en EN si existe la clave,
//                                         «Pintor» si no.

import { useTranslation } from 'react-i18next';

export function useCategoryName() {
  const { t } = useTranslation();
  return (slug, fallback) => {
    if (!slug) return fallback || '';
    const key = `categories.${slug}`;
    const translated = t(key);
    // i18next devuelve la propia clave cuando no la encuentra.
    if (!translated || translated === key) return fallback || slug;
    return translated;
  };
}

export default useCategoryName;
