# 02 — Capa de servidor: edge functions, funciones Vercel y disparadores

Fase de lectura (2026-10-01). Nada se ha modificado ni desplegado.

Fuentes leídas:
- khdemlidaba: estado commiteado `794e657` de `/Users/bigseo/khdemlidaba` (`supabase/functions`, `api`, `vercel.json`, `supabase/config.toml`, `supabase/migrations`, `scripts`, `src` para localizar llamadores) y la lista de funciones desplegadas + triggers + `internal_config` del proyecto Supabase `eiacoozyubxkbjwhgkml` (solo `select`).
- misautonomos: `/Users/bigseo/Desktop/misaut-nomos` (`api`, `vercel.json`, `src`, `supabase/functions/translate`) y el código DESPLEGADO de las 11 edge functions del proyecto `dquxsethatxtptfviiwd` (recuperado con la herramienta MCP, porque no está en el repo), más sus triggers y recuentos de tablas.

Leyenda de veredictos:
- **KEEP** — se trasplanta tal cual; sólo cambian marca, remitente y URLs en duro.
- **ADAPT** — hay que tocar lógica, idioma, geografía o contrato.
- **DECIDIR** — depende de una decisión del dueño (se puede desplegar apagada).
- **SKIP** — no se despliega en misautonomos.

---

## 0. Resumen en cifras

| Qué | Número |
|---|---|
| Edge functions de khdemlidaba en el repo | **21** (+ 3 ficheros `_shared`, 428 líneas) — 6.074 líneas en total |
| Edge functions desplegadas en `eiacoozyubxkbjwhgkml` | **22** — la 22ª, `diplome-casa`, no existe en el repo |
| Ficheros en `/Users/bigseo/khdemlidaba/api` | **11** (1.701 líneas: `prerender.js` 1.260, `blog/og.js` 167, `blog/rss.js` 61, `contact.js` 11, 8 crons de 20–37) |
| `vercel.json` de khdemlidaba | 27 rewrites, 13 redirects, 10 bloques de headers, **8 crons**, 2 entradas `functions.includeFiles` |
| Nombres de variable leídos por las edge functions (`Deno.env.get`) | **21** distintos (3 los inyecta Supabase) |
| Ficheros de servidor con `khdemlidaba.ma` en duro | **19 de 24** (71 apariciones) |
| Ficheros con `Africa/Casablanca` | 7 (4 edge + 3 crons) |
| Ficheros con texto en árabe/darija | 7 (6 edge + `prerender.js`) |
| Ficheros que hablan de DH/MAD | 6 |
| Triggers pg_net en la base de khdemlidaba | **11** (10 → `notify-admin`, 1 → `push-apns`) + 2 funciones SQL que llaman a edge functions (`fire_notify_admin`, `_promo_fire_mail`) |
| Claves de `internal_config` que la cadena necesita | 2 críticas (`notify_admin_url`, `notify_admin_cron_key`) + `review_ip_salt` + 7 `call_outcome_*` |
| Edge functions desplegadas hoy en misautonomos | **11**: 3 invocadas desde el front, 2 por trigger, **6 sin ningún llamador** en el código |
| Nombres de función que el front de misautonomos invoca y NUNCA se desplegaron | **10** nombres, 19 llamadas, 14 ficheros |
| `api/` de misautonomos | 6 ficheros (1.110 líneas), **0 crons** declarados (`api/cron/weekly-post.js` nunca se ejecuta) |
| Veredictos khdemlidaba | KEEP 6 · ADAPT 9 · DECIDIR 1 · SKIP 8 (+1 fuera del repo) |

Nota sobre la cuenta "22": el repo tiene 21 funciones; la desplegada `diplome-casa` (campaña a enfermeras de Casablanca, 26/09/2026) se subió sin commitearla. Se trata como SKIP.

---

## 1. Bloque A — Edge functions de khdemlidaba (`/Users/bigseo/khdemlidaba/supabase/functions`)

Todas leen `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` (inyectados por Supabase); la columna "Secretos" lista sólo lo demás. "Disparador" indica quién la llama HOY en khdemlidaba (ruta exacta del llamador cuando es el cliente).

### 1.1 Ficheros compartidos `_shared/`

| Fichero | Líneas | Qué hace | Secretos | Depende de (base) | Marruecos | Veredicto |
|---|---|---|---|---|---|---|
| `_shared/email-safety.ts` | 12 | `recipientAllowed` (RPC `email_recipient_allowed`, falla cerrado) y `reminderUnsubscribeUrl` (RPC `issue_reminder_unsubscribe_token` → `https://khdemlidaba.ma/desabonner?token=`) | — | 2 RPC | URL en duro | **KEEP** (cambiar host) |
| `_shared/senders.ts` | 208 | `sendTelegram`, `sendResend` con guardia de cuota diaria (`v_email_sends_today`, escribe `system_failures` kind `email_quota_reached` una vez al día), `sendAdminUrgent` (Telegram + email `[URGENT] KhdemliDaba`), `escTg` | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `RESEND_API_KEY`, `EMAIL_DAILY_CAP` (2.500) | `v_email_sends_today`, `system_failures`, RPC `email_recipient_allowed` | `FROM = KhdemliDaba <bonjour@khdemlidaba.ma>`, `REPLY_TO`, prefijo de asunto | **KEEP** (marca/remitente) |
| `_shared/payments.ts` | 208 | Capa de pago con un único adaptador: **YouCan Pay** (MAD, `country_code: 'MA'`, firma HMAC del webhook) | `PAYMENT_PROVIDER`, `YOUCANPAY_PRIVATE_KEY`, `YOUCANPAY_MODE` | — | 100 % marroquí | **SKIP** |

### 1.2 Las 21 funciones (+1 desplegada fuera del repo)

| Función | Líneas | Propósito | Disparador | Auth (`verify_jwt` desplegado) | Secretos | Datos que toca | Marruecos | Veredicto |
|---|---|---|---|---|---|---|---|---|
| `admin-send-mail` | 80 | El admin responde a alguien desde el buzón del servicio (1 destinatario por llamada, traza en `admin_notifications` kind `admin_reply`) | Cliente: `src/components/AdminReplyMail.jsx:51` (JWT admin) | JWT admin comprobado en código (`false`) | `RESEND_API_KEY` | `users.is_admin`, `admin_notifications` | remitente `bonjour@` | **KEEP** |
| `annonce-offres` | 233 | Campaña one-shot `offres_2026_09`: sitio web gratis + 3 ofertas de pago (50/150/200 DH), por tramos de 100 con reserva previa en `reminder_emails` | Manual (`curl` con `x-cron-key`) | `x-cron-key` (`false`) | `CRON_SECRET`, `RESEND_API_KEY` (salta la cuota a propósito) | `v_campagne_offres_cibles`, `reminder_emails` | precios en DH, `/site-web-gratuit`, `/promo-instagram` | **SKIP** (campaña ya enviada) |
| `bilan-deux-mois` | 419 | Campaña one-shot `bilan_2026_09` (balance "60 días desde el 27/07/2026" con cifras en duro: 1.064 contactos, 1.005 pros, 51 ciudades), FR + darija, desabono por token | Manual | `x-cron-key` (`false`) | `CRON_SECRET`, `RESEND_API_KEY` | `v_campagne_bilan_cibles`, `reminder_emails`, RPC `issue_reminder_unsubscribe_token`, `email_recipient_allowed` | cifras y fecha de fundación marroquíes | **SKIP** |
| `daily-report` | 461 | Informe diario de negocio a los admins (KPIs día vs. víspera, top métiers/villes 7 d, pros contactados con enlace `wa.me`, nuevos perfiles sin verificar, huecos categoría×ciudad) | Vercel cron 07:00 UTC vía `api/cron/daily-report.js` + cliente `src/pages/AdminReport.jsx:67,85` (JWT admin) | `x-cron-key` o JWT admin (`false`) | `CRON_SECRET`, `RESEND_API_KEY` | `users`, `professional_profiles`, `contact_events`, `v_top_categories_7d`, `v_top_cities_7d`, `v_gaps`, `admin_notifications` kind `daily_report` | `TZ = Africa/Casablanca`, textos FR, `APP_URL` | **ADAPT** (zona horaria `Europe/Madrid`, idioma, enlaces) |
| `delete-account` | 54 | Borrado de cuenta: RPC `account_delete_begin` → borra ficheros de 4 buckets (`photos`, `credentials`, `cv-documents`, `website-briefs`) por lotes → `auth.admin.signOut(global)` → `auth.admin.deleteUser`; en fallo RPC `account_delete_failed`. Body `{confirm:true, source:'web'|'app', reason?}` | Cliente: `src/components/AccountManagement.jsx:239` + app nativa | JWT (`true`) | — | RPC `account_delete_begin`/`account_delete_files`/`account_delete_failed`, Storage | ninguno | **KEEP** (revisar nombres de buckets con la capa de datos) |
| `demande-avis` | 469 | Campaña one-shot `avis_2026_09`: "¿cuántas personas te han llamado?" con frase de situación por métier/ville y PS personalizado; FR y árabe (97 destinatarios sólo árabe) | Manual | `x-cron-key` (`false`) | `CRON_SECRET`, `RESEND_API_KEY` | `v_campagne_avis_cibles`, `reminder_emails` | cifras en duro (975/483/492/52), darija | **SKIP** |
| `demandes-purge` | 133 | Purga nocturna de `demandes` caducadas (7 días), con tope `DEMANDES_MAX_PURGE` (500) y limpieza de `purge_request_outcomes`; modo `dry` | Vercel cron 02:15 UTC vía `api/cron/demandes-purge.js` | `x-cron-key` (`false`) | `CRON_SECRET`, `DEMANDES_MAX_PURGE` (opc.) | `demandes`, `candidatures`, RPC `purge_request_outcomes` | ninguno | **KEEP** |
| `diploma-tick` | 314 | Control de diplomas de enfermeros/kinesiterapeutas (leyes marroquíes 43-13 y 45-13): pausa fichas sin diploma al vencer, envía preavisos por lotes, modo `reprise` | Vercel cron 08:30 UTC vía `api/cron/diploma.js` + cliente `src/pages/AdminDiplomes.jsx:56` | `x-cron-key` o JWT admin (`false`) | `CRON_SECRET`, `RESEND_API_KEY`, `DIPLOMA_BATCH` (90), `EMAIL_DAILY_LIMIT` (99) | `professional_profiles.diploma_status`, `v_email_sends_today`, RPC `diploma_pause_expired`, `diploma_next_notices`, `diploma_notice_sent`, `diploma_reprise_targets`, `email_recipient_allowed` | marco legal y oficios marroquíes | **DECIDIR** (desplegar sin cron hasta decidir si hay control de colegiación en España) |
| `livraison-site` | 241 | Correo "tu sitio está en línea" para los sitios web regalados, parametrizado por body (`email, prenom, url, slug, lang, bilingue, question`), cerrojo `internal_config.site_mail_<slug>` (22 cerrojos hoy) | Manual | `x-cron-key` (`false`) | `CRON_SECRET`, `RESEND_API_KEY` | `internal_config` | FR + darija | **ADAPT** (o retirarla: `promo-mail` kind `website_delivered` hace lo mismo de forma automática) |
| `monthly-digest` | 164 | Resumen mensual a admins (crecimiento vs. M-1, ranking de ciudades por contactos, presión oferta/demanda por categoría, consumo Resend) | Vercel cron día 1 07:00 UTC vía `api/cron/monthly-digest.js` | `x-cron-key` o JWT admin (`false`) | `CRON_SECRET`, `RESEND_API_KEY`, `EMAIL_DAILY_CAP` | `v_monthly_digest`, `v_monthly_category_pressure`, `contact_events`, `professional_profiles`→`cities`, `admin_notifications` | texto FR; pie "quota 100/jour" obsoleto; llamada muerta a `rpc('exec_sql')` capturada | **ADAPT** |
| `notify-admin` | 1.021 | **Núcleo de avisos.** 14 `kind`: `new_signup`, `profile_published`, `contact_click` (resumen diario), `new_review`, `signalement`, `review_low`, `system_failure`, `demande_created`, `candidature_created` (email al cliente), `promo_update`, `contact_click_now`, `contact_message`, `pro_no_answer`, `website_request` (formulario de creación de sitio web). Telegram para lo silencioso, Telegram + email `[URGENT]` para lo grave, email con cuota para moderación. Máx. 30 envíos por ejecución, dedup por `admin_notifications` | 10 triggers pg_net (ver §4) + `website_request_submit` + RPC de "nadie descuelga" + Vercel cron 20:00 UTC (`api/cron/contact-clicks-digest.js`, `kind=contact_click`) + cliente `src/pages/Admin.jsx:1275` (JWT admin) | `x-cron-key` o JWT admin (`false`) | `CRON_SECRET`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `RESEND_API_KEY`, `RESEND_TO` (opc.), `EMAIL_DAILY_CAP` | `v_pending_admin_signups`, `v_pending_profile_published`, `v_daily_contact_clicks`; RPC `admin_list_reviews`, `claim_contact_notification`, `admin_no_answer_pros`; tablas `reports`, `reviews`, `system_failures`, `demandes`, `candidatures`, `contact_events`, `contact_messages`, `website_requests`, `promo_orders`, `users`, `professional_profiles`, `admin_notifications` | todos los textos en FR, `APP_URL`, importes "DH", `wa.me` | **ADAPT** (idioma y enlaces; la lógica se queda) |
| `promo-checkout` | 138 | Inicia pago con tarjeta de una oferta (`instagram_post`/`featured`) vía `_shared/payments.ts`; 503 si `PAYMENT_PROVIDER` no está puesto | Cliente web/app (JWT) | JWT (`true`) | `PAYMENT_PROVIDER`, `YOUCANPAY_*`, `SUPABASE_ANON_KEY` | RPC `promo_create_order`, `promo_mark_failed`; `promo_orders`, `system_failures` | pasarela marroquí, MAD, `ORIGINS` con `khdemlidaba.ma` | **SKIP** (el pago real en khdemlidaba es por transferencia, gestionado por `promo-mail`) |
| `promo-mail` | 553 | Correos al CLIENTE de una oferta de pago: `instructions` (datos bancarios de `promo_settings`, referencia `KD-XXXXXXXX`), `paid`, y `website_delivered` (sitio web gratis entregado; idempotencia por `delivered_mailed_at`). Autónoma (sin `_shared`) | pg_net `_promo_fire_mail` desde las RPC `promo_create_order`, `promo_create_job_order`, `promo_mark_paid`, `admin_website_request_update` + JWT admin para reenviar | `x-cron-key` o JWT admin (`false`) | `CRON_SECRET`, `RESEND_API_KEY` | `promo_orders`, `promo_settings` (`bank_holder/name/rib/iban/bic/agency`, `transfer_hold_days`, `lead_days_*`), `website_requests`, `users`, `auth.admin.getUserById`, `admin_notifications` kind `promo_mail` | DH, RIB, `Africa/Casablanca`, `ORIGINS`, textos FR | **ADAPT** (EUR/IBAN, idioma; imprescindible para `/creation-site-web`) |
| `promo-webhook` | 66 | Webhook servidor→servidor del proveedor de pago; único camino por el que una orden pasa a `paid` | Proveedor (YouCan Pay) | firma HMAC (`false`) | `PAYMENT_PROVIDER`, `YOUCANPAY_*` | RPC `promo_mark_paid`/`promo_mark_failed`, `system_failures` | pasarela marroquí | **SKIP** |
| `push-apns` | 118 | Push iOS por APNs directo (JWT ES256 firmado con la clave `.p8`, cacheado 55 min) a `device_tokens` platform `ios`; body `{title, body, url?, tokens?}` | Trigger `trg_notifications_push` (`fire_push_apns`, AFTER INSERT en `notifications`) + JWT admin/`x-cron-key` | `x-cron-key` o JWT admin (`false`) | `CRON_SECRET`, `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_BUNDLE_ID` (`ma.khdemlidaba.app`), `APNS_KEY_P8`, `APNS_HOST` | `device_tokens`, `users` | bundle id y cuenta Apple de khdemlidaba (1 token registrado hoy) | **ADAPT** sólo si misautonomos tiene app iOS; si no, no desplegar (el trigger traga el error) |
| `relance-fiche-pro` | 193 | Correo + notificación in-app a quien publicó una OFERTA en `/demandes` por error ("tu anuncio estaba del lado equivocado"), cerrojo `internal_config.relance_pro_<user_id>` (6 hoy) | Manual, body `{email, user_id, texte, prenom, lang, metier}` | `x-cron-key` (`false`) | `CRON_SECRET`, `RESEND_API_KEY`, `EMAIL_DAILY_CAP` | `internal_config`, `notifications`, `v_email_sends_today`, RPC `email_recipient_allowed` | FR + darija, `/inscription?type=pro` | **ADAPT** (baja prioridad) |
| `resend-webhook` | 91 | Recibe eventos de entrega de Resend (firma Svix, anti-replay 5 min, 128 KB máx.) y los pasa a la RPC `record_email_delivery_event` (rebotes → supresión y prórrogas) | Webhook de Resend | firma Svix; sin secreto responde 503 (`false`) | `RESEND_WEBHOOK_SECRET` | RPC `record_email_delivery_event` | ninguno | **KEEP** (hay que crear el webhook en Resend contra la URL del nuevo proyecto) |
| `send-jcsecours` | 181 | One-shot: correo a un cliente marroquí concreto (destinatario en duro), cerrojo `internal_config.jcsecours_mail_sent` | Manual | `x-cron-key` (`false`) | `CRON_SECRET`, `RESEND_API_KEY` | `internal_config` | sí, totalmente | **SKIP** |
| `send-onboarding-azdin` | 14 | Stub desactivado: responde 410 (one-shot ejecutado el 2026-08-12) | — | `true` | — | — | sí | **SKIP** |
| `send-reminders` (+ `templates.ts`) | 397 + 160 | Recordatorios: campaña `pro_incomplete` (step 1 a 24 h, step 2 a 96 h; kinds `profil_incomplet`/`compte_sans_profil`) y `client_to_pro` (72 h / 288 h). Máx. 50 por ejecución, `Idempotency-Key`, pausa si se alcanza la cuota, modos `dry`/`only`/`force` | Vercel cron 01:00 UTC ×2 (`api/cron/reminders.js`, `api/cron/client-to-pro-reminders.js`) + cliente `src/pages/Admin.jsx:1142` (JWT admin, `?campaign=`) | `x-cron-key` o JWT admin (`false`) | `CRON_SECRET`, `RESEND_API_KEY`, `EMAIL_DAILY_CAP` | `v_reminder_targets`, `v_client_conversion_targets`, `reminder_emails`, `professional_profiles`, `contact_events`, `v_email_sends_today`, RPC `email_recipient_allowed`, `issue_reminder_unsubscribe_token` | plantillas FR + darija, firma "Ilias", enlaces `/professionnel/creer`, `/profil/modifier` | **ADAPT** (plantillas en ES + 5 idiomas, enlaces) |
| `weekly-digest` | 146 | Resumen semanal a admins (totales S vs. S-1, top 5 ciudades/categorías/pros, conversión inscripción→publicación, recordatorios convertidos) | Vercel cron lunes 07:00 UTC vía `api/cron/weekly-digest.js` | `x-cron-key` o JWT admin (`false`) | `CRON_SECRET`, `RESEND_API_KEY`, `EMAIL_DAILY_CAP` | `v_weekly_digest`, `v_weekly_top_cities`, `v_weekly_top_categories`, `v_weekly_top_pros`, `reminder_emails`, `professional_profiles`, `admin_notifications` | texto FR | **ADAPT** |
| `diplome-casa` (desplegada, **no en el repo**) | — | Campaña `diplome_casa_2026_09` a 61 enfermeras de Casablanca | Manual | `true` | `CRON_SECRET`, `RESEND_API_KEY` | `v_campagne_diplome_casa_cibles`, `reminder_emails` | sí | **SKIP** |

`supabase/config.toml` declara `verify_jwt` para 14 de las 21; el desplegado real (lista MCP) es: `true` en `send-onboarding-azdin`, `promo-checkout`, `delete-account`, `diplome-casa`; `false` en las 18 restantes. Al desplegar en misautonomos hay que reproducir estos flags (los webhooks y los crons no llevan JWT de Supabase).

### 1.3 Patrones comunes que hay que conocer antes de tocar nada

- **Autorización**: 15 funciones comparan `x-cron-key` con `CRON_SECRET`; 9 de ellas aceptan además un JWT de admin (`users.is_admin`). `delete-account` y `promo-checkout` sólo aceptan JWT de usuario.
- **Cuota de correo**: `_shared/senders.ts`, `send-reminders`, `relance-fiche-pro` y `diploma-tick` leen `v_email_sends_today` (que cuenta `admin_notifications` + `reminder_emails`) y paran al llegar a `EMAIL_DAILY_CAP`/`EMAIL_DAILY_LIMIT`. Las 4 campañas one-shot se saltan la cuota a propósito.
- **Supresión**: 7 funciones llaman a `email_recipient_allowed` antes de enviar y fallan cerrado si la RPC falla.
- **Idempotencia**: reserva previa en `reminder_emails` (campañas), columnas `*_mailed_at` (`promo-mail`), cerrojos en `internal_config` (`livraison-site`, `relance-fiche-pro`, `send-jcsecours`), `Idempotency-Key` de Resend (`send-reminders`, `contact_message`), y `UPDATE … RETURNING` atómico (`website_request`).
- **Trazabilidad**: todo envío escribe en `admin_notifications` (4.876 filas hoy) o `reminder_emails` (4.450 filas).

---

## 2. Bloque B — Funciones Vercel de khdemlidaba (`/Users/bigseo/khdemlidaba/api`) y `vercel.json`

### 2.1 Funciones

| Fichero | Líneas | Ruta (rewrite en `vercel.json`) | Qué hace | Variables de entorno (`process.env`) | Datos Supabase (REST con clave anon) | Marruecos | Veredicto |
|---|---|---|---|---|---|---|---|
| `api/prerender.js` | 1.260 | 21 rewrites: `/professionnel/:slug`, `/ville/:slug`, `/metier/:slug`, `/recherche`, `/en-ligne`, `/demandes`, `/blog`, `/metiers`, `/:combo` (métier-ville) y sus variantes `/ar/…` + `/ar` raíz | Prerender SEO: lee la coquilla `dist/app.html` (repliegue `dist/index.html` o `PRERENDER_TEMPLATE`), resuelve la entidad, inyecta `title/description/canonical/OG/hreflang/JSON-LD` marcados `data-rh="true"` y un cuerpo HTML con listas de fichas y enlaces locales; 404 + `noindex` si la entidad no existe, 503 sin caché si falla la fuente; CDN 600 s. Dos locales: FR en raíz, AR con prefijo `/ar` (pack `dist/seo-i18n-ar.json`, generado en build desde `ar.json` y `src/data/cityNamesAr.js`). Importa 5 módulos de `src`: `lib/seoLocales.js`, `data/families.js`, `data/staticData.js`, `lib/localLandingContent.js` (16,8 KB de texto local marroquí), `lib/localServiceDiscovery.js` | `SUPABASE_URL` ∥ `VITE_SUPABASE_URL`, `SUPABASE_ANON_KEY` ∥ `VITE_SUPABASE_ANON_KEY`, `PRERENDER_TEMPLATE` (sólo en build, lo usa `scripts/inject-home.mjs`) | `categories`, `cities`, `rpc/get_public_professional_profiles`, `blog_posts`, `v_demandes_public` | `SITE_URL`, rutas en francés, 2 idiomas, textos y contenido local | **ADAPT fuerte** (idiomas, rutas, contenido local España; es la pieza que da la velocidad de carga percibida y el SEO) |
| `api/blog/og.js` | 167 | `/blog/:slug`, `/ar/blog/:slug` | HTML inicial del artículo: lee `dist/app.html`, trae `blog_posts` (`content_md` renderizado con `src/lib/markdown.js`), inyecta Article + BreadcrumbList JSON-LD; 404/503 con `Retry-After`; CDN 600 s | `SUPABASE_URL`/`VITE_…`, `SUPABASE_ANON_KEY`/`VITE_…` | `blog_posts` (slug, title, excerpt, content_md, cover_url, meta_*, author, published_at) | `SITE_URL`, `inLanguage: 'fr'`, `locale fr_FR` | **ADAPT** (idioma; y el blog de misautonomos es HTML, no Markdown — asunto de la capa de datos) |
| `api/blog/rss.js` | 61 | `/blog/rss.xml` | Feed RSS de los 30 últimos `blog_posts`, caché 1 h | ídem | `blog_posts` | `SITE_URL`, título/descr. FR, `<language>fr` | **ADAPT** (texto) |
| `api/contact.js` | 11 | `/api/contact` (sin rewrite) | Endpoint de compatibilidad para apps antiguas: responde `{ok, notification:'managed_by_database'}`; 0 llamadores en `src` | — | — | — | **SKIP** (inocuo si se deja) |
| `api/cron/reminders.js` | 37 | cron `0 1 * * *` | Proxy → `send-reminders` con `x-cron-key` | `CRON_SECRET`, `SUPABASE_URL`/`VITE_…` | — | — | **KEEP** |
| `api/cron/client-to-pro-reminders.js` | 24 | cron `0 1 * * *` | Proxy → `send-reminders?campaign=client_to_pro` | ídem | — | — | **KEEP** |
| `api/cron/daily-report.js` | 20 | cron `0 7 * * *` | Proxy → `daily-report` | ídem | — | hora pensada para Casablanca | **KEEP** (ajustar hora si se quiere Madrid) |
| `api/cron/contact-clicks-digest.js` | 22 | cron `0 20 * * *` | Proxy → `notify-admin?kind=contact_click` | ídem | — | — | **KEEP** |
| `api/cron/weekly-digest.js` | 22 | cron `0 7 * * 1` | Proxy → `weekly-digest` | ídem | — | — | **KEEP** |
| `api/cron/monthly-digest.js` | 20 | cron `0 7 1 * *` | Proxy → `monthly-digest` | ídem | — | — | **KEEP** |
| `api/cron/diploma.js` | 28 | cron `30 8 * * *` | Proxy → `diploma-tick` | ídem | — | — | **DECIDIR** (va con `diploma-tick`) |
| `api/cron/demandes-purge.js` | 29 | cron `15 2 * * *` | Proxy → `demandes-purge` (body `{}`) | ídem | — | — | **KEEP** |

Los 8 crons siguen el mismo esquema: Vercel manda `Authorization: Bearer <CRON_SECRET>`, el proxy lo compara y lo reenvía como `x-cron-key`; la edge function vuelve a compararlo con SU `CRON_SECRET`. Por tanto **el mismo valor tiene que vivir en Vercel y en Supabase** (y en `internal_config.notify_admin_cron_key`, ver §4).

### 2.2 `vercel.json` de khdemlidaba — qué hay que conservar y qué cambiar

| Sección | Contenido | Qué hacer en misautonomos |
|---|---|---|
| `framework/buildCommand/outputDirectory` | vite, `npm run build`, `dist`; `NODE_OPTIONS=--experimental-require-module` | KEEP |
| `functions.includeFiles` | `api/blog/og.js` → `dist/app.html`; `api/prerender.js` → `dist/{app.html,index.html,seo-i18n-ar.json,local-services.json}` | KEEP (si cambian los nombres de los packs de idioma, actualizar) |
| `redirects` (13) | 2 de ruta (`/site-web-gratuit` → `/creation-site-web`, y su `/ar/`) + 11 de host (www, khadamapro.ma, khedmlidaba.ma, khdamlidaba.ma, khdemlidaba.com, khdmli.ma y sus www) | Sustituir los 11 de host por `www.misautonomos.es → misautonomos.es`; **añadir los 21 redirects legacy** que hoy tiene el `vercel.json` de misautonomos (slugs con acentos, `/autonomo/…`, `/categoria/…`, `/precios`, `/suscripcion`, `/mensajes`…) y los nuevos de rutas antiguas → nuevas |
| `headers` (10 bloques) | CSP estricta (**contiene 3 veces `eiacoozyubxkbjwhgkml.supabase.co`** en `img-src`, `connect-src`, `frame-src`), HSTS, cache inmutable para `/assets`, iconos y `/seed`, cabeceras para `sitemap.xml`, `robots.txt`, `llms.txt`, `.well-known/apple-app-site-association` y `assetlinks.json`, `X-Robots-Tag noindex` para `/site/louay-change` | ADAPT: ref de proyecto en la CSP → `dquxsethatxtptfviiwd`; quitar el bloque `/site/louay-change`; `.well-known` sólo con los ids de la app de misautonomos; conservar los `Service-Worker-Allowed`/`OneSignalSDKWorker.js` actuales sólo si se mantiene OneSignal (khdemlidaba no lo usa) |
| `rewrites` (27) | `/site/:slug` y `/jc-secours` (sitios de clientes marroquíes en `public/site/*`), `/blog/rss.xml`, 21 de prerender, `/blog/:slug` → og, catch-all `/((?!api/|.*\.[a-zA-Z0-9]{1,8}$).*)` → `/app.html` | SKIP los 3 de sitios de clientes; KEEP el resto, con las rutas que decida el dueño (§6, pregunta 1). Sustituyen a los 27 rewrites actuales de misautonomos (25 rutas SPA → `/index.html`, `/sitemap.xml`, `/baja`) |
| `crons` (8) | ver §2.1 | KEEP 7 (quitar `diploma` salvo decisión). Hoy misautonomos no tiene ninguno |

### 2.3 Build: lo que corre en Vercel antes de que exista `dist/`

`package.json` → `build` encadena 12 pasos: `build:louay` (sitio de un cliente marroquí), `scripts/build-seo-i18n.mjs`, `vite build`, `check-hook-order`, `verify-tracking`, `check-csp-inline`, `check-css-math`, `verify-ios-entitlements`, `check-version-sync`, `scripts/generate-sitemap.js` (lee Supabase, escribe `public/sitemap.xml`), `scripts/build-local-services.mjs`, `scripts/inject-home.mjs` (**ejecuta `api/prerender.js` en local** sobre `/` con `PRERENDER_TEMPLATE` y rellena `dist/index.html`; copia la coquilla vacía a `dist/app.html`). Estos scripts leen `SUPABASE_URL`/`VITE_SUPABASE_URL`, `SUPABASE_ANON_KEY`/`VITE_SUPABASE_ANON_KEY`, `VITE_SITE_URL`, `INJECT_HOME`, `VERCEL`. Consecuencia: la build de Vercel de misautonomos necesita esas variables, y `build:louay` + `verify-ios-entitlements` fallarán si no se adaptan o se quitan del encadenado.

### 2.4 Variables de entorno en Vercel: lo que hay hoy frente a lo que pide el código de khdemlidaba

| Variable | Hoy en Vercel de misautonomos | La usa el `api/` de khdemlidaba | Acción |
|---|---|---|---|
| `SUPABASE_URL` | sí | sí (12 lecturas, con repliegue a `VITE_SUPABASE_URL`) | conservar |
| `VITE_SUPABASE_URL` | sí | repliegue | conservar |
| `VITE_SUPABASE_ANON_KEY` | sí | repliegue de `SUPABASE_ANON_KEY` (prerender, og, rss) | conservar (`SUPABASE_ANON_KEY` opcional) |
| `CRON_SECRET` | **no** | sí (8 crons) | **crear** (mismo valor que el secreto de Supabase) |
| `VITE_SITE_URL` | no | sólo scripts de build | opcional |
| `SUPABASE_SERVICE_ROLE_KEY` | sí | **no** (ningún fichero `api/` de khdemlidaba la usa) | retirar tras el trasplante: la clave de servicio no debe estar en Vercel |
| `RESEND_API_KEY`, `RESEND_FROM_NAME`, `RESEND_FROM_EMAIL` | sí | no (los correos salen de Supabase) | retirar de Vercel (el `RESEND_API_KEY` pasa a secreto de Supabase) |
| `VITE_STRIPE_PUBLIC_KEY` | sí | no | retirar |
| `VITE_APP_URL` | sí | no en `api/` | comprobar en la capa cliente |

---

## 3. Bloque C — Lo que misautonomos tiene desplegado HOY y qué lo sustituye

### 3.1 Las 11 edge functions de `dquxsethatxtptfviiwd`

| Función (versión, `verify_jwt`) | Quién la llama HOY | Qué hace | Secretos | Equivalente en khdemlidaba | Veredicto |
|---|---|---|---|---|---|
| `contact-professional` (v1, false) | `src/lib/contactProfessional.js:56` — contacto anónimo desde la ficha | Inserta un `messages` con `conversation_id = lead_<uuid>` (0 filas de este tipo hoy), llama a `track_profile_metric(contact_click)` y manda email Resend al autónomo (`email_contacto` o `users.email`) con `reply_to` del cliente | `RESEND_API_KEY` | **No existe**: en khdemlidaba el contacto es por teléfono/WhatsApp registrado en `contact_events` (1.342 filas) por RPC del cliente, y el formulario general del sitio escribe en `contact_messages` (7 filas) → trigger → `notify-admin` kind `contact_message` (Telegram + email al admin). No hay email al profesional por cada contacto | **Sustituir** (función retirada; el comportamiento cambia y hay que decírselo al dueño) |
| `notify-new-ticket` (v2, false) | Trigger `trg_notify_new_ticket` (AFTER INSERT en `tickets`; 3 tickets, último 2026-09-03). El cuerpo SQL lleva la URL y la **clave anon en duro** | Email a `hola@misautonomos.es` con el ticket si tiene menos de 10 min | `RESEND_API_KEY` | `notify-admin` (`signalement`, `review_low`, `system_failure` → Telegram + email `[URGENT]`; `contact_message`). khdemlidaba no tiene sistema de tickets: el soporte se responde con `admin-send-mail` | **Sustituir** por `notify-admin`; retirar trigger y tabla (capa de datos) |
| `send-push` (v1, false) | Trigger `trg_notify_send_push` (AFTER INSERT en `messages`; 10 mensajes, último 2026-08-15) | Lee el mensaje, busca `push_tokens` (0 filas) del destinatario y envía por **Expo Push API** (`exp.host`); deep link `misautonomos://conversation/…` | — | `push-apns` (APNs directo con clave `.p8`, `device_tokens`, trigger sobre `notifications`, no sobre mensajes). La mensajería interna no existe en khdemlidaba | **Sustituir** por `push-apns` sólo si hay app iOS; retirar trigger |
| `delete-account` (v1, true) | `src/components/account/DeleteAccountButton.tsx:37` | `auth.getUser` → RPC `delete_account(p_uid)` → `auth.admin.deleteUser` | `SUPABASE_ANON_KEY` | `delete-account` de khdemlidaba (contrato distinto: body `{confirm, source, reason}`, 3 RPC `account_delete_*`, limpieza de 4 buckets, `signOut global`, devuelve `reference`) | **Sustituir** (mismo nombre, otro contrato: el botón cambia con el front) |
| `send-newsletter` (v1, true) | `src/pages/AdminNewsletter.jsx:57` | Admin (`users.role='admin'` por `auth_user_id`) envía un HTML a `newsletter_subscribers` (**0 filas**) con pie de baja `/baja-newsletter?token=` | `RESEND_API_KEY` | **No existe**: khdemlidaba hace campañas con una función por campaña + `reminder_emails` + vistas `v_campagne_*` | **Retirar** |
| `createCheckoutSession` (v2, true) | **Nadie** (0 llamadas en `src`) | Activa el plan gratuito `plan_visibility` (escribe `subscriptions` —20 filas—, `users.subscription_*`, `professional_profiles.estado_perfil/visible_en_busqueda`) o crea sesión Stripe si hay `STRIPE_SECRET_KEY` | `STRIPE_SECRET_KEY` (opc.), `SUPABASE_ANON_KEY` | **No existe** (sin suscripciones; ofertas de pago por transferencia vía `promo_*` + `promo-mail`) | **Retirar** (resto Base44/Stripe) |
| `syncStripeSubscription` (v2, true) | Nadie | Devuelve/auto-provisiona la suscripción gratuita | `SUPABASE_ANON_KEY` | No existe | **Retirar** |
| `getStripeInvoices` (v2, true) | Nadie | Devuelve `{invoices: []}` | — | No existe | **Retirar** |
| `rehostMedia` (v2, **false**) | Nadie | Herramienta de migración Base44 → Storage `uploads` (`users.profile_picture`, `blog_posts.featured_image/og_image`, `professional_profiles.imagen_principal/photos/portfolio_items`), protegida sólo por un **token fijo escrito en el código** (`x-mig-token`) | — | No existe | **Retirar ya** (riesgo: escritura en el bucket abierta a quien tenga el token) |
| `rehostUrls` (v2, **false**) | Nadie | Ídem, para una lista de URLs | — | No existe | **Retirar ya** |
| `translate` (v1, false) | **Nadie** en `src` a HEAD (la caché `translations` tiene 469 filas) | Traduce con DeepL (host free/pro según sufijo `:fx`), caché por `sha256` en `translations`. El fichero del repo `supabase/functions/translate/index.ts` es una versión distinta (std `serve`, endpoint free fijo) | `DEEPL_API_KEY` | **No existe**: khdemlidaba no traduce en runtime; `react-i18next` con JSON estáticos y el pack `seo-i18n-ar.json` generado en build | **Retirar** (ver pregunta 2: cómo se producen los 5 idiomas no-ES) |

Resumen: de 11, **3** están vivas desde el front (`contact-professional`, `delete-account`, `send-newsletter`), **2** por trigger (`notify-new-ticket`, `send-push`) y **6** no las llama nadie. Ninguna se conserva tal cual; `delete-account` conserva el nombre con otro contrato.

### 3.2 Funciones fantasma: nombres que el front invoca y nunca se desplegaron (fallan con 404 hoy)

| Nombre | Llamadas | Ficheros |
|---|---|---|
| `sendAndLog` | 6 | `src/components/admin/AdminEmailsPanel.jsx:113`, `CampaignBlogPlataformasV1.jsx:122,176`, `CampaignRepescaV1.jsx:99,132`, `CampaignWinbackV1.jsx:143` |
| `sendTicketNotification` | 3 | `src/components/tickets/CreateTicketDialog.jsx:83,92`, `src/pages/AdminTickets.jsx:140` |
| `sendNewsletterWelcome` | 2 | `src/components/Footer.jsx:105`, `src/components/NewsletterSignup.jsx:59` |
| `resolveLegacySlug` | 2 | `src/pages/Autonomo.jsx:142`, `src/pages/Categoria.jsx:115` |
| `applyReferral`, `generateReferralCode` | 1 + 1 | `src/pages/ProfileOnboarding.jsx:445,459` |
| `backfillEmailStatusFromResend` | 1 | `src/components/admin/CampaignMetrics.jsx:142` |
| `contactForm` | 1 | `src/pages/Contacto.jsx:33` |
| `deleteUser` | 1 | `src/pages/MyProfile.jsx:395` |
| `getCampaignAudience` | 1 | `src/components/admin/CampaignRepescaV1.jsx:86` |

10 nombres, 19 llamadas, 14 ficheros (más los 5 stubs de `base44Client.js` `Core`: `sendEmail`, `sendSMS`, `invokeLLM`, `generateImage`, `extractData`). Todo esto desaparece con el front; no hay nada que migrar.

### 3.3 `api/` de misautonomos (6 ficheros) y su destino

| Fichero | Líneas | Quién lo usa | Qué hace | Env | Sustituto en khdemlidaba | Veredicto |
|---|---|---|---|---|---|---|
| `api/baja.js` | 140 | Rewrite `/baja`; enlaces de los correos y `List-Unsubscribe` (RFC 8058) | Pone `users.email_unsubscribed=true` por `users.unsubscribe_token` | `SUPABASE_SERVICE_ROLE_KEY` | Página SPA `/desabonner?token=` + RPC con jeton de `issue_reminder_unsubscribe_token` + lista de supresión (`email_recipient_allowed`) | **Retirar** |
| `api/lead-convert.js` | 88 | `src/pages/ProfileOnboarding.jsx:422` (si la URL llegó con `?lead=&ref=outreach`) | Marca `outbound_leads.status='convertido'` y avisa al admin | `SUPABASE_SERVICE_ROLE_KEY` | Ninguno | **Retirar** (con la tabla `outbound_leads`, decisión de datos) |
| `api/lead-opt-out.js` | 58 | Enlaces de baja de los mensajes outreach | `outbound_leads.opt_out=true` por `opt_out_token` | `SUPABASE_SERVICE_ROLE_KEY` | Ninguno | **Retirar** |
| `api/notify-admin.js` | 120 | 5 llamadas (`src/Layout.jsx:237`, `src/components/Footer.jsx:113`, `src/components/NewsletterSignup.jsx:67`, `src/lib/newsletterAutoSubscribe.js:33`, `src/pages/ProfileOnboarding.jsx:476`) con 3 eventos (`new_client`, `new_professional`, `newsletter_signup`), + `lead-convert.js` + `weekly-post.js`. CORS abierto, sin autenticación | Email Resend a `ADMIN_NOTIFY_EMAIL` (por defecto `ADMIN_NOTIFY_EMAIL`; remitente por defecto `onboarding@resend.dev`) | `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_FROM_NAME`, `ADMIN_NOTIFY_EMAIL` | Edge `notify-admin` disparada por triggers de base (`new_signup`, `profile_published`…), Telegram | **Retirar** |
| `api/sitemap.xml.js` | 262 | Rewrite `/sitemap.xml` | Sitemap dinámico desde `professional_profiles` (`estado_perfil`, `visible_en_busqueda`, `onboarding_completed`, `slug_publico`) + blog; caché 6 h | `SUPABASE_ANON_KEY` | `scripts/generate-sitemap.js` en build → `public/sitemap.xml` estático con cabeceras (`validate-sitemap.mjs` lo comprueba) | **Retirar**; conservar las URL antiguas como redirects |
| `api/cron/weekly-post.js` | 442 | **Nadie**: `vercel.json` no tiene sección `crons` | Autoposter semanal del blog con Anthropic sobre `blog_topic_queue`, dispara `VERCEL_DEPLOY_HOOK_URL` | `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, `AUTO_PUBLISH`, `AUTOPOST_AUTHOR_ID`, `VERCEL_DEPLOY_HOOK_URL`, `CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY` | Ninguno (los artículos de khdemlidaba se escriben a mano en `content_md`) | **Retirar** (pregunta 7) |

### 3.4 Triggers de `dquxsethatxtptfviiwd` que llaman a funciones

| Trigger | Tabla | Función SQL | Llama a | Nota |
|---|---|---|---|---|
| `trg_notify_new_ticket` | `tickets` | `notify_new_ticket()` | `…/functions/v1/notify-new-ticket` | URL y clave anon en el cuerpo de la función |
| `trg_notify_send_push` | `messages` | `notify_send_push()` | `…/functions/v1/send-push` | URL en duro, timeout 3 s |

Los otros 3 triggers de `public` (`trg_clean_message_names`, `trg_enforce_message_block`, `trg_fill_ticket_identity`) no llaman a nada externo. `pg_net` está instalado; `pg_cron` no (tampoco en khdemlidaba: la programación es 100 % Vercel Cron).

---

## 4. Cadena de disparo en khdemlidaba (lo que hay que reproducir en la base de misautonomos)

### 4.1 Triggers pg_net desplegados (11)

| Trigger | Tabla | Función SQL | `kind` enviado | Edge destino |
|---|---|---|---|---|
| `users_notify_admin` | `users` | `tg_users_notify_admin` | `new_signup` | `notify-admin` |
| `pp_notify_admin` | `professional_profiles` | `tg_pp_notify_admin` (sólo al pasar `published` a true) | `profile_published` | `notify-admin` |
| `contact_events_notify_admin` | `contact_events` | `tg_contact_events_notify_admin` | `contact_click_now` | `notify-admin` |
| `contact_messages_notify_admin` | `contact_messages` | `tg_contact_messages_notify_admin` | `contact_message` | `notify-admin` |
| `demandes_notify_admin` | `demandes` | `tg_demandes_notify_admin` | `demande_created` | `notify-admin` |
| `candidatures_notify_admin` | `candidatures` | `tg_candidatures_notify_admin` | `candidature_created` | `notify-admin` |
| `reviews_notify_admin` | `reviews` | `tg_reviews_notify_admin` | `new_review` | `notify-admin` |
| `trg_reviews_alert_low_rating` | `reviews` | `tg_reviews_alert_low_rating` (rating ≤ 2) | `review_low` | `notify-admin` |
| `trg_reports_alert_new` | `reports` | `tg_reports_alert_new` | `signalement` | `notify-admin` |
| `trg_system_failures_alert` | `system_failures` | `tg_system_failures_alert` | `system_failure` | `notify-admin` |
| `trg_notifications_push` | `notifications` | `fire_push_apns` | — (title/body/url/tokens) | `push-apns` |

Además, sin trigger: `_promo_fire_mail(kind, order_id)` → `promo-mail` (desde `promo_create_order`, `promo_create_job_order`, `promo_mark_paid`, `admin_website_request_update`), `website_request_submit` → `fire_notify_admin('website_request')`, y el contador de "nadie descuelga" → `fire_notify_admin('pro_no_answer')`. `promo_update` lo dispara la base al cambiar de estado una orden.

### 4.2 Cómo encuentran la URL y la clave: `internal_config`

`fire_notify_admin`, `_promo_fire_mail` y `fire_push_apns` leen dos filas de `public.internal_config`:
- `notify_admin_url` = `https://<ref>.supabase.co/functions/v1/notify-admin` (las otras funciones se derivan con `replace(…, 'notify-admin', 'promo-mail' | 'push-apns')`).
- `notify_admin_cron_key` = el mismo valor que el secreto `CRON_SECRET` de las edge functions (64 caracteres hoy).

**La migración `supabase/migrations/20260801200000_admin_notifications.sql:92` siembra la URL de khdemlidaba en duro** (`https://eiacoozyubxkbjwhgkml.supabase.co/functions/v1/notify-admin`). En misautonomos hay que sobrescribir las dos filas tras aplicar las migraciones; si no, los 10 triggers postearán al proyecto equivocado y, como cada `tg_*` envuelve el `perform` en `exception when others then null`, nadie se enterará.

Otras claves de `internal_config` que el código espera: `review_ip_salt` (64 hex) y las 7 `call_outcome_*` (`autopause`, `hash_ttl_days`, `max_answered`, `min_days`, `purged_at`, `threshold`, `window_days`). Las que NO se copian: `jcsecours_mail_sent`, 6 `relance_pro_<uuid>`, 22 `site_mail_<slug>` (cerrojos de correos ya enviados a clientes marroquíes).

### 4.3 Vercel Cron (8) → edge

`reminders` 01:00, `client-to-pro-reminders` 01:00, `daily-report` 07:00, `contact-clicks-digest` 20:00, `weekly-digest` lun 07:00, `monthly-digest` día 1 07:00, `diploma` 08:30, `demandes-purge` 02:15 (todo UTC; las horas se eligieron para Marruecos, UTC+1 fijo; en España con DST se mueven una hora en verano).

---

## 5. Secretos y configuración que el dueño tiene que proporcionar (sin valores)

### 5.1 Secretos de Supabase (`supabase secrets set` en `dquxsethatxtptfviiwd`)

| Secreto | Obligatorio | Lo usan | Quién lo da / cómo se obtiene |
|---|---|---|---|
| `CRON_SECRET` | **sí** | 15 edge functions, 8 crons de Vercel, `internal_config.notify_admin_cron_key` | Generar uno nuevo y aleatorio; **el mismo valor en los tres sitios** |
| `RESEND_API_KEY` | **sí** | 11 funciones que envían correo | Probablemente ya existe en el proyecto (lo usan hoy `contact-professional`, `notify-new-ticket`, `send-newsletter`): confirmar. El dominio `misautonomos.es` debe estar verificado en Resend (hoy ya envían desde `hola@misautonomos.es`) |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | sí para que los avisos lleguen | `_shared/senders.ts` → `notify-admin` (10 de sus 14 kinds son sólo Telegram) | Crear un bot con @BotFather y un chat/grupo; sin ellos la función registra `missing TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID` en `admin_notifications.error` y no manda nada |
| `RESEND_WEBHOOK_SECRET` | sí (sin él `resend-webhook` responde 503) | `resend-webhook` | Crear el webhook en el panel de Resend apuntando a `https://dquxsethatxtptfviiwd.supabase.co/functions/v1/resend-webhook` (eventos de entrega/rebote/queja/supresión); Resend da el `whsec_…` |
| `EMAIL_DAILY_CAP` | opcional (2.500 por defecto) | `senders.ts`, `send-reminders`, `relance-fiche-pro` | Ajustar al plan Resend de misautonomos |
| `RESEND_TO` | opcional | `notify-admin` kind `contact_message` | Buzón que recibe los mensajes del formulario; sin él el código usa `bonjour@khdemlidaba.ma` → cambiar el valor por defecto a `hola@misautonomos.es` |
| `DEMANDES_MAX_PURGE` | opcional (500) | `demandes-purge` | — |
| `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_BUNDLE_ID`, `APNS_KEY_P8`, `APNS_HOST` | sólo con app iOS | `push-apns` | Cuenta Apple Developer de misautonomos (clave `.p8`, team id, bundle id propio). Los valores del comentario de `push-apns/index.ts` son de la app de khdemlidaba y no sirven |
| `DIPLOMA_BATCH`, `EMAIL_DAILY_LIMIT` | sólo con `diploma-tick` | `diploma-tick` | — |
| `PAYMENT_PROVIDER`, `YOUCANPAY_PRIVATE_KEY`, `YOUCANPAY_MODE` | **no poner** | `promo-checkout`, `promo-webhook` | SKIP |
| `DEEPL_API_KEY`, `STRIPE_SECRET_KEY` | retirar | `translate`, `createCheckoutSession` | Sobran tras el trasplante |

### 5.2 Variables de Vercel (proyecto misautonomos.es)

- **Crear**: `CRON_SECRET` (mismo valor que en Supabase).
- **Conservar**: `SUPABASE_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (opcional añadir `SUPABASE_ANON_KEY` y `VITE_SITE_URL`).
- **Retirar después del corte**: `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `RESEND_FROM_NAME`, `RESEND_FROM_EMAIL`, `VITE_STRIPE_PUBLIC_KEY`. (`VITE_APP_URL`: lo decide la capa cliente.)

### 5.3 Filas de configuración en la base (no son secretos, pero sin ellas nada se dispara)

- `internal_config.notify_admin_url` = `https://dquxsethatxtptfviiwd.supabase.co/functions/v1/notify-admin`
- `internal_config.notify_admin_cron_key` = `CRON_SECRET`
- `internal_config.review_ip_salt` = 64 hex aleatorios
- `internal_config.call_outcome_*` (7 valores; copiar los de khdemlidaba)
- `promo_settings` (`bank_holder`, `bank_iban`, `bank_bic`…) si se mantienen las ofertas de pago por transferencia: sin RIB/titular, `promo-mail` envía las instrucciones "sin coordenadas" y no marca `instructions_mailed_at`.
- `users.is_admin` + `admin_notifications_enabled` en el usuario del dueño: todos los informes y avisos por email se dirigen a `users where is_admin` (khdemlidaba tiene 2 admins).

### 5.4 Fuera de código

- Resend: dominio `misautonomos.es` verificado (remitente que sustituye a `bonjour@khdemlidaba.ma` en 19 ficheros) y el webhook de §5.1.
- Telegram: bot + chat.
- Apple: sólo si hay app (clave APNs, `apple-app-site-association`).

---

## 6. Riesgos concretos del trasplante (de mayor a menor)

1. **Avisos mudos por `internal_config`**: la migración siembra `notify_admin_url` con el ref de khdemlidaba. Si no se reescriben `notify_admin_url` y `notify_admin_cron_key`, los 10 triggers y `_promo_fire_mail` postearán a khdemlidaba con una clave inválida (401) y los `exception when others then null` lo esconderán.
2. **CSP con el ref antiguo**: el header `Content-Security-Policy` de `vercel.json` cita `eiacoozyubxkbjwhgkml.supabase.co` 3 veces; copiado tal cual, la web de misautonomos no podrá ni llamar a Supabase (`connect-src`) ni mostrar imágenes del Storage (`img-src`).
3. **`CRON_SECRET` en tres sitios**: Vercel env, secreto de Supabase e `internal_config`. Un valor distinto en cualquiera = 8 crons en 401 y pg_net fallando en silencio.
4. **71 referencias a `khdemlidaba.ma` en 19 ficheros de servidor** (remitente, `APP_URL`, `/desabonner`, `ORIGINS` de CORS en `promo-checkout`/`promo-mail`, `wa.me`, enlaces de correos): un olvido = correos de misautonomos que llevan a khdemlidaba, y CORS rechazando `misautonomos.es`.
5. **SEO y rutas**: `prerender.js` + 21 rewrites asumen rutas en francés (`/professionnel`, `/ville`, `/metier`, `/recherche`, `/en-ligne`, `/demandes`, combo métier-ville) y 2 locales (fr raíz + `/ar`). misautonomos tiene indexadas `/autonomo/:cat-en-:ciudad/:slug`, `/categoria/:cat/:ciudad`, `/buscar` y 21 redirects legacy en su `vercel.json`. Sin un plan de 301 y sin ampliar el prerender a `es` (+ los otros 5), la réplica pierde el posicionamiento actual.
6. **`rehostMedia`/`rehostUrls` siguen desplegadas** con `verify_jwt=false` y un token fijo en el código: cualquiera que conozca el token escribe en el bucket `uploads`. Retirarlas no depende del trasplante.
7. **Supresión de rebotes**: sin `RESEND_WEBHOOK_SECRET` + webhook, `record_email_delivery_event` nunca recibe nada y `email_recipient_allowed` deja pasar direcciones muertas; la primera relance masiva compromete la reputación del dominio.
8. **Telegram ausente** = 10 de 14 kinds de `notify-admin` no llegan a nadie (sólo quedan en `admin_notifications`).
9. **Funciones que desaparecen respecto a hoy** y que el dueño puede no esperar: email al autónomo por cada contacto (`contact-professional`), tickets de soporte, newsletter (0 suscriptores), mensajería interna + push Expo, planes/suscripciones Stripe (20 filas en `subscriptions`), outreach de leads (`lead-convert`/`lead-opt-out`), autoposter de blog con Anthropic.
10. **Build de Vercel**: `npm run build` encadena 12 pasos, dos de ellos marroquíes (`build:louay`, `verify-ios-entitlements`) y dos que leen Supabase en build (`generate-sitemap.js`, `inject-home.mjs` ejecuta `api/prerender.js`). Si faltan variables o se dejan los pasos marroquíes, la build falla antes de desplegar nada.
11. **Zona horaria**: `daily-report` y `promo-mail` formatean fechas en `Africa/Casablanca`; los crons están en UTC pensados para UTC+1 fijo. Menor, pero visible en los correos.

---

## 7. Preguntas que sólo el dueño puede responder

1. **Rutas**: ¿se mantienen las rutas francesas de khdemlidaba (`/professionnel`, `/ville`, `/metier`, `/recherche`, `/en-ligne`, `/demandes`, `/creation-site-web`) o se traducen al español? Afecta a `vercel.json` (27 rewrites), a `prerender.js` y a más de 30 enlaces en duro dentro de los correos.
2. **Idiomas en el servidor**: el prerender sólo sabe FR (raíz) y AR (`/ar`). ¿Se prerenderiza sólo ES, ES + EN, o los 6? ¿Y de dónde salen los 5 diccionarios no-ES si `translate`/DeepL se retira (khdemlidaba usa JSON estáticos)?
3. **Telegram**: ¿bot y chat nuevos para misautonomos, o reutilizar los de khdemlidaba (mezclaría los avisos de los dos negocios)?
4. **App nativa**: ¿habrá app iOS/Android de misautonomos? Decide `push-apns`, los 5 secretos `APNS_*`, el bundle id y los ficheros `.well-known`.
5. **Control de titulación** (`diploma-tick`): ¿se aplica en España (colegiación de enfermería/fisioterapia u otros oficios) y con qué textos legales? Si no, se despliega apagada.
6. **Ofertas de pago** (post Instagram 150 DH, perfil destacado 50 DH, oferta de empleo 200 DH, pago por transferencia): ¿se replican en euros con una cuenta bancaria española en `promo_settings`? ¿Se quiere pasarela de tarjeta (la actual es YouCan Pay, sólo Marruecos)?
7. **Lo que desaparece**: contacto por email al autónomo, tickets, newsletter, mensajería interna, suscripciones Stripe, outreach de leads, autoposter de blog. ¿Alguna de estas siete tiene que sobrevivir fuera de la réplica?
8. **Correo**: remitente y buzón de respuesta (`hola@misautonomos.es` ya está en uso), y quién es "admin" (`users.is_admin`) para recibir informes y alertas.
9. **Campañas one-shot** (`annonce-offres`, `bilan-deux-mois`, `demande-avis`, `send-jcsecours`, `diplome-casa`): ¿se guardan en el repo como plantillas sin desplegar, o se descartan?
