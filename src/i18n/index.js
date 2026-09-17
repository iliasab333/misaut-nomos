// i18n bootstrap (react-i18next) — método portado de khdemlidaba.
//
// Qué cambia respecto al i18n que venía de Base44
// ───────────────────────────────────────────────
// Antes: `parseMissingKeyHandler` FABRICABA la traducción a partir del nombre
// de la clave (`profile.editButton` → "Edit Button"). Una clave que faltaba
// nunca fallaba: devolvía un texto plausible en inglés macarrónico, en
// cualquier idioma, para siempre. Sumado a `AutoTranslate` —que recorría el
// DOM traduciendo nodos de texto en caliente— la web no estaba traducida:
// estaba siendo parcheada en el navegador. De ahí los parpadeos, los nombres
// propios traducidos, las cadenas a medias y el cero absoluto de SEO
// multilingüe (un robot no ejecuta el MutationObserver).
//
// Ahora: si una clave falta, se ve que falta. `saveMissing` + un
// `missingKeyHandler` que grita en consola, y `scripts/check-i18n.mjs` que
// rompe el build antes de desplegar. Un idioma se publica cuando está
// completo, no antes.
//
// - 6 idiomas: es (fuente de verdad, raíz), en, fr, de, nl, ar.
// - Detección: `?lang=XX` → localStorage `misautonomos.lang` → es.
//   NUNCA leemos navigator.language: un visitante nuevo ve SIEMPRE español,
//   quien quiera otro idioma usa el selector (y se le recuerda).
// - Carga: sólo `es` va bundleado eager. El resto se importa dinámicamente al
//   cambiar de idioma — cada JSON en su propio chunk (Vite lo resuelve por el
//   import() con string interpolado sobre un directorio conocido).
// - Los idiomas con prefijo de URL (ver PREFIXED) mandan sobre localStorage:
//   un enlace /ar compartido por WhatsApp abre en árabe aunque el que lo
//   reciba tuviera español guardado.

import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

import es from './locales/es.json';
import { LANGS, DEFAULT_LANG, PREFIXED, RTL_CODES } from './langs.js';

export const ALL_CODES = LANGS.map((l) => l.code);

// Lo que ve el selector de idioma. Un idioma a medio traducir no se enseña:
// enseñarlo significa servir español con etiqueta de francés, que es
// exactamente el problema que veníamos a arreglar.
export const SUPPORTED = LANGS.filter((l) => l.ready);
export const SUPPORTED_CODES = SUPPORTED.map((l) => l.code);

export { DEFAULT_LANG, PREFIXED, RTL_CODES };

export function langFromPath(pathname) {
  if (typeof pathname !== 'string') return null;
  for (const code of PREFIXED) {
    const prefix = `/${code}`;
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) return code;
  }
  return null;
}

// Basename para el BrowserRouter: React Router quita el prefijo de todos los
// `useLocation()` y lo vuelve a poner en todos los `<Link>`. Ningún
// componente de la app tiene que saber que existe — es lo que hace que
// añadir un idioma prefijado sea seguro sobre 82 páginas.
export function routerBasename() {
  if (typeof window === 'undefined') return undefined;
  const code = langFromPath(window.location.pathname);
  return code ? `/${code}` : undefined;
}

const PATH_LANG = typeof window !== 'undefined' ? langFromPath(window.location.pathname) : null;

// Migración única de la clave antigua. El selector de Base44 guardaba el
// idioma en localStorage 'language'; el detector de ahora lee
// 'misautonomos.lang'. Sin esto, quien había elegido inglés volvería a ver
// español el primer día tras el despliegue y pensaría que se ha roto.
if (typeof window !== 'undefined') {
  try {
    const legacy = window.localStorage.getItem('language');
    if (legacy && !window.localStorage.getItem('misautonomos.lang')) {
      window.localStorage.setItem('misautonomos.lang', legacy);
    }
    if (legacy) window.localStorage.removeItem('language');
  } catch (_e) { /* localStorage inaccesible: modo privado, sin drama */ }
}

export const isRTL = (code) => RTL_CODES.includes((code || '').split('-')[0]);

// El idioma con el que una pantalla debe DECIDIR, no el que i18next tiene
// puesto. No son lo mismo, y confundirlos rompió tres páginas.
//
// `i18n.language` puede valer 'fr', 'de', 'nl' o 'ar': `supportedLngs` los
// acepta todos y el detector lee `?lang=XX`. Pero sólo `es` y `en` tienen
// JSON completo (los demás están `ready: false` en langs.js), así que en esos
// idiomas `t()` cae al español por `fallbackLng`.
//
// El problema aparece en las pantallas que eligen texto a mano —
// `language === 'es' ? textoEs : textoEn`, con contenido de la base de datos
// en dos columnas. Con `?lang=fr`, `i18n.language.split('-')[0]` devolvía
// 'fr', la comparación fallaba y esas pantallas se pintaban en INGLÉS
// mientras la cabecera, que usa `t()`, seguía en español. Medido en
// /ayuda?lang=fr: menú en español, cuerpo en inglés, en la misma pantalla.
//
// `uiLang()` devuelve siempre uno de los idiomas realmente publicados,
// cayendo a `es`. Es lo que hacía `useLanguage()` antes del swap de UI, y lo
// que se perdió al migrarlo a `useTranslation()` a mano.
//
//   const { i18n } = useTranslation();
//   const language = uiLang(i18n.language);   // 'es' | 'en', nunca 'fr'
export function uiLang(language) {
  const short = (language || DEFAULT_LANG).split('-')[0];
  return SUPPORTED_CODES.includes(short) ? short : DEFAULT_LANG;
}

// Cargador perezoso: el import() con variable interpolada crea un chunk por
// JSON (Vite lo resuelve en build porque `./locales/${code}.json` apunta a un
// directorio conocido). Cada idioma se descarga una sola vez.
const loaded = new Set([DEFAULT_LANG]);
async function loadLocaleAsync(code) {
  if (loaded.has(code)) return;
  try {
    const mod = await import(`./locales/${code}.json`);
    i18n.addResourceBundle(code, 'translation', mod?.default || mod, true, true);
    loaded.add(code);
  } catch (e) {
    console.error(`[i18n] Falla al cargar el bundle "${code}":`, e);
  }
}

// ── Bundle de aplicación ─────────────────────────────────────────────────
//
// Las pantallas internas (admin, CRM, facturación, presupuestos…) suman 2.956
// claves: 127 kB que un visitante de la home no necesita. Viven en
// `<lang>.app.json` y sólo se descargan cuando se abre una página que las usa.
//
// Quien dispara la carga es `lazyApp()` (src/lib/lazyWithRetry.js): encadena
// esta promesa a la del chunk de la página, de modo que el <Suspense> que ya
// envuelve las rutas espera a las dos cosas. Por eso nunca se ve una clave
// cruda: cuando la página pinta, sus textos ya están dentro.
//
// Se recuerda por idioma. Si el usuario ya estaba dentro de la app y cambia de
// idioma, `changeLanguage` vuelve a pedir el bundle de aplicación del idioma
// nuevo antes de conmutar.
const appLoaded = new Set();
const appPending = new Map();

export function ensureAppLocale(code = i18n.language) {
  const short = (code || DEFAULT_LANG).split('-')[0];
  if (!ALL_CODES.includes(short) || appLoaded.has(short)) return Promise.resolve();
  if (appPending.has(short)) return appPending.get(short);

  const p = import(`./locales/${short}.app.json`)
    .then((mod) => {
      i18n.addResourceBundle(short, 'translation', mod?.default || mod, true, true);
      appLoaded.add(short);
    })
    .catch((e) => {
      // Que falle el bundle de aplicación no puede tumbar la página: se
      // pintarán claves crudas en esa pantalla, que es feo pero navegable, y
      // el error queda en consola. Lo quitamos de `appPending` para que un
      // segundo intento (otra navegación) vuelva a pedirlo.
      console.error(`[i18n] Falla al cargar el bundle de aplicación "${short}":`, e);
      appPending.delete(short);
    });

  appPending.set(short, p);
  return p;
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    // Sólo `es` al arrancar. Los demás entran por addResourceBundle cuando su
    // chunk llega. Un visitante con localStorage=`en` ve español ~150 ms y
    // luego el cambio ocurre sin recarga.
    resources: { es: { translation: es } },
    fallbackLng: DEFAULT_LANG,
    supportedLngs: ALL_CODES,
    nonExplicitSupportedLngs: true, // "es-ES" → "es"
    interpolation: { escapeValue: false },
    // Si la URL lleva prefijo de idioma, MANDA: ni detección ni localStorage.
    lng: PATH_LANG || undefined,
    detection: {
      order: ['querystring', 'localStorage'],
      lookupQuerystring: 'lang',
      lookupLocalStorage: 'misautonomos.lang',
      caches: ['localStorage'],
    },
    // Una línea, y decide el idioma de la app para todo el que no hable
    // español. Sólo `es` va embarcado; los demás llegan por
    // addResourceBundle. Pero el detector YA dejó language='en' antes de que
    // llegara el bundle, así que no se dispara ningún `languageChanged`: los
    // recursos aterrizan en silencio y react-i18next no repinta nunca. La app
    // se abriría en español en cada arranque para cualquier no hispanohablante.
    react: { bindI18nStore: 'added' },
    returnEmptyString: false,
    // Sin `parseMissingKeyHandler`. Una clave que falta devuelve la clave, se
    // ve a simple vista y `npm run check:i18n` rompe el build. Inventar la
    // traducción a partir del nombre de la clave es lo que teníamos antes.
    saveMissing: true,
    missingKeyHandler: (lngs, ns, key, fallbackValue) => {
      // `categories.{slug}` viene de la BD y cae al nombre de la fila.
      if (typeof key === 'string' && key.startsWith('categories.')) return;
      console.error(
        `[i18n MISSING] lng=${(lngs || []).join(',')} ns=${ns} key="${key}" fallback="${fallbackValue}"`,
      );
    },
  });

// Si el detector eligió algo distinto de `es`, disparamos la carga ya: la
// vista pinta en español un instante y hace el swap sin recarga.
const detected = (i18n.language || DEFAULT_LANG).split('-')[0];
if (detected !== DEFAULT_LANG && ALL_CODES.includes(detected)) {
  loadLocaleAsync(detected);
}

// Cualquier cambio posterior: cargamos primero, y así el listener de
// `languageChanged` que sincroniza lang/dir dispara con el bundle ya
// disponible (evita ver el idioma anterior una fracción de segundo).
const originalChangeLanguage = i18n.changeLanguage.bind(i18n);
i18n.changeLanguage = async (code, ...rest) => {
  const short = (code || DEFAULT_LANG).split('-')[0];
  if (ALL_CODES.includes(short)) {
    // Si el usuario ya tenía cargado el bundle de aplicación del idioma
    // anterior, está DENTRO de una pantalla interna: pedimos también el del
    // idioma nuevo antes de conmutar. Sin esto, cambiar de idioma en el CRM
    // dejaba media pantalla en claves crudas hasta la siguiente navegación.
    const needApp = appLoaded.size > 0;
    await Promise.all([loadLocaleAsync(short), needApp ? ensureAppLocale(short) : null]);
  }
  return originalChangeLanguage(code, ...rest);
};

// Sincroniza <html lang> y <html dir>. Helmet puede sobrescribir lang por
// página, pero esta base garantiza un primer render correcto (sin flash LTR
// al cargar en árabe).
function syncHtmlLang(lng) {
  const short = (lng || DEFAULT_LANG).split('-')[0];
  if (document.documentElement.lang !== short) document.documentElement.lang = short;
  const dir = isRTL(short) ? 'rtl' : 'ltr';
  if (document.documentElement.dir !== dir) document.documentElement.dir = dir;
}
syncHtmlLang(i18n.language);
i18n.on('languageChanged', syncHtmlLang);

export default i18n;
