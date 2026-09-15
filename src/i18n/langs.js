// Fuente de verdad única de los idiomas. La consumen el motor de i18n
// (src/i18n/index.js) y la guarda de build (scripts/check-i18n.mjs), para que
// no puedan desincronizarse: si aquí un idioma está `ready`, el script exige
// que su JSON esté completo o rompe el build.
//
// Sin `import` de nada — este fichero lo carga Node directamente.

// `ready: false` = el JSON aún no está completo. El idioma NO se ofrece en el
// selector y el checker no lo audita todavía. Se pasa a `true` en el mismo
// commit que trae el locale terminado, nunca antes: ofrecer un idioma a
// medias es servir español con etiqueta de francés.
export const LANGS = [
  { code: 'es', label: 'Español', ready: true },
  { code: 'en', label: 'English', ready: true },
  { code: 'fr', label: 'Français', ready: false },
  { code: 'de', label: 'Deutsch', ready: false },
  { code: 'nl', label: 'Nederlands', ready: false },
  { code: 'ar', label: 'العربية', ready: false },
];

export const DEFAULT_LANG = 'es';

// Idiomas con URL propia (prefijo /xx). El español vive en la raíz: ninguna
// URL existente se mueve. Un idioma entra aquí sólo cuando va a pelear en
// buscadores por su cuenta — prefijar multiplica el sitemap y obliga a
// hreflang, así que no se hace "por si acaso".
export const PREFIXED = [];

export const RTL_CODES = ['ar'];
