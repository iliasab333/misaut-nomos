# Capa 08 — Tests y guardas de build

Fase de **sólo lectura**. Nada se ha modificado en ninguno de los dos repos ni en
ninguna base de datos. Lo único que se ha ejecutado:

- `npm test` en `/Users/bigseo/khdemlidaba` (una vez, lectura pura: ficheros +
  PGlite en memoria, cero red hacia Supabase).
- `npm run lint` en `/Users/bigseo/khdemlidaba`.
- `scripts/check-i18n.mjs`, `scripts/i18n-orphans.mjs --strict`,
  `scripts/check-routes.mjs --strict`, `scripts/check-vercel-routes.mjs --strict`
  y `scripts/check-hook-order.mjs` en `/Users/bigseo/Desktop/misaut-nomos`
  (todos leen ficheros del repo; ninguno toca la red).
- `eslint .` en misautonomos.

Estado del modelo: `/Users/bigseo/khdemlidaba` en HEAD
`794e6577fd718a395cfc7cb272b8a7f030a6938a`. Hay un `git stash` y 21 ficheros sin
trackear (posts/vídeos/fuentes); ninguno interviene en los tests ni en el build.

---

## 1. Resumen ejecutivo

| | khdemlidaba (modelo) | misautonomos (hoy) |
|---|---|---|
| Ficheros de test | **26** (`scripts/*.test.mjs` ×21, `scripts/lib/*.test.mjs` ×1, `client-sites/louay-change/tests/*.test.mjs` ×5) | **0** |
| Tests `node:test` | **178** | 0 |
| Escenarios extra (`test-failsafe.mjs`) | **11** | 0 |
| Scripts `test:*` en package.json | **14** | 0 |
| Pasos en `npm run build` | **12** | **6** |
| Guardas que bloquean el build | **6** (hook-order, tracking, CSP, css-math, entitlements iOS, version-sync) | **4** (i18n, i18n-orphans, routes, vercel-routes) |
| Guardas fuera del build | 6 (`check:i18n`, `check:native-back`, `smoke:metier`, `validate:sitemap`, `validate-search-rpc`, `lint`) | 2 (`check:hooks`, `check:sitemap`) |
| `npm test` dentro de `npm run build` | **NO** | no aplica |
| `lint` dentro de `npm run build` | **NO** | **NO** |
| `eslint` hoy | **0 errores, 0 avisos** (`--max-warnings 0`) | **4 errores, 5 avisos** |
| Suites que usan PGlite + migraciones reales | **8** | 0 |
| Migraciones SQL | 100 | 4 |
| Idiomas i18n | 6 ficheros planos (fr base, 1784 claves, `ar` con 43 claves de más) | 2 idiomas (es base 2097 claves, en completo) partidos en `*.json` + `*.app.json` |

**Las dos conclusiones que importan:**

1. **El modelo no tiene paridad de idiomas garantizada y misautonomos sí.** khdemlidaba
   tiene 6 locales completos por disciplina, no por guarda: no existe ningún script
   que compare `fr.json` con los otros cinco. De hecho `ar.json` arrastra **43 claves
   que ya no existen en `fr.json`**. El `check-i18n.mjs` de misautonomos (que compara
   claves, forma, vacíos/TODO e interpolaciones `{{…}}`) es **mejor que cualquier cosa
   que exista en khdemlidaba** y es la guarda que más hay que proteger en el trasplante,
   porque el requisito del dueño son 6 idiomas con `es` por defecto.
2. **Ninguno de los dos repos ejecuta sus tests ni su linter en el build.** En
   khdemlidaba `npm test` tarda 43,5 s y pasa entero: cabe de sobra en un build de
   Vercel. Hoy nadie lo lanza automáticamente, de modo que las 178 pruebas sólo
   protegen si alguien se acuerda.

---

## 2. khdemlidaba — inventario de tests

Ejecución real de `npm test` (HEAD 794e657, Node v24.14.1, macOS):

```
npm test  68.18s user 13.53s system 187% cpu 43.548 total     EXIT=0
```

**43,5 s de reloj, 178/178 tests verdes, 0 fallos, 0 saltados. 11/11 escenarios de
fail-safe verdes.** Nada falla hoy en el modelo.

### 2.1 Suite por suite

| `test:*` | Ficheros | Tests | ms | PGlite | Migraciones reales cargadas |
|---|---|---|---|---|---|
| `test:website-quote` | `website-quote.test.mjs` | 7 | 4090 | sí | `20260929163557_website_quote_requests.sql` |
| `test:louay` | `client-sites/louay-change/tests/*.test.mjs` (5) | 21 | 3844 | sí (1 de 5) | `20260928205855_louay_exchange_admin.sql`, `20260928211935_louay_brand_and_verified_address.sql` |
| `test:growth` | `growth.test.mjs`, `growth-database.test.mjs` | 14 | 4181 | sí | `20260920124643_product_funnel_and_city_inventory.sql`, `20260926201956_client_growth_measurement.sql`, `20260927100200_retours_clients_durables.sql`, `20260927130000_retours_clients_trente_jours.sql`, `20260926202006_salary_observatory.sql` |
| `test:audit-communications` | `audit-communications.test.mjs`, `audit-communications-database.test.mjs` | 15 | 3868 | sí | ninguna (esquema sintético inline, ~40 líneas de DDL) |
| `test:cv` | `cv.test.mjs`, `cv-database.test.mjs`, `cv-save.test.mjs` | 18 | 4148 | sí | `20260920153103_private_cv_library.sql` |
| `test:journey` | `product-journey.test.mjs`, `product-database.test.mjs`, `city-seo.test.mjs`, `registration-intent.test.mjs` | 19 | 3571 | sí | `20260920113039_protect_profile_promotion_moderation.sql`, `20260920113119_public_profile_projection.sql`, `20260920124643_product_funnel_and_city_inventory.sql` |
| `test:contact-matching` | `contact-matching-database.test.mjs` | 8 | 3553 | sí | ninguna (fixture + DDL inline) |
| `test:backend-restore` | `backend-restore.test.mjs` | 4 | 376 | no | — |
| `test:profile-security` | `profile-security.test.mjs` | 13 | 3633 | sí | `20260920113039_…`, `20260920113119_…` |
| `test:results-cache-privacy` | `results-cache-privacy.test.mjs` | 1 | 128 | no | — |
| `test:prerender-template` | `prerender-template.test.mjs` | 6 | 187 | no | — |
| `test:seo` | `blog-seo.test.mjs`, `seo-locales.test.mjs`, `seo-prerender.test.mjs` | 44 | 3158 | no | — |
| `test:sitemap` | `scripts/lib/sitemap-utils.test.mjs` | 8 | 139 | no | — |
| `test:failsafe` | `test-failsafe.mjs` (no es `node:test`) | 11 escenarios | ~6 s | no | — |

Suma de `duration_ms` de `node:test`: **34,9 s**. El resto (≈8,6 s) es
`test-failsafe.mjs` más el arranque de 14 procesos `npm run`.

**El coste está en PGlite.** Las 8 suites que arrancan un PostgreSQL en memoria
cuestan entre 3,5 y 4,2 s cada una, prácticamente todo arranque: las suites puras
(`sitemap` 139 ms, `results-cache-privacy` 128 ms, `prerender-template` 187 ms,
`backend-restore` 376 ms) son instantáneas. Fusionar las 8 suites PGlite en un solo
proceso bajaría los 43,5 s a ~15 s, pero perdería el aislamiento que ahora da un
`new PGlite()` por fichero. **Recomendación: no tocarlo.** 43,5 s es aceptable.

### 2.2 El fixture compartido

`/Users/bigseo/khdemlidaba/scripts/fixtures/profile-security.sql` — **150 líneas**,
único fichero de `scripts/fixtures/`. Es la columna vertebral de 3 suites
(`profile-security`, `product-database`, `contact-matching-database`). Contiene:

- roles `anon` / `authenticated` / `service_role bypassrls`, esquemas `auth` y
  `app_private`, `auth.uid()` leído de `request.jwt.claim.sub`.
- `public.users(id uuid, is_admin boolean)`.
- `public.categories(id integer, slug, name, emoji)` y `public.cities(id integer, slug, name)`
  — **IDs enteros**, es decir el esquema de khdemlidaba, no el de misautonomos (que hoy
  tiene ids `text` y `categories[]` de nombres).
- `public.professional_profiles` con **46 columnas**, incluidos `works_remote`,
  `hide_city` y el `check (not hide_city or works_remote)`.
- `app_private.professional_categories` (pivote de oficios secundarios).
- `public.is_admin()` y el trigger `pp_guard_privileged_cols()` (congela `verified`,
  `rating_*`, `diploma_*`, `auth_*` para no-admins).
- 5 políticas RLS sobre `professional_profiles`.

Cabecera literal del fichero: datos sintéticos, forma capturada de producción el
2026-09-20, **sin filas, credenciales ni triggers de red de producción**. Eso lo
hace trasplantable sin consideraciones de privacidad.

**Adaptación a España:** el fichero se copia casi literal, porque después del
trasplante el esquema de misautonomos **es** este esquema. Lo único que cambia son
las filas que insertan los tests (no el fixture: el fixture no inserta ninguna) y la
fecha del comentario de cabecera.

### 2.3 Supuestos marroquíes, fichero a fichero

Marcadores contados (`khdemlidaba|.ma|maroc|casablanca|rabat|nador|témara|+212|MAD|dirham|hijama|darija`):

| Fichero | Marcadores | Qué hay exactamente | Adaptación a España |
|---|---|---|---|
| `scripts/seo-prerender.test.mjs` | 42 | `https://khdemlidaba.ma/…` en ~20 assertions de canonical/hreflang; rutas FR `/metiers`, `/metier/plombier`, `/ville/casablanca`, `/electricien-nador`, `/plombier-casablanca`; fixture árabe inline (`سباك`, `الدار البيضاء`, `البناء`); prefijo `/ar` | Dominio → `misautonomos.es`. Slugs FR → los españoles definitivos (ver capas 02/03). El bloque árabe se **conserva** (el `ar` sigue siendo uno de los 6 idiomas) pero el prefijo de URL hay que decidirlo: khdemlidaba sólo prefija `/ar`; misautonomos necesita una política para `en`/`fr`/`de`/`nl` |
| `scripts/contact-matching-database.test.mjs` | 32 | 4 categorías FR (`femme-de-menage`, `professeur`, `developpeur`, `electricien`) con `allows_remote` por oficio; 3 ciudades (`temara`, `rabat`, `casablanca`); 9 perfiles sintéticos | Categorías → las 17 españolas; ciudades → 3 españolas de provincias distintas. **Hay que redecidir `allows_remote` oficio por oficio** para el catálogo español: es un dato de negocio, no una traducción |
| `scripts/profile-security.test.mjs` | 28 | usa el fixture + nombres de ciudad/oficio FR | Sólo las filas insertadas |
| `scripts/lib/sitemap-utils.test.mjs` | 24 | `findBadLocs` acepta/rechaza URLs `https://khdemlidaba.ma/…`; `canonicalCatSlug` usa `CATEGORY_SLUG_ALIASES` de `src/data/staticData.js` | Dominio + la tabla de alias española |
| `scripts/product-journey.test.mjs` | 15 | rutas FR y `/ar` con y sin barra final; `safeReturnPath` con `/tableau-de-bord` | Rutas españolas; `/panel` o equivalente |
| `scripts/product-database.test.mjs` | 14 | ciudades `rabat`/`casablanca`, categorías `infirmier`/`plombier`; invariante de inventario `{local:2, remote:2, total:4, trades:2}` | Sólo los literales; la invariante numérica no cambia |
| `scripts/registration-intent.test.mjs` | 9 | `/cv-gratuit`, `/tableau-de-bord`, `/recherche` | Rutas españolas |
| `scripts/growth-database.test.mjs` | 8 | **`at time zone 'Africa/Casablanca'`** en 2 assertions (día natural y `answer_until` = último segundo del día local) | **`Europe/Madrid'`**. Ojo: hay **3 migraciones** en `supabase/migrations/` que también llevan `Africa/Casablanca` codificado; si se cambia el test y no las migraciones (o al revés) el test miente |
| `scripts/city-seo.test.mjs` | 8 | assertions sobre texto FR literal: `/230 professionnels avec une ville publique à Casablanca/`, `/41 professionnels en ligne/`, `/57 métiers/`, `<h1>Professionnels à Casablanca et en ligne` | Mismos números, texto español y ciudad española. Es el test que prueba **el filtro «en línea»/`works_remote`** en el HTML prerenderizado: imprescindible conservarlo |
| `scripts/blog-seo.test.mjs` | 7 | `https://khdemlidaba.ma/` en og:url/canonical/hreflang; slug `prix-electricien` | Dominio + slug español |
| `scripts/seo-locales.test.mjs` | 6 | **54 rutas literales** en 5 tests: 8 páginas traducibles, 3 categoría/ciudad, 14 que NO deben tener variante, 3 combos, 26 malformadas | **El test que más trabajo manual exige.** Hay que reescribir las 54 rutas al esquema español y re-decidir qué páginas tienen variante por idioma |
| `client-sites/louay-change/tests/money.test.mjs` | 6 | MAD, 6 divisas, spread del buró de cambio | **Se borra** (ver 2.4) |
| `scripts/website-quote.test.mjs` | 4 | `phone:'+212600000000'`, `languages:['fr','ar']`, `city_id:1 → 'Casablanca'` | `+34…`, `['es','en']`, ciudad española. **Es el test del formulario `/creation-site-web` que el dueño pide explícitamente**: 7 tests cubriendo validación cliente, consentimiento explícito, límites de subida (tipo/tamaño/total), detección de magic bytes, permisos PostgreSQL, ficheros privados y administración manual |
| `scripts/prerender-template.test.mjs` | 4 | canonical `khdemlidaba.ma/creation-site-web` y `…/ar/cv-gratuit`; título árabe `سيرة ذاتية مجانية` | Dominio + rutas |
| `scripts/growth.test.mjs` | 3 | PDF con francés y árabe | Español + árabe |
| `scripts/cv.test.mjs` | 3 | `phone:'+212 600 000 000'`; `mobility:'Casablanca'`; y el test **«all supported interfaces supply every CV label»** que toma `fr.json → .cv` como fuente e itera `['en','es','de','nl','ar']` | `+34 …`; ciudad española; **invertir la fuente a `es.json` e iterar `['en','fr','de','nl','ar']`** |
| `scripts/backend-restore.test.mjs` | 3 | checksums de las fuentes de Edge Functions capturadas | Recalcular checksums tras el trasplante |
| `scripts/audit-communications-database.test.mjs` | 3 | esquema sintético inline; `review_ip_salt` | Casi literal |
| `client-sites/louay-change/tests/hours.test.mjs` | 1 | horarios de Nador, vuelta al GMT permanente de septiembre 2026 | **Se borra** |
| `scripts/results-cache-privacy.test.mjs`, `cv-save.test.mjs`, `cv-database.test.mjs`, `audit-communications.test.mjs` | 0 | nada geográfico | **Se trasplantan literalmente** (salvo `cv-database`, que usa `'électricienne'` como término de búsqueda admin → `'electricista'`) |

### 2.4 Lo que se borra: `test:louay` (21 tests, 3,8 s)

`client-sites/louay-change/` es un **sitio cliente** (buró de cambio en Nador: 6
divisas, MAD, spread, tabla de tasas pública, horarios con el cambio horario
marroquí). misautonomos no tiene `client-sites/`. Con ello se van:

- los 5 ficheros de `client-sites/louay-change/tests/`,
- el script `test:louay`,
- el paso `build:louay` (`scripts/build-louay-change.mjs`) del `build`,
- las rutas `client-sites/louay-change/src` y `client-sites/louay-change/tests` del
  comando `lint`,
- los globals `__LOUAY_REVIEW__` / `__LOUAY_STANDALONE__` de `eslint.config.js`,
- las 2 migraciones `20260928205855_louay_exchange_admin.sql` y
  `20260928211935_louay_brand_and_verified_address.sql`.

Esto es **decisión del dueño**, no técnica: si quiere montar sitios de cliente en
misautonomos, el andamio se queda (los 3 tests puros `money`/`hours`/
`editor-validation` son plantilla reutilizable y `standalone.test.mjs` cubre el
despliegue estático con su propio dominio y CSP).

---

## 3. khdemlidaba — guardas de build

`npm run build` = **12 pasos encadenados con `&&`**:

```
1  build:louay            scripts/build-louay-change.mjs
2  seo-i18n               scripts/build-seo-i18n.mjs
3  vite build
4  check-hook-order       scripts/check-hook-order.mjs $(find src …)
5  verify-tracking        scripts/verify-tracking.mjs
6  check-csp-inline       scripts/check-csp-inline.mjs
7  check-css-math         scripts/check-css-math.mjs
8  verify-ios-entitlements scripts/verify-ios-entitlements.mjs
9  check-version-sync     scripts/check-version-sync.mjs
10 generate-sitemap       scripts/generate-sitemap.js
11 build-local-services   scripts/build-local-services.mjs
12 inject-home            scripts/inject-home.mjs
```

### 3.1 Las 6 guardas que bloquean el deploy

**`check-hook-order.mjs`** (4727 bytes) — ningún hook de React después de un
`return` de primer nivel. **Ya existe en misautonomos, byte a byte idéntico**
(`diff` sin diferencias). En khdemlidaba está en el `build`; en misautonomos sólo
como script `check:hooks` que nadie invoca. Cero supuestos geográficos. Pasa en los
dos repos hoy.

**`verify-tracking.mjs`** — grep sobre `dist/assets/*.js` buscando las cadenas
`log_contact_event` y `log_call_outcome`. Nació de un bundle periódico de tres días
que hacía INSERT directo contra `contact_events`, rechazado por RLS, con las
estadísticas de admin a cero y sin un solo error visible. **Agnóstico geográfico**;
sólo depende de los nombres de las dos RPC. Se trasplanta tal cual si las RPC
conservan su nombre.

**`check-csp-inline.mjs`** — calcula el SHA-256 del literal `const AMORCE = "…"` de
`api/prerender.js` y exige que ese `'sha256-…'` esté escrito en `vercel.json`. Sin
él, un espacio de más en la amorce hace que el navegador la bloquee en silencio.
**misautonomos no tiene hoy ninguna cabecera `Content-Security-Policy` en
`vercel.json`** (0 ocurrencias) ni `api/prerender.js`. Esta guarda llega **después**
de que el trasplante traiga el prerender serverless y la CSP.

**`check-css-math.mjs`** — rechaza operadores pegados en `clamp()`/`calc()`/
`min()`/`max()` (`1.3rem+2vw`), que el navegador tira entero sin avisar. Rutas
escaneadas: `public/site/*/index.html`, `public/site/*/*.css`,
`public/jc-secours/*.html`, `public/jc-secours/*.css`, `src/**/*.css`. Las tres
primeras son de sitios cliente → **se quitan**; `src/**/*.css` se queda. Agnóstico
geográfico.

**`verify-ios-entitlements.mjs`** — exige `com.apple.developer.applesignin` en
`ios/App/App/App.entitlements`; y si `@capacitor/push-notifications` está instalado
**y** existe `aps-environment`, exige además los dos relays
`capacitorDidRegisterForRemoteNotifications` /
`…DidFailToRegister…` en `AppDelegate.swift`.
**misautonomos ya tiene `ios/`, `android/`, `capacitor.config.ts` y la clave
`applesignin`** → el primer bloque pasaría hoy. No tiene `aps-environment`, así que
el bloque de push se salta. Se trasplanta tal cual; el bundle id del mensaje de
error (`ma.khdemlidaba.app`) es sólo un comentario.

**`check-version-sync.mjs`** — un solo número de versión en `package.json`,
`MARKETING_VERSION` (todas las configuraciones de `project.pbxproj`) y
`versionName` de `android/app/build.gradle`, normalizando `1.4` ≡ `1.4.0`.
**Hoy misautonomos FALLARÍA**: `package.json` dice `0.0.0`, iOS dice `1.0.0`,
Android dice `1.0`. Hay que fijar una versión antes de activar la guarda.

### 3.2 Guardas fuera del build (6)

| Script | Qué hace | Red | Supuestos marroquíes |
|---|---|---|---|
| `check:i18n` → `check-i18n-slugs.mjs` | lee `public.categories` por PostgREST y exige clave `categories.{slug}` en **`fr.json`** (base); informa de cobertura en `['fr','ar','en','es','de','nl']` y de claves obsoletas | **sí** (Supabase; si faltan envs, warning y `exit 0`) | base = `fr`; los 6 códigos de idioma |
| `check:native-back` → `check-native-back.mjs` | toda ruta que no sea pestaña raíz debe renderizar `NativeAppHeader`. Listas blancas: `ROOT_TABS` (6 componentes) y `OWN_CHROME` (6) | no | nombres de componentes FR (`Demandes`, `SiteGratuit`, `OnboardingPro`) |
| `smoke:metier` → `smoke-metier-landings.mjs` | Puppeteer sobre **producción**: recorre todos los slugs de `categories` y comprueba que ninguna landing muestra «Ce métier n'est pas encore référencé» tras hidratar | **sí** (prod + Supabase) | `SITE_URL` por defecto `https://khdemlidaba.ma`; textos negativos en varias traducciones |
| `validate:sitemap` → `validate-sitemap.mjs` (196 líneas) | 10 invariantes del `public/sitemap.xml` ya escrito contra el estado real de Supabase: dominio único, cero duplicados, cero sospechosas, cero `/professionnel/{slug}` no publicado, cero `/metier/{slug}` sin pro, cero `/ville/{slug}` sin pro, cero combo vacío, cero alias legacy duplicando, cero slug vacío, `lastmod` no estampado con la fecha del build | **sí** | rutas FR; `VITE_SITE_URL` |
| `validate-search-rpc.mjs` (84 líneas) | compara, por categoría, el count directo en BD (legacy `pp.category_id` **o** pivote) con el que devuelve `search_professionals` | **sí** | — |
| `lint` | `eslint src api scripts client-sites/louay-change/{src,tests} vite.config.js --max-warnings 0`; sólo 2 reglas activas: `js.configs.recommended` y `react-hooks/rules-of-hooks: error`, con `no-unused-vars: off` | no | rutas de `client-sites` |

### 3.3 Lo que khdemlidaba **no** tiene

- **Ninguna guarda de paridad de locales.** Los 6 ficheros están completos (1784
  claves cada uno frente a `fr`), pero `ar.json` tiene **43 claves de más** y nada
  lo detecta. El único test que se acerca es el de `cv.test.mjs`, y sólo compara el
  subárbol `.cv`.
- **Ninguna guarda de claves huérfanas** (`t('x')` sin clave en el JSON).
- **Ninguna guarda de páginas declaradas sin ruta.**
- **Ninguna guarda de coherencia `vercel.json` ↔ `App.jsx`.**
- `npm test` y `lint` **no están en el build**.

Esas cuatro ausencias son exactamente las cuatro guardas que misautonomos ya tiene.

---

## 4. misautonomos — veredicto de sus 6 guardas

Estado medido hoy (`main`, árbol limpio):

```
check-i18n            es: 2097 claves (28 ns públicos + 7 de app) · en: 2097, completo
                      pendientes sin fichero: fr, de, nl, ar          → OK
i18n-orphans --strict 0 claves huérfanas, 0 partes sin fusionar       → OK
check-routes --strict 39 páginas declaradas · 39 con ruta             → OK
check-vercel-routes   30 rutas en App.jsx · 23 rewrites a index.html  → OK
check-hook-order      0 hooks tras un return de primer nivel          → OK
check-sitemap         (no ejecutado: pega contra https://misautonomos.es)
eslint .              4 errores, 5 avisos                             → FALLA (y no está en el build)
```

Los 4 errores de ESLint: `src/components/InitialsAvatar.jsx:84` y
`src/components/OptimizedImage.jsx:151` (`fetchpriority` → `fetchPriority`),
`src/components/NewsletterSignup.jsx:64` y
`src/components/profile/ReviewSection.jsx:75` (`no-empty`).

### 4.1 Una por una

**`scripts/check-i18n.mjs` (8179 bytes) — SOBREVIVE, y es la pieza clave.**
Es la guarda más valiosa de los dos repos y no tiene equivalente en khdemlidaba.
Para cada idioma con `ready: true` en `src/i18n/langs.js` comprueba 5 cosas contra
`es` (fuente de verdad): que exista el JSON, que no falte ninguna clave, que no
sobren, que la **forma** coincida (objeto vs string → «key returned an object» en
runtime), que ningún valor esté vacío ni sea `TODO`/`FIXME`/`XXX`, y que los
marcadores `{{name}}` sobrevivan a la traducción sin perderse ni inventarse.
Además verifica el reparto de namespaces (`src/i18n/namespaces.js`): sin solapes,
sin namespaces por clasificar, sin fantasmas, y **ningún namespace en los dos
ficheros a la vez** (si lo estuviera, `addResourceBundle` pisaría en silencio y la
clave ganadora dependería del orden de llegada por red).

Adaptación: ninguna de lógica. Hay que **rellenar `fr`, `de`, `nl`, `ar`** (hoy «sin
fichero») y marcarlos `ready`, y decidir si se conserva el corte
`*.json` / `*.app.json` o si se pasa al fichero plano de khdemlidaba. **Recomendación:
conservar el corte** — es una ventaja de rendimiento real que khdemlidaba no tiene
(2097 claves, de las cuales 7 namespaces no se descargan hasta entrar en una pantalla
interna), y el requisito del dueño incluye explícitamente «la misma velocidad de carga».
Si se conserva, el fichero `src/i18n/namespaces.js` sobrevive al trasplante y hay que
clasificar en él los namespaces nuevos que lleguen de khdemlidaba.

**Trabajo añadido:** aplicar esta guarda a los 1784 + N claves que trae khdemlidaba,
en 6 idiomas, con `es` como base y no `fr`. Es la tarea de i18n más grande del
trasplante y esta guarda es la que la hace verificable.

**`scripts/i18n-orphans.mjs` (6240 bytes) — SOBREVIVE.**
Detecta `t('clave')` en el código sin clave en los JSON. Es consciente de plurales
(`_one`/`_other`/`_zero`), ignora claves dinámicas con `${…}` y el prefijo
`categories.*` (vienen de la BD), y **quita los comentarios preservando la longitud
de línea** para que los números de línea del informe sigan siendo los del fichero.
`--strict` convierte en fallo la existencia de partes sin fusionar en
`src/i18n/parts/` (hoy ese directorio no existe). Herramienta de migración por
origen, pero es exactamente la guarda que hace falta durante un trasplante que
reescribe ~2000 claves.

Adaptación: la exención `categories.*` sigue valiendo (khdemlidaba también saca los
nombres de oficio de la BD). Si el trasplante trae más familias de claves desde la
BD (`cities.*`, `families.*`), hay que añadirlas a la lista de exenciones.

**`scripts/check-routes.mjs` (2244 bytes) — SOBREVIVE.**
Páginas declaradas (`const X = lazyApp(…)` / `lazyWithRetry(…)` en `App.jsx` y
`pages.config.js`) que ninguna `<Route>` renderiza. Su comentario documenta por qué
el grafo de imports no basta (`pages.config.js` importa todas las páginas) y por qué
hay que coger **todos** los componentes de un `element={…}` y no el primero (si no,
22 páginas envueltas en `<Suspense>` salían como huérfanas). khdemlidaba tiene ~60
páginas y no tiene esta guarda: después del trasplante es más útil, no menos.

Adaptación: si el `App.jsx` de khdemlidaba no usa `lazyApp`/`lazyWithRetry`, hay que
ajustar la expresión regular de «declarado». Media hora de trabajo.

**`scripts/check-vercel-routes.mjs` (3593 bytes) — SOBREVIVE, con una advertencia.**
Coteja los `rewrites` de `vercel.json` con las rutas de `App.jsx` en los dos
sentidos: rewrites muertos (configuración que miente) y rutas sin cobertura
(404 real al recargar). Es consciente de tres formas de estar cubierto: rewrite,
`redirect`, o HTML prerenderizado en `dist/<ruta>/index.html`.

Advertencia: esa tercera vía la calcula leyendo `dist/`, y en el build de
misautonomos el script corre **antes** de `vite build` → `dist/` todavía no tiene las
páginas prerenderizadas de este build. Hoy pasa porque los 23 rewrites cubren todo.
Tras el trasplante, el prerender de khdemlidaba es **serverless** (`api/prerender.js`
+ rewrites hacia la función), no directorios en `dist/` → el bloque `prerendered`
queda inútil y la guarda hay que **re-escribirla contra el `vercel.json` de
khdemlidaba** (que reescribe hacia la función, no hacia `/index.html`). Es la guarda
que más cambia de forma en el trasplante.

**`scripts/check-hook-order.mjs` — SE FUNDE (son el mismo fichero).**
`diff` entre los dos repos: **idénticos**. Un solo fichero después del trasplante.
La diferencia es dónde se invoca: khdemlidaba lo tiene en el `build`, misautonomos
sólo como script suelto. **Se adopta la versión de khdemlidaba: dentro del build.**

**`scripts/check-sitemap.mjs` (8973 bytes) — SE FUNDE, perdiendo.**
Hace dos cosas: (a) comprobar que todas las URLs del sitemap responden 200 en
producción, con concurrencia 12 y timeout 15 s; (b) una validación estructural
(sin acentos, sin `http://`, sin comas, sin guión colgante, sin espacios).
También sabe generar el sitemap en local invocando `api/sitemap.xml.js` con un mock
de `req`/`res`.

khdemlidaba cubre lo mismo y mucho más con tres piezas:
`scripts/lib/sitemap-utils.mjs` (funciones puras: `canonicalCatSlug`, `bumpLastmod`,
`findDuplicateLocs`, `findBadLocs`, `parseSitemapLocs`, `isSitemapXmlValid`),
`scripts/lib/sitemap-utils.test.mjs` (8 tests, 139 ms) y
`scripts/validate-sitemap.mjs` (10 invariantes contra el estado real de la BD).
Además `scripts/test-failsafe.mjs` prueba con 11 escenarios que un fallo de Supabase
durante la generación **conserve el último sitemap bueno** en vez de publicar uno
vacío — algo que `check-sitemap.mjs` no contempla porque genera por otra vía
(`api/sitemap.xml.js` serverless frente a `generate-sitemap.js` en build).

**Veredicto:** la validación estructural de `check-sitemap.mjs` se absorbe en
`findBadLocs` (ya detecta localhost/example/doble barra/trailing; hay que **añadirle
acentos, comas y `http://`**, que hoy no cubre). La comprobación de 200 en producción
se conserva como smoke post-deploy. El resto del fichero muere con
`api/sitemap.xml.js`.

**`scripts/i18n-inventory.mjs`, `i18n-merge.mjs`, `i18n-split.mjs` — herramientas, no guardas.**
Útiles durante el trasplante (`i18n:merge` + `i18n:split` reparten las claves entre
el fichero público y el de aplicación). Sobreviven como herramientas.

**`scripts/audit-ux.mjs`, `audit-verify-ctas.mjs`, `outreach.mjs`, `seed-blog-topics.mjs`, `seed-leads.mjs`, `send-newsletter.mjs`, `gen-app-assets.mjs` — SOBRAN.**
Ninguno está en el `build` ni en ningún script de `package.json`. Los dos `audit-*`
son de julio de 2026 y auditan una UI que la refonte va a sustituir. Los `seed-*` y
`outreach`/`send-newsletter` son operativa de marketing, no guardas.

**`scripts/prerender.mjs` (54946 bytes) — MUERE.**
Es el prerender estático de misautonomos. Lo sustituye `api/prerender.js` de
khdemlidaba (serverless, con `inject-home.mjs` para la portada, porque Vercel sirve
`dist/index.html` antes de aplicar cualquier rewrite). Con él mueren
`api/sitemap.xml.js` y el paso `prerender` del build.

---

## 5. Lista final propuesta de guardas para el build de misautonomos

### 5.1 `npm run build` — 14 pasos

Ningún paso pega contra la red salvo `generate-sitemap` e `inject-home`, que ya
tienen fail-safe probado (11 escenarios).

```
# — i18n y rutas: fallan ANTES de gastar un vite build —
 1  check:i18n          scripts/check-i18n.mjs                       [de misautonomos, 6 idiomas, base es]
 2  i18n:orphans        scripts/i18n-orphans.mjs --strict             [de misautonomos]
 3  check:routes        scripts/check-routes.mjs --strict             [de misautonomos, regex adaptada]
 4  check:vercel-routes scripts/check-vercel-routes.mjs --strict      [de misautonomos, RE-ESCRITO para el prerender serverless]
 5  check:hooks         scripts/check-hook-order.mjs $(find src …)    [fichero común, idéntico en los dos]
 6  lint                eslint src api scripts vite.config.js --max-warnings 0   [NUEVO en el build; arreglar primero los 4 errores]

# — construcción —
 7  seo-i18n            scripts/build-seo-i18n.mjs                    [de khdemlidaba, generalizado a 5 idiomas no-es]
 8  vite build

# — post-build sobre dist/ —
 9  verify-tracking     scripts/verify-tracking.mjs                   [de khdemlidaba, tal cual]
10  check-css-math      scripts/check-css-math.mjs                    [de khdemlidaba, sin las rutas client-sites]
11  check-csp-inline    scripts/check-csp-inline.mjs                  [de khdemlidaba; exige CSP en vercel.json, hoy ausente]
12  generate-sitemap    scripts/generate-sitemap.js                   [de khdemlidaba, con su fail-safe LKG]
13  build-local-services scripts/build-local-services.mjs             [de khdemlidaba]
14  inject-home         scripts/inject-home.mjs                       [de khdemlidaba]
```

**Dos pasos que se dejan FUERA del build web a propósito:**
`verify-ios-entitlements.mjs` y `check-version-sync.mjs`. En khdemlidaba están en el
`build`, lo que significa que un desajuste de versión de la app nativa **bloquea el
deploy de la web**, que no tiene nada que ver. En misautonomos, además,
`check-version-sync` fallaría hoy mismo (`0.0.0` vs `1.0.0` vs `1.0`).
→ Van a un script `build:native` que corre antes de `cap sync`, junto con
`check:native-back`.

### 5.2 `npm test` — 11 scripts, ~34 s, DENTRO del build

Los 14 scripts de khdemlidaba menos `test:louay`, con `test:journey` separado para
que el fallo diga qué se ha roto:

```
test:website-quote          website-quote.test.mjs                               7 tests  PGlite
test:growth                 growth.test.mjs growth-database.test.mjs            14 tests  PGlite
test:audit-communications   audit-communications{,-database}.test.mjs           15 tests  PGlite
test:cv                     cv.test.mjs cv-database.test.mjs cv-save.test.mjs   18 tests  PGlite
test:journey                product-journey product-database city-seo
                            registration-intent .test.mjs                       19 tests  PGlite
test:contact-matching       contact-matching-database.test.mjs                   8 tests  PGlite
test:profile-security       profile-security.test.mjs                           13 tests  PGlite
test:backend-restore        backend-restore.test.mjs                             4 tests
test:results-cache-privacy  results-cache-privacy.test.mjs                       1 test
test:prerender-template     prerender-template.test.mjs                          6 tests
test:seo                    blog-seo seo-locales seo-prerender .test.mjs        44 tests
test:sitemap                lib/sitemap-utils.test.mjs                           8 tests
test:failsafe               test-failsafe.mjs                           11 escenarios
                                                            ──────────────────────────────
                                                            157 tests + 11 escenarios, ~34 s
```

**Recomendación: añadir `npm test` al `build`, entre el paso 6 y el 7.** 34 s en un
build de Vercel es nada, y es el único modo de que 157 pruebas protejan algo. Si se
quiere un build más rápido, el subconjunto barato (`test:sitemap` 139 ms +
`test:results-cache-privacy` 128 ms + `test:prerender-template` 187 ms +
`test:backend-restore` 376 ms + `test:seo` 3,2 s ≈ **4 s para 63 tests**) cubre el
prerender, el SEO, el sitemap y la privacidad de la caché sin arrancar un solo
PostgreSQL.

### 5.3 Fuera del build: pre-deploy manual y post-deploy

```
check:i18n-slugs     check-i18n-slugs.mjs    Supabase   categorías de la BD cubiertas en es.json
validate:sitemap     validate-sitemap.mjs    Supabase   10 invariantes del sitemap vs estado real
validate:search-rpc  validate-search-rpc.mjs Supabase   count directo == count de search_professionals
smoke:categoria      smoke-metier-landings.mjs  prod    ninguna landing de oficio sale «no referenciado»
smoke:sitemap        (resto de check-sitemap.mjs) prod   todas las URLs del sitemap responden 200
check:native-back    check-native-back.mjs              toda ruta no-pestaña tiene botón de volver
check:version        check-version-sync.mjs             package.json == iOS == Android
verify:ios           verify-ios-entitlements.mjs        applesignin + relays APNs
```

### 5.4 Lo que se borra (18 ficheros)

De misautonomos: `scripts/prerender.mjs`, `scripts/check-sitemap.mjs` (absorbido),
`scripts/audit-ux.mjs`, `scripts/audit-verify-ctas.mjs`, `scripts/outreach.mjs`,
`scripts/seed-blog-topics.mjs`, `scripts/seed-leads.mjs`,
`scripts/send-newsletter.mjs`, `scripts/gen-app-assets.mjs`, `api/sitemap.xml.js`.

De khdemlidaba (no se trasplantan): los 5 tests de
`client-sites/louay-change/tests/`, `scripts/build-louay-change.mjs`,
`scripts/lib/louay-standalone.mjs`, `scripts/verif-sites-clients.mjs`.

### 5.5 Orden de trabajo para que la lista sea verde

1. Fijar una versión única (`package.json` 0.0.0 → `1.0.0`) y alinear Android `1.0` → `1.0.0`.
2. Arreglar los 4 errores de ESLint antes de meter `lint` en el build.
3. Añadir una cabecera `Content-Security-Policy` a `vercel.json` (hoy no hay ninguna)
   antes de activar `check-csp-inline`, y con `'wasm-unsafe-eval'` sin `'unsafe-eval'`
   ni `'unsafe-inline'` para que pase el test de CSP de `cv.test.mjs`.
4. Regenerar `scripts/fixtures/profile-security.sql` desde el esquema trasplantado,
   con filas españolas.
5. Reescribir las **54 rutas literales** de `seo-locales.test.mjs` y las ~20 de
   `seo-prerender.test.mjs` al esquema de URL español definitivo.
6. Cambiar `Africa/Casablanca` → `Europe/Madrid` en `growth-database.test.mjs` **y en
   las 3 migraciones** que lo llevan codificado, en el mismo commit.
7. Invertir la base de i18n de `fr` a `es` en `check-i18n-slugs.mjs`,
   `build-seo-i18n.mjs` y el test de etiquetas de CV de `cv.test.mjs`.
8. Rellenar `fr`, `de`, `nl`, `ar` (hoy «sin fichero») y marcarlos `ready` en
   `src/i18n/langs.js` — `check-i18n.mjs` es el que dice cuándo está hecho.
