# 10 — Dependencias vivas de misautonomos.es

Qué necesita HOY la web en producción para funcionar, y qué se rompe exactamente
en cada paso de la ventana de transición al trasplantar el código de
khdemlidaba y aplicar su esquema sobre el proyecto Supabase
`dquxsethatxtptfviiwd`.

Fase de **sólo lectura**: no se ha modificado código ni base de datos. Todo el
SQL ejecutado ha sido `select` / `pg_get_functiondef`. Código de misautonomos
leído del árbol de trabajo (`/Users/bigseo/Desktop/misaut-nomos`, rama `main`,
HEAD `2fe07a7`); khdemlidaba leído del estado commiteado (HEAD `794e657`).

---

## 0. Cifras de partida (medidas, no estimadas)

### Base de datos `dquxsethatxtptfviiwd` (misautonomos)

| Concepto | Número |
|---|---|
| Tablas en `public` | **52** |
| Tablas que el código vivo lee o escribe | **22** |
| Tablas que ninguna línea de código toca | **30** |
| Políticas RLS en `public` | **137** sobre **51** tablas |
| Tabla con RLS activado y **0 políticas** | **1** (`translations`, 469 filas, inaccesible desde el navegador) |
| Funciones SQL en `public` (plpgsql + sql) | **21** |
| De ellas, que nombran tablas de `public` | **16** |
| Triggers en `public` | **5** (sobre `messages`, `tickets`) |
| Triggers en `auth` | **1** (`on_auth_user_created` sobre `auth.users`) |
| Event triggers propios | **1** (`ensure_rls` → `rls_auto_enable`) |
| Edge functions desplegadas | **11** |
| Edge functions que el código invoca y **no existen** | **15** |
| Claves foráneas en `public` | **1** (`users.auth_user_id → auth.users(id) ON DELETE SET NULL`) |
| Vistas en `public` | **0** |
| Buckets de Storage | **1** (`uploads`, público) |
| Jobs de `pg_cron` | **0** (la extensión no está instalada) |
| Crons de Vercel declarados en `vercel.json` | **0** |

### Datos

| Tabla | Filas |
|---|---|
| `users` | **92** (de ellos **35** con `auth_user_id`) |
| `auth.users` | **35** |
| `professional_profiles` | **47** (los **47** con `visible_en_busqueda=true` y `onboarding_completed=true`) |
| …de esos perfiles, cuyo usuario tiene cuenta auth | **27** → **20 perfiles sin cuenta auth** |
| `service_categories` | **17** |
| `blog_posts` | **25** |
| `reviews` | **3** |
| `review_requests` | **2** |
| `messages` | **10** |
| `profile_metrics` | **2.002** |
| `subscriptions` | **20** |
| `payment_records` | **87** |
| `translations` | **469** |
| `identity_verifications` | **5** |
| `tickets` | **3** |
| `cookie_consents` | **1** |
| `notifications` | **1** |
| `invoicing_settings` | **1** |

Las 30 tablas restantes están a **0 filas**.

---

## 1. (a) Tablas que el código vivo lee o escribe

Ruta del acceso: `src/api/base44Client.js` traduce `base44.entities.<Entidad>`
a tabla con el `TABLE_MAP` (47 entradas, líneas 9–56) y hace `select *` +
filtrado en JS. `base44.auth.*` toca siempre `users`.

### Por entidad del TABLE_MAP (22 tablas tocadas)

| Tabla | Páginas / componentes que la usan | Escribe |
|---|---|---|
| `users` | `src/pages/AdminDashboard.jsx` (list), `src/pages/AdminUsuarios.jsx` (list+update), `src/pages/AdminTickets.jsx` (filter), `src/pages/Autonomo.jsx` (filter), `src/pages/Favorites.jsx` (filter), `src/pages/Search.jsx` (filter), `src/components/admin/CampaignBlogPlataformasV1.jsx`, `CampaignRepescaV1.jsx`, `CampaignWinbackV1.jsx` (filter+update). Vía `base44.auth.me()` la tocan **22 ficheros** más; vía `base44.auth.updateMe()` **7** (`src/Layout.jsx`, `src/pages/MyProfile.jsx`, `ClientOnboarding.jsx`, `Notifications.jsx`, `ProfileOnboarding.jsx`, `src/components/profile/ProfilePictureUpload.jsx`) | **sí** |
| `professional_profiles` | `src/Layout.jsx:254`, `src/lib/AppContext.jsx:29`, `src/pages/Search.jsx:107`, `Categoria.jsx:125`, `Autonomo.jsx:95`, `ProfessionalProfile.jsx`, `Favorites.jsx`, `Login.jsx`, `UserTypeSelection.jsx`, `AdminDashboard.jsx`, `AdminUsuarios.jsx` (update), `MyProfile.jsx` (create+update), `ProfileOnboarding.jsx` (create+update), `src/components/profile/ProfilePictureUpload.jsx` (update), `ReviewSection.jsx` (update), `src/components/tickets/CreateTicketDialog.jsx` | **sí** |
| `service_categories` | `src/components/home/HeroSearch.jsx`, `src/components/profile/ProfileBreadcrumb.jsx`, `src/pages/Categoria.jsx:93`, `MyProfile.jsx`, `ProfileOnboarding.jsx` | no |
| `favorites` | `src/pages/Search.jsx`, `Categoria.jsx`, `Autonomo.jsx`, `Favorites.jsx` | **sí** |
| `reviews` | `src/components/profile/ReviewSection.jsx` (create+update), `src/pages/Autonomo.jsx`, `MisValoraciones.jsx`, `MyProfile.jsx` | **sí** |
| `messages` | `src/pages/AdminDashboard.jsx` (list), `src/pages/MisValoraciones.jsx` (filter) | no |
| `notifications` | `src/components/notifications/NotificationCenter.jsx`, `src/pages/Notifications.jsx` | **sí** |
| `blog_posts` | `src/pages/AdminBlog.jsx` (CRUD completo), `BlogList.jsx`, `BlogPost.jsx` (update de contador) | **sí** |
| `tickets` | `src/pages/AdminSoporte.jsx`, `AdminTickets.jsx`, `Soporte.jsx`, `SoporteTicket.jsx`, `src/components/support/PublicTicketForm.jsx`, `src/components/tickets/CreateTicketDialog.jsx` | **sí** |
| `ticket_messages` | `src/pages/AdminSoporte.jsx`, `AdminTickets.jsx`, `SoporteTicket.jsx` | **sí** |
| `ticket_events` | `src/pages/AdminSoporte.jsx`, `AdminTickets.jsx`, `SoporteTicket.jsx`, `src/components/tickets/CreateTicketDialog.jsx` | **sí** |
| `newsletter_subscribers` | `src/components/NewsletterSignup.jsx`, `src/lib/newsletterAutoSubscribe.js`, `src/pages/AdminDashboard.jsx`, `AdminNewsletter.jsx`, `BajaNewsletter.jsx`, `EmailUnsubscribe.jsx` | **sí** |
| `cookie_consents` | `src/components/CookieBanner.jsx`, `src/pages/CookiePreferences.jsx` | **sí** |
| `identity_verifications` | `src/components/verification/IdentityVerificationWidget.jsx` (create+update), `src/components/profile/ReviewSection.jsx` | **sí** |
| `profile_metrics` | `src/pages/AdminDashboard.jsx` (filter) — y el RPC `track_profile_metric` desde `src/lib/trackMetric.js` | sí (vía RPC) |
| `subscriptions` | `src/lib/AppContext.jsx:30` | no |
| `email_logs` | `src/components/admin/AdminEmailsPanel.jsx`, `CampaignMetrics.jsx` | no |
| `outbound_leads` | `src/pages/AdminOutreachWhatsApp.jsx` (filter+update) | **sí** |
| `invoices` | `src/pages/Notifications.jsx` (filter) | no |
| `quotes` | `src/pages/Notifications.jsx` (filter) | no |
| `tasks` | `src/pages/Notifications.jsx` (filter) | no |
| `review_requests` | sólo vía RPC (`src/lib/reviewRpc.js`, `src/pages/LeaveReview.jsx`, `ProfessionalDashboard.jsx`) | sí (vía RPC) |

### Por `supabase.from(...)` directo (3 sitios, saltándose el adaptador)

| Fichero:línea | Tabla | Operación |
|---|---|---|
| `src/lib/contactProfessional.js:33-37` | `users` | select por `auth_user_id` |
| `src/pages/Soporte.jsx:76-80` | `users` | select `id` por `auth_user_id` |
| `src/pages/Soporte.jsx:104-108` | `tickets` | **insert** |

### Por funciones serverless de Vercel (`/api`, no pasan por el adaptador)

| Fichero:línea | Tabla | Clave usada |
|---|---|---|
| `api/baja.js:37` | `users` | `SUPABASE_SERVICE_ROLE_KEY` (salta RLS) |
| `api/lead-convert.js:45` | `outbound_leads` | service role |
| `api/lead-opt-out.js:30` | `outbound_leads` | service role |
| `api/sitemap.xml.js:95,101,105` | `professional_profiles`, `service_categories`, `blog_posts` | anon key |
| `api/cron/weekly-post.js:136,151` | `blog_posts`, **`blog_topic_queue`** | service role |

`api/notify-admin.js` no toca la base (sólo Resend).

**Hallazgo**: `blog_topic_queue` **no existe** en la base
(`to_regclass('public.blog_topic_queue')` → `null`). La migración
`supabase/migrations/20260629120000_blog_topic_queue.sql` nunca se aplicó. Da
igual en la práctica: no hay ningún cron declarado en `vercel.json` ni en
`pg_cron`, así que `api/cron/weekly-post.js` es **código muerto**.

### Las 30 tablas que NINGÚN código toca

`admin_alerts`, `ads_briefings`, `automation_executions`, `blocks`,
`client_activities`, `client_contacts`, `client_insights`, `crm_automations`,
`faqs`, `follow_up_reminders`, `free_month_grants`, `invoice_templates`,
`invoicing_settings`, `jobs`, `payment_records`, `plan_audit_logs`,
`project_phases`, `project_tasks`, `projects`, `push_tokens`,
`quote_requests`, `redirect_logs`, `referrals`, `reports`, `resend_events`,
`saved_searches`, `subscription_plans`, `time_logs`, `translations`,
`trial_usage_logs`.

Matices que importan para el trasplante:

- `blocks` **sí** se usa, pero sólo desde el trigger
  `trg_enforce_message_block` sobre `messages`. No hay UI para bloquear.
- `push_tokens` se usa desde la edge function `send-push`, no desde el front
  (el front tiene `src/config/onesignal.js` y `src/services/onesignalService.js`
  — dos sistemas de push distintos conviviendo).
- `payment_records` (87 filas) y `subscription_plans` (4) son datos reales que
  nadie enseña: las pantallas de precios/suscripción se retiraron
  (`vercel.json` redirige `/precios` y `/suscripcion`).
- `translations` (469 filas) está con RLS activado y **cero políticas**: ni
  `anon` ni `authenticated` pueden leerla. La i18n real vive en los JSON de
  `src/i18n/locales/`.

---

## 2. (b) RPC y edge functions que invoca el código

### RPC de Postgres (5 llamadas, 5 funciones distintas)

| Fichero:línea | RPC | Existe | Grants EXECUTE |
|---|---|---|---|
| `src/lib/reviewRpc.js:8` | `create_review_request(p_conversation_id, p_client_id)` | sí | authenticated, service_role |
| `src/lib/reviewRpc.js:17` | `get_review_request(p_token)` | sí | authenticated, anon, service_role |
| `src/lib/reviewRpc.js:34` | `submit_review(p_token, p_rating, …)` | sí | authenticated, anon, service_role |
| `src/lib/trackMetric.js:35` | `track_profile_metric(p_professional_id, p_type)` | sí | authenticated, anon, service_role |
| `src/pages/ProfessionalDashboard.jsx:52` | `get_my_dashboard()` | sí | authenticated, service_role |

`get_pro_visibility()` y `get_admin_stats(date,date)` existen en la base pero
**ninguna línea del código commiteado las llama**. `get_pro_visibility` está
concedida a `anon` y devuelve métricas del profesional logueado — inocua
porque exige `auth.uid()`, pero conviene no arrastrarla sin revisar.

### Edge functions desplegadas (11)

`createCheckoutSession`, `syncStripeSubscription`, `getStripeInvoices`,
`rehostMedia`, `rehostUrls`, `translate`, `send-newsletter`,
`contact-professional`, `notify-new-ticket`, `delete-account`, `send-push`.

Quién las llama:

| Function | Invocada desde |
|---|---|
| `contact-professional` | `src/lib/contactProfessional.js:56` (y `src/components/GuestContactModal.jsx`, `ProfessionalCard.jsx` indirectamente) |
| `send-newsletter` | `src/pages/AdminNewsletter.jsx:57` |
| `delete-account` | `src/components/account/DeleteAccountButton.tsx:37` (montado en `src/pages/MyProfile.jsx:759`) |
| `notify-new-ticket` | **sólo** desde el trigger `trg_notify_new_ticket` (`net.http_post`) |
| `send-push` | **sólo** desde el trigger `trg_notify_send_push` (`net.http_post`) |
| `createCheckoutSession`, `syncStripeSubscription`, `getStripeInvoices`, `rehostMedia`, `rehostUrls`, `translate` | **nadie** (huérfanas) |

### Edge functions que el código invoca y NO están desplegadas (15)

Todas estas llamadas fallan hoy en producción. En la mayoría de sitios el
error va dentro de un `try/catch` silencioso, así que la función
simplemente **no hace nada** y nadie se enteró.

| Nombre invocado | Desde |
|---|---|
| `sendNewsletterWelcome` | `src/components/Footer.jsx:105`, `src/components/NewsletterSignup.jsx:59` |
| `sendAndLog` | `src/components/admin/AdminEmailsPanel.jsx:113`, `CampaignWinbackV1.jsx:143`, `CampaignBlogPlataformasV1.jsx:122,176`, `CampaignRepescaV1.jsx:99,132` |
| `sendTicketNotification` | `src/components/tickets/CreateTicketDialog.jsx:83,92`, `src/pages/AdminTickets.jsx:140` |
| `getCampaignAudience` | `src/components/admin/CampaignRepescaV1.jsx:86` |
| `backfillEmailStatusFromResend` | `src/components/admin/CampaignMetrics.jsx:142` |
| `resolveLegacySlug` | `src/pages/Autonomo.jsx:142`, `src/pages/Categoria.jsx:115` |
| `contactForm` | `src/pages/Contacto.jsx:33` |
| `applyReferral` | `src/pages/ProfileOnboarding.jsx:445` |
| `generateReferralCode` | `src/pages/ProfileOnboarding.jsx:459` |
| `deleteUser` | `src/pages/MyProfile.jsx:395` |
| `sendEmail` | `src/api/base44Client.js:287` ← `Core.SendEmail`, usado en `src/components/profile/ReviewSection.jsx:294`, `src/components/support/PublicTicketForm.jsx:82` |
| `sendSMS` | `src/api/base44Client.js:288` (nadie lo usa) |
| `invokeLLM` | `src/api/base44Client.js:289` ← `Core.InvokeLLM`, usado en `src/components/profile/useProfileTranslation.jsx:50` |
| `generateImage` | `src/api/base44Client.js:290` (nadie lo usa) |
| `extractData` | `src/api/base44Client.js:291` (nadie lo usa) |

Consecuencias reales que esto ya tiene (no son regresiones del trasplante,
son cosas que hoy **no funcionan** y conviene no «replicar»):

- Los perfiles **nunca se traducen**: `useProfileTranslation` llama a
  `invokeLLM`, que no existe.
- El formulario de contacto (`/contacto`) **no envía nada**.
- El correo de bienvenida de la newsletter **no sale**.
- Las notificaciones de ticket por email **no salen**.
- Las tres campañas de email del admin **no envían**.
- El botón «eliminar cuenta» de `MyProfile.jsx:395` llama a `deleteUser`
  (inexistente); el que sí funciona es `DeleteAccountButton.tsx` →
  `delete-account`. Hay dos caminos y sólo uno vivo.

`base44.integrations.Core.UploadFile` **sí** funciona: no es una edge
function, sube directo al bucket `uploads` (`src/api/base44Client.js:276-286`).
Lo usan 6 sitios (`CreateTicketDialog`, `BlogPostEditor`,
`IdentityVerificationWidget` ×3, `PortfolioSection`, `ProfilePictureUpload`,
`ProfileOnboarding`).

**No hay realtime en uso**: el adaptador expone `entity.subscribe()`
(`src/api/base44Client.js:160-174`) pero ninguna página lo llama.

---

## 3. (c) Funciones SQL de `public` y las tablas que nombran

Las **16** funciones que citan tablas de `public` por nombre. Al renombrar las
tablas a `legacy_*` (o moverlas de esquema) **todas** hay que reescribirlas, o
apuntarán a las tablas NUEVAS con la forma antigua y fallarán — en algunos
casos en silencio, en otros borrando datos.

| Función | Firma | SECURITY DEFINER | Tablas que nombra |
|---|---|---|---|
| `is_admin` | `()` | sí | `users` |
| `current_app_user_id` | `()` | sí | `users` |
| `current_app_user_email` | `()` | sí | `users` |
| `prettify_name` | `(p text)` | no | `users` |
| `handle_new_user` | `()` trigger | sí | `users` |
| `handle_auth_user_link` | `()` trigger | sí | `users` |
| `fill_ticket_identity` | `()` trigger | sí | `users` (+ `prettify_name`, `current_app_user_id`) |
| `enforce_message_block` | `()` trigger | sí | `blocks` |
| `track_profile_metric` | `(p_professional_id text, p_type text)` | sí | `profile_metrics` |
| `create_review_request` | `(p_conversation_id text, p_client_id text)` | sí | `review_requests` |
| `get_review_request` | `(p_token text)` | sí | `review_requests`, `professional_profiles` |
| `submit_review` | `(p_token text, p_rating numeric, …8 args)` | sí | `review_requests`, `reviews`, `professional_profiles` |
| `get_my_dashboard` | `()` | sí | `professional_profiles`, `users`, `profile_metrics`, `messages`, `review_requests` |
| `get_pro_visibility` | `()` | sí | `professional_profiles`, `profile_metrics`, `messages` |
| `get_admin_stats` | `(p_from date, p_to date)` | sí | `users`, `professional_profiles`, `profile_metrics`, `messages`, `reviews`, `blog_posts`, `newsletter_subscribers` |
| `delete_account` | `(p_uid uuid)` | sí | `users`, `professional_profiles`, `profile_metrics` + **recorrido dinámico de `information_schema`** |

Las **5** que no nombran ninguna tabla: `clean_message_names`,
`handle_updated_at`, `notify_new_ticket`, `notify_send_push`,
`rls_auto_enable`.

### Tres funciones con trampa — leer antes de renombrar nada

**1) `delete_account(uuid)` es DINÁMICA y borrará las tablas `legacy_*`.**

No tiene las tablas escritas a mano: recorre `information_schema.columns` de
`public` buscando columnas llamadas `user_id`, `creator_id`, `sender_id`,
`recipient_id`, `professional_id`, `client_id`, `owner_id`, `created_by`, y
hace `delete from public.<tabla> where <col> = <id>` en **todas** menos las de
una lista de exclusión literal:

```
v_exclude text[] := array['users','payment_records','invoices','invoice_templates',
  'invoicing_settings','plan_audit_logs','email_logs','resend_events',
  'redirect_logs','subscription_plans','service_categories','translations'];
```

Si las tablas pasan a llamarse `legacy_payment_records`, `legacy_invoices`,
etc., **la lista de exclusión deja de coincidir** y la próxima ejecución de
«eliminar mi cuenta» borrará filas de las tablas de retención legal de
facturación. Además el `for` las encontrará junto con las nuevas, así que
borrará en los dos esquemas a la vez. El `exception when others then null`
interno hace que nadie vea el error.

→ `delete_account` debe reescribirse (o deshabilitarse: revocar el EXECUTE de
`service_role`, que es el único que lo tiene) **en la misma migración que el
renombrado**, no después.

**2) El event trigger `ensure_rls` activará RLS en TODAS las tablas nuevas.**

`rls_auto_enable()` se dispara en `ddl_command_end` para `CREATE TABLE` en
`public` y ejecuta `alter table … enable row level security`. Al aplicar el
esquema de khdemlidaba, sus ~41 tablas nacerán con **RLS activado y sin
políticas** si la migración no las crea en el mismo paso → todo bloqueado
para `anon` y `authenticated`, con error silencioso (`[]` en lugar de datos).

→ O el esquema trae sus políticas en el mismo fichero de migración, o se
desactiva `ensure_rls` mientras se aplica. Es exactamente lo que ya le pasó a
`translations`: RLS activado, cero políticas, 469 filas invisibles.

**3) `handle_auth_user_link()` cuelga de `auth.users` y rompe los registros.**

Es `AFTER INSERT ON auth.users` y hace `update public.users …` +
`insert into public.users (id, auth_user_id, email, full_name, role)`. En el
momento en que `public.users` pase a ser la tabla NUEVA (id uuid, sin columna
`auth_user_id`), el insert fallará → **el insert en `auth.users` se revierte**
→ **ningún usuario nuevo podrá registrarse**, ni por email ni por Google.

→ Hay que reescribir este trigger en la misma transacción que el renombrado.
No es «se degrada»: es un 500 en el registro.

---

## 4. (d) Triggers vivos

| Esquema.tabla | Trigger | Momento / evento | Función | Qué hace |
|---|---|---|---|---|
| `public.messages` | `trg_clean_message_names` | BEFORE INSERT/UPDATE, ROW | `clean_message_names` | normaliza `sender_name`, `client_name`, `professional_name` vía `prettify_name` (que lee `users`) |
| `public.messages` | `trg_enforce_message_block` | BEFORE INSERT, ROW | `enforce_message_block` | consulta `blocks`; `raise exception` si hay bloqueo |
| `public.messages` | `trg_notify_send_push` | AFTER INSERT, ROW | `notify_send_push` | `net.http_post` → edge function `send-push` |
| `public.tickets` | `trg_fill_ticket_identity` | BEFORE INSERT, ROW | `fill_ticket_identity` | rellena `creator_id`/`user_id`/`creator_name`/`creator_email`/`status` leyendo `users` |
| `public.tickets` | `trg_notify_new_ticket` | AFTER INSERT, ROW | `notify_new_ticket` | `net.http_post` → edge function `notify-new-ticket` (con la anon key **hardcodeada** en el cuerpo de la función) |
| `auth.users` | `on_auth_user_created` | AFTER INSERT, ROW | `handle_auth_user_link` | crea/vincula la fila de `public.users` |

Event triggers propios: `ensure_rls` (ddl_command_end → `rls_auto_enable`).
Los otros 6 event triggers son de Supabase (`pgrst_*`, `issue_pg_*`,
`issue_graphql_placeholder`) y no se tocan.

Dependencia de extensión: los dos `notify_*` usan `pg_net` (instalado,
v0.20.0). El esquema nuevo debe conservarla.

---

## 5. (e) Políticas RLS por tabla

137 políticas sobre 51 tablas. **Al renombrar una tabla las políticas
viajan con ella** (van ligadas al OID, no al nombre), igual que los índices,
los triggers y la única FK. No hay que recrearlas: hay que saber que seguirán
vivas sobre la tabla `legacy_*` y que las referencias a `current_app_user_id()`
e `is_admin()` dentro de ellas seguirán resolviéndose contra **la función**, y
la función contra **`public.users`** — que ya será la tabla nueva. Ahí está la
rotura: las políticas sobrevivirán sintácticamente y dejarán de autorizar a
nadie.

El patrón es uniforme. Cuatro familias:

**1. Catálogo público (lectura abierta, escritura sólo admin)** — 2 políticas cada una:
`service_categories`, `subscription_plans`, `blog_posts`, `faqs` —
`SELECT: true` + `ALL: is_admin()`.
`professional_profiles` y `reviews` son variantes de esto: `SELECT: true`,
`INSERT: auth.uid() is not null`, `UPDATE` del dueño, `DELETE` sólo admin.

**2. Propiedad por `current_app_user_id()`** — el bloque más grande. 4 políticas
(select/insert/update/delete) o 1 política `ALL`:

| Tabla | Columna de propiedad | Políticas |
|---|---|---|
| `favorites`, `follow_up_reminders` | `client_id` | 4 |
| `notifications`, `cookie_consents`, `identity_verifications`, `payment_records`, `subscriptions`, `saved_searches`, `time_logs` | `user_id` | 4 / 1 |
| `profile_metrics`, `tasks`, `jobs`, `client_contacts`, `client_activities`, `client_insights`, `crm_automations`, `automation_executions`, `invoice_templates`, `invoicing_settings`, `ads_briefings` | `professional_id` | 4 / 1 |
| `messages` | `sender_id` / `recipient_id` | 4 |
| `quotes`, `quote_requests`, `projects` | `professional_id` + `client_id` | 4 |
| `invoices` | `professional_id` + `client_email = current_app_user_email()` | 4 |
| `referrals` | `referrer_id` / `referred_id` | 3 |
| `blocks`, `reports`, `push_tokens` | `blocker_id` / `reporter_id` / `user_id`, rol `authenticated` | 3 / 2 / 4 |

**3. Sólo admin** — 1 o 2 políticas: `admin_alerts`, `email_logs`,
`free_month_grants`, `outbound_leads`, `plan_audit_logs`, `trial_usage_logs`,
`redirect_logs`, `resend_events`, `newsletter_subscribers` (con
`INSERT: true` para que cualquiera se suscriba).

**4. Casos especiales a vigilar**:

- `users` (3 políticas): `SELECT`/`UPDATE` con `auth_user_id = auth.uid() OR is_admin()`.
  **Consecuencia viva**: `src/pages/Search.jsx:113-119` pide
  `User.filter({ id: { $in: userIds } })` para 47 perfiles y recibe **como
  máximo 1 fila** (la propia) o **0** si no hay sesión. `professionalUser`
  llega `undefined` a todas las tarjetas (`Search.jsx:360,377`). Lo mismo en
  `Favorites.jsx` y `Autonomo.jsx:186`. Ya está roto hoy.
- `tickets` (4 políticas): el `USING` acepta tanto `current_app_user_id()`
  como `auth.uid()::text` en `creator_id`/`user_id` — un parche para la doble
  identidad texto/uuid. El esquema nuevo lo hace innecesario.
- `review_requests` (2): `SELECT` sólo para `client_id` o admin. El
  profesional **no** puede leer sus propias solicitudes directamente; pasa por
  `get_my_dashboard()` (SECURITY DEFINER). Si esa función se rompe, el
  dashboard pierde el contador sin dar error.
- `ticket_messages` y `ticket_events`: `SELECT: true` — **cualquiera, sin
  sesión, puede leer todos los mensajes de soporte**. Es un agujero
  preexistente que conviene no replicar.
- `translations`: RLS activado, **0 políticas**.

---

## 6. (f) Flujo de auth actual y supervivencia de la sesión

### Cómo funciona hoy

```
src/api/supabaseClient.js
  createClient(dquxsethatxtptfviiwd, anon, {
    persistSession: true, autoRefreshToken: true, detectSessionInUrl: true,
    flowType: 'pkce',
    storageKey: 'misautonomos-auth'      ← CLAVE NO ESTÁNDAR
  })

src/lib/AuthContext.jsx
  refreshUser() → base44.auth.me()
                → currentAppUser()  (base44Client.js:181-215)
                    supabase.auth.getUser()
                    select * from users where auth_user_id = <auth uid>
                    si no hay fila → busca por email y rellena auth_user_id
                    si sigue sin haber → INSERT con id = genId() 24-hex
  + supabase.auth.onAuthStateChange(refreshUser)

src/lib/AppContext.jsx
  ProfessionalProfile.filter({ user_id: user.id })   ← user.id = id TEXTO de public.users
  Subscription.filter({ user_id: user.id, estado: 'activo' })

Login: /login (src/pages/Login.jsx)
  signInWithPassword / signUp / resetPasswordForEmail
  + base44.auth.loginWithGoogle() → signInWithOAuth({ provider: 'google' })
  redirectToLogin(cb) → window.location = /login?next=<url>   (NO dispara OAuth)
Nativo: src/lib/native/auth.js (signInWithOAuth google/apple + signInWithIdToken)
        src/lib/deepLinkAuth.ts (storage en Capacitor Preferences + exchangeCodeForSession)
```

### khdemlidaba, para comparar

`/Users/bigseo/khdemlidaba/src/lib/supabase.js:144-152`:

```js
createClient(url, key, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  global: { fetch: fetchWithAuthRetry },
})
```

**Sin `storageKey`** → clave por defecto `sb-<project-ref>-auth-token`.
**Sin `flowType`** → el de por defecto de `@supabase/supabase-js`.
Y la identidad es directa: `public.users.id` **ES** `auth.users.id` (uuid,
`FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE`), así que
`AuthContext.jsx:51` hace `.from('users').eq('id', uid)` sin tabla puente.

### ¿Sobrevive la sesión al cambio de cliente?

**No, si se trasplanta `src/lib/supabase.js` tal cual. Los 35 usuarios con
cuenta tendrán que volver a iniciar sesión.** Tres motivos independientes:

1. **La clave de localStorage cambia.** La sesión viva está guardada hoy bajo
   `misautonomos-auth`. El cliente de khdemlidaba, apuntado a
   `dquxsethatxtptfviiwd`, buscará `sb-dquxsethatxtptfviiwd-auth-token`. No lo
   encontrará → `getSession()` devuelve `null` → sesión perdida en silencio
   (sin mensaje: `AuthContext` pone `user = null` y la web se comporta como si
   el usuario nunca hubiera entrado). El refresh token sigue en el navegador,
   pero en una clave que nadie lee.

2. **`flowType` cambia de `pkce` al valor por defecto.** El `code_verifier` de
   PKCE se guarda en `${storageKey}-code-verifier`. Cualquier flujo a medias en
   el momento del despliegue (enlace de confirmación de email, de recuperación
   de contraseña, o un ida y vuelta de Google abierto en otra pestaña) se queda
   sin verificador y **falla**. Además el formato del callback cambia (`?code=`
   con PKCE frente a fragmento `#access_token=` sin él), lo que afecta a las
   Redirect URLs configuradas en el panel de Supabase Auth y a las plantillas
   de correo.

3. **`public.users.id` cambia de tipo y de significado.** Hoy es un texto de 24
   hex de Base44 y la unión con auth es la columna `auth_user_id`. En el
   esquema nuevo `id` es el uuid de `auth.users`. Aunque se arreglaran los dos
   puntos anteriores y la sesión JWT sobreviviera, `user.id` pasa a valer otra
   cosa y **todas** las referencias cruzadas de los datos migrados
   (`professional_profiles.user_id`, `favorites.client_id`,
   `messages.sender_id`/`recipient_id`, `reviews.professional_id`/`client_id`,
   `notifications.user_id`, `tickets.creator_id`, `subscriptions.user_id`,
   `profile_metrics.professional_id`, `review_requests.professional_id`…)
   tienen que reescribirse en el paso de migración de datos.

### Cómo evitar la desconexión masiva (es evitable, en los dos primeros puntos)

Si el dueño quiere que nadie pierda la sesión, el cliente trasplantado debe
**conservar** `storageKey: 'misautonomos-auth'` y `flowType: 'pkce'`. Son dos
líneas. El proyecto Supabase no cambia (`dquxsethatxtptfviiwd`), así que el
JWT sigue siendo válido: la sesión sobrevive con sólo mantener la clave.

Alternativa si se prefiere la clave estándar: un *shim* de una sola ejecución
en `main.jsx`, **antes** de crear el cliente, que copie
`localStorage['misautonomos-auth']` a
`localStorage['sb-dquxsethatxtptfviiwd-auth-token']` si el segundo no existe.
Funciona en web; en la app nativa (Capacitor Preferences,
`src/lib/deepLinkAuth.ts`) hace falta el equivalente, y ahí el usuario que no
actualice la app seguirá con el cliente viejo durante semanas.

El punto 3 (el id) **no** es evitable con un shim: es trabajo de migración de
datos.

### El bloqueo de verdad: 57 usuarios y 20 perfiles sin cuenta auth

En el esquema de khdemlidaba `users.id → auth.users(id)` y
`professional_profiles.user_id → users(id)`. Por tanto **una fila de `users`
no puede existir sin su fila en `auth.users`**, y un perfil profesional no
puede existir sin usuario.

Los números de hoy:

- `users` = 92, con `auth_user_id` = 35 → **57 usuarios sin cuenta auth**.
- `professional_profiles` = 47, cuyo usuario tiene auth = 27 → **20 perfiles
  (43 % del catálogo) cuelgan de usuarios que no existen en `auth.users`**.

Si no se toca `auth.users` (que es la premisa del plan), esos 20 perfiles
**no caben** en el esquema nuevo: o se relaja la FK, o se crean 20 filas en
`auth.users`, o esos 20 perfiles desaparecen del buscador. Son 20 de las 47
fichas que hoy indexa Google. Decisión del dueño, y hay que tomarla **antes**
del paso 3, porque condiciona el DDL.

---

## 7. Plan de ventana propuesto

### Elección previa: cómo aparcar el esquema viejo

**Opción A — renombrar a `legacy_*` dentro de `public`** (lo que pide el
enunciado). 52 `ALTER TABLE … RENAME TO`, más el `TABLE_MAP` del adaptador (47
entradas), más 3 `supabase.from` directos, más 5 ficheros de `/api`, más 16
funciones SQL. Mucha superficie, mucho sitio donde olvidarse de uno.

**Opción B — mover el esquema viejo a un esquema `legacy`** (recomendada).
`CREATE SCHEMA legacy;` + 52 `ALTER TABLE … SET SCHEMA legacy;` + 21
`ALTER FUNCTION … SET SCHEMA legacy;`. Del lado del código:

- `src/api/supabaseClient.js`: añadir `db: { schema: 'legacy' }` a
  `createClient`. **Una línea**, y el `TABLE_MAP` y los 3 `supabase.from`
  directos no se tocan. Los `.rpc()` también resuelven en ese esquema.
- `/api/*.js`: cinco clientes creados a mano, misma línea en cada uno.
- Las 16 funciones: un `sed` de `public.` → `legacy.` en sus cuerpos.
- Requiere **un cambio de configuración manual** en el panel de Supabase:
  API Settings → *Exposed schemas* → añadir `legacy`. Sin eso PostgREST no lo
  sirve y la web viejo queda muerta.

Las políticas RLS, los índices, los triggers y la FK a `auth.users` viajan con
las tablas en las dos opciones. El resto del plan es idéntico; describo los
pasos con la Opción B y señalo dónde cambia con la A.

---

### Paso 0 — Preparación (sin ventana, sin riesgo)

- Copia de seguridad completa del proyecto (el dueño, desde el panel).
- Escribir la migración de aparcado en un único fichero: `CREATE SCHEMA
  legacy` + los 52 `SET SCHEMA` + los 21 `ALTER FUNCTION SET SCHEMA` + los 16
  cuerpos reescritos + el nuevo `handle_auth_user_link` + el
  `ALTER EVENT TRIGGER ensure_rls DISABLE`. Todo en **una transacción**.
- Dejar compilada y probada en *preview* la build de la web actual con
  `db: { schema: 'legacy' }`.
- Decidir los 20 perfiles sin auth (ver §6).

**Roto: nada.**

### Paso 1 — Aparcar el esquema viejo + desplegar la web actual contra él

Dos acciones que **no pueden ser simultáneas**, y de ahí sale la única ventana
real de corte.

Orden correcto: **primero la migración, después el despliegue.** Al contrario
no funciona (el esquema `legacy` no existiría y la web caería entera).

1. Añadir `legacy` a los *Exposed schemas* del panel.
2. Aplicar la migración de aparcado (segundos: la tabla mayor tiene 2.002
   filas y `SET SCHEMA` no mueve datos, sólo cataloga).
3. Desplegar la web actual con la línea de `schema: 'legacy'`.

**Roto, y durante cuánto**: desde el final de (2) hasta que el despliegue de
(3) esté sirviendo, **la web entera devuelve `[]` o error** en todo lo que
toque la base: buscador, fichas, categorías, blog, login, favoritos, soporte.
El `index.html` y los estáticos siguen cargando, así que el usuario ve la
cáscara vacía, no un 500. Duración = tiempo de build + propagación de Vercel.
Para este repo (Vite, build de ~1-2 min) y con despliegue manual, contar
**3-6 minutos** si el build ya está verificado en *preview*; más si falla y
hay que corregir.

Se puede bajar a **cero** así: aplicar (2) y, en la misma transacción, crear en
`public` vistas con los nombres viejos (`CREATE VIEW public.users WITH
(security_invoker = true) AS SELECT * FROM legacy.users;` — las vistas simples
son actualizables y con `security_invoker` respetan la RLS de la tabla base).
La web actual sigue funcionando **sin desplegar nada**. Pero sólo sirve de
puente: 7 de los nombres viejos (`users`, `professional_profiles`,
`favorites`, `reviews`, `blog_posts`, `notifications`, `reports`) colisionan
con los del esquema nuevo, así que esas vistas hay que borrarlas justo antes
del paso 3. Vale la pena si la prioridad es no tener ningún minuto de corte en
el paso 1, a cambio de concentrar el corte en el paso 3.

Lo que queda **permanentemente roto desde este paso** (y no se arregla hasta
el paso 5): nada nuevo. Lo que ya no funcionaba (las 15 edge functions
inexistentes) sigue sin funcionar igual.

Dos cosas que hay que acertar en esta migración o se rompen de verdad:

- `handle_auth_user_link` reescrito → si no, **ningún registro nuevo funciona**.
- `delete_account` reescrito o con el EXECUTE revocado → si no, el primer
  «eliminar mi cuenta» borra filas de las tablas de retención de facturación.

### Paso 2 — Comprobar el estado aparcado

No es un paso de escritura, es la verificación de que el paso 1 quedó bien.
Lista mínima: `/buscar` lista 47 perfiles · una ficha `/autonomo/...` carga ·
`/categoria/...` filtra · `/blog` lista 25 posts · login con email entra ·
login con Google entra · `/dashboard` pinta métricas (`get_my_dashboard`) ·
`/soporte` crea un ticket (ejercita `trg_fill_ticket_identity` y
`trg_notify_new_ticket`) · un alta en newsletter · un registro nuevo de
prueba (ejercita `handle_auth_user_link`) · `/sitemap.xml` responde con URLs ·
`/baja` responde.

**Roto: nada** si el paso 1 salió bien. Si algo falla, aquí es donde se
descubre, con el esquema nuevo todavía sin aplicar y la vuelta atrás a un
`ALTER … SET SCHEMA public` de distancia.

### Paso 3 — Aplicar el esquema de khdemlidaba en `public`

- `ALTER EVENT TRIGGER ensure_rls DISABLE` (o crear las políticas en el mismo
  fichero), y **volver a activarlo al terminar**.
- Crear los buckets de Storage que el código nuevo espera: khdemlidaba usa
  `photos` (público), `credentials`, `cv-documents`, `website-briefs`
  (privados). misautonomos sólo tiene `uploads`. **El bucket `uploads` NO se
  borra**: todas las `imagen_principal` y galerías actuales son URLs
  `…/object/public/uploads/…`. O se copian los objetos a `photos` y se
  reescriben las URLs, o el código nuevo debe aceptar las dos rutas.
- Si se usó el puente de vistas del paso 1, borrar las 7 que colisionan
  **justo antes** del `CREATE TABLE` correspondiente.

**Roto, y durante cuánto**: si se mantuvieron las vistas y se borran aquí, la
web actual pierde `users`, `professional_profiles`, `favorites`, `reviews`,
`blog_posts`, `notifications` → buscador, fichas, blog, login y favoritos
caen hasta el paso 5. Sin vistas (web ya apuntando a `legacy`), **la web
actual no se entera de nada: sigue funcionando entera**. Esto es el argumento
fuerte para hacer el paso 1 con despliegue y no con vistas.

Ojo también: `auth.users` queda con **dos** triggers candidatos si el nuevo
esquema trae el suyo (khdemlidaba tendrá su propio `handle_new_user`). Hay que
dejar exactamente **uno** vivo, y que escriba en la tabla nueva.

### Paso 4 — Migrar los datos de `legacy` a `public`

Orden obligado por las FK nuevas: `users` → `professional_profiles` → el resto.

El trabajo real de este paso es el remapeo de identidad:

- Construir la tabla de correspondencia `legacy.users.id (texto 24-hex)` →
  `auth_user_id (uuid)` para los **35** que tienen cuenta.
- Resolver los **57** usuarios y **20** perfiles sin cuenta auth según la
  decisión del dueño (§6).
- Reescribir con esa tabla: `professional_profiles.user_id`,
  `favorites.client_id` + `professional_id` (en el esquema nuevo
  `favorites.professional_id` apunta a `professional_profiles(id)`, no a
  `users`: el mapeo es doble), `reviews.professional_id` + `client_id` (el
  nuevo usa `author_id`), `notifications.user_id`, `messages.sender_id` +
  `recipient_id` + `conversation_id` (el id de conversación es
  `[idA,idB].sort().join('_')`, `src/lib/contactProfessional.js:48-51`: hay
  que **recalcularlo** con los uuid nuevos), `tickets.creator_id`/`user_id`,
  `subscriptions.user_id`, `payment_records.user_id`,
  `profile_metrics.professional_id` (2.002 filas),
  `review_requests.professional_id`/`client_id`,
  `identity_verifications.user_id`, `cookie_consents.user_id`.
- Geografía y categorías: hoy `professional_profiles.provincia` y `ciudad` son
  **texto** y `categories` es un **array de nombres**; en el esquema nuevo son
  `city_id integer` y `category_id integer` con FK a `cities` y `categories`.
  Hay que construir las tablas españolas y mapear los 47 perfiles. Si un
  nombre no casa, el perfil se queda sin ciudad o sin categoría y desaparece
  del buscador.
- Sin equivalente en khdemlidaba (ver el inventario de la capa de esquema,
  pero lo anoto porque afecta a lo que la web actual ofrece hoy): la
  mensajería (`messages`, 10 filas, y todo el flujo de `review_requests` →
  `get_my_dashboard`), el soporte (`tickets`/`ticket_messages`/`ticket_events`,
  3 tickets), la newsletter (`newsletter_subscribers`), los emails
  (`email_logs`, `resend_events`), el outreach (`outbound_leads`), la
  facturación/CRM (10 tablas, todas a 0) y las suscripciones Stripe
  (`subscriptions` 20, `payment_records` 87). Son tablas que hay que llevarse
  tal cual al esquema nuevo o páginas que hay que retirar.

**Roto, y durante cuánto**: nada visible — la web actual sigue leyendo
`legacy`. Pero mientras dure este paso hay **escrituras divergentes**: cada
alta de newsletter, cada favorito, cada ticket, cada registro nuevo entra en
`legacy` y **no** en `public`. Con el tráfico de este sitio (47 perfiles, 10
mensajes históricos, 1 notificación) el riesgo es bajo, pero si el paso 4 dura
días conviene un segundo pase delta antes del paso 5, o un modo de sólo
lectura durante las horas finales.

### Paso 5 — Desplegar la web nueva

Build de la web trasplantada apuntando a `public`, con el cliente de
khdemlidaba **conservando `storageKey: 'misautonomos-auth'` y
`flowType: 'pkce'`** si no se quiere desconectar a los 35 usuarios.

**Roto, y durante cuánto**: el intercambio es instantáneo en Vercel (el
despliegue nuevo pasa a producción de golpe), pero hay dos colas:

- Pestañas ya abiertas con el bundle viejo seguirán pidiendo a `legacy` hasta
  que el usuario recargue. Si en el paso 6 se borra el esquema `legacy`, esas
  pestañas ven errores. Dejar `legacy` en pie al menos **48 h**.
- La app nativa (Capacitor, iOS/Android) **no se actualiza con el despliegue
  web**. Las versiones instaladas seguirán hablando con `legacy` indefinidamente
  hasta que el usuario actualice desde la tienda. Mientras `legacy` exista
  funcionan; cuando se borre, dejan de funcionar. Esto no es un problema de
  minutos, es de semanas, y hay que planearlo (o forzar actualización mínima).

### Paso 6 — Limpieza (no antes de 48 h, mejor una semana)

`DROP SCHEMA legacy CASCADE` sólo cuando no haya tráfico contra él (se puede
comprobar en los logs de PostgREST). Volver a activar `ensure_rls`. Revisar
que `delete_account` final apunta a las tablas nuevas y que la lista de
exclusión de retención legal vuelve a coincidir.

### Resumen de cortes

| Paso | Lo que se rompe | Cuánto |
|---|---|---|
| 0 | nada | — |
| 1 (variante despliegue) | **web entera sin datos** entre la migración y el despliegue | **3-6 min** |
| 1 (variante vistas puente) | nada | **0 min** |
| 2 | nada (es verificación) | — |
| 3 | nada con la variante despliegue · con vistas: buscador/fichas/blog/login **hasta el paso 5** | 0 min / horas-días |
| 4 | nada visible; escrituras que se quedan en `legacy` | lo que dure el paso |
| 5 | pestañas viejas hasta recargar; **app nativa hasta que actualice** | minutos / semanas |
| 6 | app nativa no actualizada deja de funcionar | definitivo |

---

## 8. Riesgos, de más grave a menos

1. **20 de los 47 perfiles (43 %) y 57 de los 92 usuarios no tienen fila en
   `auth.users`**, y el esquema nuevo lo exige por FK. Sin decisión previa, el
   paso 4 los deja fuera y Google pierde 20 fichas indexadas.
2. **`delete_account(uuid)` es dinámica** y, con las tablas renombradas, borra
   las de retención legal de facturación (`payment_records` 87 filas,
   `invoices`, `plan_audit_logs`, `email_logs`…) en silencio. Reescribirla o
   revocarle el EXECUTE **en la misma migración** que el aparcado.
3. **`handle_auth_user_link` cuelga de `auth.users`**: en cuanto `public.users`
   cambie de forma, **todo registro nuevo falla** (el insert en `auth.users` se
   revierte). No es degradación: es un 500 en el alta.
4. **El event trigger `ensure_rls` activará RLS sin políticas** en las ~41
   tablas nuevas → todo devuelve `[]` sin error visible. Ya pasó con
   `translations` (469 filas invisibles).
5. **La sesión de los 35 usuarios se pierde** si el cliente trasplantado no
   conserva `storageKey: 'misautonomos-auth'` (y `flowType: 'pkce'` para los
   flujos a medias). Evitable con dos líneas.
6. **El bucket `uploads` es el único que existe** y todas las fotos actuales
   apuntan a él; el código nuevo espera `photos`. Borrarlo o no contemplarlo
   deja el catálogo sin imágenes.
7. **Remapeo de ids**: 13 columnas en 12 tablas más el recálculo de
   `conversation_id`. Un fallo aquí no da error: da favoritos de otro, reseñas
   huérfanas y métricas en el perfil equivocado.
8. **La app nativa no se despliega con la web.** Las instalaciones vivas
   hablarán con `legacy` hasta que el usuario actualice. Borrar `legacy` las
   mata.
9. **Geografía y categorías cambian de texto a FK** (`provincia`/`ciudad` →
   `city_id`, `categories[]` → `category_id`). Un nombre que no casa saca al
   perfil del buscador.
10. **Escrituras divergentes durante el paso 4**: altas de newsletter,
    favoritos, tickets y registros que entran en `legacy` y no en `public`.
11. **Downgrade de dependencias**: `react-router-dom` 7.2 → 6.26,
    `react-i18next` 14.1 → 17.0, `@supabase/supabase-js` 2.107 → 2.45,
    `vite` 6.1 → 8.3. El trasplante no es sólo `src/`: hay que decidir el
    `package.json` resultante y la mezcla no es trivial (v7→v6 de Router
    cambia API).
12. **15 edge functions que el código llama y no existen.** Hoy fallan en
    silencio. Al trasplantar hay que decidir una por una: implementarla, o
    quitar la llamada. Si se copian los ficheros tal cual, los fallos
    silenciosos se replican.
13. **`ticket_messages` y `ticket_events` tienen `SELECT: true`**: cualquiera
    sin sesión lee todo el soporte. Agujero preexistente; no replicarlo.
14. **Dos sistemas de push conviviendo** (`push_tokens` + edge `send-push`, y
    OneSignal en `src/config/onesignal.js`). Elegir uno.
15. **`api/cron/weekly-post.js` referencia `blog_topic_queue`, que no
    existe**, y no hay ningún cron declarado. Código muerto: borrarlo en vez
    de trasplantarlo.
16. **La anon key está hardcodeada en el cuerpo de `notify_new_ticket()`**
    junto a la URL del proyecto. Si alguna vez se rota la clave, el trigger
    deja de funcionar en silencio.

---

## 9. Decisiones que sólo puede tomar el dueño

1. **Los 20 perfiles y 57 usuarios sin cuenta auth**: ¿se crean sus filas en
   `auth.users` (contradice «sin tocar auth.users»), se relaja la FK
   `users.id → auth.users.id` del esquema nuevo, o se aceptan como pérdida?
   Condiciona el DDL del paso 3, así que hay que decidirlo antes.
2. **¿Se desconecta a los 35 usuarios o se conserva la sesión?** Conservar
   cuesta dos líneas (mantener `storageKey: 'misautonomos-auth'` y
   `flowType: 'pkce'`) a cambio de arrastrar una clave no estándar para
   siempre.
3. **Opción A (renombrar a `legacy_*`) u Opción B (esquema `legacy`)?** La B
   es mucho menos superficie de cambio pero exige que el dueño añada `legacy`
   a los *Exposed schemas* en el panel de Supabase.
4. **¿Cero corte en el paso 1 (vistas puente) o cero corte en el paso 3
   (despliegue)?** No se puede tener los dos: o 3-6 min de web vacía en el
   paso 1, o la web vieja a medias entre los pasos 3 y 5.
5. **Mensajería, soporte, newsletter, facturación/CRM y suscripciones Stripe**:
   khdemlidaba no tiene equivalente. ¿Se llevan las tablas tal cual al esquema
   nuevo (y se mantienen sus páginas), o se retiran esas pantallas? Afecta a
   `/soporte`, `/mis-valoraciones`, `/dashboard` (contador de mensajes no
   leídos y de reseñas pendientes), `/admin/newsletter`, `/admin/emails`,
   `/admin/outreach-whatsapp`.
6. **Las 15 edge functions inexistentes**: ¿se implementan (contacto por
   email, bienvenida de newsletter, notificación de tickets, traducción de
   perfiles) o se quitan las llamadas? Hoy la web promete cosas que no hace.
7. **Las fotos**: ¿se copian los objetos de `uploads` a `photos` reescribiendo
   las URLs de los 47 perfiles, o el código nuevo acepta las dos rutas?
8. **La app nativa**: ¿cuánto tiempo se mantiene `legacy` en pie, y se fuerza
   actualización mínima?
9. **`package.json`**: ¿se adopta el de khdemlidaba entero (downgrade de
   Router 7→6, Vite 6→8, i18next 14→17) o se mantiene el de misautonomos y se
   adapta el código trasplantado?
10. **`payment_records` (87) y `subscriptions` (20)**: son datos de
    facturación reales de pantallas que ya están retiradas. ¿Se migran por
    retención legal, se archivan fuera, o se dejan en `legacy` para siempre?
