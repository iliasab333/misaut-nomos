# 06 · Rendimiento: velocidad e imágenes

Fase de sólo lectura. Medidas tomadas el 2026-10-01 (17:36–18:40 UTC) desde un Mac en España: borde Cloudflare `MAD` para los dos proyectos Supabase, borde Vercel `cdg1` para las dos webs. Todo lo que no sea una cifra medida está marcado como estimación.

Repos: misautonomos `/Users/bigseo/Desktop/misaut-nomos` (HEAD `2fe07a7`), khdemlidaba `/Users/bigseo/khdemlidaba` (HEAD `794e657`). Supabase: `dquxsethatxtptfviiwd` (misautonomos) y `eiacoozyubxkbjwhgkml` (khdemlidaba).

## 0. Lo esencial

1. **El dueño tiene razón en el síntoma y se equivoca en la causa.** El HTML, el bundle y la latencia a Supabase son equivalentes en las dos webs; khdemlidaba incluso envía **más JavaScript** (372.573 bytes por cable frente a 254.143). Lo que hace lenta a misautonomos son **las imágenes** y, en segundo lugar, **las peticiones de datos**.
2. Cada avatar de 56 px del buscador de misautonomos se sirve como **el fichero original**: media de **571.862 bytes**, máximo **2.837.614 bytes** (3840×2160 px). Las 30 `imagen_principal` suman **17.155.864 bytes**; las mismas 30 pasadas por el endpoint de transformación a 112 px WebP suman **72.916 bytes** (235 veces menos). En la primera pantalla medida en el navegador, tres avatares costaron **1.409.791 bytes**; en khdemlidaba, cuatro avatares cuestan unos **19.000 bytes**.
3. La razón es un fichero con una premisa caducada: `src/lib/supabaseImage.js` afirma que `/render/image/` devuelve `403 FeatureNotEnabled` y devuelve la URL original sin parámetros. **Hoy el endpoint responde 200 en las 30 imágenes probadas** (incluida una `.avif`). Nadie lo ha vuelto a comprobar desde el commit `b2cbe3c`.
4. El buscador de misautonomos descarga **la tabla entera** (`select *`, 63 columnas, 46 filas, 112.952 bytes sin comprimir / 20.343 con brotli), lanza una petición a `users` que **devuelve `[]`** al visitante anónimo por RLS (1.449 ms tirados) y dispara **12 escrituras** (`rpc/track_profile_metric`, una por tarjeta) en cada vista. khdemlidaba pide **24 filas** de una RPC paginada (32.673 / 7.460 bytes) con todos los filtros en SQL, cero escrituras, y cachea el resultado en memoria.
5. El bucket `uploads` de misautonomos (público, sin límite de tamaño ni de tipo MIME) guarda **183 objetos, 189.456.750 bytes**, media **1.035.283 bytes**, **0 WebP**, **74 objetos de más de 1 MB**, **20 con `Content-Type: application/octet-stream`**, todos con `cacheControl=3600`. El bucket `photos` de khdemlidaba: 1.734 objetos, media **95.446 bytes**, 875 WebP, límite 5 MB y tres MIME permitidos, todos con `cacheControl=31536000`.
6. El trasplante resuelve por sí solo la RPC paginada, la transformación de avatares, la subida en WebP (400 px avatar / 800 px galería) y el troceado del bundle. **No resuelve** las 98 fotos ya subidas (90.544.659 bytes): hay que reprocesarlas o aceptar la transformación al vuelo (que funciona, pero con `max-age=3600` heredado de los objetos actuales).

## 1. Método

| Qué | Cómo |
|---|---|
| HTML de `/buscar` y `/recherche` | `curl` ×3 con `Accept-Encoding: gzip, br` y ×1 sin compresión; cabeceras con `curl -sI`. |
| Activos del bundle desplegado | `index.html` de cada web → cada `<script>`/`<link>` medido por cable (brotli) y sin comprimir. |
| Lo que carga de verdad el navegador | Panel de navegador (Chromium) sobre las dos URLs públicas, 8 s de espera, `performance.getEntriesByType('resource')` y lectura del DOM (`<img>`: `naturalWidth`, `loading`, `fetchpriority`). |
| Peticiones de datos | Lectura de `src/pages/Search.jsx`, `src/api/base44Client.js` (misautonomos) y `src/hooks/useProfessionals.js`, `src/lib/resultsCache.js` (khdemlidaba); después `GET` reales a PostgREST con la clave anon pública que cada web incrusta en su bundle (la de misautonomos está en `src/api/supabaseClient.js:6` como `FALLBACK_ANON_KEY`; la de khdemlidaba es una `sb_publishable_…` dentro de `assets/index-CjFUb3JK.js`). Para la RPC de khdemlidaba usé `GET /rest/v1/rpc/…`: la función es `STABLE` y no contiene escrituras (comprobado con `pg_get_functiondef`), y PostgREST ejecuta los GET en transacción de sólo lectura. |
| Tamaño del payload en base | SQL de sólo lectura: `sum(pg_column_size(t.*))`, `sum(length(row_to_json(t)::text))`, bytes de `description` y `photos[]`. |
| Imágenes | 6 URLs al azar + las 30 `imagen_principal` completas: `curl -sI` del original (Content-Length, Content-Type, Cache-Control, cf-cache-status) y de la URL transformada (`/object/public/` → `/render/image/public/` + `?width=112&height=112&resize=cover&quality=75`), dos veces cada una para ver la caché; dimensiones con `sips`. |
| Buckets | SQL sobre `storage.buckets` y `storage.objects` (metadata `size`, `mimetype`, `cacheControl`) en los dos proyectos. |
| Bundle local | `ls` de `dist/assets` en los dos repos, `package.json` de ambos, `grep` del chunk principal. |

## 2. Tabla de medidas

### 2.1 HTML de la página de resultados

| | misautonomos.es/buscar | khdemlidaba.ma/recherche |
|---|---|---|
| Bytes sin comprimir | 9.772 | 11.312 |
| Bytes por cable (brotli) | 3.857 | 3.979 |
| TTFB en 3 pasadas | 0,398 / 0,213 / 0,128 s | 0,471 / 0,129 / 0,218 s |
| Cómo se sirve | `index.html` estático, `x-vercel-cache: HIT`, `age: 36275`; `<link rel="canonical">` fijo a `/buscar` en `index.html:37` | `api/prerender.js` (`x-vercel-cache: MISS`, `cdn-cache-control: public, max-age=600`), título y JSON-LD inyectados por ruta |
| Cabeceras de seguridad | HSTS | HSTS + CSP + X-Frame-Options + Referrer-Policy + Permissions-Policy (`vercel.json`) |

Veredicto: iguales. Aquí no está la diferencia.

### 2.2 Bundle

Desplegado, carga inicial (lo que referencia `index.html`):

| | misautonomos | khdemlidaba |
|---|---|---|
| Ficheros | 4 | 37 (`modulepreload` de 20 chunks) |
| Bytes por cable (brotli) | **254.143** | **372.573** |
| Bytes sin comprimir | 873.297 | 1.166.951 |
| Chunk principal | `index-CXLSQpgC.js` 713.930 raw / 220.081 br | `index-CjFUb3JK.js` 331.798 raw / 92.579 br |
| Vendors separados | sólo `vendor-utils` (46.615) y `vendor-fonts` (243) — `vite.config.js:35-57` deja todo lo demás en el chunk principal | `vendor` 179.104, `supabase` 212.410, `i18n` 56.462 con hash estable (`vite.config.js`, `rolldownOptions.output.codeSplitting`) |
| Idioma inicial | `es.app` 32.863 (perezoso) | `fr` 116.135 raw / 39.110 br |
| CSS | 112.509 raw / 19.409 br | 128.521 raw / 16.440 br |
| Fuentes | 3 woff2 preload por JS (23.664 + 24.452 + 24.356) + 500 bajo demanda, `font-display: optional` (`src/main.jsx:27-56`) | `inter-latin.woff2` 48.432 (preload) + `inter-latin-ext` 85.272; **`/fonts/*` sin cabecera de caché larga** (`max-age=0, must-revalidate`) |

Lo que el navegador ejecutó de verdad en la página de resultados:

| | misautonomos `/buscar` | khdemlidaba `/recherche` |
|---|---|---|
| Scripts | 21 | 39 |
| JS descomprimido | 841.944 bytes | 1.010.238 bytes |
| Chunks perezosos de la ruta | `Search` 11.647, `es.app` 32.863, `StructuredData` 8.711, `locationsData` 6.059, `ProfessionalCard` 5.235, `HeroSearch` 5.090, `SEOHead` 4.965, `GuestContactModal` 4.863 | `Search-BqjPdxdO.js` 11.065 + hooks pequeños (`useCategories` 2.423, `useCities` 2.295, `resultsCache` 1.346, `image` 1.930) |
| `domContentLoaded` / `load` | 244 / 257 ms | 301 / 304 ms |

`dist/` local (misautonomos construido el 22-09, khdemlidaba el 29-09):

| | misautonomos | khdemlidaba |
|---|---|---|
| Ficheros en `dist/assets` | 92 | 140 |
| JS total | 1.853.657 | 3.620.282 (de los que **1.216.293 son `Tajawal_700Bold-*.js`**, la fuente árabe embebida como JS, perezosa) |
| Chunks más grandes | `index` 713.930; `BlogPostEditor` 241.068 (react-quill); `ProfessionalDashboard` 125.379 | `Tajawal` 1.216.293; `index` 332.611; `supabase` 212.409; `vendor` 179.104; `Admin` 146.941; locales `ar` 137.700 / `fr` 116.486 / `de` 112.450 / `es` 109.375 / `nl` 107.256 / `en` 102.131 |

Dependencias (`package.json`): 34 y 34. Sólo en misautonomos (10): `@capacitor/geolocation`, `@fontsource/inter`, `@tailwindcss/typography`, `@tanstack/react-query`, `date-fns`, `framer-motion`, `leaflet`, `react-leaflet`, `react-quill`, `tailwindcss-animate`. Uso real en `src/`: `framer-motion` 1 fichero, `react-quill` 1 (BlogPostEditor), `date-fns` 5, `@tanstack/react-query` 27, `leaflet` 0, `react-leaflet` 0, `tailwindcss-animate` 0. En el chunk principal no aparece `framer-motion` ni `quill` (van perezosos); sí aparecen 131 referencias a `lucide`, 65 a `supabase`, 23 a `i18next`, 11 a `OneSignal`, 10 a `capacitor`. Sólo en khdemlidaba (10): `@react-pdf/renderer`, `marked`, `isomorphic-dompurify`, `libphonenumber-js`, `qrcode`, `@expo-google-fonts/tajawal`, `@capgo/capacitor-social-login`, `@vercel/analytics`, `@capacitor/keyboard`, `@capacitor/cli`.

Veredicto: el bundle **no** es lo que frena a misautonomos. El trasplante trae un bundle inicial un 47 % más pesado por cable (+118.430 bytes), que el visitante recurrente amortiza gracias a los chunks `vendor`/`supabase`/`i18n` con hash estable, cosa que el chunk único de 714 KB de misautonomos no permite (cada despliegue invalida todo).

### 2.3 Peticiones de datos del buscador

**misautonomos** (`src/pages/Search.jsx:104-132` sobre `src/api/base44Client.js:113-129`, que siempre hace `select('*')`):

| # | Petición | Filas × columnas | Bytes raw / brotli | Duración en navegador |
|---|---|---|---|---|
| 1 | `GET /rest/v1/service_categories?select=*&order=created_date.desc` | 17 × ? | 5.347 / 1.279 | 789 ms |
| 2 | `GET /rest/v1/professional_profiles?select=*&order=created_date.desc` — **toda la tabla**, filtro `visible_en_busqueda && onboarding_completed` en JS (`Search.jsx:108`) | 46 × 63 | **112.952 / 20.343** (curl TTFB 0,20–0,98 s) | 827 ms |
| 3 | `GET /rest/v1/users?select=*&id=in.(46 ids)` (`Search.jsx:113-122`) | **0 filas** → `[]` | 2 / 2 | **1.449 ms** |
| 4–15 | 12 × `POST /rest/v1/rpc/track_profile_metric` (`search_appearance`, una por tarjeta, `Search.jsx:158-164`) | — | — | ~430 ms cada una, en paralelo |

Sobre la #2, medido en base (`sum(pg_column_size)` = 58.768 bytes; JSON 112.300): las columnas más gordas que viajan y la tarjeta no pinta son `photos[]` 9.961 bytes, `description` 7.122, `descripcion_corta` 6.608, `social_links` 3.177, `services_offered` 2.561, `portfolio_items` 2.219, `formas_pago` 1.616. La tarjeta (`src/components/ProfessionalCard.jsx`) usa unas 15 columnas.

Sobre la #3: la política `users_self_read` es `(auth_user_id = auth.uid()) OR is_admin()`, así que el visitante anónimo recibe `[]` y `professionalUser?.profile_picture` (`ProfessionalCard.jsx:58`) nunca se usa. Es una petición de 1,4 s con una URL de ~3 KB que no sirve para nada en el caso principal. (De paso: 25 de los 46 `user_id` son ids Base44 de 24 hex y 21 son UUID; `pp_read` es `true`, el anónimo ve las 63 columnas, teléfono incluido — eso es capa de datos, no de rendimiento.)

Cadena crítica medida: datos empiezan a 352 ms → perfiles llegan a 1.179 ms → tarjetas → imágenes empiezan a 1.220 ms.

**khdemlidaba** (`src/hooks/useProfessionals.js`, `PAGE_SIZE = 24`, `src/lib/resultsCache.js`):

| # | Petición | Filas × columnas | Bytes raw / brotli | Duración en navegador |
|---|---|---|---|---|
| 1 | `GET /rest/v1/cities?select=id,slug,name` | ? × 3 | 3.385 / 977 | 671 ms |
| 2 | `GET /rest/v1/categories?select=id,slug,name,emoji,aliases,family,allows_remote` | ? × 7 | 21.467 / 5.583 | 649 ms |
| 3 | `POST /rest/v1/rpc/search_professionals` (`p_limit 24`, filtros categoría/ciudad/experiencia/nota/disponibilidad/género/modo/orden **en SQL**, `total_count` en cada fila) | 24 × 31 | **32.673 / 7.460** (curl TTFB 0,22–0,31 s) | 985 ms |
| — | Escrituras en la página de resultados | **0** | | |

La RPC devuelve `description` (3.261 bytes en la página) y `gallery` (8.208) porque la ficha los reutiliza. `total_count` = 1.140 publicados de 1.394 perfiles. Caché en memoria por combinación de filtros (8 entradas, `FRESH_MS` 60 s, stale-while-revalidate), persistencia en `localStorage` sólo en app nativa (24 h, 180.000 caracteres), scroll infinito con `IntersectionObserver`, una relance automática a los 1.200 ms, dedupe por id.

Cadena crítica medida: RPC empieza a 451 ms → llega a 1.436 ms → imágenes a 1.532 ms.

Veredicto: en fibra y a 46 perfiles, los dos buscadores pintan la primera tarjeta en un tiempo parecido (1,2–1,5 s). La diferencia es estructural: el payload de misautonomos **crece con cada perfil** (a 500 perfiles serían ~1,2 MB sin comprimir por visita, estimación lineal), el de khdemlidaba es constante (24 filas con 1.140 perfiles). Y misautonomos hace 15 peticiones donde khdemlidaba hace 3.

### 2.4 Imágenes

**Buckets:**

| | `uploads` (dquxsethatxtptfviiwd) | `photos` (eiacoozyubxkbjwhgkml) |
|---|---|---|
| Público | sí | sí |
| `file_size_limit` | **ninguno** | 5.242.880 |
| `allowed_mime_types` | **ninguno** | `image/jpeg`, `image/png`, `image/webp` |
| Objetos | 183 | 1.734 |
| Bytes totales | 189.456.750 | 165.503.338 |
| Bytes medios / máximo | **1.035.283** / 4.968.379 | **95.446** / 1.195.321 |
| Formato | 145 JPEG, 17 PNG, **0 WebP**, **20 `application/octet-stream`** (todos en `rehosted/`, 19 con extensión de imagen), 1 `audio/mp4` | 709 JPEG, 150 PNG, **875 WebP** |
| Objetos > 1 MB | **74** (40 %) | 14 (0,8 %) |
| `cacheControl` en metadata | 183 × `max-age=3600` | 1.734 × `max-age=31536000` |
| Avatares | — (no hay convención de ruta) | 821 objetos `*/avatar-*`, media **46.906** bytes, máx 370.657 |
| Galería | — | 907 objetos `*/gallery-*`, media 139.341 bytes |

**Lo que referencian los 46 perfiles de misautonomos** (join URL → `storage.objects`; 0 huérfanas, todas existen):

| Origen | Referencias | Bytes totales | Media | Máximo | > 1 MB | > 500 KB | Formato |
|---|---|---|---|---|---|---|---|
| `imagen_principal` | 30 | 17.155.864 | 571.862 | 2.837.614 | 7 | 9 | 17 JPEG, 7 PNG, 6 octet-stream, 0 WebP |
| `photos[]` | 81 | 73.388.795 | 906.035 | 3.795.692 | 26 | 30 | 70 JPEG, 4 PNG, 0 WebP |
| **Total** | 111 (98 URLs distintas) | **90.544.659** | 815.718 | 3.795.692 | 33 | 39 | 0 WebP |

Dimensiones de la muestra de 6 (`sips`): 3840×2160 (2.298.495 B), 3840×2160 (2.434.913 B), 1024×1024 PNG (1.005.770 B), 2048×1152 (65.909 B), 512×384 (32.997 B), 223×223 (23.161 B). Se pintan a **56×56 px**.

**Original frente a transformada** (`/render/image/public/…?width=112&height=112&resize=cover&quality=75`, cabecera `Accept: image/webp`):

| # | Original (bytes) | Content-Type original | Cache-Control original | Transformada (bytes) | Content-Type | Cache-Control | cf-cache-status 1º/2º |
|---|---|---|---|---|---|---|---|
| 1 | 2.298.495 | image/jpeg | `no-cache` | **3.874** | image/webp | `public, max-age=3600` | MISS / HIT |
| 2 | 23.161 | image/jpeg | `no-cache` | **2.102** | image/webp | `public, max-age=3600` | MISS / HIT |
| 3 | 32.997 | **application/octet-stream** | `no-cache` | **2.066** | image/webp | `public, max-age=3600` | MISS / HIT |
| 4 | 65.909 | image/jpeg | `no-cache` | **754** | image/webp | `public, max-age=3600` | MISS / HIT |
| 5 | 2.434.913 | image/jpeg | `no-cache` | **2.752** | image/webp | `public, max-age=3600` | MISS / HIT |
| 6 | 1.005.770 | image/png | `no-cache` | **1.910** | image/webp | `public, max-age=3600` | HIT / HIT |

Notas: sin `Accept: image/webp` el endpoint devuelve el formato de origen (JPEG 4.520 bytes para la #1); el formato lo decide la cabecera del navegador, como en khdemlidaba. Los originales responden `cache-control: no-cache` y `cf-cache-status: MISS → REVALIDATED` en **los dos proyectos** (también el avatar WebP de khdemlidaba, 34.384 bytes): es el comportamiento del gateway de Storage para `/object/public/`. La transformada hereda el `cacheControl` del objeto: `3600` en misautonomos, `31536000` en khdemlidaba (medido: `public, max-age=31536000`, HIT).

**Las 30 `imagen_principal` completas:** originales **17.155.864** bytes → a 112 px **72.916** bytes (media 2.431 por avatar; 235× menos) → a 400 px, calidad 82 (el tamaño de avatar que sube khdemlidaba) **542.610** bytes (32× menos). **0 fallos de 30**, incluida `6a247e649edad07994fa67e2.avif` (80.995 → 4.916) y las 6 servidas como `octet-stream`.

**Primera pantalla real** (navegador, 12 tarjetas, 4 con `priority`): tres avatares cargados en `eager`/`fetchpriority=high`: `…2add39b9.jpg` 1079×999 (78.883 B), `…cf6e2229.png` 1024×1024 (1.005.770 B), `…4c7e2bc1.jpeg` 1370×1500 (325.138 B) = **1.409.791 bytes para tres cuadrados de 56 px**; sus transformadas suman 5.136 bytes. En khdemlidaba, cuatro avatares `eager` a 112 px WebP (4.664 bytes el medido) ≈ 19.000 bytes. Una muestra ordenada de 12 tarjetas (SQL, `is_ads_plus desc, created_date desc`): 9 con foto, **2.956.815 bytes**.

Estimación de tiempo sólo para las imágenes de la primera pantalla: a 10 Mbit/s (4G corriente) 2,96 MB ≈ **2,4 s**; a 1,5 Mbit/s (3G) ≈ **16 s**. Las transformadas: < 0,1 s en los dos casos. Recorrer la lista entera (30 avatares): 17,2 MB ≈ 14 s a 10 Mbit/s, frente a 73 KB.

### 2.5 Latencia a Supabase

`GET /auth/v1/health` ×3: `dquxsethatxtptfviiwd` connect 18–36 ms, TLS 75–93 ms, TTFB 130–174 ms; `eiacoozyubxkbjwhgkml` connect 18–36 ms, TLS 75–92 ms, TTFB 102–320 ms. Los dos detrás de Cloudflare con borde `MAD`. No hay diferencia de red.

## 3. Diagnóstico: qué hace lenta a misautonomos hoy

Por orden de peso:

1. **Avatares sin transformar (el 90 % del problema).** `src/lib/supabaseImage.js` devuelve `url.split('?')[0]` con el comentario «este proyecto NO tiene activado Image Transformations… devuelve 403». Medido hoy: 30 de 30 transformaciones responden 200. Resultado: `ProfessionalCard.jsx:60` pide `optimizeSupabaseImage(photoUrl, { width: 128, quality: 70 })` y recibe el original de hasta 2,8 MB para un `<img>` de 56 px. El componente que sí usa `/render/image/` con `format=webp`, `src/components/OptimizedImage.jsx`, **no lo importa ningún fichero**. El `loading`/`fetchpriority`/`decoding` de `InitialsAvatar.jsx:63-66` están bien puestos; lo que falla es el `src`.
2. **`cache-control: no-cache` + `cacheControl=3600`.** Cada original se revalida con el origen en cada navegación (304, pero un viaje por imagen), y aunque se activara la transformación, la variante cacheada caduca a la hora porque `base44Client.js:281` sube con `cacheControl: '3600'`.
3. **Subida sin reprocesar.** `Core.UploadFile` (`base44Client.js:276-286`) sube el fichero tal cual; los únicos controles son `file.size > 5 MB` (`ProfilePictureUpload.jsx:23`, `PortfolioSection.jsx:73`, `ProfileOnboarding.jsx:564`, `MyProfile.jsx:320`). Por eso hay 74 objetos de más de 1 MB y fotos de 3840×2160. Además, documentos de verificación de identidad (`IdentityVerificationWidget.jsx:85-87`) y adjuntos de tickets (`CreateTicketDialog.jsx:136`) van al **mismo bucket público**; khdemlidaba los guarda en `credentials` (privado, 15 MB, MIME acotados).
4. **Datos: la tabla entera y una petición muerta.** 112.952 bytes de JSON por visita (20.343 por cable) de los que la tarjeta usa una fracción; la petición a `users` tarda 1.449 ms y devuelve `[]`; 12 `rpc/track_profile_metric` por vista. El orden aleatorio se calcula en cliente (`Search.jsx:135-145`), así que la lista cambia en cada carga y la caché de react-query (5 min) sólo evita la red, no el barajado.
5. **Bundle: un chunk de 714 KB.** No es lento por cable (220 KB brotli, menos que khdemlidaba) pero se invalida entero en cada despliegue. Las dependencias sin uso (`leaflet`, `react-leaflet`, `tailwindcss-animate`) no pesan en el bundle; `react-quill` sólo en el editor del blog (241 KB perezosos).

## 4. Código de imágenes, lado a lado

| | misautonomos | khdemlidaba |
|---|---|---|
| Transformación | `src/lib/supabaseImage.js`: ninguna (premisa del 403) | `src/lib/image.js` `transformSupabaseImage(url, {width, height, quality=75, resize='cover'})`; sólo actúa sobre URLs con `/storage/v1/object/public/` |
| Avatar | `src/components/InitialsAvatar.jsx`: `<img src={original}>`, `loading` eager/lazy, `fetchpriority` high/low, `decoding` sync/async, `onError` → iniciales | `src/components/Avatar.jsx`: pide 2× el tamaño pintado (112 px para 56), `loading` eager/lazy, `fetchpriority` high/auto, `decoding="async"`, `width`/`height` fijos, **doble repliegue** (transformada → original → iniciales) |
| Primeras tarjetas | `priority={idx < 4}` (`Search.jsx:378`) | `eagerImage={i < 4}` (`Search.jsx:402`) |
| Subida avatar | fichero original, `uploads/<id>-<nombre>`, `cacheControl 3600`, `contentType: file.type` | `fileToSquareWebp(file, 400, 0.82)` → recorte central 1:1 por `<canvas>` → WebP (o JPEG 0,8 si Safari devuelve PNG) → `photos/<uid>/avatar-<ts>.<ext real>`, `cacheControl 31536000`, `contentType` real (`AvatarField.jsx:75-77`, `OnboardingPro.jsx:1208-1209`) |
| Subida galería | ídem | `fileToScaledWebp(f, 800, 0.78)` (`GalleryField.jsx:50-52`, `OnboardingPro.jsx:1235-1236`); vignettes de galería también transformadas |
| Bucket | público, sin límites | público, 5 MB, 3 MIME |
| Fallback de foto en tarjeta | `imagen_principal` → `photos[0]` → `users.profile_picture` (18 usuarios la tienen, pero RLS impide leerla al anónimo) | `avatar_url` de la RPC |

## 5. Lo que el trasplante resuelve por sí solo

- La RPC `search_professionals` paginada (24 filas, 31 columnas, filtros y orden en SQL, `total_count`), el hook `useProfessionals` con caché en memoria y stale-while-revalidate, el scroll infinito y la relance automática. Desaparecen el `select *` de la tabla entera, la petición muerta a `users` y las 12 escrituras por vista.
- `Avatar.jsx` + `transformSupabaseImage`: los avatares pasan a 112 px WebP con doble repliegue. **Funciona ya con las URLs actuales** (el endpoint responde y las URLs llevan `/storage/v1/object/public/`), aunque se queden en el bucket `uploads`.
- La subida nueva en WebP 400/800 px con `cacheControl 31536000` y `Content-Type` real; el bucket `photos` con límite y MIME acotados (viene con las migraciones).
- Troceado del bundle en `vendor`/`supabase`/`i18n` con hash estable; CSS por ruta; `target es2019`.
- Prerender de `/recherche` (→ `/buscar`) con caché CDN de 600 s, título y JSON-LD por ruta, y las cabeceras CSP/X-Frame/Referrer de `vercel.json`.
- Preconnect a Supabase y preload de la fuente latina (ya existía en misautonomos de otra forma).

## 6. Lo que necesita trabajo extra

1. **Reprocesar las 98 fotos existentes (90.544.659 bytes).** Opción A, la del modelo: generar avatar 400×400 WebP (medido: las 30 `imagen_principal` a 400 px suman 542.610 bytes) y galería a 800 px, subirlas a `photos/<uid>/avatar-<ts>.webp` y `gallery-<ts>.webp` con `cacheControl 31536000`, y actualizar `avatar_url`/`gallery` en la migración de datos. Se puede hacer con `sharp` (khdemlidaba lo tiene en `devDependencies`) o incluso descargando ya transformadas desde `/render/image/…?width=400` (comprobado 30/30). Opción B: dejar las URLs originales y confiar en la transformación al vuelo; funciona, pero cada variante caduca a la hora (`cacheControl 3600` heredado), el primer render de un original de 2,8 MB tarda ~0,55 s frente a ~0,1 s en HIT, y los 90 MB siguen ocupando almacenamiento.
2. **`cacheControl` de los 183 objetos actuales** (todos a 3600): si se opta por la opción B hay que volver a subirlos con `upsert` o `storage.from('uploads').update(path, blob, { cacheControl: '31536000' })` para que la variante transformada dure un año. Con la opción A el problema se va con el bucket.
3. **Los 20 objetos con `application/octet-stream`** (6 de los 30 avatares principales): al resubir, fijar el `contentType` real. La transformación los acepta, pero servidos en crudo dependen del *sniffing* del navegador.
4. **Separar lo que no es foto pública.** 21 objetos no-imagen (20 octet-stream + 1 `audio/mp4`) y los documentos de verificación de identidad y adjuntos de tickets viven en el bucket público `uploads`. khdemlidaba tiene `credentials` (privado) y `cv-documents`; hay que mapear cada objeto a su bucket destino antes de migrar. Identificar cuáles son documentos exige cruzar `identity_verifications` y `tickets` con las URLs; no lo he hecho en esta fase.
5. **Cuota de transformaciones.** El endpoint funciona hoy en `dquxsethatxtptfviiwd`, pero Supabase factura por imagen de origen transformada; khdemlidaba sostiene 630 avatares + galerías con el mismo mecanismo. Conviene verificar el plan del proyecto antes de apoyarse en la opción B.
6. **Cabecera de `/fonts/` en `vercel.json` de khdemlidaba**: `inter-latin.woff2` (48.432 bytes) se sirve con `max-age=0, must-revalidate`; al copiar `vercel.json` añadir `/fonts/(.*)` a las reglas de `max-age=31536000, immutable`.
7. **Métricas por tarjeta.** El trasplante elimina los 12 `track_profile_metric` por vista; si el dueño quiere conservar el contador `search_appearance` del panel de autónomo hay que reimplementarlo (por lotes, no por tarjeta) o aceptar el modelo de khdemlidaba (`contact_events`, `productAnalytics`).
8. **`users.profile_picture`** (18 usuarios): decidir si se vuelca a `avatar_url` como repliegue durante la migración; hoy ni siquiera se lee por RLS.
9. **Peso del bundle heredado.** El inicial sube de 254 KB a ~373 KB por cable; el chunk `Tajawal_700Bold` (1.216.293 bytes raw) sólo se carga en `ar`, y `@react-pdf/renderer` sólo en el CV. No es trabajo obligatorio, pero si se recortan funciones que no se quieren en España, el bundle baja.

## 7. Riesgos para el trasplante (de mayor a menor)

1. Migrar las URLs de `uploads` tal cual y no reprocesar: el buscador irá rápido (transformación al vuelo), pero las fichas con galería seguirán tirando de originales de hasta 3,8 MB allí donde el modelo no transforma (el visor a tamaño completo), con caché de una hora y 90 MB de almacenamiento inútil.
2. Mover el bucket público `uploads` entero al bucket `photos` arrastraría documentos de identidad y adjuntos a un bucket pensado sólo para fotos públicas.
3. Depender de la transformación al vuelo sin confirmar la cuota del plan: un corte del servicio devolvería originales (el `Avatar.jsx` cae a ellos) y la web volvería a pesar lo que pesa hoy.
4. El bundle inicial crece un 47 %; en móvil con 3G la primera visita tardará algo más que hoy aunque la segunda pantalla sea mucho más rápida.
5. Pérdida silenciosa del contador `search_appearance` si nadie lo porta.
6. `/fonts/*` sin caché larga en el `vercel.json` del modelo: un viaje de 48 KB por visita hasta que se añada la regla.

## 8. Decisiones que sólo puede tomar el dueño

- Reprocesar las 98 fotos a WebP (y qué hacer con los originales: borrar, archivar en privado) o confiar en la transformación al vuelo.
- Qué va a cada bucket: fotos públicas, documentos de identidad, adjuntos de soporte, y el `audio/mp4` suelto.
- Conservar o no las métricas por tarjeta (`search_appearance`) del panel de autónomo.
- Si `users.profile_picture` (18 usuarios) cuenta como avatar de repliegue.
- Si se mantienen en España las funciones que engordan el bundle del modelo (CV en PDF, fuente árabe Tajawal).

## Anexo: comandos reproducibles

```sh
# HTML
curl -sS -o /dev/null -H 'Accept-Encoding: gzip, br' -w 'size=%{size_download} ttfb=%{time_starttransfer}\n' https://misautonomos.es/buscar
curl -sS -o /dev/null -H 'Accept-Encoding: gzip, br' -w 'size=%{size_download} ttfb=%{time_starttransfer}\n' https://khdemlidaba.ma/recherche
# Imagen original vs transformada
U='https://dquxsethatxtptfviiwd.supabase.co/storage/v1/object/public/uploads/rehosted/6a247e595cdcaaf445bfedac.jpeg'
curl -sI "$U" | grep -i -E 'content-length|content-type|cache-control|cf-cache-status'
curl -sI -H 'Accept: image/webp' "${U/object\/public/render/image/public}?width=112&height=112&resize=cover&quality=75" | grep -i -E 'content-length|content-type|cache-control|cf-cache-status'
```

```sql
-- payload del buscador de misautonomos (dquxsethatxtptfviiwd)
select count(*), sum(pg_column_size(t.*)), sum(length(row_to_json(t)::text)),
       sum(length(coalesce(description,''))), sum(length(coalesce(photos::text,'')))
from professional_profiles t where visible_en_busqueda and onboarding_completed;
-- página de 24 de khdemlidaba (eiacoozyubxkbjwhgkml)
select count(*), sum(length(row_to_json(r)::text)), max(total_count)
from public.search_professionals(p_limit => 24, p_offset => 0, p_sort => 'rating') r;
```
