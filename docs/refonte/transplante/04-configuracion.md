# 04 · Superficies de configuración y marca

Fase de solo lectura. Estado examinado: khdemlidaba en HEAD `794e657` (solo ficheros trackeados; los posts/vídeos sin trackear no cuentan), misautonomos en HEAD `2fe07a7`. Greps con `git grep` (khdemlidaba) y `grep -rn` (misautonomos), consultas `select` contra los dos proyectos Supabase, y la API de proyectos de Supabase para la región.

Convención de este documento: cada hallazgo lleva `fichero:línea` del repo de khdemlidaba (`/Users/bigseo/khdemlidaba/…`) salvo que se indique `[mis]`, que apunta a `/Users/bigseo/Desktop/misaut-nomos/…`. «Valor nuevo» es la propuesta para la réplica.

---

## 0. Lo esencial

- El dominio `khdemlidaba.ma` aparece en **172 ficheros trackeados**; en `src/` hay **163 ocurrencias** (110 en los 6 JSON de idioma, 53 en 35 ficheros de código). Solo **4 constantes** leen `VITE_SITE_URL`; el resto está en duro.
- El nombre `KhdemliDaba` (cualquier grafía) está en **174 ficheros** fuera de los locales, **165 ocurrencias en `src/`** (78 líneas con la grafía exacta `KhdemliDaba`), **123 ocurrencias en 19 de las 21 edge functions**, y 87/87/87/86/87/25 claves en fr/es/de/nl/en/ar (más 78 en grafía árabe «خدملي»).
- El project ref `eiacoozyubxkbjwhgkml` está en **21 ficheros**, de los cuales 7 son operativos: `src/lib/supabase.js:15`, `index.html:64-65`, `vercel.json:41` (5 veces en la CSP), `codemagic.yaml:144,168,584`, `supabase/migrations/20260801200000_admin_notifications.sql:92`, `supabase/.temp/linked-project.json:1` (está trackeado) y `scripts/lib/louay-standalone.mjs:31`.
- El idioma por defecto `fr` y el prefijo `/ar` no viven en un sitio: viven en **9 ficheros de `src/`**, en `api/prerender.js` (10 tramos), en `scripts/generate-sitemap.js`, en `vercel.json` (11 rewrites + 1 redirect), en el AASA (5 entradas) y en el AndroidManifest (5 `pathPrefix`). misautonomos ya tiene la generalización correcta (`src/i18n/langs.js` con `DEFAULT_LANG='es'`, `PREFIXED=[]`): conviene portarla al código trasplantado, no al revés.
- País del teléfono: `'MA'` en **6 ficheros** (`CountryPhoneInput.jsx:31,106`, `PhoneWhatsAppFields.jsx:20,104`, `whatsapp.js:33`, `OnboardingPro.jsx:145`, `NativeRegisterWizard.jsx:378`, `ProfessionalProfile.jsx:317`) + `+212` en 4 placeholders y 5 claves × 6 idiomas. **Riesgo real**: `toE164()` convierte un nacional de 9 cifras en `+212…` mientras el fallback siga en `'MA'`; hay que cambiarlo antes de migrar un solo teléfono.
- Moneda: «DH»/«MAD» en **12 líneas de `AdminPromos.jsx`**, `promo.js:184`, `quote.js:33`, 3 componentes, 2 claves × 5 idiomas, 7 edge functions y **7 columnas `*_mad`** del esquema (`promo_orders`, `promo_settings`). El proveedor de pago es **YouCan Pay** (`_shared/payments.ts:94-130`, `currency:'MAD'`, `country_code:'MA'`): no sirve en España.
- **No existe número de WhatsApp de soporte en el código**: `VITE_WHATSAPP_SUPPORT` (`.env.example:13`) tiene 0 usos. Tampoco `VITE_SITE_NAME` ni `VITE_PHONE_AUTH`.
- Colores: en los tokens hay que tocar **4 variables en la web**, **5 en la app clara y 5 en la oscura** (más los neutros cálidos de la app si se quiere coherencia). Fuera de los tokens hay **74 líneas con hex naranja** (19 en `src/`, 31 en edge functions, 3 en `api/prerender.js`, 3 en `capacitor.config.ts`, 2 en `index.html`, 5 en los SVG de `public/`, 1 en `site.webmanifest`, 1 en `LaunchScreen.storyboard`, 5 en scripts de marketing, 2 en `theme.js`). `tailwind.config.js` no lleva ningún color literal: no requiere cambios.
- Logos: misautonomos tiene `logo-192.png`, `logo-512.png` (azulejo marino con herramientas doradas), `og-image.png` 1200×630, `apple-touch-icon.png` 180 y `favicon.ico`; **no tiene ningún SVG** (solo `src/assets/react.svg`), ni logotipo horizontal, ni variante blanca, ni icono maskable, ni `favicon.svg`. `Logo.jsx` del modelo espera un SVG horizontal 208×40 (`width = height × 5.2`).
- La región del proyecto `dquxsethatxtptfviiwd` es **eu-west-2 (Londres)**, no eu-west-3 (París) como publica `src/lib/legal.js:51`. Importa para la cláusula de transferencias de la política de privacidad (Reino Unido = fuera de la UE, con decisión de adecuación).

---

## 1. Alcance y método

Capa cubierta: todo lo que khdemlidaba escribe en duro y en misautonomos cambia (dominio, proyecto Supabase, nombre, idioma/prefijo, teléfono, moneda, soporte, identidad nativa, logos/manifests/`index.html`, `vercel.json`, remitentes, Telegram, legal, datos geográficos y de idiomas, scripts de build, `codemagic.yaml`, `capacitor.config.ts`, `.env.example`, tokens de color). Fuera de la capa: esquema de datos, migración de perfiles/usuarios/blog, categorías españolas, rutas en sí (solo señalo dónde los slugs franceses tocan configuración).

Excluidos de los conteos por ser contenido y no configuración: `docs/`, `public/sitemap.xml` (833 KB generados), `public/seo-i18n-ar.json`, `public/blog/`, `public/site/`, `client-sites/`, `scripts/post-*`, `scripts/video-*`, `scripts/site-batch-*`, `scripts/sites-clients.json`, `supabase/snapshots/`, `package-lock.json`.

---

## 2. Inventario por superficie

### 2.1 Dominio `khdemlidaba.ma` → `misautonomos.es`

**Conteo**: 172 ficheros trackeados; `src/` 163 ocurrencias (locales: fr 19, en 19, es 19, de 19, nl 19, ar 15 = 110; código: 53 en 35 ficheros); `api/` 7; `supabase/functions/` 44 en 14 ficheros; `supabase/migrations/` 8 en 4 ficheros; nativo 5; scripts/tests 46.

**a) Constantes de sitio** (todas deberían leer una sola fuente; hoy solo 4 leen `VITE_SITE_URL`):

| Fichero:línea | Hoy | Valor nuevo |
|---|---|---|
| `src/components/SEO.jsx:13` | `import.meta.env.VITE_SITE_URL \|\| 'https://khdemlidaba.ma'` | fallback `'https://misautonomos.es'` |
| `src/lib/promo.js:79` | `SITE_URL = 'https://khdemlidaba.ma'` (duro) | leer de `SEO.jsx`/`brand.js` |
| `src/pages/BlogPost.jsx:26` | `SITE_URL` duro | ídem |
| `src/pages/EnLigneLanding.jsx:23` | `SITE_URL` duro | ídem |
| `src/components/ObtainReviewsCard.jsx:24` | `PUBLIC_SITE` duro | ídem |
| `src/components/ReviewShareBlock.jsx:22` | `PUBLIC_SITE` duro | ídem |
| `api/prerender.js:32` | `SITE_URL` duro (sin env) | `process.env.VITE_SITE_URL \|\| 'https://misautonomos.es'` |
| `api/blog/og.js:7`, `api/blog/rss.js:4` | duro | ídem |
| `scripts/generate-sitemap.js:53`, `scripts/validate-sitemap.mjs:36`, `scripts/smoke-metier-landings.mjs:13` | env con fallback `.ma` | fallback `.es` |
| `scripts/captures-site.mjs:15` | `BASE` duro | `.es` |

**b) URLs absolutas inline en `src/`** (53 ocurrencias; las que no son comentario):
`src/pages/Home.jsx:78,84` (JSON-LD WebSite + SearchAction `/recherche?q=`), `src/pages/CategoryLanding.jsx:80-81`, `src/pages/CityLanding.jsx:65-66`, `src/pages/ComboLanding.jsx:87-90` (breadcrumbs JSON-LD), `src/pages/Favorites.jsx:100` (canonical `/favoris`), `src/pages/OnboardingPro.jsx:1545` (`/professionnel/{slug}`), `src/pages/ProfessionalProfile.jsx:513`, `src/components/CvGratuitSection.jsx:9`, `src/components/FreeToolsSection.jsx:7`, `src/lib/native.js:512` (`redirectURI` de Sign in with Apple), `src/lib/native.js:807-808` (`authRedirectBase`), `src/lib/nativeBoot.js:188,290`, `src/components/NativeShell.jsx:35` (`INTERNAL_HOSTS = {'khdemlidaba.ma','www.khdemlidaba.ma','khdemlidaba.vercel.app'}` → `{'misautonomos.es','www.misautonomos.es','misautonomos.vercel.app'}`), `src/lib/localServiceDiscovery.js:42` (filtra el sitemap por `url.origin === 'https://khdemlidaba.ma'`), `src/lib/quoteDocument.js:35` (pie del PDF de presupuesto), `src/pages/MentionsLegales.jsx:41`, `src/pages/LouayAdminRedirect.jsx:13,15` (eliminar: es un cliente marroquí).

**c) Email `bonjour@khdemlidaba.ma`** en código: `src/lib/legal.js:13` (`RESPONSABLE_EMAIL`), `src/pages/Contact.jsx:8` (`SUPPORT_EMAIL`), `src/pages/Dashboard.jsx:154`, `src/pages/DeleteAccount.jsx:62`, `src/pages/Unsubscribe.jsx:74`, `src/components/AdminReplyMail.jsx:1,30,39,49,64`. Valor nuevo: una sola dirección (ver pregunta abierta 4: hoy misautonomos usa cuatro distintas).

**d) Raíz y `public/`**: `index.html:18,35,36,44`; `public/robots.txt:27` (`Sitemap:`); `public/llms.txt:6-24` (15 enlaces, 5 oficios y 5 ciudades marroquíes); `.env.example:6,17`; `vercel.json:20-30` (11 redirecciones de host: `www.`, `khadamapro.ma`, `khedmlidaba.ma`, `khdamlidaba.ma`, `khdemlidaba.com`, `khdmli.ma` y sus `www.` → sustituir por la única de misautonomos, `[mis] vercel.json:8-17`, `www.misautonomos.es → misautonomos.es`).

**e) Locales** — las 19 claves de `fr.json` que contienen el dominio (las mismas en en/es/de/nl; ar tiene 15): `footer.copyright`, `account.delete_error`, `legal.legal_body.0`, `legal.legal_body.2`, `legal.privacy_body.2`, `legal.contact_body.0`, `contact_form.err_submit_failed`, `whatsapp.template`, `cookies.page_intro`, `privacy.controller_intro`, `privacy.social_diffusion_withdraw`, `legal_notice.ip_body`, `cgu.intro_body`, `cgu.social_diffusion_withdraw`, `cgu.reporting_body`, `report.err_send_failed`, `diploma.privacy_note`, `promo.transfer_closed_note`, `promo.native_order_body`.

**f) Edge functions** (constantes de URL, 9 ficheros): `annonce-offres/index.ts:33` (`SITE`), `bilan-deux-mois/index.ts:46` (`SITE`), `daily-report/index.ts:17` (`APP_URL`), `demande-avis/index.ts:44` (`SITE`), `notify-admin/index.ts:22` (`APP_URL`), `promo-checkout/index.ts:22` (`APP_URL`), `promo-mail/index.ts:55` (`APP_URL`), `relance-fiche-pro/index.ts:68` (`LIEN = …/inscription?type=pro`), `send-jcsecours/index.ts:25`. URLs inline además en `diploma-tick/index.ts:231,233,275,299`, `send-reminders/index.ts:359` y `send-reminders/templates.ts:102` (`<img src="https://khdemlidaba.ma/icon-192.png">`), `_shared/email-safety.ts:11` (enlace de baja `/desabonner?token=`). Propuesta: un `supabase/functions/_shared/brand.ts` con `SITE_URL`, `BRAND`, `FROM`, `REPLY_TO` importado por las 9 funciones.

**g) Migraciones**: `20260801200000_admin_notifications.sql:92` (`internal_config.notify_admin_url = https://eiacoozyubxkbjwhgkml.supabase.co/functions/v1/notify-admin` → URL del proyecto `dquxsethatxtptfviiwd`); `20260917200000_site_web_gratuit.sql:471-483` y `20260921080547_audit_storage_account_deletion.sql:70` (mensaje de error `use account deletion on khdemlidaba.ma`); el resto son comentarios.

**h) Nativo**: `android/app/src/main/AndroidManifest.xml:32` (`android:host`), `ios/App/App/App.entitlements:30-31` (`applinks:` y `webcredentials:`), `public/.well-known/apple-app-site-association` (12 rutas), `public/.well-known/assetlinks.json`.

**i) Tests que fijan el dominio** (actualizar o parametrizar): `scripts/lib/sitemap-utils.test.mjs` (15), `scripts/seo-prerender.test.mjs` (12; `:104-105` y `:193` exigen hreflang `ar`), `scripts/blog-seo.test.mjs` (4), `scripts/seo-locales.test.mjs:45`, `scripts/test-failsafe.mjs:27-28`.

### 2.2 Proyecto Supabase `eiacoozyubxkbjwhgkml` → `dquxsethatxtptfviiwd`

| Fichero:línea | Hoy | Valor nuevo |
|---|---|---|
| `src/lib/supabase.js:15` | `FALLBACK_URL = 'https://eiacoozyubxkbjwhgkml.supabase.co'` | `https://dquxsethatxtptfviiwd.supabase.co` (misautonomos ya lo tiene en `[mis] src/api/supabaseClient.js:5`) |
| `src/lib/supabase.js:16` | `FALLBACK_KEY = 'sb_publishable_U3834…'` (clave pública de khdemlidaba) | la publishable/anon de misautonomos (`[mis] src/api/supabaseClient.js:6-9`, `FALLBACK_ANON_KEY`) |
| `index.html:61,64,65` | preconnect/dns-prefetch al host | host nuevo (`[mis] index.html:9-10` ya lo hace) |
| `vercel.json:41` | CSP: `img-src`, `connect-src` (https + wss), `frame-src` → 5 veces el host | 5 sustituciones |
| `codemagic.yaml:137,144,168,584` | guard post-build: `grep -q "eiacoozyubxkbjwhgkml" dist/assets/*.js` | `dquxsethatxtptfviiwd` |
| `supabase/config.toml:1` | `project_id = "khdemlidaba"` | `"misautonomos"` |
| `supabase/.temp/linked-project.json:1` | `{"ref":"eiacoozyubxkbjwhgkml","name":"KhdemliDaba"…}` **trackeado en git** | no copiar; `supabase link --project-ref dquxsethatxtptfviiwd` y añadir `supabase/.temp/` al `.gitignore` |
| `supabase/migrations/20260801200000_admin_notifications.sql:92` | URL de la función `notify-admin` | host nuevo (se aplica al correr la migración) |
| `scripts/lib/louay-standalone.mjs:31`, `client-sites/louay-change/src/config.js:4` | CSP y clave del micrositio Louay | no trasplantar |
| `README.md:42,78,89`, `android/README.md:35`, `ios/README.md:71,92,102` | documentación | reescribir |

Buckets de storage (consulta a las dos bases): khdemlidaba tiene `photos` (público), `credentials`, `cv-documents`, `website-briefs` (privados); misautonomos tiene solo `uploads` (público). El código referencia `storage.from('photos')` 3 veces y `'credentials'` 1 vez (src + functions). La creación de buckets es de la capa de datos; para esta capa basta con que la CSP apunte al host (`img-src https://dquxsethatxtptfviiwd.supabase.co`). `.github/workflows/quality.yml:18-19` usa placeholders (`https://ci.example.test`): no cambia.

### 2.3 Nombre `KhdemliDaba` → `MisAutónomos`

Sitios que fijan la marca para todo lo demás:

| Fichero:línea | Qué |
|---|---|
| `src/components/SEO.jsx:16` | `BRAND_SUFFIX = ' \| KhdemliDaba'` → `' \| MisAutónomos'` |
| `src/components/SEO.jsx:19` | título por defecto «Trouvez un professionnel de confiance au Maroc» |
| `src/components/SEO.jsx:148,157` | `og:site_name`, `og:image:alt` |
| `index.html:23,24,30,33,34,39,42,43` | `<title>`, description, OG, Twitter |
| `public/site.webmanifest:2-4` | `name`, `short_name`, `description` (`[mis] public/manifest.json:2-4` ya en español) |
| `capacitor.config.ts:12` | `appName: 'KhdemliDaba'` → `'MisAutónomos'` (`[mis] capacitor.config.ts:5`) |
| `android/app/src/main/res/values/strings.xml:3-4` | `app_name`, `title_activity_main` |
| `ios/App/App/Info.plist:10,36,54` + `ios/App/App/{fr,en,es,de,nl,ar}.lproj/InfoPlist.strings` (6 ficheros × 3-4 cadenas) | nombre y purpose strings |
| `src/components/Logo.jsx:6` | `alt="khdemlidaba"` |
| `api/prerender.js` (29 ocurrencias) | sufijos `\| KhdemliDaba` en ~20 títulos, `:262,270` JSON-LD Organization/WebSite, `:987` wordmark literal `khdemli<span>daba</span>` del splash de prerender, ids CSS `#kd-pre`, `.kd-mark`, `html.kd-js` |
| `api/blog/og.js:43,49,127,129,159`, `api/blog/rss.js:40,49` | sufijo, `site_name`, publisher, autor por defecto |
| `src/lib/whatsapp.js:67` | `DEFAULT_TEMPLATE` «…je vous ai trouvé sur KhdemliDaba.ma…» |
| `src/pages/Cookies.jsx:16-22` | `issuer: 'KhdemliDaba'` ×7 y nombres de cookie con prefijo |
| `src/pages/AdminBlog.jsx:104,149`, `src/pages/BlogPost.jsx:153,156` | autor/publisher por defecto |
| `src/pages/Home.jsx:77` | JSON-LD `name` |
| `src/lib/cv.js:69`, `src/lib/cvDocument.js:38`, `src/lib/quoteDocument.js:27` | nombre de fichero PDF y `creator` |
| `src/components/ObtainReviewsCard.jsx:47`, `src/components/ReviewShareBlock.jsx:90`, `src/pages/OnboardingPro.jsx:1551` | `share({ title: 'KhdemliDaba' })` |
| `PageTitle eyebrow="KhdemliDaba"` | `Blog.jsx:84`, `Conditions.jsx:35`, `Contact.jsx:74,100`, `Cookies.jsx:32`, `DeleteAccount.jsx:47`, `EnLigneLanding.jsx:68`, `Favorites.jsx:112`, `MentionsLegales.jsx:32`, `Privacy.jsx:42` (10 líneas) |
| `<SEO title="… — KhdemliDaba">` en admin/privadas | `Admin.jsx:80`, `AdminReport.jsx:100`, `DemandeDetail.jsx:99`, `Demandes.jsx:114`, `DemandesNouvelle.jsx:146,200,224`, `DevisGratuit.jsx:40`, `MesCandidatures.jsx:81`, `MesDemandes.jsx:160`, `Salaires.jsx:55`, `Unsubscribe.jsx:35` |
| Pantallas nativas | `NativeLangPicker.jsx:123`, `NativeWelcome.jsx:64`, `NativeAccount.jsx:294`, `More.jsx:144`, `Search.jsx:271` (wordmark en texto, 19 px) |
| `src/lib/nosReseaux.js:16` | Instagram `@khdemlidaba` → cuenta de MisAutónomos (si existe; si no, `handle: ''` y el pie la oculta) |
| `src/lib/appStore.js:6`, `src/lib/legal.js:32`, `src/lib/promo.js:150` | comentarios/documentación |
| `package.json:2` | `"name": "khdemlidaba"` |
| `codemagic.yaml:1,15,19,33-34,251,532,546,548` | nombre, grupos `khdemlidaba_vite`/`khdemlidaba_appstore`/`khdemlidaba_upload`, `--name "KhdemliDaba"` |
| `android/keystore.properties.example:8-19` | alias/`.jks`/`CN=KhdemliDaba, L=Casablanca, C=MA` |
| `supabase/functions/*` | 123 ocurrencias en 19 ficheros: barras de cabecera HTML `KhdemliDaba` (`annonce-offres:93`, `demande-avis:281`, `livraison-site:156`…), prefijo `[URGENT] KhdemliDaba` (`_shared/senders.ts:140`), `promo-mail:23` «Admin · KhdemliDaba», remitentes (§2.11) |
| `supabase/migrations/20260801000000_blog_posts.sql:13` | `author text not null default 'KhdemliDaba'` |
| `supabase/migrations/20260923120000_push_apns_trigger.sql:47` | título push por defecto |
| `supabase/migrations/20260910120000_promo_instagram.sql:3,463,469`, `20260917170000…:94,955,961` | «publié sur @khdemlidaba» en mensajes de la RPC |

Locales: 87 cadenas en fr/es/de/nl, 86 en en, 25 en ar (+78 «خدملي»). Grafía a decidir: el `index.html` actual de misautonomos mezcla `MisAutónomos` (`:36,55,56`) y `misAutónomos` (`:41,43,51,106`); el logotipo PNG dice «misAutónomos». Recomiendo fijar una (`MisAutónomos` en texto, «misAutónomos» solo en el logotipo) y exponerla desde un único módulo `src/lib/brand.js` (`BRAND_NAME`, `SITE_URL`, `SUPPORT_EMAIL`) en vez de reproducir el hardcode.

### 2.4 Idioma por defecto `fr` → `es`, y el prefijo `/ar`

Hoy el francés vive en la raíz y el árabe en `/ar`; en/es/de/nl van solo por selector + localStorage. Para misautonomos: español en la raíz, **sin prefijo para ningún idioma** (lo pide el encargo). misautonomos ya tiene la forma generalizada en `[mis] src/i18n/langs.js:12-29` (`LANGS` con `ready`, `DEFAULT_LANG = 'es'`, `PREFIXED = []`, `RTL_CODES`) y `[mis] src/i18n/index.js:47-64` (`langFromPath`/`routerBasename` sobre `PREFIXED`): es la versión que hay que conservar al trasplantar, cambiando `AR_PREFIX` por `PREFIXED`.

| Fichero:línea | Hoy | Valor nuevo |
|---|---|---|
| `src/i18n/index.js:16` | `import fr from './locales/fr.json'` | `es` |
| `src/i18n/index.js:18-25` | `SUPPORTED` con `fr` primero | `es, en, fr, de, nl, ar` |
| `src/i18n/index.js:48-62` | `AR_PREFIX = '/ar'`, `langFromPath`, `routerBasename` | `PREFIXED = []` (patrón de `[mis] langs.js`) |
| `src/i18n/index.js:72` | `loaded = new Set(['fr'])` | `['es']` |
| `src/i18n/index.js:95-97` | `resources: { fr }`, `fallbackLng: 'fr'` | `es` |
| `src/i18n/index.js:109` | `lookupLocalStorage: 'khdemlidaba.lang'` | `'misautonomos.lang'` (`[mis] index.js:70-79` ya migra la clave legada `language`) |
| `src/i18n/index.js:141-142,151,160` | `'fr'` como defecto | `'es'` |
| `src/lib/seoLocales.js:3-13` | `ARABIC_SEO_PATHS` (9 rutas francesas) y `:25` regex `^/ar` | eliminar o generalizar a `PREFIXED` |
| `src/components/SEO.jsx:3-4,66-88,140-142` | canonical/hreflang `fr`/`ar`/`x-default` | sin hreflang si `PREFIXED` está vacío |
| `src/components/LangSwitcher.jsx:8,56-59` | construye `/ar/...` | sobre `PREFIXED` |
| `src/lib/nativeBoot.js:35,65-66` | recorta `/ar` de deep links | ídem |
| `src/main.jsx:10,51` | `basename={routerBasename()}` | igual (la función cambia por dentro) |
| `api/prerender.js:272` | `inLanguage: 'fr'` | `'es'` |
| `api/prerender.js:768-782` | `AR_PREFIX` y la lógica `isAr` | eliminar |
| `api/prerender.js:822,1028,1108` | `locale: 'ar' \| 'fr'` | `'es'` |
| `api/prerender.js:1168-1210` | hreflang `fr`/`ar`/`x-default` | sin bloque |
| `api/prerender.js:1187,1242-1247` | `<html lang="fr">`/`lang="ar" dir="rtl"` | `lang="es"` |
| `scripts/generate-sitemap.js:294-321` (`AR_PREFIX`, hreflang), `:410`, `:522` | pares fr/ar por URL | una entrada por URL |
| `scripts/build-seo-i18n.mjs` (77 líneas) + `public/seo-i18n-ar.json` + `vercel.json:14` (`includeFiles`) + paso `node scripts/build-seo-i18n.mjs` en `package.json` build | metadatos árabes para el prerender | innecesario sin `/ar` |
| `vercel.json:19` (redirect) y `:120-126,128-131` (11 rewrites `/ar/...`) | — | eliminar |
| `public/.well-known/apple-app-site-association:11-15`, `android/app/src/main/AndroidManifest.xml` (5 `pathPrefix="/ar/..."`) | — | eliminar |
| `index.html:2` `lang="fr"`, `:32` `og:locale fr_FR`; `api/blog/og.js:49,135`; `public/site.webmanifest:9`; `ios/App/App/Info.plist:8` (`CFBundleDevelopmentRegion fr`), `:57-65` (orden `fr, ar, en, es, de, nl`) | — | `es`, `es_ES`, `es` primero |
| `scripts/check-i18n-keys.py:26-27` (`LOCALES`, `REFERENCE = 'fr'`), `scripts/check-i18n-slugs.mjs:23-24` (`BASE = 'fr'`) | — | `REFERENCE/BASE = 'es'` |
| `scripts/seo-locales.test.mjs`, `scripts/seo-prerender.test.mjs:104-105,193`, `scripts/blog-seo.test.mjs:32` | aserciones sobre `/ar` | reescribir |

Fuente de verdad de las traducciones: hoy `fr.json` (1828 claves hoja, 68 bloques de primer nivel; `src/i18n/index.js:2` lo declara). Tras el trasplante la referencia es `es.json` (ya existe, mismas claves). Advertencia de contenido, no de configuración: `es.json` es la traducción del producto marroquí (26 cadenas con «Marruecos», 6 con ciudades marroquíes, 87 con la marca); la capa de textos tendrá que reescribirlas, no solo renombrarlas.

**Locales de formato y zona horaria** (misma familia de hardcode):
- `src/lib/dates.js:87-88`: `DATE_LOCALE = { ar: 'ar-MA', fr: 'fr-MA' }`, `NUMBER_LOCALE = { ar: 'ar-MA', fr: 'fr-FR' }` → `{ es: 'es-ES', en: 'en-GB', fr: 'fr-FR', de: 'de-DE', nl: 'nl-NL', ar: 'ar' }`; `:102,113` fallback `'fr-FR'` → `'es-ES'`.
- 29 llamadas con `'fr-FR'` en duro: `src/components/AdminClientResults.jsx:20`, `AdminProductFunnel.jsx:22`, `PromoInstagramSection.jsx:39`, `src/lib/promo.js:184`, `src/pages/AdminCv.jsx:46`, `AdminDiplomes.jsx:179,180,189,192`, `AdminPromos.jsx:81-82`, `AdminReport.jsx:27,32`, `AdminSites.jsx:51`, `MesPaiements.jsx:251`, `PromoInstagram.jsx:88`; `supabase/functions/daily-report/index.ts:279,287`, `diploma-tick/index.ts:255`, `notify-admin/index.ts:691`, `promo-mail/index.ts:396,398`.
- `Africa/Casablanca` (UTC+1 sin horario de verano) → `Europe/Madrid`: `supabase/functions/daily-report/index.ts:18` (`TZ`), `promo-mail/index.ts:396`, `src/pages/AdminReport.jsx:32`, `src/pages/MesDemandes.jsx:277`, migraciones `20260828100000_email_reorg.sql:128`, `20260910120000_promo_instagram.sql:130`, `20260927130000_retours_clients_trente_jours.sql:55-56`; los 8 crons de `vercel.json:143-152` están en UTC (`0 7 * * *` = 09:00 en Madrid en verano, 08:00 en invierno).

### 2.5 País del teléfono: `+212` / `'MA'` → `+34` / `'ES'`

| Fichero:línea | Hoy | Valor nuevo |
|---|---|---|
| `src/components/CountryPhoneInput.jsx:31` | `PINNED = ['MA','ES','FR','BE','NL','DE','IT']` | `['ES','FR','PT','GB','DE','IT','MA']` (orden a gusto del dueño) |
| `src/components/CountryPhoneInput.jsx:106` | `defaultCountry = 'MA'` | `'ES'` |
| `src/components/PhoneWhatsAppFields.jsx:20,104` | fallback `'MA'` | `'ES'` |
| `src/lib/whatsapp.js:33` | `parsePhoneNumberFromString(digits, 'MA')` (fallback nacional) | `'ES'` — **antes de migrar datos** (§5, riesgo 2) |
| `src/lib/whatsapp.js:3-13` | comentarios con ejemplos `+212` | — |
| `src/pages/OnboardingPro.jsx:145` | `parsePhoneNumberFromString(…, 'MA')` | `'ES'` |
| `src/pages/NativeRegisterWizard.jsx:378` | `defaultCountry="MA"` | `"ES"` |
| `src/pages/ProfessionalProfile.jsx:317` | JSON-LD `addressCountry: 'MA'` | `'ES'` |
| `src/components/ContactActions.jsx:63` | decorativo `'+212 6 •• •• •• ••'` | `'+34 6•• ••• •••'` |
| `src/pages/DeleteAccount.jsx:74`, `DemandesNouvelle.jsx:309`, `Recrutement.jsx:373` | placeholders `+212 6…` | `+34 6…` |
| Locales (×6) | `auth.phone_hint_format`, `onboarding.phone_placeholder`, `onboarding.step_phone_placeholder`, `onboarding.step_phone_wa_placeholder`, `onboarding.step_phone_invalid`, `onboarding.hint_phone_format_ma` | ejemplos españoles |
| `supabase/functions/_shared/payments.ts:123` | `country_code: 'MA'` | depende del proveedor (§2.6) |
| `supabase/migrations/20260101000002_seed_data.sql:57-86` | 30 perfiles semilla marroquíes | no aplicar |

Dato de contexto para el riesgo: en misautonomos los teléfonos están en `professional_profiles.telefono_contacto`, `professional_profiles.whatsapp_phone_number` y `users.phone` (los tres `text`, formato no normalizado); el modelo exige E.164 con `+` (`20260724040000_professional_profiles_phone_e164.sql`).

### 2.6 Moneda `MAD`/«DH» → `EUR`/«€», y el proveedor de pago

Interfaz: `src/lib/quote.js:33` (`quoteMoney` → `' MAD'`), `src/lib/promo.js:181-184` (`formatMoney` → `' DH'` con `toLocaleString('fr-FR')`), `src/components/CvGratuitSection.jsx:24` («0 DH»), `src/pages/DevisGratuit.jsx:42` («0 DH · PDF»), `src/pages/CvGratuit.jsx:86`, `src/pages/AdminPromos.jsx:199,200,211,222,239,251,252,396,453,467,497,525` (12 líneas), `src/pages/Soutien.jsx:85`, comentarios en `PromoFeaturedCard.jsx:1`, `PromoJobCard.jsx:2-3,97`, `NativeAccount.jsx:223`. Locales: `support.any_amount`, `support.card_body` × 5 idiomas (ar no).

Edge functions: `_shared/payments.ts:87-89,115` (`currency: 'MAD'`), `:171-174` (`isMad`, `amountMad`), `annonce-offres/index.ts:64-67,114-122` (precios 50/150/200 DH en texto y HTML), `promo-mail/index.ts:412,443,454,470`, `notify-admin/index.ts:686`, `send-jcsecours/index.ts:57,118`.

Esquema (consulta a `eiacoozyubxkbjwhgkml`): 7 columnas con sufijo `_mad` — `promo_orders.amount_mad`, `promo_orders.ad_budget_mad`, `promo_settings.price_mad`, `featured_price_mad`, `job_price_mad`, `ad_budget_mad`, `job_ad_budget_mad` — más `promo_settings.bank_rib/bank_iban/bank_bic/bank_name/bank_agency/bank_holder` (datos bancarios marroquíes para el pago por transferencia; 1 fila) y los mensajes `'Montant reçu %s DH, attendu %s DH.'` en 3 migraciones (`20260910120000:353`, `20260912100000:321`, `20260917170000:753`). La migración `20260917240000_soutien_don.sql` crea la tabla de RIB para donaciones.

Proveedor: **YouCan Pay** (marroquí), `_shared/payments.ts:4,64,70-130`, secretos `PAYMENT_PROVIDER`, `YOUCANPAY_PRIVATE_KEY`, `YOUCANPAY_MODE`. En España hace falta otro adaptador (misautonomos ya tiene `VITE_STRIPE_PUBLIC_KEY` en `.env.local` y las tablas `subscription_plans`, `subscriptions`, `payment_records` de su modelo por suscripción). Decisión del dueño (§6, pregunta 3).

### 2.7 WhatsApp de soporte

No hay número de soporte en el código de khdemlidaba: `VITE_WHATSAPP_SUPPORT=212600000000` solo existe en `.env.example:13` y tiene **0 usos** en `src/`, `api/` y `scripts/`. Todas las URLs `wa.me` son del profesional (`src/lib/whatsapp.js:87`, `src/pages/MesDemandes.jsx:303`, `AdminReport.jsx:51`, `AdminVerifier.jsx:73`, `daily-report/index.ts:270`) o sin destinatario para compartir (`ShareButton.jsx:64`, `ObtainReviewsCard.jsx:51`, `ReviewShareBlock.jsx:94`, `OnboardingPro.jsx:1555`). Lo que sí cambia: las plantillas admin en francés/darija con la marca, `AdminReport.jsx:50` y `AdminVerifier.jsx:14`. misautonomos tampoco tiene número de soporte; `[mis] src/pages/AdminOutreachWhatsApp.jsx:30` firma «Soy Ilias, de MisAutónomos».

### 2.8 App Store, bundle id, Apple, Google, APNs

| Fichero:línea | Hoy (khdemlidaba) | Valor nuevo (misautonomos) |
|---|---|---|
| `src/lib/appStore.js:30`, `vite.config.js:46` | fallback `'6800660020'` | `'6759524805'` (`[mis] codemagic.yaml:75`) |
| `src/lib/appStore.js:35` | `https://apps.apple.com/ma/app/khdemlidaba/id…` | `https://apps.apple.com/es/app/misautonomos/id6759524805` (slug de la ficha a confirmar) |
| `src/lib/appStore.js:42` | `PLAY_STORE_URL = ''` | URL de Play si la app está publicada |
| `capacitor.config.ts:11` | `appId: 'ma.khdemlidaba.app'` | `'com.base690076ad86e673c796768de5.app'` (`[mis] capacitor.config.ts:4`) |
| `capacitor.config.ts:12` | `appName: 'KhdemliDaba'` | `'MisAutónomos'` |
| `capacitor.config.ts:18,36,66` | `backgroundColor: '#E8590C'` | `'#00255C'` (`[mis] capacitor.config.ts:8,15` ya lo tiene) |
| `android/app/build.gradle:4,7` | `namespace`/`applicationId "ma.khdemlidaba.app"` | ver pregunta abierta 5 (misautonomos tiene `es.misautonomos.app` en `[mis] android/app/build.gradle:7` y `com.base6…app` en iOS) |
| `android/app/src/main/java/ma/khdemlidaba/app/MainActivity.java` | paquete Java | mover al paquete nuevo |
| `android/app/src/main/res/values/strings.xml:5-6` | `package_name`, `custom_url_scheme` | ídem |
| `android/app/src/main/AndroidManifest.xml:32` + 10 `pathPrefix` (`:33-45`) | host y rutas francesas | host nuevo; rutas según §2.13 |
| `public/.well-known/assetlinks.json:6,8` | `ma.khdemlidaba.app`, `REPLACE_WITH_UPLOAD_KEYSTORE_SHA256` (sigue siendo placeholder también en khdemlidaba) | paquete nuevo + huella SHA-256 real del keystore |
| `ios/App/App.xcodeproj/project.pbxproj:344,366` | `PRODUCT_BUNDLE_IDENTIFIER = ma.khdemlidaba.app` | `com.base690076ad86e673c796768de5.app` (`[mis] project.pbxproj:309,331`) |
| `ios/App/App.xcodeproj/project.pbxproj:335,342,358,365` | `CURRENT_PROJECT_VERSION = 5`, `MARKETING_VERSION = 1.4` | versión de misautonomos (hoy `1.0.0`) |
| `ios/App/App/Info.plist:78-79` | Google iOS Client ID `331709303550-qmtb…` y su scheme inverso | cliente iOS nuevo para el bundle de misautonomos (`[mis] Info.plist:77-79` solo registra el scheme del bundle) |
| `ios/App/App/App.entitlements:30-31` | `applinks:khdemlidaba.ma`, `webcredentials:khdemlidaba.ma` | `misautonomos.es` (`[mis] App.entitlements:18-19` lleva `applinks:` para `misautonomos.es` y `www.`) |
| `ios/App/App/Base.lproj/LaunchScreen.storyboard:21` | `red=0.9098 green=0.349 blue=0.047` (= `#E8590C`) | `red=0 green=0.145 blue=0.361` (= `#00255C`) |
| `public/.well-known/apple-app-site-association:6,25` | `76RVH7PMJG.ma.khdemlidaba.app` | `<TEAM_ID>.com.base690076ad86e673c796768de5.app` — el AASA actual de misautonomos tiene `REPLACE_TEAM_ID` (`[mis] …/apple-app-site-association:6`) |
| `codemagic.yaml:24,454` | `Team ID 76RVH7PMJG` | confirmar que es el mismo equipo |
| `codemagic.yaml:38` | `BUNDLE_ID: "ma.khdemlidaba.app"` | bundle nuevo (`[mis] codemagic.yaml:74`) |
| `codemagic.yaml:33-34,546,548` | grupos `khdemlidaba_vite`, `khdemlidaba_appstore`, `khdemlidaba_upload` | renombrar y recrear en Codemagic |
| `codemagic.yaml:517` | notificaciones a `benchellal12@gmail.com` | mantener o cambiar |
| `codemagic.yaml:42-55,551` | `node >= 24 < 25` (igual que `package.json engines`) | `[mis] codemagic.yaml:71` usa `node: 22.14.0`: subir a 24 |
| `src/lib/native.js:442-443` | Apple Service ID `ma.khdemlidaba.signin` (web) + bundle (app) configurados en el proveedor Apple de Supabase | Service ID nuevo (p. ej. `es.misautonomos.signin`) en el proyecto `dquxsethatxtptfviiwd` |
| `src/lib/native.js:452` | `GOOGLE_IOS_CLIENT_ID` en duro | nuevo |
| `src/lib/native.js:464` | `VITE_GOOGLE_WEB_CLIENT_ID` (env) | nuevo |
| `src/lib/native.js:511-512` | `clientId: 'ma.khdemlidaba.app'`, `redirectURI: 'https://khdemlidaba.ma/auth/callback'` | bundle y dominio nuevos |
| `supabase/functions/push-apns/index.ts:100` | fallback `APNS_BUNDLE_ID \|\| 'ma.khdemlidaba.app'` | bundle nuevo; secretos `APNS_TEAM_ID`, `APNS_KEY_ID`, `APNS_KEY_P8` (`:11-14`) |
| `.gitignore:11` | `~/khdemlidaba-apple-auth` | ruta nueva |

Iconos nativos: `resources/icon.png` (1024², naranja) y `resources/splash.png` / `splash-dark.png` (2732²) alimentan `@capacitor/assets` → `ios/App/App/Assets.xcassets/AppIcon.appiconset`, `Splash.imageset` y 24 carpetas `android/app/src/main/res/drawable*`. misautonomos tiene sus fuentes equivalentes en `[mis] assets/icon-only.png`, `icon-foreground.png`, `icon-background.png`, `splash.png`, `splash-dark.png` y un `[mis] scripts/gen-app-assets.mjs`: regenerar con ellos.

### 2.9 Logos, iconos, manifests, `index.html`

**Activos del modelo** (`public/`): `logo.svg` y `logo-white.svg` (208×40: círculo naranja + check + wordmark «khdemli»/«daba» en dos colores), `favicon.svg` (32², azulejo naranja + check), `favicon.ico` (PNG 32²), `apple-touch-icon.png` (180²), `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `og-default.png` (1200×630, símbolo + wordmark + «Trouvez un professionnel de confiance au Maroc»). Todos los PNG salen de `scripts/generate-brand-assets.js:16` (`BRAND = { orange:'#E8590C', ink:'#1A1A1A', white }`). `public/manifest.webmanifest` (iconos `../icons/*.webp`) no está enlazado desde `index.html:13` (que apunta a `/site.webmanifest`): fichero muerto, no copiar. `icons/*.webp` (7) solo lo usa ese manifest muerto.

**Quién consume el logotipo**: `src/components/Logo.jsx:2` (`/logo-white.svg` o `/logo.svg`, `width = height × 5.2`), usado en `Header.jsx:102` (h 32), `Footer.jsx:65` (h 28), `AuthCallback.jsx:169`, `ReviewSubmit.jsx:162`, `Welcome.jsx:93`; `api/prerender.js:264` (`logo: ${SITE_URL}/logo.svg` en JSON-LD); `api/blog/og.js:130` (`icon-192.png` como logo del publisher); emails `send-reminders/index.ts:359`, `templates.ts:102`, `daily-report/index.ts:412` (`icon-192.png`); `vercel.json:60` (lista de nombres con caché inmutable).

**Activos de misautonomos** (`[mis] public/`): `logo-192.png` (192², RGB, azulejo marino con llave inglesa y destornillador dorados), `logo-512.png` (512²), `og-image.png` (1200×630: fondo marino, símbolo y wordmark «misAutónomos» en blanco), `apple-touch-icon.png` (180²), `favicon-32.png` (en realidad 64×64), `favicon.ico` (3 tamaños), `manifest.json` (iconos `../icons/*.webp`, ruta fuera de `public/`: en producción no resuelven). Consumidores actuales: `[mis] src/Layout.jsx:36`, `Header.jsx:28`, `Footer.jsx:10`, `Login.jsx:309` (`/logo-192.png`); `SEOHead.jsx:202`, `StructuredData.jsx:20`, `WebsiteSchema.jsx:36`, `BlogList.jsx:121`, `BlogPost.jsx:99` (`/logo-512.png`).

**Lo que falta en misautonomos** (anotación pedida): no hay ningún SVG de marca (`find` solo devuelve `src/assets/react.svg`); no hay logotipo horizontal (el PNG es un icono cuadrado: con `Logo.jsx` reservaría `width = 5.2 × alto` para una imagen 1:1 y provocaría un salto de layout en la cabecera); no hay variante blanca para fondos marinos; no hay `favicon.svg`; no hay `icon-maskable-512.png` (el `manifest.json` declara `any maskable` sobre WebP que no se sirven). Propuesta: portar `scripts/generate-brand-assets.js` con `BRAND = { navy:'#00255C', gold:'#F5C13D', ink:'#1A1A1A', white:'#FFFFFF' }` y generar `logo.svg` (símbolo + «misAutónomos» en marino), `logo-white.svg`, `favicon.svg`, `favicon.ico`, `apple-touch-icon.png`, `icon-192/512/maskable-512.png` y `og-default.png` (1200×630 con eslogan español), conservando los nombres de fichero del modelo para no tocar `Logo.jsx`, `vercel.json:60`, `site.webmanifest`, `prerender.js:264` ni `og.js:130`. El símbolo de herramientas existe ya en `[mis] assets/icon-only.png` (217 KB, PNG): hay que vectorizarlo o redibujarlo.

**`index.html`** (84 líneas):

| Línea | Hoy | Valor nuevo |
|---|---|---|
| 2 | `<html lang="fr">` | `lang="es"` |
| 6 | `theme-color #E8590C` | `#00255C` (`[mis] index.html:107`) |
| 9-13 | favicon.svg / favicon.ico / apple-touch-icon / `site.webmanifest` | mismos nombres |
| 18,35,36,44 | `https://khdemlidaba.ma/…` | `https://misautonomos.es/…` |
| 23-24 | título «Trouvez un professionnel de confiance au Maroc \| KhdemliDaba» y description | «MisAutónomos - Encuentra autónomos y profesionales en España» (`[mis] index.html:36-37`) |
| 30-44 | OG/Twitter (`og:site_name`, `og:locale fr_FR`, `og:image …/og-default.png`) | marca, `es_ES`, misma ruta de imagen |
| 53 | `preload /fonts/inter-latin.woff2` | igual (misautonomos ya usa Inter; §2.18) |
| 61,64,65 | preconnect al host Supabase | host nuevo |
| 67-78 | `html, body { background-color: #E8590C }` (anti-flash entre LaunchScreen y primer render) | `#00255C` |

`public/site.webmanifest:2-4,9,10` (`name`, `short_name`, `description`, `lang`, `theme_color #E8590C`) → `MisAutónomos`, `es`, `#00255C`; `background_color #FFFFFF` queda. `src/lib/theme.js:43` `THEME_COLOR = { light: '#FBF6EE', dark: '#15110D' }` (barra de estado de la app) → `{ light: '#F4F6FA', dark: '#0B1120' }` (§3).

### 2.10 `vercel.json`

**Lo que tiene misautonomos hoy** (`[mis] vercel.json`, 295 líneas): ninguna cabecera de seguridad (solo 7 `Cache-Control`, 1 `Content-Type`, 1 `Service-Worker-Allowed`), 20 redirecciones (1 de host + 19 de slugs legados, `:19-120`), 25 rewrites (`/sitemap.xml → /api/sitemap.xml`, `/baja → /api/baja`, 23 rutas SPA a `/index.html`), sin crons, `trailingSlash: false`.

**Lo que trae khdemlidaba** (153 líneas) y qué hacer con cada bloque:

| Líneas | Bloque | Acción |
|---|---|---|
| 6-8 | `env.NODE_OPTIONS --experimental-require-module` | conservar |
| 9-16 | `functions.includeFiles` (`dist/app.html`, `index.html`, `seo-i18n-ar.json`, `local-services.json`) | quitar `seo-i18n-ar.json` |
| 18-19 | redirects `/site-web-gratuit → /creation-site-web` y su `/ar/` | eliminar (histórico de khdemlidaba) |
| 20-30 | 11 redirecciones de host | sustituir por la única de misautonomos (`www.misautonomos.es → misautonomos.es`) |
| 34-36 | `X-Robots-Tag noindex` para `/site/louay-change/` | eliminar |
| 41 | CSP: `default-src 'self'; script-src 'self' 'wasm-unsafe-eval' 'sha256-OO9x/…' https://va.vercel-scripts.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: <host>; font-src 'self'; connect-src 'self' <host> wss://<host> https://va.vercel-scripts.com; frame-src 'self' https://www.google.com <host> https://appleid.apple.com https://accounts.google.com; manifest-src 'self'; worker-src 'self' blob:` | sustituir el host 5 veces; el hash `sha256-OO9x/…` es el del script inline que inyecta el prerender (`api/prerender.js:987` `AMORCE`) y lo vigila `scripts/check-csp-inline.mjs`: si no se toca `AMORCE`, no cambia |
| 42-48 | `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy geolocation=(self)`, HSTS `preload`, `Cache-Control` | conservar (son una mejora neta: misautonomos no tiene ninguna) |
| 60 | lista de activos con caché inmutable (`logo.svg`, `logo-white.svg`, `icon-*.png`, `og-default.png`, `site.webmanifest`…) | conservar si se mantienen los nombres (§2.9) |
| 115-118 | rewrites `/site/louay-change/admin`, `/site/:slug`, `/jc-secours` | eliminar |
| 119 | `/blog/rss.xml → /api/blog/rss` | conservar |
| 120-131 | 11 rewrites `/ar/...` | eliminar |
| 127,132-141 | prerender para `/metiers`, `/blog/:slug`, `/professionnel/:slug`, `/ville/:slug`, `/metier/:slug`, `/recherche`, `/en-ligne`, `/demandes`, `/blog`, combo `/:cat-:ciudad` (con lista negativa de slugs franceses) y fallback SPA a `/app.html` | conservar la mecánica; los slugs dependen de la pregunta abierta 1 |
| 143-152 | 8 crons (`reminders`, `client-to-pro-reminders`, `daily-report`, `contact-clicks-digest`, `weekly-digest`, `monthly-digest`, `diploma`, `demandes-purge`) | conservar los que sobrevivan al trasplante de funciones (`CRON_SECRET` en Vercel); horarios en UTC (§2.4) |

Terceros del misautonomos actual que la CSP del modelo bloquearía si se conservasen: OneSignal (`[mis] index.html:76-104`, `src/config/onesignal.js`, 7 ficheros en `src/`, `public/OneSignalSDKWorker.js`; carga `https://cdn.onesignal.com`), Stripe (1 fichero), `@vercel/speed-insights` (1 fichero; `va.vercel-scripts.com` ya está permitido). Con el trasplante desaparecen salvo que el dueño quiera conservar alguno (push web de OneSignal frente al push APNs del modelo). Las 19 redirecciones de slugs legados de misautonomos (`/precios → /para-autonomos`, `/autonomo/… → …`, `vinaròs → vinaros`…) hay que mantenerlas como 301 hacia las rutas nuevas: es la única parte del `vercel.json` actual que conserva valor.

### 2.11 Remitentes de email (Resend) y Telegram

**Resend** — el remitente está en duro en 9 ficheros (15 líneas), no lee `RESEND_FROM` (`.env.example:17` es otra variable sin uso):

`supabase/functions/_shared/senders.ts:25-26`, `admin-send-mail/index.ts:18-19`, `bilan-deux-mois/index.ts:47-48`, `daily-report/index.ts:16` (+ `:90` `reply_to` inline), `diploma-tick/index.ts:25-26`, `notify-admin/index.ts:21` (+ `:813` `RESEND_TO || 'bonjour@khdemlidaba.ma'`), `promo-mail/index.ts:53-54`, `relance-fiche-pro/index.ts:36-37`, `send-reminders/index.ts:38` (+ `:159,284` `reply_to` inline). Valor nuevo: `FROM = 'MisAutónomos <X@misautonomos.es>'`, `REPLY_TO = 'X@misautonomos.es'`, centralizados en `_shared/brand.ts`. Además `_shared/senders.ts:140` (`[URGENT] KhdemliDaba —`), las barras de cabecera HTML con fondo `#E8590C` y texto «KhdemliDaba» (§3.4) y los `<img src=".../icon-192.png">`. Requisito externo: dominio `misautonomos.es` verificado en Resend (SPF/DKIM); misautonomos ya usa Resend (`[mis] api/notify-admin.js:48` con fallback `onboarding@resend.dev`, `scripts/send-newsletter.mjs`, `RESEND_API_KEY` en `.env.local`), por lo que el estado de la verificación lo sabe el dueño.

Direcciones de soporte que misautonomos usa hoy (son cuatro): `soporte@misautonomos.es` (`[mis] src/pages/TermsConditions.jsx:8`, `PrivacyPolicy.jsx:8`, `src/components/seo/SEOHead.jsx:214`, `StructuredData.jsx:25`, `api/lead-opt-out.js:22`, `index.html:55`), `hola@misautonomos.es` (`src/pages/Contacto.jsx:9`, `BajaNewsletter.jsx:11`, `api/baja.js:24,29,49,95`), `hola@misautonomos.com` (`src/pages/CookiePreferences.jsx:10`, `CookiePolicy.jsx:10`: dominio `.com`, casi seguro errata) e `info@misautonomos.es` (`src/pages/LegalNotice.jsx:8`). El modelo tiene una sola (`bonjour@`): hay que elegir una (pregunta abierta 4).

**Telegram** — no hay nada en duro: `supabase/functions/_shared/senders.ts:46-80` lee `TELEGRAM_BOT_TOKEN` y `TELEGRAM_CHAT_ID`; `notify-admin/index.ts` emite 15 tipos de aviso por ese canal (los textos van en francés con la marca: `:686`, `:691`, `promo-mail:23`). Hace falta decidir bot/chat nuevos o reutilizar los de khdemlidaba (los avisos de las dos webs llegarían mezclados al mismo chat).

### 2.12 Textos legales y entidad

`src/lib/legal.js` (76 líneas) es la fuente de los datos duros:

| Línea | Hoy | Valor nuevo |
|---|---|---|
| 11,17 | `RESPONSABLE_NOM`/`PUBLICATION_DIRECTOR = 'Ilias Yahya'` | el dueño (igual o razón social) |
| 12,14 | dirección y teléfono vacíos (persona física) | LSSI-CE art. 10 exige nombre/razón social, NIF, domicilio y email: hay que rellenarlos |
| 13 | `RESPONSABLE_EMAIL = 'bonjour@khdemlidaba.ma'` | dirección elegida en §2.11 |
| 18-20 | `LEGAL_FORM = 'Personne physique'`, `RC_NUMBER`, `ICE_NUMBER` (registros marroquíes) | `NIF` (y forma jurídica española); `MentionsLegales.jsx:48-49` pinta RC/ICE solo si existen |
| 23 | `CNDP_DECLARATION_NUMBER` | no aplica en España (la AEPD no numera declaraciones): eliminar junto con `Privacy.jsx:142-149` y `privacy.h_cndp`/`cndp_line`/`cndp_pending` |
| 40 | `CGU_VERSION = 'v4-2026-09-01'` | nueva versión (p. ej. `v1-es-2026-10`); ojo: `users.cgu_version` no existe en misautonomos (su tabla `users` solo tiene `phone` como columna afín), así que `CguReacceptBanner.jsx` saldrá a todos los usuarios migrados en su primer acceso |
| 43-69 | `HOSTING`: Vercel (ok), Supabase **«Région eu-west-3 (Paris, France)»** (`:51`), Resend Delaware (ok), Google Ireland (ok), registrar **NindoHost, «Registrar accrédité .ma (Maroc)»** (`:65-68`) | Supabase: `eu-west-2 (Londres, Reino Unido)` según la API del proyecto; registrar del `.es` (desconocido: dueño) |

Páginas: `src/pages/Privacy.jsx:1,8,12,22,142-149` (CNDP, ley 09-08, «transferencia fuera de Marruecos»), `src/pages/Conditions.jsx:3,14,53,73,84` (ley 31-08 de consumidor, ley 09-08, «droit marocain / tribunaux du Maroc»), `src/pages/MentionsLegales.jsx:3,48-49` (09-08, 31-08, RC/ICE), `src/pages/Cookies.jsx:2,16-23` (CNDP; nombres de cookie con prefijo). En `fr.json` hay 44 cadenas que citan Maroc/09-08/CNDP/tribunales, entre ellas `privacy.legal_basis_body`, `privacy.transfer_body`, `privacy.rights_intro`, `privacy.rights_exercise` (`www.cndp.ma`), `cgu.law_body` («tribunaux du Royaume du Maroc»), `cgu.role_body`, `cgu.pro_declaration_body`, `cgu.regulated_body` (profesiones reguladas marroquíes: ley 43-13 de enfermería, que también gobierna `AdminReplyMail.jsx:18` y la función `diploma-tick`). Marco español equivalente: RGPD + LOPDGDD 3/2018 (AEPD), LSSI-CE 34/2002, TRLGDCU (RDL 1/2007), jurisdicción de los tribunales españoles. Los textos legales actuales de misautonomos viven en `[mis] src/i18n/locales/es.json` bajo `legal.notice.sections.*` (9 secciones: `identification`, `purpose`, `termsOfUse`, `intellectualProperty`, `liability`, `links`, `dataProtection`, `applicableLaw`, `contact`) y en `PrivacyPolicy`/`TermsConditions`/`CookiePolicy`; los datos de identificación no están en código.

### 2.13 Datos geográficos, familias, idiomas y slugs de ruta

- `src/data/cityNamesAr.js`: **70 slugs** de ciudades marroquíes → nombre árabe (el comentario de cabecera dice 68). Consumidores: `src/hooks/useCityName.js` y `scripts/build-seo-i18n.mjs:21,30`. Sin `/ar`, los dos consumidores se simplifican y el fichero se elimina; si el árabe se mantuviera indexable, habría que regenerarlo para las ciudades españolas.
- `src/data/families.js:10-20`: **9 familias** (`batiment`, `maison`, `restauration`, `beaute`, `logistique`, `evenementiel`, `bureau`, `sante`, `stages`) con icono (`hammer`, `home`, `chef`, `sparkle`, `truck`, `camera`, `laptop`, `heart`, `graduation`) y claves i18n `families.*` (× 6 idiomas) y `families_page.*`. La pertenencia va en `categories.family` en base (comentario `:7-8`). Las 17 categorías españolas necesitan su propio reparto en familias (y posiblemente otras familias: «stages» es un producto marroquí): decisión del dueño/capa de categorías. Consumidores: `CategoryGrid.jsx`, `NativeFamilies.jsx`, `TradeIcon.jsx`, `CategoryLanding.jsx`.
- `src/data/staticData.js:17-26` `LANGUAGES` (idiomas que habla el profesional): `ar, ber (amazigh), fr, es, en, de, nl, it` con etiquetas en francés + bloques i18n `languages_list`/`languages_full`. Propuesta para España: `es, ca, eu, gl, en, fr, de, nl, it, pt, ar, ro` (a validar). En misautonomos `professional_profiles` **no tiene columna de idiomas** (consulta a `dquxsethatxtptfviiwd`: solo `telefono_contacto`, `whatsapp_*`): el campo nace vacío, no hay datos que mapear. `:32` `CATEGORY_SLUG_ALIASES = { cuisiniere: 'cuisinier' }` es un alias histórico de khdemlidaba → vaciar.
- **Slugs de ruta franceses**: `src/App.jsx` declara 52 rutas con 42 slugs de primer nivel (`/professionnel`, `/professionnels`, `/metier`, `/metiers`, `/ville`, `/recherche`, `/connexion`, `/inscription`, `/mot-de-passe`, `/tableau-de-bord`, `/profil`, `/favoris`, `/demandes`, `/mes-demandes`, `/mes-candidatures`, `/mes-paiements`, `/avis`, `/blog`, `/conditions`, `/confidentialite`, `/mentions-legales`, `/cookies`, `/contact`, `/en-ligne`, `/cv-gratuit`, `/devis-gratuit`, `/creation-site-web`, `/site-web-gratuit`, `/recrutement`, `/salaires`, `/soutenir`, `/supprimer-mon-compte`, `/desabonner`, `/notifications`, `/compte`, `/plus`, `/bienvenue`, `/promo-instagram`, `/site`, `/auth`, `/admin`, `/`). Están repetidos en `vercel.json:120-141` (22 rewrites), `public/robots.txt:5-25` (21 `Disallow`), el AASA (12 componentes), el AndroidManifest (10 `pathPrefix`), `public/llms.txt` (15 enlaces), `src/lib/seoLocales.js:3-17`, `api/prerender.js` (enrutado), `scripts/generate-sitemap.js` y las 19 redirecciones legadas de misautonomos. misautonomos publica hoy en español: `/buscar`, `/autonomo/:cat-en-:ciudad/:slug`, `/categoria/:cat/:ciudad`, `/blog/`, `/para-autonomos`, `/preguntas-frecuentes`, `/ayuda`, `/privacidad`, `/terminos`, `/cookies`, `/aviso-legal`, `/contacto` (`[mis] public/robots.txt:80-93`). Traducir o no los slugs, y cómo redirigir los indexados, es la decisión que condiciona todas estas superficies (pregunta abierta 1).

### 2.14 Scripts de build y comprobación

`package.json` (`"type": "module"`, `engines node >=24 <25`, versión `1.4.0`), script `build`:
`npm run build:louay && node scripts/build-seo-i18n.mjs && vite build && check-hook-order && verify-tracking && check-csp-inline && check-css-math && verify-ios-entitlements && check-version-sync && generate-sitemap && build-local-services && inject-home`.

| Script | Hardcodes | Acción |
|---|---|---|
| `scripts/build-louay-change.mjs` + `scripts/lib/louay-standalone.mjs:31` | micrositio de un cliente marroquí; clave publishable de khdemlidaba | **quitar del `build`** (`npm run build:louay` es el primer paso y escribe en `public/site/louay-change`) |
| `scripts/build-seo-i18n.mjs:21,23` | lee `cityNamesAr.js` y `ar.json` | quitar si no hay `/ar` |
| `scripts/inject-home.mjs` | ninguno (usa `VERCEL`, `INJECT_HOME`, `PRERENDER_TEMPLATE`) | conservar |
| `scripts/build-local-services.mjs` | ninguno directo; depende de `src/lib/localServiceDiscovery.js:42` (origen `https://khdemlidaba.ma`) | cambiar el origen |
| `scripts/generate-sitemap.js:53,311,314-321,410,501,522` | `SITE_URL` fallback, `AR_PREFIX`, hreflang, filtro de URLs ajenas | fallback `.es`; sin bloque árabe |
| `scripts/check-i18n-keys.py:26-27` | `LOCALES`, `REFERENCE='fr'` | `'es'` |
| `scripts/check-i18n-slugs.mjs:23-24,32-43` | `BASE='fr'`; lee `categories` por REST | `'es'` |
| `scripts/check-csp-inline.mjs` | compara el hash de `AMORCE` con `vercel.json:41` | conservar |
| `scripts/check-version-sync.mjs` | exige la misma versión en `package.json`, `project.pbxproj` y `build.gradle` | alinear las tres (hoy khdemlidaba 1.4.0/1.4; misautonomos 0.0.0/1.0.0) |
| `scripts/verify-ios-entitlements.mjs` | comprueba el dominio en `App.entitlements` (1 ocurrencia de la marca) | dominio nuevo |
| `scripts/check-hook-order.mjs`, `check-css-math.mjs`, `check-native-back.mjs` | ninguno | conservar |
| `scripts/validate-sitemap.mjs:36`, `smoke-metier-landings.mjs:13`, `captures-site.mjs:15`, `appstore-screenshots.mjs:59`, `playstore-screenshots.mjs`, `feature-graphic.mjs`, `portada-reel.mjs`, `blog-couverture.mjs` | dominio, marca, naranja | actualizar (los de marketing pueden quedarse fuera) |
| `scripts/verif-sites-clients.mjs`, `sites-clients.json`, `site-batch-*.json`, `build-site-batch-*.mjs` | clientes marroquíes (teléfonos `+212…`) | no trasplantar |
| `scripts/generate-brand-assets.js:16` | `BRAND` naranja | portar con marino/dorado (§2.9) |
| `.claude/launch.json:5-20` | `khdemlidaba-dev` (5173) y `misautonomos-dev` (5174) | ya contempla los dos repos |

Contenido khdemlidaba-específico que `vite build` copia a `dist/` y que no debe viajar: `public/site/` (34 entradas: 33 micrositios de clientes + `commun/`), `public/jc-secours/` (4 ficheros), `public/blog/` (14 carpetas de imágenes de artículos marroquíes), `client-sites/louay-change/`, `src/pages/LouayAdminRedirect.jsx`, y las funciones `send-jcsecours`, `send-onboarding-azdin`, `livraison-site` (entrega de micrositios).

### 2.15 `.env.example`, `supabase/config.toml`

`.env.example` (23 líneas): `:1` comentario, `:2-3` URL/clave (placeholders, ok), `:6` `VITE_SITE_URL=https://khdemlidaba.ma`, `:7` `VITE_SITE_NAME=KhdemliDaba` (0 usos), `:10` `VITE_PHONE_AUTH=false` (0 usos), `:13` `VITE_WHATSAPP_SUPPORT=212600000000` (0 usos), `:17` `RESEND_FROM=KhdemliDaba <bonjour@khdemlidaba.ma>` (0 usos: las funciones lo fijan en duro), `:20-23` Twilio (0 usos). Faltan en el ejemplo variables que sí se leen: `VITE_APP_STORE_ID`, `VITE_GOOGLE_WEB_CLIENT_ID`, `VITE_PROMO_ENABLED`, `VITE_PROMO_PREVIEW`, `CRON_SECRET`, `SUPABASE_URL`/`SUPABASE_ANON_KEY` (api). Propuesta de `.env.example` nuevo:

```
VITE_SUPABASE_URL=https://dquxsethatxtptfviiwd.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_xxx
VITE_SITE_URL=https://misautonomos.es
VITE_APP_STORE_ID=6759524805
VITE_GOOGLE_WEB_CLIENT_ID=
VITE_PROMO_ENABLED=0
# Vercel (api/cron/*, api/prerender.js, api/blog/*)
SUPABASE_URL=https://dquxsethatxtptfviiwd.supabase.co
SUPABASE_ANON_KEY=sb_publishable_xxx
CRON_SECRET=
```

`.env.local` actual de misautonomos ya define `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `VITE_STRIPE_PUBLIC_KEY` (nombres; valores no leídos); le faltan `VITE_SITE_URL`, `CRON_SECRET`, `SUPABASE_ANON_KEY`, `VITE_APP_STORE_ID`, `VITE_GOOGLE_WEB_CLIENT_ID`.

`supabase/config.toml:1` `project_id = "khdemlidaba"`; `:6-45` 14 bloques `[functions.*]` (`verify_jwt`): conservar los que se trasplanten. Vercel: `.vercel/project.json` de cada repo apunta a su proyecto (`prj_JErhsX…` khdemlidaba, `prj_tZOJcf…` misautonomos, misma `orgId`): no mezclar.

### 2.16 Claves de `localStorage` con prefijo de marca

14 claves distintas: `khdemlidaba.lang` (`src/i18n/index.js:109`, `NativeLangGate.jsx:45`, `NativeLangList.jsx:50`, `NativeLangPicker.jsx:86`, `Cookies.jsx:16`), `khdemlidaba.cookie_consent` (`src/lib/consent.js:11`, `Cookies.jsx:17`), `khdemlidaba.theme` (`src/lib/theme.js:12`), `khdemlidaba.pending_cgu` (`oauthRegistration.js:7,18`, `Register.jsx:204`, `Welcome.jsx:52,62`), `khdemlidaba.pro-banner.dismissed` y `.paused.dismissed` (`ProProfileBanner.jsx:39-40`), `kd.callfb.v1`, `kd.callfb.ticket` (`callFeedbackState.js:2-3`), `kd.analytics.session.v1` (`productAnalyticsCore.js:8`), `kd.analytics.signup.v1` (`productAnalytics.js:16`), `kd.demande.draft.v1` (`demandDraft.js:2`), `kd.site.draft` (`siteGratuit.js:42`). Valor nuevo: prefijo `misautonomos.` / `ma.` y actualizar la tabla de `Cookies.jsx:16-22`. misautonomos ya usa `misautonomos.lang` y guarda el consentimiento de cookies en la tabla `cookie_consents` (`[mis] src/components/CookieBanner.jsx:70`), modelo distinto del `localStorage` de khdemlidaba: lo resuelve la capa de datos, aquí solo el nombre.

### 2.17 Motivo cultural «zellige»

No es configuración pero es marca: `src/components/ZelligeBand.jsx`, `.zellige-band`/`.zellige-mark` (`src/index.css:594,763`), `Icons.jsx`, `TradeIcon.jsx`, `VerifiedBadge.jsx`, `App.jsx` (6 ficheros, 26 líneas) dibujan un patrón de azulejo marroquí en la app nativa. Hay que decidir si se recolorea (marino/dorado) o se retira (pregunta abierta 7).

### 2.18 Fuentes

El modelo autoaloja 11 `woff2` en `public/fonts/` (Inter latin/latin-ext para la web, Tajawal ×6 para el árabe, Rubik ×3 para la app; `src/index.css:9-94`). misautonomos usa Inter vía `@fontsource/inter` (`[mis] index.html:15-30` con fallback métrico). No hay nada de marca aquí: conservar lo del modelo tal cual.

---

## 3. Tokens de color: tabla exacta de sustitución

Base: `src/index.css:116-162` (web, `:root`), `:166-196` (app clara, `html.capacitor-native`), `:201-232` (app oscura, `html.capacitor-native[data-theme="dark"]`), más `.text-accent`/`.text-success` → tokens de texto en `:1615-1616`. Formato: canales RGB sueltos (`rgb(var(--c-x) / <alpha>)`). misautonomos ya tiene un bloque equivalente en `[mis] src/index.css:160-198` con `--c-accent: 0 37 92` y `--c-accent-hover: 0 26 69`; los `--brand-*` HSL de `[mis] src/index.css:50-56` y la paleta shadcn (`:15-90`) desaparecen con el trasplante (el propio fichero lo dice en `:151-158`).

Contrastes medidos (WCAG, texto normal exige 4,5:1; componentes 3:1): marino `#00255C` sobre blanco **14,80:1**; blanco sobre marino 14,80:1; `#001A45` sobre blanco 17,02:1; dorado `#F5C13D` sobre blanco **1,67:1** (no sirve como tinta ni como icono); marino sobre dorado 8,86:1 (sí sirve como botón dorado con texto marino); dorado oscuro `#B8860B` sobre blanco 3,25:1 (vale para iconos, no para texto); dorado sobre nocturno `#0B1120` 11,21:1. Referencia del modelo: naranja `#E8590C` sobre blanco 3,58:1, por eso existe `--c-accent-text` (`#C1400C`, 5,24:1). Con el marino el desdoble aplat/tinta deja de hacer falta, pero el token se conserva porque `.text-accent` lo lee.

### 3.1 Web (`:root`, `src/index.css:116-162`)

| Token | khdemlidaba | MisAutónomos | Nota |
|---|---|---|---|
| `--c-canvas` | `255 255 255` | `255 255 255` | igual |
| `--c-surface` | `255 255 255` | `255 255 255` | igual |
| `--c-ink` | `26 26 26` | `26 26 26` | igual (el actual de misautonomos es `17 24 39`; cualquiera de los dos) |
| `--c-muted` | `102 102 102` | `102 102 102` | igual |
| `--c-border` | `229 229 229` | `229 229 229` | igual |
| `--c-soft` | `245 245 245` | `245 245 245` | igual |
| **`--c-accent`** | `232 89 12` (#E8590C) | **`0 37 92`** (#00255C) | marino |
| **`--c-accent-hover`** | `209 74 0` (#D14A00) | **`0 26 69`** (#001A45) | ya en `[mis] index.css:178` |
| **`--c-accent-text`** | `193 64 12` (#C1400C) | **`0 37 92`** | igual que el aplat (14,8:1) |
| **`--c-petrol`** | `22 163 74` (green-600) | **`0 37 92`** (opción A) o `184 134 11` (#B8860B, opción B) | 17 usos como tinta de iconos/enlaces: `Combobox.jsx:632`, `LocalServiceGuide.jsx:15,22,47`, `LocalServiceLinks.jsx:38`, `ProfessionalCard.jsx:129`, `VerifiedBadge.jsx:55,70`, `ComboLanding.jsx:116`, `DiplomaUpload.jsx:151-152`, `NativeFamilies.jsx:88,107,153,196`, `ProfessionalProfile.jsx:423`, `Search.jsx:303`; `index.css:591,1295`. Con la opción B los 3 enlaces de texto (`LocalServiceGuide:47`, `LocalServiceLinks:38`, `ComboLanding:116`) caen a 3,25:1 |
| `--c-contrast` | `26 26 26` | `26 26 26` | botón oscuro (`btn-dark`); igualarlo al marino haría indistinguibles `btn-primary` y `btn-dark` |
| `--c-success` / `--c-success-text` | `22 163 74` / `21 128 61` | igual | |
| `--c-error` | `220 38 38` | igual | |
| `--c-warning` | `180 83 9` | igual | |
| `--c-whatsapp` | `37 211 102` | igual | |
| **`--c-star`** | `26 26 26` (estrellas negras) | **`245 193 61`** (#F5C13D) | aquí entra el dorado; 1 uso (`text-star`) |
| `--c-avail-bg` / `-border` / `-text` | `240 253 244` / `187 247 208` / `22 101 52` | igual | |
| `--c-danger-text` | `185 28 28` | igual | |
| `--c-warn-bg` / `--c-warn-text` | `255 247 237` / `154 52 18` | igual | |
| `--r-md` / `--r-lg` / `--r-xl` | `8px` / `8px` / `12px` | igual | |
| `--sh-card` | `0 1px 3px rgba(0,0,0,.08)` | igual | |
| `--f-sans` / `--f-sans-ar` | Inter / Tajawal | igual | |

Cambio mínimo en la web: **4 líneas** (`--c-accent`, `--c-accent-hover`, `--c-accent-text`, `--c-star`) + la decisión sobre `--c-petrol`. Con eso, los ~120 `bg-accent`/`text-accent`/`border-accent` del código salen en marino sin tocar un componente.

### 3.2 App, tema claro (`html.capacitor-native`, `src/index.css:166-196`)

| Token | khdemlidaba («Zellige», papel cálido) | MisAutónomos | Nota |
|---|---|---|---|
| `--c-canvas` | `251 246 238` (#FBF6EE) | `244 246 250` (#F4F6FA) | neutro frío; opcional, puede quedarse blanco |
| `--c-surface` | `255 255 255` | igual | |
| `--c-ink` | `27 22 19` | `17 24 39` (#111827) | opcional |
| `--c-muted` | `122 110 99` | `100 112 136` | opcional |
| `--c-border` | `234 224 210` | `221 227 236` | opcional |
| `--c-soft` | `245 238 228` | `236 240 247` | opcional |
| **`--c-accent`** | `217 72 15` | **`0 37 92`** | |
| **`--c-accent-hover`** | `168 58 11` | **`0 26 69`** | |
| **`--c-accent-text`** | `193 64 12` | **`0 37 92`** | |
| **`--c-petrol`** | `14 91 84` | **`0 37 92`** (o `184 134 11`) | misma decisión que en la web |
| `--c-contrast` | `27 22 19` | `17 24 39` | opcional |
| `--c-success` / `-text`, `--c-error`, `--c-warning` | — | igual | |
| `--c-whatsapp` | `22 163 74` | igual | |
| **`--c-star`** | `194 116 10` | **`245 193 61`** | |
| `--r-md` / `-lg` / `-xl` | `10px` / `12px` / `18px` | igual | |
| `--sh-card` | `0 6px 18px -12px rgba(40,25,12,.30)` (sombra cálida) | `0 6px 18px -12px rgba(0,37,92,.25)` | |
| `--f-sans` / `--f-sans-ar` | Rubik | igual | |

Cambio mínimo: 5 líneas (accent, hover, text, petrol, star). Los neutros cálidos son coherentes con el naranja; con el marino quedarían «sucios», de ahí la propuesta fría, pero no es obligatoria.

### 3.3 App, tema oscuro (`html.capacitor-native[data-theme="dark"]`, `src/index.css:201-232`)

El marino puro no funciona en nocturno (sobre `#0B1120` da ≈1,2:1), así que el acento oscuro tiene que ser un azul claro; el dorado sí luce (11,2:1) y es el candidato natural para estrellas y acentos de texto.

| Token | khdemlidaba (negro-marrón) | MisAutónomos | Nota |
|---|---|---|---|
| `--c-canvas` | `21 17 13` (#15110D) | `11 17 32` (#0B1120) | negro-azul |
| `--c-surface` | `38 31 25` | `22 30 50` (#161E32) | |
| `--c-ink` | `246 240 230` | `240 244 250` | |
| `--c-contrast` | `214 203 189` | `200 210 230` | |
| `--c-muted` | `162 149 138` | `150 162 185` | |
| `--c-border` | `62 52 42` | `46 58 84` | |
| `--c-soft` | `43 36 29` | `30 40 62` | |
| **`--c-accent`** | `242 104 28` | **`59 111 214`** (#3B6FD6) | blanco encima 4,74:1; sobre el fondo 3,95:1 |
| **`--c-accent-hover`** | `255 130 60` | **`92 141 235`** (#5C8DEB) | |
| **`--c-accent-text`** | `242 104 28` | **`127 166 242`** (#7FA6F2) | 7,70:1 sobre el fondo |
| **`--c-petrol`** | `70 179 166` | **`127 166 242`** | |
| `--c-success` / `-text` | `52 199 123` | igual | |
| `--c-error` | `248 113 113` | igual | |
| `--c-warning` | `245 176 65` | igual | |
| `--c-whatsapp` | `31 158 82` | igual | |
| **`--c-star`** | `232 163 61` | **`245 193 61`** | |
| `--c-avail-*`, `--c-danger-text`, `--c-warn-*` | — | igual | |

### 3.4 Hex de marca fuera de los tokens (74 líneas)

Valores nuevos: `#E8590C` → `#00255C`; `#C1410C`/`#C1400C` → `#00255C`; `#D1410C` → `#001A45`; `#F2681C` (nocturno) → `#7FA6F2`; `rgba(232,89,12,α)` → `rgba(0,37,92,α)`.

- `src/` (19): `src/components/Avatar.jsx:20` (`#A94208` terracota de iniciales → `#00255C`; la paleta de 4 fondos en `:19-24` puede ser `#00255C`, `#0F766E`, `#1B1613`, `#5B3A8A`), `src/components/HeroMockup.jsx:77` (halo `rgba(232,89,12,.06)` → `rgba(245,193,61,.12)`: buen sitio para el dorado), `src/components/NativeLangGate.jsx:55`, `src/components/ObtainReviewsCard.jsx:55` y `src/pages/Dashboard.jsx:114` (`style={{ borderColor: '#E8590C' }}` redundante con `border-accent`), `src/pages/EditProfile.jsx:514` y `src/pages/OnboardingPro.jsx:754` (★ principal `#E8590C` → `#F5C13D`), `src/pages/Blog.jsx:217` (`['#F97316','#E8590C']` → `['#F5C13D','#00255C']`), `src/pages/NativeLangPicker.jsx:104,159,166`, `src/pages/NativeRegisterWizard.jsx:610`, `src/pages/NativeWelcome.jsx:44`, `src/lib/nativeBoot.js:136` (`StatusBar.setBackgroundColor('#E8590C')`), `src/lib/confetti.js:21` (fallback), `src/index.css:438` (`.bg-orange-native`), `src/index.css:1413` (pulso).
- `api/prerender.js:958-984` (CSS inline del esqueleto de prerender): `:964` `#E8590C`, `:966` `#C1410C`, `:982` `#F2681C`, y los neutros cálidos `#EFE7DC`, `#15110D`, `#F6F0E6`, `#2A231C`, `#A79C8E` → `#E5E9F0`, `#0B1120`, `#F0F4FA`, `#2E3A54`, `#96A2B9`.
- `index.html:6,74`; `capacitor.config.ts:18,36,66`; `public/site.webmanifest:10`; `public/logo.svg:2,5`, `public/logo-white.svg:2,5`, `public/favicon.svg:2`; `ios/App/App/Base.lproj/LaunchScreen.storyboard:21`; `src/lib/theme.js:43` (`#FBF6EE`/`#15110D` → `#F4F6FA`/`#0B1120`).
- Edge functions (31 líneas en 10 ficheros; plantillas HTML de email): `annonce-offres/index.ts:93,100,103,114,118,122,126`, `livraison-site/index.ts:156,160,161,164,165`, `bilan-deux-mois/index.ts:226,227,240,245,251`, `diploma-tick/index.ts:231,275,299` (+`:233`), `demande-avis/index.ts:281,297` (`#FFF6EE` → `#EEF2FA`), `send-reminders/templates.ts:3,113`, `send-reminders/index.ts:365`, `promo-mail/index.ts:407,527`, `relance-fiche-pro/index.ts:121`, `notify-admin/index.ts:585`.
- Scripts (5): `scripts/generate-brand-assets.js:16`, `feature-graphic.mjs`, `portada-reel.mjs` (2), `blog-couverture.mjs`.

### 3.5 `tailwind.config.js`

El del modelo (62 líneas) resetea la paleta y define `canvas, surface, ink, contrast, accent, accent-hover, petrol, border, muted, soft, star, whatsapp, whatsapp-hover, success, error` **todos por variable CSS**: ningún literal de color. Se copia tal cual; la paleta shadcn + `brand.*` + `c-*` prefijados del `[mis] tailwind.config.js:27-117` (CommonJS) desaparece, y con ella el plan de `sed 's/c-accent/accent/'` que anuncia `[mis] tailwind.config.js:53-56`. Única diferencia de módulo: khdemlidaba es `"type": "module"` (ESM) y misautonomos CJS; al trasplantar `package.json` se resuelve solo.

---

## 4. Variables de entorno y secretos que hay que recrear

**Vercel (build y `api/`)** — leídas en código: `VITE_SUPABASE_URL` (3 en src + 17 en api/scripts), `VITE_SUPABASE_ANON_KEY` (2 + 9), `SUPABASE_URL`/`SUPABASE_ANON_KEY` (api, alternativa), `VITE_SITE_URL` (`SEO.jsx:13`, `generate-sitemap.js:53`, `validate-sitemap.mjs:36`, `smoke-metier-landings.mjs:13`), `VITE_APP_STORE_ID` (`appStore.js:30`, `vite.config.js:46`), `VITE_GOOGLE_WEB_CLIENT_ID` (`native.js:464`), `VITE_PROMO_ENABLED`/`VITE_PROMO_PREVIEW`, `CRON_SECRET` (8 crons), `PRERENDER_TEMPLATE`/`INJECT_HOME`/`VERCEL` (build). `vite.config.js:21-33` aborta el build si faltan las dos de Supabase.

**Supabase Edge Functions** (21 nombres distintos de `Deno.env.get`): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY` (automáticas), `CRON_SECRET` (15 funciones), `RESEND_API_KEY` (8), `RESEND_TO`, `RESEND_WEBHOOK_SECRET`, `EMAIL_DAILY_CAP`, `EMAIL_DAILY_LIMIT`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `PAYMENT_PROVIDER`, `YOUCANPAY_PRIVATE_KEY`, `YOUCANPAY_MODE`, `APNS_TEAM_ID`, `APNS_KEY_ID`, `APNS_KEY_P8`, `APNS_HOST`, `APNS_BUNDLE_ID`, `DIPLOMA_BATCH`, `DEMANDES_MAX_PURGE`. Además la fila `internal_config.notify_admin_cron_key` (`20260801200000_admin_notifications.sql:93`, «set via management UI») debe coincidir con `CRON_SECRET`.

**Codemagic**: grupos `*_vite` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_GOOGLE_WEB_CLIENT_ID`), `*_appstore` (`APP_STORE_APPLE_ID`, `APPLE_ID_EMAIL`), `*_upload` (keystore Android); integración `codemagic_asc_api_key` (misautonomos ya la tiene en `[mis] codemagic.yaml:69`).

**Dashboard de Supabase (no está en el repo)**: Site URL y Redirect URLs de Auth (`https://misautonomos.es/auth/callback`), proveedor Google (web client id) y Apple (Service ID + bundle id, clave `.p8`), remitente SMTP de los emails de Auth, plantillas de email de Auth (hoy en francés con la marca), buckets (§2.2).

---

## 5. Riesgos para el trasplante (de mayor a menor)

1. **Rutas francesas en todas las superficies de configuración**. `vercel.json` (22 rewrites), AASA (12), AndroidManifest (10), `robots.txt` (21), `llms.txt` (15), `seoLocales.js`, prerender y sitemap codifican `/professionnel`, `/metier`, `/ville`, `/recherche`… Si el trasplante se hace «tal cual», misautonomos.es pasa a publicar URLs en francés y pierde las indexadas en español (`/autonomo/…`, `/categoria/…`, `/buscar`) sin redirección. Hay que decidir los slugs antes de tocar `vercel.json`.
2. **Teléfonos migrados con el país equivocado**. `src/lib/whatsapp.js:33` y `PhoneWhatsAppFields.jsx:20,104` usan `'MA'` como fallback: un `612345678` español se guardaría o mostraría como `+212612345678`. Cambiar a `'ES'` antes de la migración de datos, y validar los `text` de `professional_profiles.telefono_contacto`/`whatsapp_phone_number`/`users.phone`.
3. **CSP con el host antiguo**. Si `vercel.json:41` se despliega sin sustituir las 5 ocurrencias de `eiacoozyubxkbjwhgkml`, el navegador bloquea `connect-src`/`img-src`/`frame-src` contra `dquxsethatxtptfviiwd`: la web carga en blanco y las imágenes no salen. Lo mismo con el fallback de `src/lib/supabase.js:15-16`, que además lleva la publishable key de khdemlidaba: un build sin env vars hablaría con la base marroquí.
4. **Moneda y pagos**. 7 columnas `*_mad`, 3 RPC con mensajes en dirhams, YouCan Pay con `currency:'MAD'`/`country_code:'MA'`, RIB marroquí en `promo_settings`: las ofertas de pago del modelo no funcionan en euros sin un adaptador nuevo y una revisión del esquema. Mientras tanto, cualquier texto «DH» que se cuele en el frontend se vería en producción.
5. **Emails saliendo con remitente y dominio de khdemlidaba**. 9 funciones fijan `FROM = 'KhdemliDaba <bonjour@khdemlidaba.ma>'`; si se despliegan antes de corregirlo, Resend rechazará el envío (dominio no verificado para ese proyecto) o, peor, saldrán correos de MisAutónomos firmados por KhdemliDaba con enlaces a `khdemlidaba.ma/desabonner`.
6. **Textos legales de otro país**. CNDP, ley 09-08, ley 31-08, «tribunaux du Maroc», registrar `.ma`, y la región de Supabase mal publicada (`legal.js:51` dice París; el proyecto está en Londres, fuera de la UE). Publicar esas páginas en misautonomos.es sería incumplir LSSI/RGPD de forma visible.
7. **Build que arrastra clientes marroquíes**. `npm run build` empieza por `build:louay` y copia `public/site/` (34 entradas) y `public/jc-secours/` a `dist/`: micrositios de terceros con sus teléfonos `+212…` quedarían publicados bajo misautonomos.es/site/… hasta que se quiten del repo y del `vercel.json:115-118`.
8. **Identidad nativa incoherente en misautonomos**. iOS usa `com.base690076ad86e673c796768de5.app` y Android `es.misautonomos.app` (`[mis] android/app/build.gradle:7` frente a `capacitor.config.ts:4`); el AASA tiene `REPLACE_TEAM_ID`; `assetlinks.json` de khdemlidaba sigue con `REPLACE_WITH_UPLOAD_KEYSTORE_SHA256`. Universal/App Links no funcionarán hasta fijar team id, paquete y huella.
9. **Re-aceptación de CGU para todos**. `CGU_VERSION` nueva + `users.cgu_version` inexistente en misautonomos → el banner de `CguReacceptBanner.jsx` sale a los 34 usuarios con cuenta en su primer acceso. Es correcto legalmente, pero conviene avisarlo.
10. **Zona horaria y crons**. `Africa/Casablanca` (sin DST) en 3 funciones, 4 migraciones y 2 pantallas; con `Europe/Madrid` los crons UTC de `vercel.json:143-152` se mueven una hora entre invierno y verano.
11. **Prefijo `/ar` a medio quitar**. Si se elimina `AR_PREFIX` de `i18n/index.js` pero quedan los rewrites `/ar/*` de `vercel.json:120-131` o las aserciones de `seo-prerender.test.mjs:104-105`, el build rompe (tests) o Google ve `/ar/...` servido en español con `<html lang="ar" dir="rtl">` (`prerender.js:1247`).
12. **Versión de Node**. `package.json engines node >=24 <25` y `codemagic.yaml:42-55`; el `codemagic.yaml` de misautonomos fija `22.14.0`: el build iOS/Android fallaría en Codemagic hasta subirlo.

---

## 6. Preguntas abiertas (solo el dueño puede decidir)

1. **Slugs de ruta**: ¿se traducen al español (`/autonomo`, `/categoria`, `/buscar`, `/login`, …) conservando las URL indexadas de misautonomos.es, o se adoptan los franceses del modelo con 301 desde las antiguas? Afecta a `vercel.json`, AASA, AndroidManifest, `robots.txt`, `llms.txt`, `seoLocales.js`, prerender y sitemap.
2. **Idiomas con URL propia**: confirmar que ningún idioma lleva prefijo (`PREFIXED = []`), o si se quiere `/en` para captar búsquedas en inglés (implica hreflang, sitemap doble y prerender bilingüe).
3. **Pagos y ofertas**: ¿se mantienen las ofertas de pago del modelo (perfil destacado, post patrocinado, anuncio de empleo, donación por transferencia) en euros con Stripe o transferencia SEPA, o se descartan y con ellas `promo_*`, YouCan Pay y los crons asociados? ¿Qué pasa con el modelo actual de suscripciones de misautonomos (`subscription_plans`, Stripe)?
4. **Dirección de soporte única**: `hola@misautonomos.es`, `soporte@misautonomos.es` o `info@misautonomos.es` (hoy conviven las tres más `hola@misautonomos.com`). Es el `FROM`/`REPLY_TO` de 9 funciones, el `RESPONSABLE_EMAIL` legal y el email de contacto.
5. **Identificadores nativos**: ¿qué paquete Android está publicado en Play (`es.misautonomos.app` o `com.base690076ad86e673c796768de5.app`)? ¿El Team ID de Apple es `76RVH7PMJG` (el de khdemlidaba) para el AASA? ¿Se reutilizan el App Store ID `6759524805` y el slug de la ficha? ¿Hay keystore de subida y su huella SHA-256?
6. **Datos legales**: nombre/razón social, NIF, domicilio y email del titular (LSSI art. 10); registrar del dominio `.es`; si la web se publica como persona física o sociedad.
7. **Marca visual**: (a) dónde entra el dorado — solo estrellas y logotipo (opción A, WCAG limpia) o también iconos/badges en dorado oscuro `#B8860B` (opción B, 3 enlaces de texto a corregir); (b) grafía `MisAutónomos` vs `misAutónomos`; (c) ¿se conserva el motivo «zellige» recoloreado o se retira?; (d) ¿se acepta regenerar los activos (`logo.svg` horizontal, `logo-white.svg`, `favicon.svg`, maskable, `og-default.png`) a partir del icono de herramientas, o hay un logotipo vectorial original que no está en el repo?
8. **Telegram y notificaciones**: ¿bot y chat nuevos para MisAutónomos o reutilizar los de khdemlidaba? ¿Se abandona OneSignal (push web actual) en favor del push APNs nativo del modelo?
9. **Familias de oficios e idiomas del perfil**: reparto de las 17 categorías españolas en familias (hoy 9 marroquíes, con «stages» como producto propio) y lista de idiomas del profesional para España (propuesta: es, ca, eu, gl, en, fr, de, nl, it, pt, ar, ro).
10. **Profesiones reguladas**: el circuito de verificación de diploma (`diploma-tick`, `AdminReplyMail.jsx`, `cgu.regulated_body`) está escrito para la ley marroquí 43-13 (enfermería/fisioterapia). ¿Se mantiene con las profesiones reguladas españolas, o se desactiva?
