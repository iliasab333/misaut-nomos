# 03 — Rutas y URLs: tabla completa, paths españoles, 301 y tamaño del renombrado

Fase de lectura (2026-10-01). Nada se ha modificado, ni código ni base de datos.

Fuentes leídas:
- khdemlidaba, estado commiteado `794e657` de `/Users/bigseo/khdemlidaba`: `src/App.jsx`, `src/pages/Admin.jsx`, `vercel.json`, `api/prerender.js`, `api/blog/og.js`, `scripts/generate-sitemap.js`, `scripts/inject-home.mjs`, `src/lib/navSections.js`, `src/lib/seoLocales.js`, `src/lib/productAnalyticsCore.js`, `src/components/NativeTabBar.jsx`, `src/components/SEO.jsx`, `src/components/RequireAuth.jsx`, `src/contexts/AuthContext.jsx`, `src/i18n/index.js`, `public/robots.txt`, `public/.well-known/apple-app-site-association`, `android/app/src/main/AndroidManifest.xml`, y los 347 ficheros `.js/.jsx/.mjs/.json/.ts/.py` trackeados en `src`, `api`, `scripts` para el recuento.
- misautonomos, `/Users/bigseo/Desktop/misaut-nomos`: `src/App.jsx`, `src/pages.config.js`, `vercel.json`, `scripts/prerender.mjs`, `api/sitemap.xml.js`, `src/lib/seoUrl.js`, `src/lib/slugify.js`, `src/pages/Categoria.jsx`, `src/pages/Autonomo.jsx`, `src/pages/ProfessionalProfile.jsx`, `src/i18n/langs.js`, `public/robots.txt`, `public/llms.txt`. No existe `public/sitemap.xml`: el sitemap es dinámico (`/sitemap.xml` → `api/sitemap.xml.js`).
- Bases de datos (sólo `select`): `dquxsethatxtptfviiwd` (misautonomos: 46 `professional_profiles`, 17 `service_categories`, 25 `blog_posts` publicados) y `eiacoozyubxkbjwhgkml` (khdemlidaba: 118 `categories`, 70 `cities`, 1.140 perfiles `published`, 34 posts publicados, 2 `demandes`).
- Script de recuento: `/private/tmp/claude-501/-Users-bigseo-Desktop-misaut-nomos/29957642-c98b-43be-8c5b-e7438e59f24a/scratchpad/count-paths.mjs` (método en §7).

Leyenda de la columna «Veredicto»: **IGUAL** (misma URL en los dos sitios), **YA EXISTE** (misautonomos ya publica esa URL española y se conserva), **NUEVA** (URL española que no existía), **SKIP** (no se trasplanta).

---

## 0. Resumen en cifras

| Qué | Número |
|---|---|
| `<Route>` en `src/App.jsx` de khdemlidaba | **52** (38 públicas, 13 `RequireAuth`, 1 `RequireAdmin` = `/admin/*`) |
| Subrutas dentro de `src/pages/Admin.jsx` | **18** (índice + 17) → 70 declaraciones de ruta en total |
| Rutas servidas por `api/prerender.js` (`resolve()`) | 14 formas de URL, 13 alcanzables por rewrite; `/professionnels` está contemplada en `resolve()` pero ningún rewrite la envía (rama muerta) |
| `vercel.json` khdemlidaba | 27 rewrites (10 de ellos para `/ar`), 13 redirects (2 de ruta + 11 de host), 8 crons |
| Entradas del sitemap de khdemlidaba hoy (`public/sitemap.xml` commiteado) | **2.397** `<loc>` (fr + ar) |
| `<Route>` en `src/App.jsx` de misautonomos | **46** (incluida `/login` fuera del Layout y el comodín `*`) |
| `vercel.json` misautonomos | 21 redirects (1 de host + 20 de ruta), 25 rewrites (23 a `/index.html` porque NO hay catch-all SPA) |
| URLs públicas de misautonomos en su sitemap hoy | **106**: 10 estáticas + 17 categorías + 0 ciudad×categoría con ≥3 pros + 8 guías editoriales + 46 fichas + 25 posts |
| HTML prerenderizados por `scripts/prerender.mjs` | **108** (11 estáticas + 17 + 46 + 25 + 8 + 404) |
| Fichas con URL anidada `/autonomo/<cat>-en-<ciudad>/<slug>` | **44** de 46 (2 planas por `ciudad` vacía); el encargo cita 39 indexadas |
| Perfiles cuyo `slug_publico` NO es el slug canónico (acentos, comas, guion final) | **23** de 46 → necesitan 301 propia (7 ya existen en `vercel.json`, 16 no) |
| Redirecciones heredadas de Base44 en `src/App.jsx` de misautonomos (`LEGACY_REDIRECTS` + `EXPLICIT_301s`) | **55** (39 + 16), todas client-side con `<Navigate>` |
| Apariciones de paths franceses que cambian en `src` + `api` + `scripts` + `vercel.json` | **971** (901 con barra + 46 en alternancias de regex + 24 subrutas `/admin/<x>`) en **165 ficheros** |
| … de las cuales en líneas de código (no comentario) | 762 de las 901 con barra |
| Apariciones de paths que quedan IGUALES (`/blog`, `/cookies`, `/admin`, `/auth/callback`, `/promo-instagram`, `/ar`, `/cv`) | 242 (no se tocan, pero conviene pasarlas por el mismo módulo) |
| Fuera del perímetro pedido pero con paths franceses | `supabase/functions` 12 ficheros / 51 líneas · `supabase/migrations` 12 / 22 · `public/robots.txt` 15 · `public/llms.txt` 14 · AASA 9 · `AndroidManifest.xml` 9 · `public/sitemap.xml` 2.183 (generado) |

---

## 1. Tabla completa de rutas de khdemlidaba y path español propuesto

Columnas: path FR · componente (`src/pages/…`) · auth · prerender (`api/prerender.js` vía rewrite de `vercel.json`) · sitemap (`scripts/generate-sitemap.js`) · path ES · veredicto · nota.

### 1.1 Directorio público

| Path FR | Componente | Auth | Prerender | Sitemap | Path ES | Veredicto | Nota |
|---|---|---|---|---|---|---|---|
| `/` | `Home.jsx` (eager; en nativo `NativeHome` → `/tableau-de-bord` o `/recherche`) | no | sí, en build (`scripts/inject-home.mjs` rellena `dist/index.html`; la coquilla pasa a `dist/app.html`) | 1.0, bilingüe | `/` | IGUAL | misautonomos sirve hoy `Landing.jsx` prerenderizada en `dist/index.html` |
| `/professionnels` | `Professionals.jsx` | no | rama muerta (ver §0) | no | `/para-autonomos` | YA EXISTE | hoy prioridad 0.9 en el sitemap de misautonomos y enlazada desde `Layout.jsx`; hay que darle rewrite explícito y entrada de sitemap |
| `/recherche` | `Search.jsx` | no | sí (`renderSearch`, `noindex,follow` si hay filtros) | no (a propósito) | `/buscar` | YA EXISTE | misautonomos la lista con 0.95; recomiendo mantenerla en el sitemap (1 línea en `generate-sitemap.js`) |
| `/metiers` | `NativeFamilies.jsx` (directorio de oficios/familias) | no | sí (rewrite explícito) | 0.8, bilingüe | `/categorias` | NUEVA | misautonomos tenía `/categoria` (índice) con 301 → `/buscar`; pasar ese 301 a `/categorias` |
| `/notifications` | `Notifications.jsx` | sí | no | no | `/notificaciones` | YA EXISTE | `robots.txt` ya la bloquea |
| `/professionnel/:slug` | `ProfessionalProfile.jsx` | no | sí (`renderProfile`, 404+noindex si no existe) | 0.6 | `/autonomo/:slug` | YA EXISTE (forma plana) | la forma canónica actual es la anidada (§3); `Autonomo.jsx` ya resuelve la plana y los `slug_publico_aliases` |
| `/ville/:city` | `CityLanding.jsx` | no | sí | 0.8, bilingüe, sólo con oferta | `/ciudad/:slug` | NUEVA | misautonomos no tiene landing de ciudad; exige tabla `cities` con slug (capa de datos) |
| `/metier/:category` | `CategoryLanding.jsx` | no | sí | 0.8, bilingüe, sólo con oferta | `/categoria/:slug` | YA EXISTE | 17 slugs ya indexados (§3.2); los slugs de `categories` deben ser exactamente esos |
| `/en-ligne` | `EnLigneLanding.jsx` (pros `works_remote`) | no | sí | 0.7, bilingüe | `/en-linea` | NUEVA | alternativa `/online`; `/en-linea` es la etiqueta del filtro |
| `/:combo` (`/<metier>-<ville>`) | `ComboLanding.jsx` | no | sí (`renderCombo`; 404 si no parte en cat+ciudad) | 0.7, bilingüe, sólo con oferta | **decisión**: `/categoria/:cat/:ciudad` (recomendado) o `/:cat-:ciudad` | YA EXISTE / NUEVA | ver §4.2 |
| `*` | `NotFound.jsx` | no | — | — | `*` | IGUAL | misautonomos usa aquí `LegacyRedirect` (55 redirecciones client-side) → mover a `vercel.json` (§4.5) |

### 1.2 Autenticación

| Path FR | Componente | Auth | Prerender | Sitemap | Path ES | Veredicto | Nota |
|---|---|---|---|---|---|---|---|
| `/connexion` | `Login.jsx` | no | no | no | `/login` | YA EXISTE | misautonomos la renderiza fuera del Layout y sin esperar a auth (`AuthenticatedApp`) — comportamiento a conservar o no (capa UI) |
| `/inscription` | `Register.jsx` | no | no | no | `/registro` | YA EXISTE | absorbe `/registro-cliente` (301) |
| `/mot-de-passe/oublie` | `ForgotPassword.jsx` | no | no | no | `/contrasena/olvidada` | NUEVA | |
| `/mot-de-passe/nouveau` | `UpdatePassword.jsx` | sí | no | no | `/contrasena/nueva` | NUEVA | destino del `?next=` del callback (`AuthContext.jsx:246`) |
| `/auth/callback` | `AuthCallback.jsx` | no | no | no | `/auth/callback` | IGUAL | hay que añadir `https://misautonomos.es/auth/callback` a las Redirect URLs del proyecto `dquxsethatxtptfviiwd`; hoy misautonomos redirige al origen y a `/confirma-email` |
| `/bienvenue` | `Welcome.jsx` (elige tipo de cuenta) | sí | no | no | `/bienvenida` | NUEVA | `robots.txt` de misautonomos ya tiene `Disallow: /bienvenida` |
| `/site/louay-change/admin` | `LouayAdminRedirect.jsx` | no | no | no | — | SKIP | puerta a la web de un cliente marroquí (`client-sites/louay-change`) |

### 1.3 Cuenta

| Path FR | Componente | Auth | Prerender | Sitemap | Path ES | Veredicto | Nota |
|---|---|---|---|---|---|---|---|
| `/professionnel/creer` | `OnboardingPro.jsx` | sí | no (el rewrite `/professionnel/:slug` lo manda al prerender, que responde 404+noindex y la SPA arranca igual) | no | `/autonomo/crear` | NUEVA | sustituye a `/completar-perfil` (301); una ficha con slug `crear` quedaría tapada, como hoy `creer` |
| `/tableau-de-bord` | `Dashboard.jsx` | sí | no | no | `/dashboard` | YA EXISTE | se conserva el anglicismo porque ya está publicado y bloqueado en robots |
| `/favoris` | `Favorites.jsx` | sí | no | no | `/favoritos` | YA EXISTE | |
| `/profil/modifier` | `EditProfile.jsx` («Modifier mon profil professionnel») | sí | no | no | `/mi-perfil` | YA EXISTE | hoy `/mi-perfil` es `MyProfile.jsx` (cuenta); pasa a ser la edición de ficha del pro |
| `/profil/diplome` | `DiplomaUpload.jsx` | sí | no | no | `/mi-perfil/titulacion` | NUEVA | las edge functions enlazan `/profil/diplome` 6 veces (§7.4) |
| `/compte` | `NativeAccount.jsx` (login o cuenta según sesión) | no | no | no | `/cuenta` | NUEVA | raíz del tab «Compte» en nativo |
| `/plus` | `More.jsx` («Paramètres») | no | no | no | `/ajustes` | NUEVA | |
| `/supprimer-mon-compte` | `DeleteAccount.jsx` | no | no | no | `/eliminar-cuenta` | NUEVA | URL declarada en Google Play Console (borrado de cuenta): actualizarla allí |

### 1.4 Solicitudes de clientes («demandes»)

| Path FR | Componente | Auth | Prerender | Sitemap | Path ES | Veredicto | Nota |
|---|---|---|---|---|---|---|---|
| `/demandes` | `Demandes.jsx` (tablón público) | no | sí | 0.7, bilingüe | `/solicitudes` | NUEVA | `robots.txt` de misautonomos tiene `Disallow: /solicitudes` (ruta privada de Base44): borrar esa línea. Alternativa: `/encargos` |
| `/demandes/nouvelle` | `DemandesNouvelle.jsx` | no (envío con cuenta) | no | no | `/solicitudes/nueva` | NUEVA | |
| `/demandes/:id` | `DemandeDetail.jsx` | no | no | no | `/solicitudes/:id` | NUEVA | deep link en AASA y AndroidManifest |
| `/mes-demandes` | `MesDemandes.jsx` | sí | no | no | `/mis-solicitudes` | NUEVA | |
| `/mes-candidatures` | `MesCandidatures.jsx` | sí | no | no | `/mis-candidaturas` | NUEVA | |

### 1.5 Ofertas y servicios

| Path FR | Componente | Auth | Prerender | Sitemap | Path ES | Veredicto | Nota |
|---|---|---|---|---|---|---|---|
| `/promo-instagram` | `PromoInstagram.jsx` | no | no (`ROUTES_SPA_A_TIRET` → HTML crudo con 200) | 0.6 | `/promo-instagram` | IGUAL | |
| `/promo-instagram/contenu/:orderId` | `PromoBrief.jsx` | sí | no | no | `/promo-instagram/contenido/:orderId` | NUEVA | |
| `/recrutement` | `Recrutement.jsx` («Publiez une offre d'emploi sponsorisée») | no | no | 0.6 | `/empleo` | NUEVA | alternativa larga `/publicar-oferta-de-empleo` |
| `/devis-gratuit` | `DevisGratuit.jsx` | no | sí (entra por el rewrite `/:combo` y `resolve()` la reconoce antes) | 0.7, bilingüe | `/presupuesto-gratis` | NUEVA | |
| `/salaires` | `Salaires.jsx` («Observatoire des salaires au Maroc», noindex) | no | no | no | `/salarios` | NUEVA / probable SKIP | datos salariales marroquíes |
| `/cv-gratuit` | `CvGratuit.jsx` | no | sí (vía `/:combo`) | 0.7, bilingüe | `/cv-gratis` | NUEVA | |
| `/site-web-gratuit` | `SiteGratuit.jsx` | no | — (301 → `/creation-site-web` en `vercel.json`; la ruta sigue viva sólo en nativo) | no | `/pagina-web-gratis` → 301 `/crear-pagina-web` | opcional | nada que preservar en español: se puede omitir ruta y redirect |
| `/creation-site-web` | `WebsiteQuote.jsx` (formulario de creación de web) | no | sí (vía `/:combo`) | 0.7, bilingüe | `/crear-pagina-web` | NUEVA | |
| `/soutenir` | `Soutien.jsx` (donación, noindex) | no | no | no | `/apoyar` | NUEVA | |
| `/mes-paiements` | `MesPaiements.jsx` | sí | no (cae en `/:combo` por tener guion y no estar excluida → responde 404+noindex en recarga, la SPA arranca igual) | no | `/mis-pagos` | NUEVA | |
| `/mes-paiements/virement/:orderId` | `PromoVirement.jsx` | sí | no | no | `/mis-pagos/transferencia/:orderId` | NUEVA | |

### 1.6 Admin (`/admin/*`, `RequireAdmin`, chunk propio, `Disallow` en robots)

| Path FR | Componente | Path ES | Nota |
|---|---|---|---|
| `/admin` | `Admin.jsx` → `AdminDashboard` | `/admin` | YA EXISTE |
| `/admin/verifier` | `AdminVerifier.jsx` | `/admin/verificar` | |
| `/admin/stats` | `AdminStats.jsx` | `/admin/estadisticas` | |
| `/admin/inscrits` | `AdminInscrits.jsx` | `/admin/usuarios` | reutiliza la URL que misautonomos ya tenía |
| `/admin/report` | `AdminReport.jsx` («Report legacy») | `/admin/informe` | |
| `/admin/professionnels` | `AdminPros` (en `Admin.jsx`) | `/admin/autonomos` | |
| `/admin/diplomes` | `AdminDiplomes.jsx` | `/admin/titulaciones` | |
| `/admin/avis` | `AdminReviews` (en `Admin.jsx`) | `/admin/valoraciones` | |
| `/admin/messages` | `AdminMessages` (en `Admin.jsx`) | `/admin/mensajes` | |
| `/admin/signalements` | `AdminReports` (en `Admin.jsx`) | `/admin/denuncias` | |
| `/admin/relances` | `AdminReminders` (en `Admin.jsx`) | `/admin/recordatorios` | |
| `/admin/demandes` | `AdminDemandes.jsx` | `/admin/solicitudes` | |
| `/admin/promos` | `AdminPromos.jsx` | `/admin/promos` | IGUAL |
| `/admin/sites` | `AdminSites.jsx` | `/admin/webs` | |
| `/admin/cv` | `AdminCv.jsx` | `/admin/cv` | IGUAL |
| `/admin/notifications` | `AdminNotifications` (en `Admin.jsx`) | `/admin/notificaciones` | |
| `/admin/blog` | `AdminBlogList` (`AdminBlog.jsx`) | `/admin/blog` | YA EXISTE |
| `/admin/blog/:id` | `AdminBlogEdit` (`AdminBlog.jsx`) | `/admin/blog/:id` | |

Las 24 apariciones de `/admin/<x>` viven en `Admin.jsx` (20: 17 `TabLink` + 6 `HealthTile`, menos solapes) y 4 repartidas en `AdminPromos.jsx`, `AdminStats.jsx` y componentes. El comentario de `Admin.jsx` dice que el panel «se mantiene SOLO en francés»: los paths son internos, pero la UI tendrá que traducirse (otra capa).

### 1.7 Legal, blog y varios

| Path FR | Componente | Auth | Prerender | Sitemap | Path ES | Veredicto | Nota |
|---|---|---|---|---|---|---|---|
| `/mentions-legales` | `MentionsLegales.jsx` | no | no | 0.3 | `/aviso-legal` | YA EXISTE | está en la lista de exclusión del `/:combo` (ver §5) |
| `/confidentialite` | `Privacy.jsx` | no | no | 0.3 | `/privacidad` | YA EXISTE | |
| `/conditions` | `Conditions.jsx` | no | no | 0.3 | `/terminos` | YA EXISTE | |
| `/cookies` | `Cookies.jsx` | no | no | 0.3 | `/cookies` | IGUAL | |
| `/contact` | `Contact.jsx` | no | no | 0.3 | `/contacto` | YA EXISTE | |
| `/desabonner` | `Unsubscribe.jsx` (baja de recordatorios por token) | no | no | no | `/baja` | conflicto | misautonomos sirve hoy `/baja` → `api/baja.js` (baja newsletter por token). Si `api/baja` sobrevive (ver 02-funciones), usar `/baja-recordatorios` |
| `/blog` | `Blog.jsx` | no | sí (`renderBlogIndex`) | 0.7, bilingüe | `/blog` | IGUAL | |
| `/blog/:slug` | `BlogPost.jsx` | no | sí, pero por `api/blog/og.js` (rewrite propio) | 0.7 | `/blog/:slug` | IGUAL | los 25 slugs actuales (§3.3) se conservan tal cual |
| `/blog/rss.xml` | (rewrite → `api/blog/rss.js`) | — | — | — | `/blog/rss.xml` | IGUAL | nuevo en misautonomos |
| `/avis/:slug` | `ReviewSubmit.jsx` (reseña sin cuenta, por slug del pro) | no | no | no | `/valorar/:slug` | NUEVA (la ruta `/valorar/:token` existía con otro significado) | ver riesgo en §8.6 |

### 1.8 Comportamiento nativo ligado a paths (Capacitor)

No son rutas nuevas pero son listas de paths franceses que hay que renombrar a la vez:

| Dónde | Qué | Paths |
|---|---|---|
| `src/App.jsx` `AUTH_PATHS` | sin footer | 6: `/connexion`, `/inscription`, `/mot-de-passe/oublie`, `/mot-de-passe/nouveau`, `/auth/callback`, `/bienvenue` |
| `src/App.jsx` `NO_SCROLL_ROUTES_NATIVE` | bloqueo de scroll | 4 |
| `src/App.jsx` `useNativeDocBackground` | fondo naranja | 1 (`/bienvenue`) |
| `src/components/NativeTabBar.jsx` `HIDDEN_TAB_ROUTES` | sin tab bar | 8 |
| `src/lib/navSections.js` `SECTION_ROOTS` + 6 regex (`RE_SEARCH`, `RE_DEMANDES`, `RE_FAVORITES`, `RE_NOTIFICATIONS`, `RE_ACCOUNT`, `RE_TRANSIT`) | pilas por pestaña y botón atrás | 5 raíces + 28 segmentos en alternancias sin barra |
| `src/lib/productAnalyticsCore.js` | mapa ruta → evento | 14 literales |
| `public/.well-known/apple-app-site-association` | Universal Links | 12 componentes (`/professionnel/*`, `/metier/*`, `/ville/*`, `/blog/*`, `/avis/*`, sus 5 variantes `/ar/…`, `/demandes/*`, `/auth/callback`) |
| `android/app/src/main/AndroidManifest.xml` | App Links | 11 `pathPrefix` (los mismos) |
| `scripts/smoke-native-routes.mjs` | smoke test | 17 rutas |

### 1.9 Prefijo de idioma `/ar`

khdemlidaba prefija SÓLO el árabe (`src/i18n/index.js` `AR_PREFIX = '/ar'`, `routerBasename()` en `src/main.jsx:51`): 10 rewrites `/ar/...` en `vercel.json`, sitemap bilingüe (`bilingue: true` duplica cada `<url>` con `hreflang`), `src/lib/seoLocales.js` decide qué páginas tienen versión árabe propia (8 fijas + `/metier/*`, `/ville/*` y combos), y el prerender traduce con `dist/seo-i18n-ar.json`. misautonomos ya tiene el mismo mecanismo portado (`src/i18n/index.js` `langFromPath`/`routerBasename`, `src/i18n/langs.js` `PREFIXED = []`): hoy ningún idioma lleva prefijo y sólo `es` y `en` están `ready`. Decisión del dueño (§9.2): qué idiomas de los 5 no-default obtienen prefijo de URL. Cada idioma prefijado multiplica el sitemap (hoy 2.397 entradas en khdemlidaba con un solo prefijo) y exige su `seo-i18n-<xx>.json`.

---

## 2. Rewrites y redirects de `vercel.json` de khdemlidaba (lo que no es `<Route>`)

| Entrada | Tipo | Destino | Español |
|---|---|---|---|
| `/site-web-gratuit`, `/ar/site-web-gratuit` | redirect 308 | `/creation-site-web` | opcional (§1.5) |
| 11 redirects de host (`www.`, `khadamapro.ma`, `khedmlidaba.ma`, `khdamlidaba.ma`, `khdemlidaba.com`, `khdmli.ma` y sus `www`) | redirect | `https://khdemlidaba.ma/$1` | sustituir por el único de misautonomos (`www.misautonomos.es` → apex) |
| `/site/louay-change/admin`, `/site/:slug` | rewrite | `/site/:slug/index.html` (webs de clientes en `public/site/`, 8 carpetas + `client-sites/louay-change`) | SKIP las webs; reservar `/sitio/:slug` para las futuras webs españolas del servicio `/crear-pagina-web` |
| `/jc-secours`, `/jc-secours/` | rewrite | `/jc-secours/index.html` | SKIP |
| `/blog/rss.xml` | rewrite | `/api/blog/rss` | IGUAL |
| `/blog/:slug([a-z0-9-]+)` | rewrite | `/api/blog/og?slug=:slug` | IGUAL |
| `/professionnel/:slug`, `/ville/:slug`, `/metier/:slug`, `/recherche`, `/en-ligne`, `/demandes`, `/blog`, `/metiers` | rewrite | `/api/prerender?path=…` | `/autonomo/:slug`, `/ciudad/:slug`, `/categoria/:slug`, `/buscar`, `/en-linea`, `/solicitudes`, `/blog`, `/categorias` |
| `/:combo((?!mes-demandes\|mes-candidatures\|tableau-de-bord\|supprimer-mon-compte\|mentions-legales\|en-ligne)[a-z0-9]+(?:-[a-z0-9]+)+)` | rewrite | `/api/prerender?path=/:combo` | ver §4.2 y §5 |
| 10 rewrites `/ar…` | rewrite | `/api/prerender?path=/ar/…` o `/api/blog/og` | según §9.2 |
| `/((?!api/\|.*\.[a-zA-Z0-9]{1,8}$).*)` | rewrite catch-all | `/app.html` | IGUAL: hace innecesarios los 23 rewrites a `/index.html` de misautonomos |
| header `X-Robots-Tag: noindex` en `/site/louay-change/:path*` | header | — | SKIP |

---

## 3. Inventario de URLs que misautonomos tiene publicadas hoy (lo que no se puede romper)

### 3.1 Estáticas (10 en el sitemap, `api/sitemap.xml.js` `STATIC_PATHS`)
`/` (1.0), `/buscar` (0.95), `/para-autonomos` (0.9), `/preguntas-frecuentes` (0.7), `/blog` (0.7), `/ayuda` (0.6), `/privacidad`, `/terminos`, `/cookies`, `/aviso-legal` (0.3). Prerenderizadas además: `/contacto` (11 estáticas en `scripts/prerender.mjs` `STATIC_ROUTES`). `robots.txt` añade `Allow: /precios` (ya 301 → `/para-autonomos`) y `llms.txt` enlaza `/precios`.

### 3.2 Categorías (17, `/categoria/<slug>`)
`abogado`, `albanil-reformas`, `asesoria-gestoria`, `autonomo-limpieza`, `carpintero`, `cerrajero`, `climatizacion-calefaccion`, `electricista`, `empresa-multiservicios`, `fontanero`, `informatico-domicilio-soporte-it`, `jardinero`, `marketing-digital-diseno-web`, `peluqueria-estetica-domicilio`, `persianas-toldos`, `pintor`, `transportista`. Ojo: el segmento de las fichas NO usa estos slugs sino `slugify(categories[0])` (p. ej. `asesoria-o-gestoria`, `albanil-reformas`, `informatico-a-domicilio-soporte-it`): dos vocabularios para la misma categoría.

### 3.3 Blog (25 posts `status = 'published'`, `/blog/<slug>`)
`alta-autonomo-2026-pasos`, `autonomo-vs-empresa-comparativa-espana`, `como-conseguir-primeros-clientes-autonomo`, `como-conseguir-resenas-autonomo-multiplican-clientes`, `como-contratar-autonomo-seguro-guia-clientes`, `como-crear-perfil-irresistible-mas-clientes`, `como-darse-de-alta-autonomo-espana-2025`, `como-encontrar-clientes-autonomo-estrategias`, `como-hacer-factura-correcta-autonomo`, `como-pedir-presupuesto-profesional-consejos`, `como-redactar-presupuestos-profesionales`, `cuanto-cobrar-como-autonomo-guia-sectores-espana`, `cuanto-cuesta-fontanero-madrid-2026`, `cuota-autonomos-2026-congelada-mei-letra-pequena`, `deduccion-gastos-irpf-autonomos`, `errores-comunes-autonomos-empezar`, `faltan-fontaneros-electricistas-espana-oficio-bien-pagado`, `iva-autonomos-declaracion-trimestral`, `mejores-apps-herramientas-autonomos-espana`, `mejores-herramientas-gratuitas-autonomos-2025`, `mejores-plataformas-conseguir-clientes-autonomo-2026`, `modelo-303-130-100-guia-fiscal-autonomos`, `networking-autonomos-clientes-sin-publicidad`, `novedades-laborales-autonomos-2025`, `retencion-irpf-facturas-autonomos`. Se conservan sin cambio de URL.

### 3.4 Ciudad × categoría: DOS formas conviven hoy
- `/categoria/<cat>/<ciudad>`: la que emiten `scripts/prerender.mjs` y `api/sitemap.xml.js` (candado ≥3 pros: hoy **0** combinaciones lo pasan; las dos más pobladas, `asesoria-o-gestoria/barcelona` y `pintor/barcelona`, tienen 2) más las **8 guías editoriales** con contenido propio (`fontanero`, `electricista`, `cerrajero`, `albanil-reformas` × `sabadell`, `terrassa`; ~270 líneas de texto en `prerender.mjs` 368–640). Ninguna `<Route>` de `App.jsx` tiene dos segmentos bajo `/categoria`: el HTML prerenderizado existe pero al hidratar cae en `LegacyRedirect` (comodín `*`).
- `/categoria/<cat>-en-<ciudad>`: la que construye y declara canónica `src/pages/Categoria.jsx` (líneas 71, 112, 178, 208) al navegar por la SPA.

### 3.5 Fichas (46)
Canónica actual (prerender + sitemap): `/autonomo/<slugify(categories[0])>-en-<slugify(ciudad)>/<slugify(slug_publico)>` para 44 perfiles; `/autonomo/<slug>` para 2 con `ciudad` vacía (`andres-f-rodriguez-estrada`, `esdrujulo`). La SPA (`src/lib/seoUrl.js` `getProfileSeoUrl`) usa `slug_publico` SIN limpiar, así que para los 23 perfiles con slug sucio circulan dos variantes (`…/oscar-gómez` y `…/oscar-gomez`). 29 ciudades distintas; 0 slugs duplicados.

### 3.6 Rutas privadas publicadas (no indexables, pero con usuarios y enlaces en correos)
`/login`, `/registro`, `/registro-cliente`, `/confirma-email`, `/configuracion-cookies`, `/favoritos`, `/mi-perfil`, `/soporte`, `/soporte/:id`, `/valorar/:token`, `/notificaciones`, `/dashboard`, `/mis-valoraciones`, `/perfil`, `/perfil/:slug`, `/completar-perfil`, `/admin` y 6 subrutas, `/newsletter/unsubscribe`, `/baja-newsletter`, `/NewsletterUnsubscribe`, `/baja` (API).

---

## 4. Redirecciones 301 propuestas para `vercel.json` de misautonomos

Vercel aplica UNA redirección por petición y las evalúa antes que los rewrites; el orden importa (las específicas antes que las genéricas).

### 4.1 Fichas: de anidada a plana (cubre las 44 y cualquier futura)

```json
{ "source": "/autonomo/:seg/:slug", "destination": "/autonomo/:slug", "permanent": true }
```

Las 44 URLs actuales y su destino:

| Hoy | Destino |
|---|---|
| `/autonomo/electricista-en-reus/abdel` | `/autonomo/abdel` |
| `/autonomo/electricista-en-calpe/ad4grrenelectricity` | `/autonomo/ad4grrenelectricity` |
| `/autonomo/climatizacion-calefaccion-en-cornella-de-llobregat/adrian-avila` | `/autonomo/adrian-avila` |
| `/autonomo/marketing-digital-diseno-web-en-terrassa/adrian-fortea` | `/autonomo/adrian-fortea` |
| `/autonomo/albanil-reformas-en-valencia/ailton-silva` | `/autonomo/ailton-silva` |
| `/autonomo/carpintero-en-barcelona/alberto-carpintero-evanista` | `/autonomo/alberto-carpintero-evanista` |
| `/autonomo/pintor-en-girona/amig-decor-pintor` | `/autonomo/amig-decor-pintor` |
| `/autonomo/albanil-reformas-en-inca/andriy-montador-de-pladur` | `/autonomo/andriy-montador-de-pladur` |
| `/autonomo/empresa-multiservicios-en-viladecans/antonio-linares` | `/autonomo/antonio-linares` |
| `/autonomo/pintor-en-terrassa/ba-pintores-terrassa` | `/autonomo/ba-pintores-terrassa` |
| `/autonomo/cerrajero-en-madrid/cerrajeria-cabello` | `/autonomo/cerrajeria-cabello` |
| `/autonomo/cerrajero-en-valencia/cerrajeros-y-persianistas-feltrer` | `/autonomo/cerrajeros-y-persianistas-feltrer` |
| `/autonomo/empresa-multiservicios-en-mollet-del-valles/ecosmart-instalaciones` | `/autonomo/ecosmart-instalaciones` |
| `/autonomo/electricista-en-valdepenas/electricistas-sl` | `/autonomo/electricistas-sl` |
| `/autonomo/asesoria-o-gestoria-en-malaga/fast-services-asesores` | `/autonomo/fast-services-asesores` |
| `/autonomo/albanil-reformas-en-palma/fernando` | `/autonomo/fernando` |
| `/autonomo/electricista-en-barcelona/florentin-gabriel-tudor` | `/autonomo/florentin-gabriel-tudor` |
| `/autonomo/asesoria-o-gestoria-en-barcelona/guccito` | `/autonomo/guccito` |
| `/autonomo/cerrajero-en-elda/hamid` | `/autonomo/hamid` |
| `/autonomo/marketing-digital-diseno-web-en-mataro/ilias` | `/autonomo/ilias` |
| `/autonomo/asesoria-o-gestoria-en-granada/ilyas-kharrat-azirar` | `/autonomo/ilyas-kharrat-azirar` |
| `/autonomo/asesoria-o-gestoria-en-barcelona/inmobiliaria-traspasos` | `/autonomo/inmobiliaria-traspasos` |
| `/autonomo/empresa-multiservicios-en-mostoles/javier-fernandez-mateo` | `/autonomo/javier-fernandez-mateo` |
| `/autonomo/pintor-en-barcelona/javier-maciel-reforma-integral` | `/autonomo/javier-maciel-reforma-integral` |
| `/autonomo/carpintero-en-villanueva-de-la-serena/joselito` | `/autonomo/joselito` |
| `/autonomo/cerrajero-en-girona/juan-jose-meliton-cerrajero-24h` | `/autonomo/juan-jose-meliton-cerrajero-24h` |
| `/autonomo/autonomo-de-limpieza-en-malaga/juan-perez-5e8405` | `/autonomo/juan-perez-5e8405` |
| `/autonomo/transportista-en-sabadell/kassim-kone` | `/autonomo/kassim-kone` |
| `/autonomo/peluqueria-y-estetica-a-domicilio-en-mataro/leonor` | `/autonomo/leonor` |
| `/autonomo/pintor-en-esplugues-de-llobregat/luis-adolfo-pintor` | `/autonomo/luis-adolfo-pintor` |
| `/autonomo/pintor-en-benavente/luis-reformas` | `/autonomo/luis-reformas` |
| `/autonomo/pintor-en-cornella-de-llobregat/marjorie-orellana` | `/autonomo/marjorie-orellana` |
| `/autonomo/informatico-a-domicilio-soporte-it-en-barcelona/marwan-el-haddadi` | `/autonomo/marwan-el-haddadi` |
| `/autonomo/cerrajero-en-granollers/nacho-narvaez-ruiz-cerrajeria-residencial-y-del-automovil` | `/autonomo/nacho-narvaez-ruiz-cerrajeria-residencial-y-del-automovil` |
| `/autonomo/albanil-reformas-en-getafe/oleksandr` | `/autonomo/oleksandr` |
| `/autonomo/jardinero-en-elda/oscar-barambio` | `/autonomo/oscar-barambio` |
| `/autonomo/asesoria-o-gestoria-en-santa-pola/oscar-gomez` | `/autonomo/oscar-gomez` |
| `/autonomo/marketing-digital-diseno-web-en-barcelona/rayan` | `/autonomo/rayan` |
| `/autonomo/albanil-reformas-en-barcelona/ruben-cardenas-torres` | `/autonomo/ruben-cardenas-torres` |
| `/autonomo/informatico-a-domicilio-soporte-it-en-mollet-del-valles/sergi-fixtic-informatica-formacio-i-consultoria-it-ia` | `/autonomo/sergi-fixtic-informatica-formacio-i-consultoria-it-ia` |
| `/autonomo/albanil-reformas-en-elche/soy-de-cimentaciones-de-pilotes` | `/autonomo/soy-de-cimentaciones-de-pilotes` |
| `/autonomo/pintor-en-hospitalet-de-llobregat/toni-gonzalez-pintor-y-reformas` | `/autonomo/toni-gonzalez-pintor-y-reformas` |
| `/autonomo/electricista-en-denia/youssef-khairi` | `/autonomo/youssef-khairi` |
| `/autonomo/pintor-en-barcelona/zaid-bencharki` | `/autonomo/zaid-bencharki` |

Esta regla se puede desplegar ANTES del trasplante: `Autonomo.jsx` ya sirve la forma plana.

Slugs sucios: `get_public_professional_profiles(p_slug)` de khdemlidaba resuelve el slug EXACTO (no hay tabla de alias en sus 100 migraciones), así que (a) la migración de datos debe escribir el slug limpio en `professional_profiles.slug`, y (b) hacen falta 23 reglas que capturen la variante sucia en cualquiera de las dos formas, por ejemplo:

```json
{ "source": "/autonomo/:seg*/oscar-gómez", "destination": "/autonomo/oscar-gomez", "permanent": true }
```

(`:seg*` = cero o más segmentos; validar en un preview de Vercel antes de confiar en ello). Los 23 pares sucio → limpio: `adrian-avila-`→`adrian-avila`, `ailton-silva-`→`ailton-silva`, `alberto---carpintero-evanista`→`alberto-carpintero-evanista`, `andres-f-rodriguez-estrada-`→`andres-f-rodriguez-estrada`, `andriy,-montador-de-pladur`→`andriy-montador-de-pladur`, `ba-pintores-terrassa-`→`ba-pintores-terrassa`, `esdrújulo-`→`esdrujulo`, `fast-services-asesores-`→`fast-services-asesores`, `florentín-gabriel-tudor`→`florentin-gabriel-tudor`, `javier-fernández-mateo-`→`javier-fernandez-mateo`, `javier-maciel---reforma-integral`→`javier-maciel-reforma-integral`, `juan-josé-melitón---cerrajero-24h`→`juan-jose-meliton-cerrajero-24h`, `juan-pérez-5e8405`→`juan-perez-5e8405`, `luís-reformas-`→`luis-reformas`, `nacho-narvaez-ruiz--cerrajeria-residencial-y-del-automovil`→`nacho-narvaez-ruiz-cerrajeria-residencial-y-del-automovil`, `oleksandr-`→`oleksandr`, `oscar-gómez`→`oscar-gomez`, `rayan-`→`rayan`, `ruben-cárdenas-torres`→`ruben-cardenas-torres`, `sergi---fixtic---informàtica,-formació-i-consultoria-it-ia`→`sergi-fixtic-informatica-formacio-i-consultoria-it-ia`, `soy-de-cimentaciónes-de-pilotes`→`soy-de-cimentaciones-de-pilotes`, `youssef-khairi-`→`youssef-khairi`, `zaid-bencharki-`→`zaid-bencharki`. Las 7 reglas específicas que ya hay en `vercel.json` (alberto, esdrújulo, oscar-gómez, ruben, sergi, rayan, `:slug-`) deben cambiar su destino a la forma plana para no encadenar dos saltos.

### 4.2 Ciudad × categoría (depende de la decisión §9.1)

Opción B (recomendada, conservar `/categoria/:cat/:ciudad` como landing combinada):
```json
{ "source": "/categoria/:cat-en-:ciudad", "destination": "/categoria/:cat/:ciudad", "permanent": true }
```
Y `ComboLanding.jsx` se monta en `/categoria/:cat/:ciudad` (ruta declarada ANTES de `/categoria/:slug`). Ventajas: las 8 guías indexadas no se mueven, desaparece el catch-all raíz `/:combo` y su lista de exclusión (que hoy ya deja escapar `/mes-paiements`, §1.5), y el prerender no tiene que adivinar dónde termina la categoría y empieza la ciudad (en España hay slugs con guiones a ambos lados: `albanil-reformas` × `cornella-de-llobregat`).

Opción A (réplica literal, `/<cat>-<ciudad>` en raíz):
```json
{ "source": "/categoria/:cat/:ciudad", "destination": "/:cat-:ciudad", "permanent": true },
{ "source": "/categoria/:cat-en-:ciudad", "destination": "/:cat-:ciudad", "permanent": true }
```
más la lista de exclusión española de §5.

En ambos casos hay que unificar el vocabulario de slugs de categoría (§3.2): la 301 `/categoria/asesoria-o-gestoria/…` → `/categoria/asesoria-gestoria/…` sólo se puede escribir cuando se fije el slug definitivo (capa de datos).

### 4.3 Páginas de misautonomos que desaparecen

| Hoy | 301 → | Por qué |
|---|---|---|
| `/perfil` | `/dashboard` | `ProfessionalProfile.jsx` ya era sólo una redirección |
| `/perfil/:slug` | `/autonomo/:slug` | idem |
| `/soporte`, `/soporte/:id` | `/contacto` | khdemlidaba no tiene tickets |
| `/mis-valoraciones` | `/dashboard` | las reseñas del pro viven en el dashboard de khdemlidaba |
| `/completar-perfil` | `/autonomo/crear` | mismo papel (onboarding del pro) |
| `/registro-cliente` | `/registro` | `Register.jsx` + `/bienvenida` eligen el tipo |
| `/confirma-email` | `/login` | el flujo pasa a `/auth/callback` |
| `/configuracion-cookies` | `/cookies` | khdemlidaba gestiona el consentimiento en `CookieBanner.jsx` |
| `/ayuda` | `/contacto` | el commit `2fe07a7` ya retiró los artículos; khdemlidaba no tiene centro de ayuda |
| `/preguntas-frecuentes` | **decisión** (§9.3): conservar como página extra o 301 → `/` | está indexada (0.7) y khdemlidaba no tiene FAQ |
| `/preguntas-frecuentes/(.*)` | ya existe (→ `/preguntas-frecuentes`) | seguir la decisión anterior |
| `/precios` | ya existe → `/para-autonomos` | quitar `Allow: /precios` de robots y el enlace de `llms.txt` |
| `/suscripcion`, `/mensajes`, `/inicio` | ya existen → `/`, `/`, `/` | sin cambio |
| `/autonomo` (índice) | ya existe → `/buscar` | sin cambio |
| `/categoria` (índice) | cambiar destino → `/categorias` | antes → `/buscar` |
| `/valorar/:token` | queda ocupada por `ReviewSubmit` (`/valorar/:slug`) | los enlaces por token ya enviados dejan de resolver (§8.6) |
| `/newsletter/unsubscribe`, `/baja-newsletter`, `/NewsletterUnsubscribe` | `/baja` (o el path que decida 02-funciones para `api/baja`) | |
| `/admin/tickets`, `/admin/soporte`, `/admin/newsletter`, `/admin/emails`, `/admin/outreach-whatsapp` | `/admin` | privadas; sólo marcadores |
| `/admin/usuarios` | se conserva (= `AdminInscrits`) | |

### 4.4 Rutas de misautonomos que se CONSERVAN sin 301
`/`, `/buscar`, `/autonomo/:slug`, `/categoria/:slug`, `/para-autonomos`, `/contacto`, `/privacidad`, `/terminos`, `/cookies`, `/aviso-legal`, `/registro`, `/login`, `/favoritos`, `/mi-perfil`, `/dashboard`, `/notificaciones`, `/admin`, `/admin/blog`, `/admin/usuarios`, `/blog`, `/blog/:slug`, `/baja`, `/sitemap.xml`, `/robots.txt`, `/llms.txt`.

### 4.5 Las 55 redirecciones heredadas de Base44
`LEGACY_REDIRECTS` (39 claves en minúscula) y `EXPLICIT_301s` (16 en PascalCase) de `src/App.jsx` son `<Navigate replace>` client-side: un robot recibe 200 + HTML vacío y luego un salto JS. khdemlidaba no tiene este mecanismo (`*` → `NotFound`). Propuesta: pasarlas a `redirects` de `vercel.json` (Vercel compara sin distinguir mayúsculas, así que una regla por destino basta: 39 reglas, no 55) y descartar las que apuntan a páginas que ya no existen (`/proyectos`, `/calendario`, `/facturas`, `/pagar`, `/mis-clientes`, `/automatizaciones`, `/clientes`, `/trabajos`, `/presupuestos`, `/pedir-presupuesto`, `/solicitudes`-privada, `/admin/pagos`, `/admin/mensajes`: 13 destinos muertos → mandarlas a `/` o a su equivalente nuevo).

---

## 5. `vercel.json` español: bloque de rewrites propuesto (opción B)

```json
"rewrites": [
  { "source": "/blog/rss.xml",            "destination": "/api/blog/rss" },
  { "source": "/blog/:slug([a-z0-9-]+)",   "destination": "/api/blog/og?slug=:slug" },
  { "source": "/autonomo/:slug",          "destination": "/api/prerender?path=/autonomo/:slug" },
  { "source": "/ciudad/:slug",            "destination": "/api/prerender?path=/ciudad/:slug" },
  { "source": "/categoria/:cat/:ciudad",  "destination": "/api/prerender?path=/categoria/:cat/:ciudad" },
  { "source": "/categoria/:slug",         "destination": "/api/prerender?path=/categoria/:slug" },
  { "source": "/categorias",              "destination": "/api/prerender?path=/categorias" },
  { "source": "/buscar",                  "destination": "/api/prerender?path=/buscar" },
  { "source": "/en-linea",                "destination": "/api/prerender?path=/en-linea" },
  { "source": "/solicitudes",             "destination": "/api/prerender?path=/solicitudes" },
  { "source": "/blog",                    "destination": "/api/prerender?path=/blog" },
  { "source": "/para-autonomos",          "destination": "/api/prerender?path=/para-autonomos" },
  { "source": "/crear-pagina-web",        "destination": "/api/prerender?path=/crear-pagina-web" },
  { "source": "/cv-gratis",               "destination": "/api/prerender?path=/cv-gratis" },
  { "source": "/presupuesto-gratis",      "destination": "/api/prerender?path=/presupuesto-gratis" },
  { "source": "/((?!api/|.*\\.[a-zA-Z0-9]{1,8}$).*)", "destination": "/app.html" }
]
```

16 rewrites (frente a 27 en khdemlidaba y 25 en misautonomos); `/sitemap.xml` deja de ser función (khdemlidaba lo genera en build con last-known-good) y los 23 rewrites a `/index.html` desaparecen gracias al catch-all. Si se elige la opción A, el catch-all de combos tiene que excluir TODAS las rutas españolas de un segmento con guion que no pasen por redirect: `para-autonomos`, `preguntas-frecuentes` (si se conserva), `aviso-legal`, `mi-perfil`, `en-linea`, `mis-solicitudes`, `mis-candidaturas`, `mis-pagos`, `promo-instagram`, `crear-pagina-web`, `cv-gratis`, `presupuesto-gratis`, `eliminar-cuenta`, `pagina-web-gratis` — 14 frente a las 6 de hoy, y cada ruta nueva con guion que se olvide responderá 404+noindex al recargar.

Si se prefijan idiomas (§9.2), cada rewrite de prerender se duplica por idioma como hoy `/ar` (10 entradas), o se generaliza a `/:lang(en|fr|de|nl|ar)/…`.

Prerender y sitemap, cambios concretos: en `api/prerender.js` `resolve()` (líneas 738–765) las 13 comparaciones de path y los 7 `canonical` fijos (líneas 255–712) pasan a leer el módulo de rutas; `ROUTES_SPA_A_TIRET` desaparece con la opción B. En `scripts/generate-sitemap.js` las 15 entradas fijas (líneas 420–450) y las 5 plantillas (`/ville/`, `/metier/`, combo, `/professionnel/`, `/blog/`) idem; añadir `/buscar` y `/para-autonomos` (que hoy misautonomos sí declara). `scripts/validate-sitemap.mjs`, `scripts/seo-prerender.test.mjs` (18) y `scripts/seo-locales.test.mjs` (35) comprueban literales franceses y hay que reescribirlos con el mismo módulo.

---

## 6. Qué queda prerenderizado y en el sitemap tras el trasplante (opción B)

| URL ES | Prerender | Sitemap | Hoy en misautonomos |
|---|---|---|---|
| `/` | build (`inject-home`) | 1.0 | prerender estático, 1.0 |
| `/buscar` | sí | sí (añadir) | prerender, 0.95 |
| `/categorias` | sí | 0.8 | — |
| `/categoria/:slug` (17) | sí, 404 si no existe | 0.8 si hay oferta | prerender siempre, 0.7 |
| `/categoria/:cat/:ciudad` | sí, 404 si no hay oferta | 0.7 si hay oferta | 8 editoriales, candado ≥3 |
| `/ciudad/:slug` | sí | 0.8 si hay oferta | — |
| `/autonomo/:slug` (46) | sí, 404 si no existe | 0.6 | prerender anidada, sitemap anidada |
| `/en-linea`, `/solicitudes` | sí | 0.7 | — |
| `/blog`, `/blog/:slug` (25) | sí (`og.js` para posts) | 0.7 | prerender, 0.7 |
| `/crear-pagina-web`, `/cv-gratis`, `/presupuesto-gratis` | sí | 0.7 | — |
| `/para-autonomos` | sí (añadir rewrite) | 0.9 (añadir) | prerender, 0.9 |
| `/empleo`, `/promo-instagram` | no (HTML crudo) | 0.6 | — |
| `/contacto`, `/terminos`, `/privacidad`, `/aviso-legal`, `/cookies` | no | 0.3 | prerender, 0.3 |
| `/preguntas-frecuentes` | depende de §9.3 | | prerender, 0.7 |

Cambio de criterio a vigilar: khdemlidaba sólo emite `/categoria/:slug` con al menos un pro publicado (hoy en misautonomos 4 de las 17 categorías no tienen ningún perfil visible: `abogado`, `fontanero`, `autonomo-limpieza` tiene 1, `persianas-toldos` 1 — con el criterio de khdemlidaba `abogado` y `fontanero` salen del sitemap y responden `noindex,follow`).

---

## 7. Tamaño del renombrado

### 7.1 Método
`count-paths.mjs` (scratchpad) recorre los 347 ficheros `.js/.jsx/.mjs/.json/.ts/.py` que `git ls-files src api scripts vercel.json` devuelve en `794e657` y cuenta, por línea, las apariciones de `/<segmento>` con frontera de palabra para los 36 segmentos franceses que cambian (`professionnels`, `recherche`, `metiers`, `professionnel`, `ville`, `metier`, `en-ligne`, `connexion`, `inscription`, `mot-de-passe`, `bienvenue`, `tableau-de-bord`, `favoris`, `profil`, `demandes`, `mes-demandes`, `mes-candidatures`, `recrutement`, `devis-gratuit`, `salaires`, `cv-gratuit`, `site-web-gratuit`, `creation-site-web`, `soutenir`, `mes-paiements`, `mentions-legales`, `confidentialite`, `conditions`, `contact`, `desabonner`, `avis`, `compte`, `plus`, `supprimer-mon-compte`, `notifications`, `site`), más (b) las mismas palabras dentro de alternancias de regex sin barra (`(compte|admin|…)`), más (c) `/admin/<subruta francesa>`. Cubre `to="/…"`, `href="/…"`, `navigate('/…')`, `<Navigate to>`, `startsWith('/…')`, `canonical="/…"`, `path.match(/^\/…/)`, rewrites/redirects de `vercel.json` y literales de tests. Cuenta también comentarios (139 de las 901) y tiene algún falso positivo (`/site` dentro de `https://khdemlidaba.ma/site/…` es legítimo; `/plus` y `/contact` aparecen una vez en contextos no-ruta). No había ninguna llamada a `matchPath`.

### 7.2 Totales

| Perímetro | Ficheros con paths | Cambian (con barra) | En alternancias | `/admin/<x>` | Total que cambia | Iguales |
|---|---|---|---|---|---|---|
| `src/` (sin locales) | 117 | 599 | 32 | 24 | **655** | 128 |
| `src/i18n/locales/*.json` (6) | 0 | 0 | 0 | 0 | 0 | 0 |
| `scripts/` | 31 | 219 | 0 | 0 | **219** | 63 |
| `api/` | 1 (`prerender.js`) | 62 | 4 | 0 | **66** | 24 |
| `vercel.json` | 1 | 21 | 10 | 0 | **31** | 27 |
| **Total** | **165** | **901** | **46** | **24** | **971** | **242** |

De las 219 de `scripts/`, 67 están en 12 scripts de marketing/vídeo/capturas marroquíes que no se trasplantan (`video-shots.mjs` 25, `appstore-screenshots.mjs` 10, `captures-site.mjs` 8, `build-site-batch-20260929.mjs` 6, `site-stock-photos.json` 5, `playstore-screenshots.mjs` 4, `video-clients-app.mjs` 3, `build-site-batch-20260928.mjs` 2, `apercu-site.mjs`, `sites-clients.json`, `verif-sites-clients.mjs`, `video-neveu.mjs` 1 cada uno): el renombrado real es de **904 apariciones en 153 ficheros**.

### 7.3 Top 20 ficheros

| # | Fichero | Cambian | Detalle |
|---|---|---|---|
| 1 | `api/prerender.js` | 66 | 62 con barra (48 en código) + 4 en regex |
| 2 | `src/App.jsx` | 57 | 52 `<Route>` + `AUTH_PATHS`, `NO_SCROLL_ROUTES_NATIVE`, `NativeHome` |
| 3 | `src/lib/navSections.js` | 45 | 17 con barra + 28 en las 6 regex de secciones |
| 4 | `scripts/seo-locales.test.mjs` | 35 | tests de `isArabicSeoPath` |
| 5 | `vercel.json` | 31 | 21 rewrites/redirects + 10 en la exclusión del combo |
| 6 | `scripts/video-shots.mjs` | 25 | marketing, no se trasplanta |
| 7 | `src/pages/Admin.jsx` | 25 | 5 + 20 subrutas |
| 8 | `scripts/generate-sitemap.js` | 24 | 14 en código |
| 9 | `src/components/Header.jsx` | 23 | 14 `to=` distintos |
| 10 | `src/pages/NativeAccount.jsx` | 20 | |
| 11 | `scripts/seo-prerender.test.mjs` | 18 | |
| 12 | `src/components/NativeTabBar.jsx` | 16 | `HIDDEN_TAB_ROUTES` + raíces |
| 13 | `src/pages/Register.jsx` | 16 | incluye `?next=/professionnel/creer` del callback |
| 14 | `src/components/Footer.jsx` | 15 | |
| 15 | `src/lib/productAnalyticsCore.js` | 15 | 14 + 1 en regex |
| 16 | `scripts/smoke-native-routes.mjs` | 14 | |
| 17 | `src/pages/More.jsx` | 14 | |
| 18 | `src/pages/NativeRegisterWizard.jsx` | 13 | |
| 19 | `src/pages/ProfessionalProfile.jsx` | 13 | |
| 20 | `scripts/growth-database.test.mjs` / `scripts/validate-sitemap.mjs` / `src/pages/OnboardingPro.jsx` | 12 | empate |

Por segmento (las 901 con barra): `recherche` 96, `professionnel` 95, `demandes` 70, `metier` 66, `connexion` 56, `ville` 40, `inscription` 33, `profil` 32, `metiers` 29, `mes-paiements` 29, `creation-site-web` 25, `tableau-de-bord` 25, `en-ligne` 22, `site` 22, `confidentialite` 22, `bienvenue` 22, `cv-gratuit` 19, `conditions` 19, `contact` 18, `recrutement` 17, `compte` 14, `avis` 14, `devis-gratuit` 13, `mentions-legales` 13, `mot-de-passe` 13, `plus` 11, `professionnels` 9, `site-web-gratuit` 9, `soutenir` 9, `mes-demandes` 9, `favoris` 8, `notifications` 6, `salaires` 6, `mes-candidatures` 5, `desabonner` 3, `supprimer-mon-compte` 2.

### 7.4 Fuera del perímetro pedido (pero necesario para que no quede nada en francés)

| Dónde | Ficheros | Apariciones | Nota |
|---|---|---|---|
| `supabase/functions` (Deno) | 12 | 51 líneas (`/profil/` 9, `/desabonner?` 8, `/professionnel/` 7, `/site-web-gratuit` 5, `/avis` 3, `/mes-paiements` 4, `/mes-demandes?` 2, `/inscription?` 2, `/professionnels` 2) | no pueden importar `src/lib/routes.js` |
| `supabase/migrations` (SQL) | 12 | 22 líneas (`/mes-paiements` 7, `/demandes/` 4, `/site-web-gratuit` 3, `/profil/` 3, `/metier/` 2, `/ville/`, `/salaires`, `/recherche`, `/professionnels`, `/metiers`, `/mes-demandes`, `/mes-candidatures` 1) | textos de notificaciones y enlaces generados en SQL: reescribir al portar las migraciones |
| `public/robots.txt` | 1 | 15 | |
| `public/llms.txt` | 1 | 14 | |
| `public/.well-known/apple-app-site-association` | 1 | 9 (12 componentes) | + `assetlinks.json` (sin paths) |
| `android/app/src/main/AndroidManifest.xml` | 1 | 9 líneas (11 `pathPrefix`) | |
| `public/sitemap.xml`, `public/local-services.json`, `public/seo-i18n-ar.json` | 3 | 2.183 + generados | se regeneran en build; no se editan |
| `public/site/*/index.html` | 8 | 22 | webs de clientes marroquíes: SKIP |

---

## 8. Mecanismo propuesto: un módulo de rutas y una guarda de build

### 8.1 `src/lib/routes.js` — única fuente de verdad
- Sin imports (para que lo carguen Node en `api/` y `scripts/`, igual que `api/blog/og.js` ya importa `src/lib/markdown.js` y `scripts/lib/sitemap-utils.mjs` importa `src/data/staticData.js`).
- Tres exportaciones: `PATHS` (constantes y constructores: `PATHS.search = '/buscar'`, `PATHS.pro(slug)`, `PATHS.category(slug)`, `PATHS.city(slug)`, `PATHS.combo(cat, city)`, `PATHS.blogPost(slug)`, `PATHS.review(slug)`, `PATHS.demande(id)`, `PATHS.admin.x`…), `PATTERNS` (los `path=` de `<Route>`: `'/autonomo/:slug'`, `'/categoria/:cat/:ciudad'`, …) y `SEGMENTS` (primer segmento de cada ruta, para que `navSections.js` construya sus 6 regex con `new RegExp` en vez de escribirlas a mano, y para que la guarda sepa qué literales son legítimos).
- Listas derivadas que hoy están dispersas: `AUTH_PATHS`, `NO_SCROLL_ROUTES_NATIVE`, `HIDDEN_TAB_ROUTES`, `SECTION_ROOTS`, `ARABIC_SEO_PATHS` (`seoLocales.js`), la lista de páginas indexables de `productAnalyticsCore.js:85`, la lista de rutas del smoke test, las entradas fijas del sitemap y los `canonical` de `prerender.js`: todas pasan a derivarse de `PATHS`.
- Los 165 ficheros se reescriben sustituyendo el literal por `PATHS.*`; los 46 segmentos en regex se reconstruyen desde `SEGMENTS`.

### 8.2 Guarda de build `scripts/check-route-literals.mjs`
- Se encadena en `npm run build` junto a `check-hook-order.mjs`, `check-csp-inline.mjs` y `check-version-sync.mjs` (mismo patrón: `node scripts/check-… || exit 1`).
- Regla 1 (bloqueante): ningún fichero trackeado de `src`, `api`, `scripts`, `vercel.json`, `supabase/functions`, `supabase/migrations`, `public/robots.txt`, `public/llms.txt`, `public/.well-known/*`, `android/app/src/main/AndroidManifest.xml` contiene `/<segmento francés>` ni `<segmento francés>` dentro de una alternancia de regex (misma lista de 36 + 14 subrutas admin que el script de recuento, que ya existe y sirve de base).
- Regla 2 (bloqueante en `src/` y `api/`): todo literal de cadena que empiece por `/` y cuyo primer segmento sea alfabético debe estar en `SEGMENTS` o en una allowlist corta (`/assets/`, `/api/`, `/seed/`, `/icon-`, `/og-default.png`, `/.well-known/`, `/sitemap.xml`, `/robots.txt`, `/llms.txt`, `/app.html`). Obliga a pasar por `PATHS` también en el código nuevo.
- Regla 3: cada `source` de `vercel.json` (rewrites y redirects) tiene su primer segmento en `SEGMENTS` o en los redirects de legado, y cada `PATTERN` de un segmento sin rewrite propio está cubierto por el catch-all (absorbe `scripts/check-vercel-routes.mjs` de misautonomos, que muere con el trasplante). Si se elige la opción A, comprueba además que la lista de exclusión del combo sea exactamente el conjunto de `SEGMENTS` con guion.
- Complemento opcional en `eslint.config.js`: `no-restricted-syntax` con selector `Literal[value=/^\/(connexion|inscription|…)/]` para que el editor avise antes del build.

### 8.3 Lo que no puede importar el módulo
- Edge functions (Deno): un paso `scripts/sync-routes.mjs` genera `supabase/functions/_shared/routes.ts` a partir de `routes.js`; la guarda falla si los dos ficheros divergen.
- SQL: las 22 líneas de las migraciones se reescriben a mano al portarlas (capa de datos); la guarda las vigila.
- `vercel.json`, AASA, `AndroidManifest.xml`, `robots.txt`, `llms.txt`: se editan a mano una vez; la guarda impide que vuelva un path francés.

### 8.4 Orden de trabajo sugerido
1. Crear `routes.js` con los valores españoles de §1 (decisiones de §9 cerradas).
2. Reescribir los 153 ficheros de §7.2 (sin los 12 de marketing) de mayor a menor: `prerender.js`, `App.jsx`, `navSections.js`, `vercel.json`, `generate-sitemap.js`, `Admin.jsx`, `Header.jsx`, … y los 8 tests.
3. Encadenar la guarda y hacerla pasar en verde.
4. `robots.txt`, `llms.txt`, AASA, `assetlinks`, `AndroidManifest`, edge functions (via `sync-routes`), migraciones.
5. Redirects de §4 en `vercel.json` (la 4.1 puede ir antes que todo lo demás).

---

## 9. Riesgos (de mayor a menor gravedad)

1. **Fichas**: 44 URLs anidadas indexadas + 23 slugs sucios en circulación. Sin la regla genérica de §4.1, las 23 reglas por slug y la limpieza de `slug` en la migración, la mitad de las fichas dan 404 (khdemlidaba resuelve el slug exacto, sin alias).
2. **Catch-all `/:combo` en raíz** (opción A): la lista de exclusión pasa de 6 a 14 entradas y cada ruta española con guion olvidada responde 404+noindex en recarga directa; hoy ya le pasa a `/mes-paiements` en khdemlidaba.
3. **Dos vocabularios de slug de categoría** en misautonomos (`service_categories.slug` vs `slugify(categories[0])`): hasta que la capa de datos fije uno, las 301 de `/categoria/<cat>/<ciudad>` y el segmento de las fichas no se pueden escribir en firme.
4. **Auth**: `/auth/callback` y `?next=/contrasena/nueva` deben estar en las Redirect URLs de Supabase `dquxsethatxtptfviiwd`; hoy misautonomos redirige al origen y a `/confirma-email`. Si se olvida, ningún enlace de correo (confirmación, olvido de contraseña, magic link) funciona.
5. **Contenido indexado sin equivalente**: `/preguntas-frecuentes` (0.7), `/ayuda` (0.6) y las 8 guías editoriales `/categoria/<cat>/<sabadell|terrassa>` (0.8, ~270 líneas de texto en `prerender.mjs`) no existen en la arquitectura de khdemlidaba. O se portan como páginas extra, o se asume la pérdida con 301.
6. **`/valorar/:token`**: los correos ya enviados con token de reseña dejan de resolver cuando la ruta pasa a `ReviewSubmit` (`/valorar/:slug`); el único paliativo es que la capa de datos mapee `review_tokens` → slug y se añada un redirect por token (no hay lista de tokens vivos en este informe).
7. **`robots.txt` de misautonomos** bloquea `/solicitudes` (futuro tablón público indexable) y `/valorar`; `Allow: /precios` y `llms.txt` apuntan a `/precios` (301). Hay que reescribirlo con la lista de khdemlidaba (20 `Disallow`).
8. **Nativo**: AASA (12 componentes), `AndroidManifest` (11 `pathPrefix`), la URL de borrado de cuenta declarada en Google Play y `applinks:misautonomos.es` en `App.entitlements` tienen que cambiar en la misma versión que las rutas, o los deep links abren el navegador en vez de la app.
9. **55 redirecciones de legado** client-side desaparecen con `App.jsx`; si no pasan a `vercel.json`, las URLs PascalCase de Base44 (`/Autonomo`, `/Search`, `/FAQ`…) vuelven a dar 404.
10. **Edge functions y SQL**: 51 + 22 líneas con paths franceses fuera del alcance del módulo; cualquier correo o notificación generada en servidor enlazaría `/profil/diplome` o `/mes-paiements` en misautonomos.es.

---

## 10. Decisiones que sólo puede tomar el dueño

1. Forma de la landing ciudad × categoría: `/categoria/:cat/:ciudad` (conserva las 8 URLs indexadas, sin catch-all raíz; recomendado) o la réplica literal `/<cat>-<ciudad>` en raíz.
2. Qué idiomas llevan prefijo de URL (`/en`, `/fr`, `/de`, `/nl`, `/ar`) y cuáles sólo viven en el selector; hoy khdemlidaba prefija sólo `/ar` y misautonomos ninguno.
3. `/preguntas-frecuentes` y `/ayuda`: conservarlas como páginas extra fuera del modelo o 301 (a `/` y `/contacto`).
4. Nombre del tablón público: `/solicitudes` (obliga a quitar su `Disallow` de robots) o `/encargos`.
5. Las 8 guías editoriales de Sabadell/Terrassa: portarlas al prerender español o dejarlas como listados genéricos.
6. `/salarios` (observatorio marroquí) y `/apoyar` (donación): se trasplantan o no.
7. `/desabonner` → `/baja` (colisiona con `api/baja.js` de la newsletter) o `/baja-recordatorios`.
8. Webs de clientes `/site/:slug`: reservar `/sitio/:slug` desde el primer día o esperar al primer cliente español.
9. Nombre de la oferta de empleo: `/empleo` o `/publicar-oferta-de-empleo`.
