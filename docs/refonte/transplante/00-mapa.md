# 00 — Mapa del trasplante khdemlidaba → misautonomos

Síntesis de los diez informes de la fase de lectura. **No sustituye a los informes: los ordena.** Cada afirmación lleva entre corchetes el informe del que sale, con su ruta completa al final del documento. Nada se ha modificado en esta fase (ni código, ni base de datos, ni despliegues).

Estado de partida: khdemlidaba en HEAD `794e657` (sólo lo commiteado), misautonomos en `2fe07a7`. Proyectos Supabase: modelo `eiacoozyubxkbjwhgkml`, destino `dquxsethatxtptfviiwd`.

**Contradicción resuelta entre informes.** `05-datos.md` cuenta 91 usuarios / 34 con cuenta auth / 46 perfiles / 26 con cuenta; `10-dependencias-vivas.md` cuenta 92 / 35 / 47 / 27. No es un error de ninguno de los dos: son medidas de días distintos. Consulta de solo lectura del 02/10/2026 contra `dquxsethatxtptfviiwd`: **92 usuarios, 35 con `auth_user_id`, 35 filas en `auth.users`, 47 perfiles (los 47 visibles), 27 perfiles con cuenta, 2 027 filas en `profile_metrics`, 194 objetos en el bucket `uploads`** (el informe 05 midió 183 y el 06 también). Es decir: la web está viva y crece ~1 perfil y ~10 objetos por día. **Consecuencia operativa: todo recuento de datos hay que volver a medirlo el día del corte, y el SQL de migración debe contar filas, no números escritos a mano.** El dato invariante en las dos medidas, y el que importa, es **20 perfiles sin cuenta auth**.

---

## 1. Matriz de huecos

Veredicto: **SUSTITUYE** (lo de khdemlidaba reemplaza lo de misautonomos), **ADAPTA** (se trasplanta tocando lógica, idioma, geografía o moneda), **MIGRA** (los datos actuales se mueven al esquema nuevo), **CONSERVA** (gana lo de misautonomos, contra el reflejo de copiar el modelo), **DESCARTA** (no viaja).

### 1.1 Resumen por capa

| Capa | Qué tiene khdemlidaba | Qué tiene misautonomos | Qué hace el trasplante |
|---|---|---|---|
| **Esquema** | 41 tablas + 21 vistas en `public`, 19 tablas `app_private`, 136 + 37 funciones, 33 + 1 triggers + **4 sobre `auth.users`**, 74+5+17 policies, 4 buckets, 6 enums. En el repo: 100 ficheros de migración (11 424 líneas) que **no son un instalador**: el ledger de producción tiene 193 entradas y sólo 10 versiones coinciden | 52 tablas, **0 vistas**, 21 funciones, 5 triggers `public` + 1 en `auth.users`, 137 policies, 1 bucket `uploads`, 0 enums, sin `app_private`, 7 event triggers (incluido `ensure_rls`) | **SUSTITUYE** vía volcado del esquema vivo del modelo (`supabase db dump --schema public,app_private,private`) como «migración 0», podado de lo marroquí y adaptado. Los 100 ficheros quedan como documentación y checklist (74 «aplicarían», 26 «se saltarían»). Las 52 tablas de hoy se aparcan en un esquema `legacy` [01, 10] |
| **Datos** | 1 788 usuarios, 1 394 perfiles (1 140 publicados), 70 ciudades, 118 categorías, 52 reseñas, 1 342 `contact_events`, 37 posts | 92 users (35 con auth), 47 perfiles (todos visibles; 20 sin cuenta), 17 categorías, 25 posts, 3 reseñas, 2 027 `profile_metrics`, 5 verificaciones de identidad, 87 `payment_records` (1 549,21 €) | **MIGRA** 9 de las 52 tablas (14 tienen filas). Se retira el bloque CRM/facturación/Stripe/chat/caché DeepL. Recuentos esperados: 17 categorías, 376 ciudades, 35 users, 47 perfiles, 47 filas en la pivote, 2 reseñas, 26 `contact_events`, 25 posts, 1 `contact_message`. **`auth.users` no se toca** [05] |
| **Funciones de servidor** | 21 edge functions en repo (6 074 líneas) + 3 `_shared` (428), 22 desplegadas; 11 ficheros en `api/` (1 701 líneas, `prerender.js` 1 260); `vercel.json` con 27 rewrites, 13 redirects, 10 bloques de headers, **8 crons**; 11 triggers `pg_net` | 11 edge functions desplegadas (3 las llama el front, 2 por trigger, **6 huérfanas**) + **15 nombres que el código invoca y no existen**; 6 ficheros en `api/` (1 110 líneas), **0 crons** | **ADAPTA**: KEEP 6 · ADAPT 9 · DECIDIR 1 (`diploma-tick`) · SKIP 8. Las 11 de misautonomos: ninguna se conserva tal cual (`delete-account` conserva el nombre con otro contrato). Las 15 fantasma **DESCARTA** (hoy fallan en silencio: no replicar los fallos) [02, 10] |
| **Rutas / SEO** | 52 `<Route>` + 18 subrutas de admin = 70 declaraciones; prerender serverless (`api/prerender.js`) con 13 formas de URL alcanzables; sitemap de 2 397 `<loc>`; prefijo `/ar` | 46 `<Route>`; prerender estático (`scripts/prerender.mjs`, 54,9 kB, 108 HTML); sitemap dinámico de **106 URLs**; 21 redirects + 25 rewrites; 55 redirecciones de legado Base44 client-side | **ADAPTA** a paths españoles: 971 apariciones en 165 ficheros (904 reales en 153 al descartar 12 scripts de marketing). Se **CONSERVAN** las URLs indexadas de misautonomos (`/buscar`, `/autonomo/:slug`, `/categoria/:slug`, los 25 slugs de blog) con 301 desde las 44 anidadas y los 23 slugs sucios. Mecanismo propuesto: `src/lib/routes.js` como única fuente + guarda `check-route-literals.mjs` [03] |
| **Configuración / marca** | `khdemlidaba.ma` en 172 ficheros (163 ocurrencias en `src/`); nombre en 174; ref del proyecto en 21 (7 operativos, 5 de ellos en la CSP); 74 líneas con el naranja `#E8590C`; `+212`/`'MA'` en 6 ficheros; 7 columnas `*_mad`; YouCan Pay; legal marroquí (CNDP, leyes 09-08/31-08/43-13) | marca, colores (`#00255C` / `#F5C13D`), dominio, `DEFAULT_LANG='es'`, `PREFIXED=[]`, 19 redirecciones de slugs legados, legal español real (Astra Invest and Finance S.L., CIF B10865418, LSSI art. 10) | **ADAPTA** 18 superficies. Cambio mínimo de color: **4 variables** en la web, 5 en la app clara, 5 en la oscura. Se **CONSERVA** el i18n generalizado de misautonomos (`langs.js` con `PREFIXED`, no `AR_PREFIX`) y sus textos legales. **DESCARTA** `legal.js` marroquí, `cityNamesAr.js`, `build-seo-i18n.mjs` árabe, micrositios de clientes [04] |
| **i18n** | 6 locales de 1 784 claves, 66 namespaces, 0 claves planas; **ninguna guarda de i18n en el build**; 29 claves de su `es.json` en inglés; 109 con vocabulario marroquí; **340 pares fr/ar fuera de i18n**, 169 de ellos en `/creation-site-web` | 2 097 claves al 100 % en `es` y `en`, 0 huérfanas, 7 cadenas a mano; reparto público/aplicación en dos bundles; **`check-i18n.mjs` + `i18n-orphans.mjs --strict` dentro de `npm run build`** | **CONSERVA** el motor, el corte en dos bundles y las guardas de misautonomos. **ADAPTA** importando los 46 namespaces que sólo existen en kh (1 084 claves, traducidas desde `fr.json`, no desde su `es.json`). **CONSERVA** 427 claves de copy de marca (`landing` 86, `legal` 78, `cookies` 79, `faq` 77, `forPros` 41, `footer` 40, `nav` 26). **DESCARTA** 139 claves legales marroquíes. Reescribe `categories` con los 17 slugs reales [09] |
| **Imágenes / rendimiento** | RPC paginada de 24 filas (32 673 bytes), 3 peticiones, 0 escrituras; `transformSupabaseImage` activo; subida en WebP 400/800 px; bucket `photos` con límite 5 MB, 3 MIME, `cacheControl 31536000`, media 95 446 bytes | `select *` de la tabla entera (47 × 63 columnas), petición a `users` que devuelve `[]` en 1 449 ms, **12 escrituras `track_profile_metric` por vista**, 15 peticiones; `supabaseImage.js` desactivado por una premisa caducada; bucket `uploads` sin límite ni MIME, media 1 035 283 bytes, **0 WebP** | **SUSTITUYE** la capa de datos y de imagen (lo resuelve el trasplante solo). **Trabajo extra**: reprocesar las 98 fotos referenciadas (90 544 659 bytes) y recolocar los 15 documentos de identidad. El bundle inicial **sube** un 47 % (254 143 → 372 573 bytes por cable), a cambio de chunks con hash estable [06] |
| **Nativo** | Capacitor 8.5.0, 13 plugins, 2 ficheros Swift con relés APNs y `SceneDelegate`, 6 `InfoPlist.strings`, App Links con 12 `pathPrefix`, `codemagic.yaml` de 645 líneas con 5 guards, push APNs directo funcionando | Capacitor 8.4.0, 12 plugins, proyecto Android sincronizado el 15/06 con **4 de 13 plugins**, 1 solo permiso (`INTERNET`), sin App Links, **sin `aps-environment`**, splash con flash blanco, versiones descuadradas (0.0.0 / 1.0.0 / 1.0), CI de 108 líneas sin guards | **SUSTITUYE** la coquilla nativa conservando la identidad de misautonomos (bundle iOS `com.base690076ad86e673c796768de5.app`, paquete Android `es.misautonomos.app`, App Store ID `6759524805`, dominio, colores). **DESCARTA** las 3 cadenas de push rotas (OneSignal web, token en `sessionStorage`, cadena Expo). **El DDL de `device_tokens` y sus 2 RPC no está en ninguna migración**: hay que extraerlo de la base viva [07] |
| **Tests y guardas** | 26 ficheros, 178 tests + 11 escenarios, 43,5 s, todo verde; `lint` limpio con `--max-warnings 0`; 8 suites con PGlite sobre migraciones reales; build de 12 pasos con 6 guardas; **ni `npm test` ni `lint` están en el build** | 0 tests; build de 6 pasos con 4 guardas que khdemlidaba **no tiene** (paridad de locales, claves huérfanas, páginas sin ruta, coherencia `vercel.json`↔`App.jsx`); `eslint .` con **4 errores y 5 avisos** | **ADAPTA**: build propuesto de 14 pasos que **CONSERVA** las 4 guardas de misautonomos (con `check-vercel-routes` reescrito, porque el prerender pasa a ser serverless), adopta las 6 de khdemlidaba, mete `lint` y `npm test` dentro del build (157 tests, ~34 s) y saca `check-version-sync` y `verify-ios-entitlements` a un `build:native`. 18 ficheros se borran [08] |

### 1.2 Colisiones exactas en el destino

Las 7 tablas con el mismo nombre y otra forma: `users`, `professional_profiles`, `reviews`, `favorites`, `notifications`, `blog_posts`, `reports`. Las 2 funciones: `handle_new_user`, `is_admin`. La sobrecarga peligrosa: `submit_review`. El trigger: `on_auth_user_created` sobre `auth.users`. Y **16 de las 21 funciones SQL de misautonomos nombran tablas de `public` por su nombre** y hay que reescribirlas en la misma transacción que el aparcado [01, 10].

---

## 2. Registro de riesgos, de mayor a menor gravedad

Cada riesgo lleva la mitigación concreta que propone su informe.

### Bloqueantes: hay que resolverlos antes de escribir una línea de SQL en producción

**R1 — Tratar el repo de khdemlidaba como un instalador.** El ledger de producción tiene 193 entradas, el repo 100 ficheros, y sólo **10 versiones coinciden**: 93 migraciones se aplicaron desde el dashboard y nunca se guardaron (diplomas ×14, recordatorios, contacto, push, multi-categoría, 11 RPC admin, `is_admin()`, `client_ip()`, `submit_review`, `log_contact_event`). **22 objetos** son referenciados y nunca creados (`is_admin()` en 24 ficheros, la pivote `app_private.professional_categories` en 15). Aplicados en orden sobre el destino, **26 ficheros fallan** y 6 más fallan en runtime.
→ *Mitigación [01 §9 paso 2]*: la fuente de verdad es el esquema vivo. Partir de `supabase db dump --project-ref eiacoozyubxkbjwhgkml --schema public,app_private,private`, añadir a mano los 4 `insert into storage.buckets`, las 17 policies de `storage.objects`, los 4 triggers sobre `auth.users` y las 10 claves de `internal_config`; podar y adaptar; aplicar como un único fichero. Los 100 ficheros sirven de checklist de lo que el volcado debe contener.

**R2 — 20 de los 47 perfiles (43 % del catálogo indexado) y 57 de los 92 usuarios no tienen fila en `auth.users`,** y el esquema nuevo lo exige por FK (`users.id → auth.users(id)`, `professional_profiles.user_id → users(id)`). Sin decisión previa esos 20 perfiles no caben y Google pierde 20 fichas.
→ *Mitigación [05 §15]*: `professional_profiles.user_id` **admite NULL** y khdemlidaba ya tiene 28 perfiles así (su propia seed creó 30). Los 20 entran con `user_id = NULL`, `published = true`, `onboarding_step = 9`, sin inventar cuentas y sin tocar `auth.users`. Como khdemlidaba **no tiene flujo de «reclamar ficha»**, guardar el email legado en `app_private.legacy_owner_emails(professional_id, email)` y engancharlo desde `handle_new_user` (3 líneas) para que el día que se registren recuperen su ficha.

**R3 — `handle_auth_user_link()` cuelga de `auth.users` y rompe TODO registro nuevo.** Es `AFTER INSERT ON auth.users` e inserta en `public.users (id, auth_user_id, email, full_name, role)`. En cuanto `public.users` sea la tabla nueva (id uuid, sin `auth_user_id`), el insert falla y **revierte el insert en `auth.users`**: nadie puede registrarse, ni por email ni por Google. No es degradación, es un 500 en el alta.
→ *Mitigación [10 §3]*: reescribir el trigger en la **misma transacción** que el aparcado. Durante la ventana conviven dos triggers de alta a propósito (`legacy_on_auth_user_created → handle_auth_user_link` escribiendo en `legacy`, y `on_auth_user_created → handle_new_user` escribiendo en la tabla nueva): la cuenta existe en los dos mundos [01 §9 paso 6].

**R4 — `delete_account(uuid)` es DINÁMICA y borra las tablas de retención legal.** Recorre `information_schema.columns` buscando `user_id`/`creator_id`/`sender_id`/… y borra en todas las tablas salvo una lista de exclusión **literal** (`payment_records`, `invoices`, `invoicing_settings`, `plan_audit_logs`, `email_logs`…). Con las tablas movidas o renombradas la lista deja de coincidir y el primer «eliminar mi cuenta» borra los **87 justificantes de cobro (1 549,21 €)** que la normativa obliga a conservar (4 años AEAT / 6 Código de Comercio). Su `exception when others then null` lo esconde.
→ *Mitigación [10 §3]*: reescribirla apuntando al esquema correcto **o** revocarle el `EXECUTE` a `service_role` (el único que lo tiene) en la misma migración que el aparcado. Y exportar el CSV de `payment_records` e `invoicing_settings` (NIF + IBAN) **antes** de cualquier borrado [05 §12].

**R5 — El event trigger `ensure_rls` activará RLS sin políticas en las ~41 tablas nuevas.** `rls_auto_enable()` se dispara en `ddl_command_end` y las deja deny-all: todo devuelve `[]` sin error visible. Precedente exacto en la propia base: `translations`, RLS activado, **0 políticas, 469 filas invisibles**. khdemlidaba no tiene este event trigger.
→ *Mitigación [10 §7 paso 3]*: `ALTER EVENT TRIGGER ensure_rls DISABLE` mientras se aplica el baseline (que ya trae sus propias policies) y **volver a activarlo al terminar**. Verificación objetiva: `select relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relrowsecurity and not exists (select 1 from pg_policies p where p.tablename=c.relname)` debe devolver 0 filas.

**R6 — `is_admin()` y `on_auth_user_created` cambian de semántica en el mismo instante, y `submit_review` queda sobrecargado.** `is_admin()` pasa de `role='admin' from users where auth_user_id=auth.uid()` a `is_admin from users where id=auth.uid()`, y **las 137 policies legacy la invocan**. `submit_review` no se pisa: se **sobrecarga** con dos firmas y PostgREST responde «could not choose the best candidate function», rompiendo las reseñas por token de la web actual.
→ *Mitigación [01 §9 paso 3, nota A]*: renombrar antes `is_admin()` → `legacy_is_admin` y `submit_review(...)` → `legacy_submit_review`. Renombrar una función **no rompe las policies** (Postgres guarda el OID), así que el admin legacy conserva su acceso durante toda la ventana.

**R7 — SEO de las fichas: la mitad daría 404.** Hay 44 de 47 fichas con URL anidada `/autonomo/<cat>-en-<ciudad>/<slug>` indexada, **23 slugs «sucios»** en circulación (acentos, comas, guiones finales: `oscar-gómez`, `esdrújulo-`, `sergi---fixtic---informàtica,-…`) y **dos vocabularios de slug de categoría** conviviendo (`service_categories.slug` = `asesoria-gestoria` frente a `slugify(categories[0])` = `asesoria-o-gestoria`). khdemlidaba resuelve el slug **exacto** y no tiene tabla de alias en ninguna de sus 100 migraciones.
→ *Mitigación [03 §4.1]*: una 301 genérica `/autonomo/:seg/:slug → /autonomo/:slug` (se puede desplegar **antes** de todo lo demás, porque `Autonomo.jsx` ya sirve la forma plana), 23 reglas por slug sucio, escribir el slug limpio en `professional_profiles.slug` durante la migración, y fijar un único vocabulario de categoría antes de redactar las 301 de ciudad×categoría. Las 55 redirecciones client-side de Base44 pasan a `vercel.json` (39 reglas bastan: Vercel no distingue mayúsculas).

**R8 — Los avisos quedan mudos y la web carga en blanco por tres constantes.** La migración `20260801200000_admin_notifications.sql:92` siembra `internal_config.notify_admin_url` con el ref **marroquí**: los 10 triggers `pg_net` y `_promo_fire_mail` postearían a las edge functions de khdemlidaba con clave inválida (401), y cada `tg_*` envuelve el `perform` en `exception when others then null`, así que **nadie se enteraría**. La CSP de `vercel.json:41` cita `eiacoozyubxkbjwhgkml.supabase.co` **5 veces** (`img-src`, `connect-src`, `wss`, `frame-src`): copiada tal cual, el navegador bloquea Supabase y la web carga vacía. Y `CRON_SECRET` tiene que coincidir en **tres sitios** (env de Vercel, secreto de Supabase, `internal_config.notify_admin_cron_key`) o los 8 crons responden 401.
→ *Mitigación [02 §4.2, 04 §2.10]*: sobrescribir las dos filas de `internal_config` justo después del baseline; sustituir las 5 ocurrencias de la CSP; generar un `CRON_SECRET` único y escribirlo en los tres sitios en el mismo paso. Añadir además `src/lib/supabase.js:15-16`, que lleva URL **y publishable key de khdemlidaba** como fallback: un build sin variables de entorno hablaría con la base marroquí.

### Graves: rompen datos, dinero o la ley si se pasan por alto

**R9 — 15 documentos de identidad (DNI/NIE y selfies) están en el bucket público `uploads`,** legibles por cualquiera que tenga la URL. **Es una fuga de datos personales que existe HOY**, no un riesgo del trasplante.
→ *Mitigación [05 §11, §14]*: moverlos a `credentials/<auth uid>/cin-<ts>-{front,back,selfie}.<ext>` (bucket privado, 15 MB), crear 4 (o 12) `credential_submissions` pendientes, borrar los originales, y cerrar `uploads` a INSERT dejándolo como legado de sólo lectura con límite de tamaño y lista MIME.

**R10 — Teléfonos migrados con el país equivocado.** `src/lib/whatsapp.js:33` y `PhoneWhatsAppFields.jsx:20,104` usan `'MA'` como fallback nacional: un `612345678` español se guardaría o mostraría como `+212612345678`. Los tres campos de origen (`telefono_contacto`, `whatsapp_phone_number`, `users.phone`) son texto libre sin normalizar.
→ *Mitigación [04 §2.5]*: cambiar los 6 ficheros a `'ES'` **antes de migrar un solo dato**, y normalizar a `+34` + 9 dígitos en el SQL de import. Las reglas de publicación del modelo («≥ 8 cifras») pasan sin cambios con un móvil español de 9.

**R11 — Textos legales de otro país publicados en un `.es`.** CNDP, ley 09-08, ley 31-08, «tribunaux du Royaume du Maroc», registrar `.ma`, ley 43-13 de enfermería; y `src/lib/legal.js:51` publica que Supabase está en **eu-west-3 (París)** cuando el proyecto destino está en **eu-west-2 (Londres)**, fuera de la UE. 44 cadenas de `fr.json` y 139 claves legales de kh.
→ *Mitigación [04 §2.12, 09 §5.2]*: las 139 claves legales de khdemlidaba (`cgu` 43, `privacy` 35, `legal_notice` 17, `cookies` 38, `legal` 6) **se borran, no se traducen**: se sustituyen por `legal`(78) + `cookies`(79) de misautonomos, ya escritos para España con el titular real. Sólo se conserva `cgu_reaccept`(7), adaptando sus textos. Corregir la cláusula de transferencias con la región real.

**R12 — `gender` es NOT NULL con CHECK `homme|femme` y no hay dato en origen; la pivote `app_private.professional_categories` es obligatoria.** Sin rellenar ambas, `search_professionals` y `count_professionals_by_category` devuelven listas vacías o incorrectas.
→ *Mitigación [01 §10.4, 05 §19.5]*: una fila en la pivote por perfil con `is_primary=true` (47 filas) en el mismo paso que los perfiles; y para `gender`, el valor que ponga el dueño (el asistente de khdemlidaba usa `'homme'` por defecto en `OnboardingPro.jsx:301`) o relajar el CHECK con un tercer valor, que toca el filtro `p_gender` y la UI.

**R13 — Los guards del destino sabotean el import en silencio.** `trg_00_pp_guard` fuerza `verified=false` y los ratings a 0; `trg_users_guard` fuerza `is_admin=false` (porque `is_admin()` depende de `auth.uid()`, NULL en una migración); `contact_validate` reescribe `created_at` y puede lanzar `CONTACT_UNAVAILABLE`; `trg_zz_pp_minimum` rechaza publicar los 2 perfiles sin ciudad y los 3 de sólo chat interno. Los datos entran mutilados **sin un solo error visible**.
→ *Mitigación [05 §16]*: el import se ejecuta como `postgres` en **una transacción** con `set local session_replication_role = 'replica'`, y después se recalculan `rating_avg`/`rating_count` con la misma fórmula de `recompute_professional_rating`. Validación antes del `commit`: replicar a mano la condición de `pp_require_minimum_to_publish` y exigir 0 filas.

**R14 — La sesión de los 35 usuarios con cuenta se pierde.** La sesión viva está en `localStorage['misautonomos-auth']`; el cliente de khdemlidaba no fija `storageKey` y buscaría `sb-dquxsethatxtptfviiwd-auth-token`. Además pierde `flowType: 'pkce'`, con lo que el `code_verifier` de cualquier flujo a medias desaparece y el formato del callback cambia de `?code=` a `#access_token=` (afecta a las Redirect URLs del panel y a las plantillas de correo).
→ *Mitigación [10 §6]*: conservar **dos líneas** en el cliente trasplantado (`storageKey: 'misautonomos-auth'`, `flowType: 'pkce'`). El proyecto Supabase no cambia, así que el JWT sigue válido. Coste: arrastrar una clave no estándar para siempre.

**R15 — El bucket `uploads` es el único que existe y el código nuevo espera `photos`.** Las 98 URLs de foto de los 47 perfiles son `…/object/public/uploads/…`. Y las policies de `photos` exigen carpeta `<auth.uid()>/` para escribir: los objetos planos de `uploads` no las cumplen, así que un pro migrado no podría borrar sus propias fotos y `delete_my_account` no las barrería.
→ *Mitigación [05 §14, 06 §6]*: no borrar `uploads`. Copiar a `photos/<auth uid>/avatar-<ts>.webp` y `gallery-<ts>.webp` las fotos de los 27 pros con cuenta (reprocesadas: las 30 `imagen_principal` pasan de **17 155 864 a 542 610 bytes** a 400 px) y reescribir `avatar_url`/`gallery` en la migración. Para los 20 sin cuenta no hay carpeta posible: se quedan en `uploads` como legado.

### Medios: degradan el producto o el trabajo, sin perder datos

**R16 — Las 4 guardas que misautonomos tiene y khdemlidaba no se pierden por el reflejo de copiar el `package.json` del modelo.** La prueba de que hacen falta: `ar.json` de khdemlidaba arrastra **43 claves que ya no existen en `fr.json`** y nada lo detecta; y **29 slugs de categoría (24,6 % del catálogo) se pintan hoy en francés** para cualquier usuario no francófono, porque el `missingKeyHandler` silencia a propósito todo lo que empieza por `categories.` y la única red (`check-i18n-slugs.mjs`) hace `process.exit(0)` sin envs y no está en ningún build.
→ *Mitigación [08 §5.1, 09 §6.5]*: build de 14 pasos que conserva `check-i18n.mjs`, `i18n-orphans.mjs --strict`, `check-routes.mjs` y `check-vercel-routes.mjs` (este **reescrito**: detecta cobertura leyendo directorios en `dist/`, y el prerender pasa a ser serverless). Y hacer bloqueante la cobertura de los 17 slugs leyendo una lista versionada, no por REST.

**R17 — `/creation-site-web` portado tal cual sale en FRANCÉS.** `const tx = (fr, arabic) => ar ? arabic : fr`: con `ar` siempre falso, elige el primer brazo. Son **169 pares** (84 en `WebsiteQuote.jsx` + 85 en `websiteQuote.js`) que no pasan por `t()` y que **ninguna guarda detecta**, porque `i18n-orphans.mjs` ve claves que faltan, no texto que nunca fue clave. Hay además 5 accesos por índice (`[ar ? 1 : 0]`).
→ *Mitigación [09 §6.6]*: extraer los 169 pares a i18n **en el mismo commit que porta el formulario**, con `OPTIONS`/`LABELS` como claves construidas (`site_quote.option_<group>_<code>`) añadidas al reconstructor, de modo que un `code` nuevo sin traducción rompa el build. Los otros 171 pares repartidos en 16 pantallas (`Salaires.jsx` 37, `localLandingContent.js` 39 bloques…) siguen la misma regla.

**R18 — Push iOS inoperante salvo que se toquen 4 capas a la vez,** y Universal Links rotos de origen. Hacen falta `aps-environment` + los 2 relés en `AppDelegate.swift` + la capability Push en el App ID + tabla/RPC/trigger/edge/secretos en el destino. khdemlidaba ya perdió una build (1.4) por el relé. Y el AASA de misautonomos lleva `REPLACE_TEAM_ID`: sin AASA correcto **desplegado antes de instalar la build**, el login Apple y el enlace mágico no vuelven a la app.
→ *Mitigación [07 §5.3]*: el DDL de `device_tokens` y sus 2 RPC **no está en las 100 migraciones**; hay que extraerlo de la base viva de khdemlidaba (el informe trae la definición completa). `verify-ios-entitlements.mjs` es la guarda que lo vigila. Desplegar el AASA con el Team ID real antes de la primera build, y comprobar con una fila de prueba en `notifications`.

**R19 — La app nativa no se actualiza con el despliegue web.** Las instalaciones vivas seguirán hablando con `legacy` hasta que el usuario actualice desde la tienda. Mientras `legacy` exista funcionan; al borrarlo dejan de funcionar. Es un problema de semanas, no de minutos.
→ *Mitigación [10 §7 paso 5-6]*: dejar `legacy` en pie al menos 48 h por las pestañas abiertas, y semanas por la app; o forzar versión mínima en las tiendas. Decidirlo antes del `DROP SCHEMA`.

**R20 — Imágenes: el trasplante arregla el buscador y no las fichas.** La transformación al vuelo funciona ya con las URLs actuales (30 de 30 responden 200: el comentario de `supabaseImage.js` que dice 403 está desfasado), pero la galería a tamaño completo seguirá tirando de originales de hasta **3,8 MB**, con `cacheControl=3600` heredado en los 194 objetos y 90 MB de almacenamiento inútil. Y Supabase factura por imagen de origen transformada.
→ *Mitigación [06 §6]*: reprocesar (opción A) con `sharp` o descargando ya transformadas desde `/render/image/…?width=400`; corregir el `content-type` de los 20 objetos servidos como `application/octet-stream` (6 de ellos son avatares principales); añadir `/fonts/(.*)` a las reglas de caché inmutable del `vercel.json` del modelo, que hoy sirve `inter-latin.woff2` con `max-age=0`.

**R21 — El build arrastra clientes marroquíes a producción.** `npm run build` empieza por `build:louay` y `vite build` copia `public/site/` (34 entradas) y `public/jc-secours/` a `dist/`: micrositios de terceros con teléfonos `+212` publicados bajo `misautonomos.es/site/…`.
→ *Mitigación [04 §2.14, 08 §2.4]*: quitar `build:louay` del encadenado, borrar `client-sites/`, `public/site/`, `public/jc-secours/`, los 3 rewrites correspondientes del `vercel.json`, el bloque de headers `/site/louay-change/`, las 2 migraciones `louay_*`, los globals de `eslint.config.js` y los 5 tests (21 tests, 3,8 s).

**R22 — Zona horaria.** `Africa/Casablanca` (UTC+1 sin DST) vive en 3 funciones SQL, 3-4 migraciones, 2 pantallas y 1 test; los 8 crons están en UTC pensados para UTC+1 fijo. Si se cambia el test y no las migraciones (o al revés), **el test pasa y miente**: sólo se ve alrededor de un cambio de hora.
→ *Mitigación [08 §5.5 punto 6]*: `Europe/Madrid` en las migraciones **y** en `growth-database.test.mjs` en el mismo commit; revisar las horas de los crons sabiendo que se desplazan una hora entre invierno y verano.

**R23 — Dos ficheros de migración son trampas si alguien los reaplica.** `20260925115759` lleva `BEGIN;`/`COMMIT;` propios (el COMMIT prematuro deja medio aplicado lo que venga detrás en el runner de Supabase) y `20260901191500` **no es SQL válido** (línea 14 fuera de comentario). Otros 6 son de traza y 1 lanza `raise exception`.
→ *Mitigación [01 §8]*: están en la lista de los 26 que se saltan. Con el baseline del esquema vivo ninguno hace falta.

**R24 — `rehostMedia` y `rehostUrls` siguen desplegadas con `verify_jwt=false` y un token fijo escrito en el código:** cualquiera que lo conozca escribe en el bucket `uploads`. No depende del trasplante.
→ *Mitigación [02 §6.6]*: retirarlas ya, junto con las otras 4 huérfanas (`createCheckoutSession`, `syncStripeSubscription`, `getStripeInvoices`, `translate`). Y `ticket_messages`/`ticket_events` tienen política `SELECT: true` (cualquiera sin sesión lee todo el soporte): agujero preexistente que no conviene replicar [10 §5].

**R25 — Downgrade de dependencias no trivial.** `react-router-dom` 7.2 → 6.26 (cambio de API), `react-i18next` 14.1 → 17.0, `@supabase/supabase-js` 2.107 → 2.45, `vite` 6.1 → 8.3, Node `engines >=24 <25` frente al `22.14.0` del `codemagic.yaml` actual.
→ *Mitigación [10 §8.11]*: decidir el `package.json` resultante antes de la fase A (ver decisión D8); el trasplante no es sólo `src/`.

**R26 — Otros, con mitigación directa.** Supresión de rebotes: sin `RESEND_WEBHOOK_SECRET` y el webhook creado, `email_recipient_allowed` deja pasar direcciones muertas y la primera relance masiva daña la reputación del dominio [02]. Telegram ausente: 10 de los 14 kinds de `notify-admin` no llegan a nadie [02]. `pg_net` 0.20.0 en destino frente a 0.20.4 en el modelo: verificar en la rama de ensayo [01]. Re-aceptación de CGU para los 35 usuarios en su primer acceso, porque `users.cgu_version` no existe hoy [04]. Permisos sobrantes en iOS (`NSLocationWhenInUseUsageDescription` sin uso, motivo de rechazo 5.1.1) y `TARGETED_DEVICE_FAMILY "1,2"` con una coquilla sólo iPhone [07]. Pérdida del contador `search_appearance` del panel de autónomo (6 828 apariciones) y de las 515 visitas de perfil: `contact_events` sólo guarda clics [05, 06]. Escrituras divergentes durante la migración de datos: cada alta entra en `legacy` y no en `public` [10].

---

## 3. Decisiones que sólo puede tomar el dueño

Diez, consolidadas y deduplicadas de las 97 preguntas abiertas de los diez informes. Cada una con lo que recomiendo y por qué.

**D1 — Los 20 perfiles y 57 usuarios sin cuenta auth.**
Opciones: (a) importarlos con `user_id = NULL`; (b) crear 20 filas en `auth.users`; (c) relajar la FK; (d) aceptar la pérdida.
→ **Recomiendo (a)**. Es el único camino que no contradice la premisa «sin tocar `auth.users`», no toca el DDL del modelo y está probado: khdemlidaba tiene 28 perfiles así y su propia seed creó 30. Conserva las 20 fichas indexadas (43 % del catálogo). Añadir `app_private.legacy_owner_emails` para que el enganche sea automático cuando se registren, porque khdemlidaba no tiene «reclamar ficha». Los 37 usuarios sin nada enganchado quedan sólo en el CSV de exportación. *Se decide antes de la fase B: condiciona el DDL.* [05 §15, 10 §9.1]

**D2 — Rutas: ¿español o francés?**
→ **Recomiendo traducir al español y conservar las URLs indexadas de misautonomos**, con la landing combinada en `/categoria/:cat/:ciudad` (opción B) en lugar del catch-all `/:combo` en raíz. Razones: las 106 URLs publicadas hoy (17 categorías, 46 fichas, 25 posts, 8 guías editoriales) siguen valiendo; la opción A obliga a una lista de exclusión de **14 entradas** donde cada ruta española con guion olvidada responde 404+noindex al recargar (ya le pasa a `/mes-paiements` en khdemlidaba); y en España hay slugs con guiones a los dos lados (`albanil-reformas` × `cornella-de-llobregat`), así que el prerender no puede adivinar dónde acaba la categoría. Coste: 904 apariciones en 153 ficheros, que es trabajo mecánico vigilable con una guarda. *Decisiones menores que viajan con esta: `/solicitudes` para el tablón (quitando su `Disallow` de `robots.txt`), `/baja-recordatorios` para no chocar con `api/baja.js`, y 301 de `/preguntas-frecuentes` y `/ayuda` sólo si no se portan.* [03 §10.1, 04 §6.1]

**D3 — Idiomas del día 1.**
→ **Recomiendo `es` + `en`, `PREFIXED = []`, y conservar el corte en dos bundles** (`es.json` público 91,6 kB + `es.app.json` perezoso 41,4 kB). Son los dos únicos idiomas al 100 % hoy (2 097/2 097, verificado por el checker). `fr`/`de`/`nl` no existen en misautonomos y generarlos desde khdemlidaba cubriría ~55 % del árbol español: el build rompería en cuanto se pusieran `ready: true`. `ar` arrastra 43 formas plurales, un `cityNamesAr.js` con 376 ciudades españolas y todo el prerender árabe, para un público que no busca un fontanero en Madrid en árabe. El mecanismo para añadirlos después ya está (`ready` + `PREFIXED` genérico). Y copiar el fichero plano de khdemlidaba volvería a meter `admin` (430 claves), `onboarding` (124) y `myProfile` (67) en la portada: **exactamente contra el requisito «la misma velocidad de carga»**. [09 §7, 08 §6]

**D4 — Alcance funcional: qué módulos del modelo se encienden.**
→ **Recomiendo encender** `/creation-site-web` (lo pide el dueño explícitamente), el tablón de demandas, el CV gratis, el presupuesto gratis y el filtro «en línea»/`works_remote`; **traer el esquema entero pero apagado** para promociones de pago (`promo_settings.is_open=false`, `featured_is_open=false`, `job_is_open=false`), porque están escritas en dirhams con RIB marroquí y YouCan Pay no opera en España; y **no desplegar** `diploma-tick` ni `/salarios` (control de titulación escrito sobre la ley marroquí 43-13, y observatorio salarial con rangos en MAD y `noindex`). Así «réplica total» se cumple en código y la decisión comercial queda reversible con un `update` de una fila. [01 §11.2-3, 02 §7.5-6, 03 §10.6]

**D5 — Qué funciones actuales de misautonomos se retiran.** Ver la lista completa en §5.2.
→ **Recomiendo aceptar las siete retiradas con una excepción**: conservar el aviso por email al autónomo cuando alguien le contacta. Es la única con valor real para el usuario (hoy la hace `contact-professional`) y cuesta un `kind` nuevo en `notify-admin`, que ya tiene 14. Las otras seis (tickets, newsletter con 0 suscriptores, mensajería interna con 10 mensajes, suscripciones Stripe, outreach de leads, autoposter de blog) no tienen equivalente y su retirada simplifica. *Ojo: 46 de los 47 perfiles tienen `chat_interno` en `metodos_contacto` y 3 lo tienen como único canal.* [02 §7.7, 10 §9.5]

**D6 — Datos legales, marca y exportaciones obligatorias.**
Hace falta: nombre o razón social, NIF, domicilio y email del titular (LSSI art. 10); registrar del dominio `.es`; una sola dirección de soporte (hoy conviven `soporte@`, `hola@`, `info@misautonomos.es` y `hola@misautonomos.com`); grafía de la marca; dónde entra el dorado; y dónde se guardan los CSV de `payment_records` (87 cobros, 1 549,21 €) e `invoicing_settings` (NIF + IBAN) antes de borrar `legacy`.
→ **Recomiendo** reutilizar los datos que ya están en `es.json` (`legal.notice.sections.identification`: Astra Invest and Finance S.L., CIF B10865418, Melilla) tras confirmarlos; **`hola@misautonomos.es`** como remitente y buzón único (ya está en uso y el dominio está en Resend); **`MisAutónomos`** en texto y `misAutónomos` sólo en el logotipo; y el **dorado sólo en estrellas y logotipo** (opción A), porque `#F5C13D` da 1,67:1 sobre blanco y no sirve como tinta: el marino `#00255C` da 14,80:1. Corregir la región de Supabase a eu-west-2 (Londres). [04 §6.4, §6.6, §6.7, 05 §19.16]

**D7 — Geografía: `cities` plano o con provincia.**
→ **Recomiendo el modelo A: 376 municipios, esquema idéntico al del modelo, sin provincia como entidad.** khdemlidaba no tiene noción de provincia en ninguna parte del código y vive bien con 70 ciudades y un combobox que filtra por texto. Los datos no justifican más: los 47 perfiles usan 28 ciudades de 12 provincias. Se pierde el desplegable provincia→ciudad. **No mezclar provincias y municipios en la misma tabla: 42 slugs colisionarían.** Si el dueño exige el filtro provincial, el camino es el modelo C (+ `province_slug`/`province_name`) y hay que decidirlo **antes de la seed**, porque cambiar después obliga a tocar `useCities`, `get_city_inventory`, el prerender y el sitemap. [05 §5]

**D8 — `package.json`: ¿el del modelo entero o el de misautonomos adaptado?**
→ **Recomiendo adoptar el de khdemlidaba** (es el que hace funcionar su `src/`, sus 12 pasos de build y sus 178 tests) **añadiendo lo que misautonomos necesita conservar**: los scripts `check-i18n`, `i18n-orphans`, `check-routes`, `check-vercel-routes` y el nombre y la versión nuevos. Mantener el de misautonomos obligaría a adaptar el código trasplantado a Router 7, que es más trabajo y más riesgo que aceptar el 6.26 del modelo. Decidir en la misma pasada la **versión única** para `package.json`, `MARKETING_VERSION` (×2) y `versionName` (hoy 0.0.0 / 1.0.0 / 1.0, por lo que `check-version-sync` falla), y subir Codemagic a Node 24. [10 §9.9, 07 §10.3, 08 §5.5]

**D9 — Imágenes y buckets.**
→ **Recomiendo la opción A: reprocesar las 98 fotos referenciadas** (90 544 659 bytes) a WebP 400 px de avatar y 800 px de galería, subirlas a `photos/<auth uid>/…` con `cacheControl 31536000` y reescribir `avatar_url`/`gallery` en la migración. Medido: las 30 `imagen_principal` pasan de 17,2 MB a 542 610 bytes. La opción B (confiar en la transformación al vuelo) funciona, pero deja cada variante caducando a la hora, 90 MB inútiles y una dependencia de cuota facturable. En el mismo paso: los 15 documentos de identidad a `credentials` (R9), el `audio/mp4` suelto fuera, y los 20 `application/octet-stream` con su `content-type` real. *Decisión menor que viaja: `users.profile_picture` (18 filas) como avatar de repliegue — recomiendo no usarlo, porque duplica `imagen_principal` y hoy el RLS impide leerlo.* [06 §6, §8, 05 §14]

**D10 — Forma de la ventana de producción.**
→ **Recomiendo la opción B (mover las 52 tablas a un esquema `legacy`) con despliegue, no con vistas puente.** Mover de esquema cambia **una línea** en el cliente (`db: { schema: 'legacy' }`) en lugar de las 47 entradas del `TABLE_MAP` más 3 `supabase.from` más 5 ficheros de `/api`. Exige que el dueño añada `legacy` a los *Exposed schemas* del panel de Supabase. Y el despliegue en el paso 1 cuesta **3-6 minutos de web sin datos** (la cáscara carga, no hay 500), frente a las vistas puente, que dan 0 minutos ahí pero concentran el corte en el paso 3 y lo alargan a horas o días. Con despliegue, la web vieja **no se entera** de que el esquema nuevo se está aplicando. Y `legacy` se mantiene 48 h por las pestañas abiertas, semanas por la app nativa. [10 §7, §9.3-4]

---

## 4. Plan por fases

Cada fase indica entregable, verificación objetiva (un comando o una consulta, no una impresión) y si es reversible. Las fases A y B son de taller: no tocan producción. La C es la única con corte.

### Fase A — Repo: traer el código y localizarlo

**Entregable.** Un worktree del repo de misautonomos con el `src/`, `api/`, `scripts/`, `supabase/functions/`, `vercel.json`, `ios/`, `android/`, `codemagic.yaml` y `package.json` de khdemlidaba, localizado: marca, dominio, idioma por defecto, rutas españolas vía `src/lib/routes.js`, geografía, moneda, teléfono `+34`, tokens de color, legal español. Se conservan de misautonomos: el motor i18n con `langs.js`/`namespaces.js`, los 2 097 claves de `es`/`en`, las 427 claves de copy de marca, las 4 guardas de build, las 19 redirecciones de slugs legados y el cliente Supabase con `storageKey`/`flowType`. Se borran los 18 ficheros de la lista [08 §5.4] y todo lo marroquí de §5.1.

**Verificación objetiva.**
1. `npm run build` termina en 0 con los 14 pasos, contra la base de **khdemlidaba en modo lectura** (variables de entorno apuntando a `eiacoozyubxkbjwhgkml` con la clave anon).
2. `npm test` → **157 tests + 11 escenarios verdes** en ~34 s.
3. `npm run lint` → 0 errores y 0 avisos con `--max-warnings 0` (hoy misautonomos tiene 4 errores y 5 avisos: hay que arreglarlos antes, no desactivar la guarda).
4. `node scripts/check-i18n.mjs` → `es` y `en` al 100 %, 0 claves huérfanas, ≤ 7 cadenas a mano en `i18n-inventory.mjs`.
5. La guarda nueva `check-route-literals.mjs` sale 0: **ninguna aparición de los 36 segmentos franceses** en `src`, `api`, `scripts`, `vercel.json`, `supabase/functions`, `supabase/migrations`, `robots.txt`, `llms.txt`, `.well-known/*`, `AndroidManifest.xml`.
6. `grep -rn 'khdemlidaba\|eiacoozyubxkbjwhgkml\|E8590C\|+212\|Africa/Casablanca\|DH\b' src api scripts supabase vercel.json index.html` → 0 resultados fuera de comentarios de documentación.
7. `grep -c 'tx(' src/pages/WebsiteQuote.jsx` → 0 (los 169 pares extraídos a i18n).

**Reversible: sí, totalmente.** Es un worktree; nada se ha desplegado ni se ha tocado ninguna base. El riesgo es de tiempo, no de datos.

### Fase B — Esquema: baseline adaptado, validado en pglite

**Entregable.** Tres ficheros SQL y una rama de ensayo:
- `00_baseline.sql`: volcado del esquema vivo de `eiacoozyubxkbjwhgkml` (`public`, `app_private`, `private`) + los 4 buckets + las 17 policies de `storage.objects` + los 4 triggers sobre `auth.users` + `alter role authenticator set pgrst.db_max_rows='1000'` + las 10 filas de `internal_config` con valores nuevos + el DDL de `device_tokens` y sus 2 RPC extraídos de la base viva. **Podado** de `tbib_*` (9 tablas, 5 enums), `exchange_*` (3 tablas + esquema `private`), las 5 vistas `v_campagne_*`, las 4 tablas IG/Telegram y las filas operativas de `internal_config`. **Adaptado**: `Europe/Madrid` ×3, URL del proyecto destino, textos en español, defaults de moneda, rutas españolas en `measurement_page()`, slugs remotos españoles.
- `01_seed_es.sql`: 17 categorías con `family`, `allows_remote` y alias castellanos + 376 ciudades.
- `02_data_from_legacy.sql`: el import de §16 de [05], con sus funciones auxiliares (`legacy.slugify`, `legacy.socials_json`, `legacy.new_credential_path`).
- Una rama de Supabase (o un proyecto de ensayo con el dump de `dquxsethatxtptfviiwd`) donde la secuencia completa se haya ejecutado de principio a fin.

**Verificación objetiva.**
1. `00_baseline.sql` + `01_seed_es.sql` se aplican limpios en pglite con un bootstrap como `scripts/fixtures/profile-security.sql` (roles, `auth.uid()`, `auth.users`, `storage.*`).
2. En la rama de ensayo, tras los tres ficheros: `select count(*) from pg_proc where pronamespace='public'::regnamespace` ≈ 136 + las 21 legacy; `pg_trigger` sobre `auth.users` = 4 nuevos + 1 legacy; `storage.buckets` = 5.
3. **Ninguna tabla con RLS y 0 policies** (la consulta de R5 devuelve 0 filas).
4. Los recuentos de cierre de [05 §17] cuadran con los contados el día del ensayo, y las comprobaciones funcionales pasan: `select count(*) from professional_profiles where published` = 47; perfiles con `user_id` huérfano = 0; perfiles sin `category_id` o sin ciudad y sin `works_remote` = 0; slugs duplicados = 0 filas; `search_professionals(p_category_slug=>'pintor')` devuelve 8; `search_professionals(p_city_slug=>'barcelona')` devuelve 9.
5. `validate-search-rpc.mjs` → el count directo coincide con el de `search_professionals` en las 17 categorías.
6. `select * from internal_config where value like '%eiacoozyubxkbjwhgkml%'` → 0 filas.

**Reversible: sí.** Todo ocurre en pglite y en una rama o proyecto de ensayo. Producción intacta.

### Fase C — Ventana de producción: `legacy` → esquema nuevo → datos

**Entregable.** El proyecto `dquxsethatxtptfviiwd` con el esquema de khdemlidaba en `public`, los datos migrados, y las 52 tablas viejas en el esquema `legacy` sirviendo a la web actual.

Orden, con lo que se rompe en cada paso:
- **C0** (sin corte): copia de seguridad completa + CSV de `payment_records`, `subscriptions`, `messages`, `profile_metrics`, `translations`, `invoicing_settings` y los 57 usuarios sin cuenta. Añadir `legacy` a los *Exposed schemas*. Dejar en *preview* y probada la build de la web **actual** con `db: { schema: 'legacy' }`.
- **C1** (corte de 3-6 min): aplicar en **una transacción** `create schema legacy` + 52 `set schema` + 21 `alter function set schema` + los 16 cuerpos reescritos + el `handle_auth_user_link` nuevo + `delete_account` reescrito o con el EXECUTE revocado + `alter event trigger ensure_rls disable` + los renombrados a `legacy_is_admin` / `legacy_submit_review` / `legacy_on_auth_user_created`. Después, desplegar la web actual. **El orden importa: primero la migración, después el despliegue.**
- **C2** (sin corte): verificación del estado aparcado.
- **C3** (sin corte visible): aplicar `00_baseline.sql` + `01_seed_es.sql` vía `apply_migration`, crear los 4 buckets, reactivar `ensure_rls`. Dejar **exactamente un** trigger de alta vivo por mundo.
- **C4** (sin corte visible): `02_data_from_legacy.sql` en una transacción con `session_replication_role = replica`, como `postgres`. Mover los 15 documentos de identidad a `credentials` y reprocesar las fotos (D9).

**Verificación objetiva.**
- Tras C1: la lista de C2 de [10] entera en verde — `/buscar` lista los 47 perfiles, una ficha carga, `/categoria/…` filtra, `/blog` lista 25 posts, login con email y con Google entran, `/dashboard` pinta métricas, `/soporte` crea un ticket (ejercita 2 triggers), un alta de newsletter, **un registro nuevo de prueba** (ejercita `handle_auth_user_link` reescrito: es la comprobación que evita R3), `/sitemap.xml` responde, `/baja` responde.
- Tras C3: las verificaciones 2 y 3 de la fase B, ahora en producción.
- Tras C4: los recuentos de cierre de la fase B, más `select count(*) from auth.users` = **el mismo número que antes de empezar**, y `select count(*) from storage.objects where bucket_id='uploads' and name in (<los 15 documentos>)` = 0.

**Reversible: sí hasta el final de C4, con coste creciente.** Hasta C2: `alter table legacy.X set schema public` ×52 + redeploy de la web anterior. Tras C3: añadir `drop schema app_private cascade` y el `drop` de las tablas nuevas. Tras C4: la vuelta atrás es la misma, pero las escrituras que hayan entrado en `public` se pierden. **`auth.users` no se toca en ningún punto**, que es lo que hace reversible todo lo demás.

### Fase D — Funciones de servidor y secretos

**Entregable.** Las 15 edge functions que sobreviven (6 KEEP + 9 ADAPT) desplegadas en `dquxsethatxtptfviiwd` con sus `verify_jwt` reproducidos; las 11 actuales retiradas; los 7 crons de Vercel (8 menos `diploma`); los secretos puestos; el webhook de Resend creado; `internal_config` con la URL y la clave del proyecto destino.

**Verificación objetiva.**
1. `select key from internal_config` incluye `notify_admin_url` con el ref **destino**, `notify_admin_cron_key`, `review_ip_salt` y las 7 `call_outcome_*`.
2. El mismo valor de `CRON_SECRET` en los tres sitios: un `curl` con `Authorization: Bearer` a uno de los 8 crons responde 200, no 401.
3. Insertar una fila de prueba en `reports` o `system_failures` → llega el aviso a Telegram **y** queda la fila en `admin_notifications` con `error is null`. Es la comprobación que cierra R8.
4. `select count(*) from admin_notifications where error is not null and created_at > now() - interval '1 hour'` = 0.
5. `backend-restore.test.mjs` con los checksums recalculados sobre las fuentes nuevas.
6. `supabase functions list` → 0 funciones con nombre de las retiradas (`rehostMedia`, `rehostUrls`, `createCheckoutSession`, `syncStripeSubscription`, `getStripeInvoices`, `translate`, `send-newsletter`, `contact-professional`, `notify-new-ticket`, `send-push`).

**Reversible: sí.** Desplegar una edge function no destruye nada; retirarlas es lo único con efecto, y basta no borrar el código. El `internal_config` es un `update` de dos filas.

### Fase E — Despliegue web, redirecciones, sitemap y prerender

**Entregable.** La web trasplantada en producción con el `vercel.json` español (16 rewrites, los 301 de §4 de [03], la CSP con el host correcto, los headers de seguridad que misautonomos hoy no tiene, los 7 crons), el sitemap generado en build y el prerender serverless.

**Verificación objetiva.**
1. Las 44 URLs anidadas y los 23 slugs sucios responden **301** al destino correcto (lista completa en [03 §4.1]): un script que recorra las 106 URLs del sitemap actual y exija 200 o 301, nunca 404.
2. `validate-sitemap.mjs` → las 10 invariantes en verde contra el estado real de la base.
3. `smoke-metier-landings.mjs` → ninguna landing de oficio sale «no referenciado» tras hidratar.
4. `curl -sI https://misautonomos.es/buscar` → cabeceras CSP, HSTS, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` presentes, y la CSP **sin** `eiacoozyubxkbjwhgkml`.
5. La consola del navegador sin un solo bloqueo de CSP en la portada, el buscador y una ficha.
6. `robots.txt` sin `Disallow: /solicitudes` ni `Allow: /precios`, y `llms.txt` sin enlaces a URLs redirigidas.

**Reversible: sí, en un clic.** Vercel conserva el despliegue anterior; `legacy` sigue en pie. El rollback web es instantáneo mientras no se borre `legacy`.

### Fase F — Nativo

**Entregable.** La coquilla nativa del modelo sobre la identidad de misautonomos: `capacitor.config.ts`, los 2 ficheros Swift, los 6 `InfoPlist.strings`, el AASA con el Team ID real, el `AndroidManifest.xml` con los `pathPrefix` españoles, el `codemagic.yaml` de 645 líneas con sus 5 guards adaptados, `device_tokens` + `push-apns` + los 5 secretos APNS.

**Verificación objetiva.**
1. `node scripts/check-version-sync.mjs` → un único número en `package.json`, las 2 `MARKETING_VERSION` y `versionName`.
2. `node scripts/verify-ios-entitlements.mjs` → verde **con** `aps-environment` presente (es decir, comprobando de verdad los 2 relés de `AppDelegate.swift`).
3. `npx cap sync android` → `capacitor.settings.gradle` con **13** plugins (hoy 4).
4. El AASA desplegado **antes** de instalar la build: `curl -s https://misautonomos.es/.well-known/apple-app-site-association | grep -c REPLACE_TEAM_ID` → 0.
5. Build de Codemagic verde, IPA en TestFlight, y las **12 pruebas manuales en un iPhone físico** de [07 §7]. La clave: activar notificaciones → `select count(*) from device_tokens` pasa de 0 a 1 → insertar una fila en `notifications` → llega el push → al tocarlo abre `data.url`.
6. Un Universal Link abierto desde Notas abre la app, no Safari.

**Reversible: parcialmente.** El código sí. Lo que no: un `versionCode` o un número de build ya subido a Play o a App Store Connect no se puede reutilizar, y el guard de certificados de Apple responde 409 tras 3 builds con clave nueva. **Esta máquina (MacBook Pro 2016, macOS 12.7.6, 0 identidades de firma, sin `simctl`, sin JRE, sin SDK Android) no puede compilar iOS nunca**: el único camino es Codemagic.

### Fase G — Verificación final y medidas frente al modelo

**Entregable.** Un informe corto con las mismas medidas que tomó [06], ahora sobre la web trasplantada, comparadas con khdemlidaba y con el estado anterior de misautonomos.

**Verificación objetiva (umbrales medibles, no impresiones).**
1. **Imágenes de la primera pantalla**: hoy 1 409 791 bytes para tres cuadrados de 56 px; objetivo **< 25 000** (khdemlidaba está en ~19 000). Se mide con `performance.getEntriesByType('resource')`.
2. **Peticiones del buscador**: hoy 15 (una de ellas devuelve `[]` en 1 449 ms y 12 son escrituras); objetivo **3, con 0 escrituras**.
3. **Payload de datos del buscador**: hoy 112 952 bytes sin comprimir y creciendo con cada perfil; objetivo **constante**, ~32 673 bytes para una página de 24.
4. **JS inicial por cable**: aceptar el crecimiento a ~372 573 bytes, pero comprobar que `vendor`/`supabase`/`i18n` tienen hash estable (no se invalidan en cada despliegue).
5. **Bucket**: 0 objetos > 1 MB entre los referenciados por perfiles, 0 `application/octet-stream`, `cacheControl` 31536000, 0 documentos de identidad en bucket público.
6. **Recorrido de navegador** sobre portada, `/buscar`, una ficha, `/categoria/:slug`, `/categoria/:cat/:ciudad`, `/blog`, `/blog/:slug`, `/crear-pagina-web`, login, alta de perfil: 0 errores de consola, 0 bloqueos de CSP, 0 peticiones en 404.
7. `select count(*) from auth.users` = el valor de partida. Ninguna pérdida de cuentas.

**Reversible: no aplica** (es verificación). Pero el `DROP SCHEMA legacy CASCADE` que viene después **no es reversible**: no antes de 48 h por las pestañas, y mejor semanas por la app nativa (R19).

---

## 5. Lo que queda explícitamente fuera

### 5.1 Marruecos-solo: no viaja

| Qué | Dónde está | Por qué no viaja |
|---|---|---|
| Seed marroquí | `20260101000002_seed_data.sql` (15 ciudades, 12 categorías, 30 perfiles con `+212` y `@example.ma`) + los 70 slugs de ciudad y ~70 categorías del dashboard | Se sustituye por el seed español (17 categorías, 376 municipios) |
| Categorías y alias en darija/árabe | ficheros 7, 15 (datos), 19, 34, 88 de las migraciones; `CATEGORY_SLUG_ALIASES` | Vocabulario marroquí; 10 de ellas son la familia `stages` (prácticas), un producto que España no tiene |
| Heurística de género con ~120 nombres marroquíes | `20260829200100` | Sólo se aplica su `set not null` |
| Campañas de email fechadas | `annonce-offres`, `bilan-deux-mois`, `demande-avis`, `send-jcsecours`, `send-onboarding-azdin`, `diplome-casa` (desplegada y **no commiteada**) + las 5 vistas `v_campagne_*` + migraciones 78, 80, 85, 87, 90 | One-shot ya enviados, con cifras y destinatarios marroquíes en duro |
| Micrositios de clientes | `client-sites/louay-change/` (21 tests), `public/site/` (34 entradas), `public/jc-secours/`, `scripts/build-louay-change.mjs`, `lib/louay-standalone.mjs`, `verif-sites-clients.mjs`, migraciones 98 y 99 (+ `exchange_*` y el esquema `private`), 3 rewrites y 1 bloque de headers del `vercel.json` | Negocio de terceros con teléfonos `+212`; la migración 98 además lanza excepción sin la `website_request` de Louay |
| Pasarela de pago | `_shared/payments.ts` (YouCan Pay, `currency: 'MAD'`, `country_code: 'MA'`), `promo-checkout`, `promo-webhook`, secretos `YOUCANPAY_*` | No opera en España |
| Prefijo `/ar` y todo su andamio | `AR_PREFIX`, 11 rewrites, `build-seo-i18n.mjs`, `public/seo-i18n-ar.json`, `cityNamesAr.js` (70 ciudades), `ARABIC_SEO_PATHS`, 5 entradas del AASA, 5 `pathPrefix` del manifest | D3: `PREFIXED = []` |
| Legal marroquí | 139 claves i18n (`cgu`, `privacy`, `legal_notice`, `cookies`, `legal`), `src/lib/legal.js` (CNDP, RC, ICE, registrar `.ma`), ley 43-13 | Se sustituye por los textos españoles existentes |
| Tablas sin uso del modelo | `tbib_*` (9 tablas + 5 enums, de otro producto), `followups`, `ig_pending_replies`, `learned_examples`, `telegram_messages` | No las usa ni el front de khdemlidaba |
| Scripts de marketing marroquí | 12 ficheros (`video-shots.mjs` 25 apariciones de ruta, `appstore-screenshots.mjs`, `captures-site.mjs`, `site-batch-*`…) | 67 de las 971 apariciones de ruta están aquí y no se trasplantan |
| Observatorio salarial y control de titulación | `/salaires` (rangos 500–500 000 MAD, `noindex`), `diploma-tick` + 14 migraciones `diploma_*` | D4: el esquema viaja; el módulo queda apagado |

### 5.2 Funciones de misautonomos que desaparecen porque khdemlidaba no las tiene

**El dueño tiene que saber esto antes de empezar.** Siete capacidades que la web actual ofrece (o aparenta ofrecer) y que la réplica no tendrá:

1. **Aviso por email al autónomo cada vez que alguien le contacta.** Hoy lo hace `contact-professional` (con `reply_to` del cliente). En khdemlidaba el contacto es por teléfono o WhatsApp y se registra en `contact_events`; el único email va al admin. *Es la única que recomiendo rescatar (D5).*
2. **Mensajería interna.** `messages` (10 filas, 6 conversaciones, 1 presupuesto adjunto), `blocks`, los 3 triggers asociados y el push por Expo. **46 de los 47 perfiles tienen `chat_interno` entre sus métodos de contacto y 3 lo tienen como único canal**: esos 3 pasan a publicar el teléfono que dieron o se quedan sin publicar.
3. **Tickets de soporte.** `/soporte`, `/soporte/:id`, `tickets`/`ticket_messages`/`ticket_events`, `notify-new-ticket`. En khdemlidaba el soporte se responde con `admin-send-mail` y el formulario del sitio escribe en `contact_messages`. Se migra 1 de los 3 tickets (los otros 2 son de prueba). *Bonus: se cierra el agujero de `SELECT: true` que hoy deja leer todo el soporte sin sesión.*
4. **Newsletter.** `newsletter_subscribers` (**0 filas**), `send-newsletter`, `/baja-newsletter`, `api/baja.js`, `NewsletterSignup.jsx`, los 36 claves del namespace. khdemlidaba hace campañas puntuales con una función por campaña.
5. **Suscripciones y planes.** `subscription_plans` (4), `subscriptions` (20, **0 vigentes**), `payment_records` (87, 1 549,21 €), Stripe, `createCheckoutSession`. Las pantallas ya están retiradas (`/precios` y `/suscripcion` redirigen). Los 6 perfiles con `is_ads_plus` pierden la marca salvo que se les regale destacado. **Los 87 cobros hay que exportarlos por obligación fiscal.**
6. **Métricas por tarjeta y por visita.** `profile_metrics` (2 027 filas): **515 visitas de perfil y 6 828 apariciones en búsqueda no tienen destino**; sólo sobreviven los 26 clics como `contact_events`. Los paneles de khdemlidaba arrancan de cero en visitas.
7. **Mapa, búsquedas guardadas, CRM y facturación.** `leaflet`/`react-leaflet` están en el `package.json` con **0 ficheros que los importen** (el mapa no existe hoy); `saved_searches`, `quote_requests`, `invoices`, `projects`, `tasks`, `time_logs`, `client_*`, `crm_automations` y 20 tablas más están a **0 filas**. Nada que perder, pero desaparecen del esquema. También: el programa de referidos (25 códigos, 0 referidos), el outreach de leads (`outbound_leads`, `api/lead-convert.js`, `api/lead-opt-out.js`), el autoposter de blog con Anthropic (`api/cron/weekly-post.js`, que además escribe en una tabla que **no existe** y no tiene ningún cron: código muerto), la traducción de perfiles con DeepL (469 filas de caché; hoy ni funciona, porque llama a una función inexistente) y el push web de OneSignal (número de suscriptores desconocido, sólo visible en su panel).

**Y lo que hoy ya no funciona y conviene no replicar:** 15 nombres de edge function que el código invoca y que nunca se desplegaron. Dentro de `try/catch` silenciosos. Resultado medible: el formulario de `/contacto` **no envía nada**, el correo de bienvenida de la newsletter **no sale**, las notificaciones de ticket por email **no salen**, las 3 campañas del admin **no envían**, y los perfiles **nunca se traducen**. Más dos roturas vivas por RLS: `users_self_read` hace que `Search.jsx:113-119` reciba 0 o 1 fila de 47, así que `professionalUser` llega `undefined` a todas las tarjetas (también en `Favorites.jsx` y `Autonomo.jsx:186`), y `translations` tiene RLS activado con 0 políticas (469 filas invisibles). **No son regresiones del trasplante: son el estado actual.**

---

## 6. Informes de origen

| # | Capa | Ruta |
|---|---|---|
| 01 | Migraciones y esquema | `/Users/bigseo/Desktop/misaut-nomos/docs/refonte/transplante/01-migraciones.md` |
| 02 | Edge functions, `api/`, disparadores | `/Users/bigseo/Desktop/misaut-nomos/docs/refonte/transplante/02-funciones.md` |
| 03 | Rutas, URLs y 301 | `/Users/bigseo/Desktop/misaut-nomos/docs/refonte/transplante/03-rutas.md` |
| 04 | Configuración y marca | `/Users/bigseo/Desktop/misaut-nomos/docs/refonte/transplante/04-configuracion.md` |
| 05 | Mapeo de datos | `/Users/bigseo/Desktop/misaut-nomos/docs/refonte/transplante/05-datos.md` |
| 06 | Rendimiento e imágenes | `/Users/bigseo/Desktop/misaut-nomos/docs/refonte/transplante/06-rendimiento.md` |
| 07 | Capa nativa Capacitor | `/Users/bigseo/Desktop/misaut-nomos/docs/refonte/transplante/07-nativo.md` |
| 08 | Tests y guardas de build | `/Users/bigseo/Desktop/misaut-nomos/docs/refonte/transplante/08-tests.md` |
| 09 | Idiomas | `/Users/bigseo/Desktop/misaut-nomos/docs/refonte/transplante/09-i18n.md` |
| 10 | Dependencias vivas y ventana | `/Users/bigseo/Desktop/misaut-nomos/docs/refonte/transplante/10-dependencias-vivas.md` |

Fecha de esta síntesis: 2026-10-02. Fase de solo lectura: nada modificado, nada desplegado, ninguna escritura en ninguna base de datos.
