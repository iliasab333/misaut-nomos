// Qué namespaces viven en el bundle público y cuáles en el de aplicación.
//
// El problema que resuelve
// ───────────────────────
// Al centralizar los textos en un JSON por idioma, todo lo que antes vivía
// repartido por los chunks perezosos de cada página (el panel de admin, el
// CRM, la facturación) pasó a un único fichero que se carga de entrada. El
// bundle principal creció de 775 a 961 kB: un visitante que aterriza en la
// home se descargaba 896 claves del panel de administración.
//
// Así que hay dos ficheros por idioma:
//
//   locales/es.json      → público. Va embarcado (es) o en su chunk (resto).
//   locales/es.app.json  → pantallas internas. Sólo lo piden las páginas que
//                          lo necesitan, vía `lazyApp()` (ver lib/lazyWithRetry.js),
//                          que encadena su carga a la del chunk de la página.
//                          El <Suspense> que ya envuelve las rutas espera a
//                          las dos cosas, así que nunca se ve una clave cruda.
//
// El criterio NO es «requiere login»: es «¿qué páginas usan estas claves?».
// /presupuesto/aceptar y /factura/pagar son públicas (el cliente llega por un
// enlace del email) y usan `quotes` e `invoices`; son lazyApp igual que el
// CRM. Lo que las separa del bundle público es que no están en el camino de
// un visitante que llega buscando un electricista.
//
// Reglas:
//   - Un namespace está en UNA lista, nunca en las dos. `scripts/check-i18n.mjs`
//     lo comprueba y rompe el build si se solapan o si falta alguno.
//   - `common.*` va en el público: lo usa todo, incluidos los estados de
//     error y carga que pueden pintarse antes que nada.
//   - Al añadir un namespace nuevo, decide aquí. Si no aparece en ninguna
//     lista, el checker falla: no hay «por defecto» silencioso.

export const APP_NAMESPACES = [
  'admin',
  'dashboard',
  // `helpCenter` es la única excepción que PARECE pública y va aquí a
  // propósito: /ayuda se sirve con `lazyApp` porque su formulario de
  // contacto usa `support` y `tickets`, así que el bundle de aplicación ya
  // viaja con la página. Meter sus claves en el público sólo añadiría peso
  // a la portada, que nunca las pinta.
  'helpCenter',
  'myProfile',
  'onboarding',
  'support',
  'tickets',
];

// Tres namespaces que PARECEN internos y no lo son. Los tres se descubrieron
// midiendo qué alcanza cada página, no leyendo nombres:
//
//   verification (1,9 kB) — el distintivo «verificado» se pinta en la ficha
//     pública del profesional (ProfessionalProfile → ReviewSection →
//     useIdentityVerification).
//   supportChat  (1,4 kB) — GuestContactModal lo usa desde el buscador, que
//     es la página más visitada del sitio.
//   blog         (4,3 kB) — blog.list y blog.post son páginas públicas.
//     `blog.editor` (del panel) viaja con ellas: 4,3 kB no justifican partir
//     el namespace en dos.
//
// Dejarlos en el bundle de aplicación habría metido los 127 kB enteros en el
// buscador y en cada ficha de profesional, que es justo lo que esta división
// venía a evitar.

export const PUBLIC_NAMESPACES = [
  'account',
  'auth',
  'blog',
  'categories',
  'category',
  'common',
  'contact',
  'cookies',
  'errors',
  'faq',
  'favorites',
  'footer',
  'forPros',
  'home',
  'landing',
  'layout',
  'legal',
  'messages',
  'nav',
  'newsletter',
  'notifications',
  'profile_card',
  'profile_page',
  'proProfile',
  'reviews',
  'search',
  'supportChat',
  'verification',
];

// Claves planas heredadas: el es.json original de Base44 tenía ~155 claves de
// primer nivel sin namespace (`aboutMe`, `invoiceNumber`, `tabPersonal`…).
// Mezclan lo público (la ficha del profesional) con lo interno (el formulario
// de factura), así que repartirlas exige tocar sus llamadas una a una.
// Mientras tanto van enteras al bundle público: son etiquetas cortas, unos
// 8 kB en total, y equivocarse por el lado de «se carga de más» sólo cuesta
// bytes, mientras que equivocarse por el otro pinta la clave cruda.
//
// Deuda conocida: cuando se migren, cada una a su namespace y esta excepción
// desaparece. Hasta entonces, el checker las cuenta como públicas y no se
// queja.
export const LEGACY_FLAT_IS_PUBLIC = true;

// Un valor de primer nivel que es string (no objeto) es una clave plana
// heredada. Las nuevas SIEMPRE cuelgan de un namespace.
export const isLegacyFlat = (value) => typeof value === 'string';

export const isAppNamespace = (key) => APP_NAMESPACES.includes(String(key).split('.')[0]);
