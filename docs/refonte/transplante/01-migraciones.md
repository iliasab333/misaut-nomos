# 01 — Las 100 migraciones de khdemlidaba y su trasplante a misautonomos

Fase de SOLO LECTURA. Fuentes: `/Users/bigseo/khdemlidaba/supabase/migrations` en HEAD `794e657` (100 ficheros, 11 424 líneas, 600 005 bytes), el proyecto Supabase modelo `eiacoozyubxkbjwhgkml` y el proyecto destino `dquxsethatxtptfviiwd` (consultados con `execute_sql` en modo lectura: `information_schema`, `pg_proc`, `pg_trigger`, `pg_policies`, `pg_extension`, `storage.buckets`, `supabase_migrations`). Fecha: 2026-10-01.

---

## 0. Lo esencial en diez líneas

1. **Los 100 ficheros del repo NO son una cadena aplicable sobre una base vacía.** El ledger de producción de khdemlidaba (`supabase_migrations.schema_migrations`) tiene **193 entradas**; el repo tiene **100 ficheros**; sólo **10 versiones coinciden exactamente**. 93 migraciones se aplicaron desde el dashboard/MCP y nunca se guardaron en el repo (p.ej. `auth_trigger_and_admin`, `all_moroccan_cities`, `multi_categories_v2`, `reminder_emails_tracking`, `device_tokens_push_notifications`, `reviews_public_submission`, `diploma_*` ×14, `security_audit_p1..p4`, `tbibdaba_v1_schema`). El propio `docs/backend/RECOVERY.md` del repo lo reconoce («165 entrées de production, 77 fichiers Git, 5 horodatages identiques» el 20/09; hoy 193/100/10).
2. **22 objetos son referenciados por los ficheros del repo pero nunca creados en ellos** (sección 4): `public.is_admin()` (24 ficheros), `app_private.professional_categories` (15), `public.reminder_emails` (6), `app_private.diploma_notices` (6), `client_ip()`, `log_contact_event`, `submit_review`, `admin_notifications`, `contact_messages`, `device_tokens`, el enum `public.diploma_status`, etc. Aplicados en orden sobre dquxsethatxtptfviiwd, **26 ficheros fallan** (sección 7).
3. **6 ficheros son «de traza»** (sólo comentarios o un `select 'voir docs…'`), **1 está roto** (`20260901191500` tiene una línea que no es SQL: error de sintaxis) y **1 lanza `raise exception`** si no existe `admin_kpis` (`20260901190000`). Tres más son parciales («voir la base pour le corps»).
4. **La suite pglite no aplica la cadena**: cada test parte de un *fixture sintético* (`scripts/fixtures/profile-security.sql`, 150 líneas, «captured from production on 2026-09-20») y aplica entre 1 y 5 ficheros concretos. `node --test scripts/product-database.test.mjs` aplica 3 ficheros y tarda **3,77 s** (6 subtests, todos verdes).
5. Conclusión operativa: **la fuente de verdad es el esquema vivo de `eiacoozyubxkbjwhgkml`**, no los ficheros. El trasplante debe partir de un **volcado de esquema** (`supabase db dump --schema public,app_private,private` + extracción manual de buckets, policies de `storage.objects` y los 4 triggers sobre `auth.users`), **podado** de lo marroquí (`tbib_*` ×9 tablas, `exchange_*` ×3, 5 vistas de campañas, 4 tablas IG/Telegram), **adaptado** (seeds, teléfonos, moneda, zona horaria, URL de edge functions, rutas de `measurement_page`) y aplicado como «migración 0» en dquxsethatxtptfviiwd. Los 100 ficheros sirven como documentación y como lista de verificación, no como instalador.
6. **Extensiones**: khdemlidaba y misautonomos tienen exactamente el mismo juego (`pgcrypto 1.3`, `uuid-ossp 1.1`, `pg_net` 0.20.4/0.20.0, `pg_stat_statements 1.11`, `supabase_vault 0.3.1`, `plpgsql`). **Ninguno tiene `pg_cron`** y ningún fichero usa `cron.*` ni `vault.*`. Las purgas (demandes-purge, diploma-tick) son edge functions con cron externo. No hay nada que instalar.
7. **Colisiones en dquxsethatxtptfviiwd**: 7 tablas (`users`, `professional_profiles`, `reviews`, `favorites`, `notifications`, `blog_posts`, `reports`), 2 funciones (`handle_new_user`, `is_admin`), 1 sobrecarga peligrosa (`submit_review` con otra firma), 1 trigger (`on_auth_user_created` sobre `auth.users`, hoy apunta a `handle_auth_user_link()`), y 16 funciones SQL de misautonomos que nombran esas tablas por su nombre.
8. **Datos de Marruecos dentro del SQL**: seed de 15 ciudades + 12 categorías + 30 perfiles con `+212`, 36 categorías más con alias en darija/árabe, heurística de género con nombres marroquíes, regla de «8 cifras» de teléfono, `price_mad`/`amount_mad`/«DH», `Africa/Casablanca` en 3 funciones, URL `https://eiacoozyubxkbjwhgkml.supabase.co/functions/v1/notify-admin` grabada en `internal_config`, textos de notificación en francés en 7 ficheros, rutas francesas en `measurement_page`.
9. **La web actual de misautonomos puede seguir viva durante la ventana**: su acceso a tablas pasa por un único mapa (`src/api/base44Client.js` líneas 9-28 `TABLE_MAP`, más 3 `from('users')` en 189-209 y el bucket `uploads` en 280-284) y por 16 funciones SQL que se reescriben con `create or replace` apuntando a `legacy_*`.
10. Riesgo mayor: hacerlo «fichero a fichero» creyendo que el repo es completo. Segundo riesgo: el trigger `on_auth_user_created` y la función `is_admin()` cambian de semántica (id `text`+`role='admin'` → id `uuid`+`is_admin boolean`) y afectan a las 137 policies legacy en el instante del cambio.

---

## 1. Qué se ha leído y ejecutado

| Qué | Dónde | Resultado |
|---|---|---|
| 100 ficheros SQL completos | `/Users/bigseo/khdemlidaba/supabase/migrations/*.sql` | leídos íntegros (11 424 líneas) |
| Suites pglite | `scripts/product-database.test.mjs`, `cv-database.test.mjs`, `growth-database.test.mjs`, `contact-matching-database.test.mjs`, `audit-communications-database.test.mjs`, `scripts/fixtures/profile-security.sql` | ninguna aplica la cadena completa |
| Ejecución | `cd /Users/bigseo/khdemlidaba && node --test scripts/product-database.test.mjs` | 6/6 OK, `duration_ms 3387.9`, `real 3.77 s`, PGlite 0.5.8 |
| Inventario oficial del repo | `docs/backend/RECOVERY.md`, `docs/backend/migration-inventory-2026-09-20.json` | 165 prod / 77 repo / 5 coincidencias (20/09) |
| Ledger modelo | `list_migrations(eiacoozyubxkbjwhgkml)` | 193 entradas |
| Ledger destino | `list_migrations(dquxsethatxtptfviiwd)` | 21 entradas (y sólo 4 ficheros en `/Users/bigseo/Desktop/misaut-nomos/supabase/migrations`) |
| Esquema modelo | `information_schema`, `pg_proc`, `pg_trigger`, `pg_policies`, `storage.buckets` | 41 tablas + 21 vistas en `public`, 19 tablas en `app_private`, 136 funciones `public` + 37 `app_private`, 33 triggers `public` + 1 `app_private` + 4 en `auth.users`, 74 + 5 + 17 policies, 4 buckets, 6 enums, esquemas `app_private` y `private` |
| Esquema destino | ídem en dquxsethatxtptfviiwd | 52 tablas, 0 vistas, 21 funciones, 5 triggers `public` + 1 en `auth.users`, 137 policies, 1 bucket `uploads` (183 objetos), 0 enums, sin `app_private`, 7 event triggers (incluido `ensure_rls -> rls_auto_enable`) |

Datos vivos (sólo recuentos): modelo = 1 788 usuarios, 1 394 perfiles (1 140 publicados), 70 ciudades, 118 categorías (9 familias, 22 remotas, 2 reguladas), 1 584 filas en la pivote de categorías, 52 reseñas, 1 342 contact_events, 37 posts. Destino = 91 `users` (34 con `auth_user_id`; en 29 el `id` text coincide con `auth_user_id::text`, en 5 no), 46 perfiles (26 con cuenta auth, los 46 `estado_perfil='activo'` y visibles), 12 provincias y 28 ciudades distintas en texto libre, 17 categorías, 25 posts, 3 reseñas, 1 notificación, 3 tickets, 0 favoritos, 1 admin (`role='admin'`).

---

## 2. Esquemas, extensiones y dependencias externas

**Esquemas usados por los ficheros**: `public` (todo), `app_private` (creado con `create schema if not exists` en `20260920153103` y `20260929163557`, pero ya referenciado desde `20260814100000`: la pivote `app_private.professional_categories` nació en el dashboard), `private` (sólo `20260928205855`, louay), `storage` (buckets y policies), `auth` (FK a `auth.users`, triggers sobre `auth.users`), `net` (`net.http_post`), `extensions` (`extensions.digest`, `extensions.hmac`, `extensions.gen_random_bytes`).

**Extensiones**: `create extension if not exists "pgcrypto"` (`20260101000000`) y `create extension if not exists pg_net` (`20260801200000`). Instaladas hoy en ambos proyectos; no-op. `pg_net` está en el esquema `public` en los dos (no es relocalizable; `20260826200000` lo documenta). **No se usa `pg_cron`** (0 ficheros con `cron.`), **no se usa `vault`** (0 ficheros).

**HTTP a edge functions desde SQL** (`net.http_post`, asíncrono, sólo tras COMMIT):
- `public.fire_notify_admin(text)` → `internal_config.notify_admin_url` con cabecera `x-cron-key = notify_admin_cron_key` (`20260801200000`); disparado por 9 triggers (`users_notify_admin`, `pp_notify_admin`, `trg_reviews_alert_low_rating`, `trg_reports_alert_new`, `trg_system_failures_alert`, `demandes_notify_admin`, `contact_events_notify_admin`, `contact_messages_notify_admin`, `candidatures_notify_admin`) y por 6 RPC de promo/website.
- `public._promo_fire_mail(text, uuid)` → misma URL con `notify-admin` sustituido por `promo-mail` (`20260917170000`).
- `public.fire_push_apns()` → misma URL con `push-apns` (`20260923120000`); lee `public.device_tokens` (no creada en el repo).

**Claves de `internal_config` que exige el SQL del repo**: `notify_admin_url` (insertada con la URL de eiacoozyubxkbjwhgkml), `notify_admin_cron_key` (placeholder `__set_via_management_ui__`), `review_ip_salt` (**sólo leída**, nunca insertada en el repo: la puso `p1_contact_events_bucket_and_idor` desde el dashboard), `call_outcome_threshold`, `call_outcome_window_days`, `call_outcome_max_answered`, `call_outcome_autopause`, `call_outcome_min_days`, `call_outcome_hash_ttl_days`, `call_outcome_purged_at`. En producción hay además 31 claves operativas (`site_mail_*`, `relance_pro_*`, `jcsecours_mail_sent`) que no deben copiarse.

**Secretos**: `app_private.email_token_key.secret` se genera en la propia migración (`extensions.gen_random_bytes(32)`, `20260921080401`); el resto son secretos de edge functions (`RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`…), fuera de esta capa.

**Buckets** que el SQL espera: `photos` (público, 5 MB, 3 mimes; `20260101000003` + `20260822172452`), `credentials` (privado, 15 MB, HEIC; **creado en el dashboard**, el repo sólo lo actualiza en `20260902180000`), `cv-documents` (privado, 4 MB; `20260920153103`), `website-briefs` (privado, 8 MB; `20260929163557`). Policies sobre `storage.objects` en el repo: 4 de `photos`, 4 de `cv-documents`, 3 de `website-briefs`, 2 restrictivas `account_active_*`; las 4 `credentials_*` existen sólo en producción (17 en total).

**Triggers sobre `auth.users`** en producción (4): `on_auth_user_created -> handle_new_user` (**creado en dashboard**; el repo sólo redefine la función), `on_auth_user_signin -> sync_last_seen` (**dashboard**), `cv_cleanup_before_account_delete -> app_private.cv_require_storage_cleanup` (`20260920153103`), `sync_confirmed_email -> app_private.sync_confirmed_email` (`20260921080701`).

**Rol `authenticator`**: `20260822181000` hace `alter role authenticator set pgrst.db_max_rows = '1000'` + `notify pgrst`. Hoy en dquxsethatxtptfviiwd el rol tiene `session_preload_libraries=safeupdate; statement_timeout=8s; lock_timeout=8s` y ningún `db_max_rows`.

---

## 3. Tabla completa de las 100 migraciones

Columnas: nº · fichero · propósito · objetos que crea/altera · dependencias externas (fuera del fichero) · Marruecos · clasificación. «NO-REPO» marca objetos que el fichero usa y que **ningún fichero del repo crea** (viven sólo en producción). Clasificación: **CORE**, **FEATURE:x**, **MA** (Marruecos-solo), **TRAZA** (no ejecutable / no-op).

| # | Fichero | Propósito | Crea / altera | Dependencias | Marruecos | Clase |
|---|---|---|---|---|---|---|
| 1 | `20260101000000_initial_schema.sql` | esquema base | ext `pgcrypto`; tablas `users`(uuid→auth.users), `categories`(serial), `cities`(serial), `professional_profiles`, `reviews`, `contact_events`; 4 índices; fn `recompute_professional_rating`, `touch_updated_at`; triggers `trg_reviews_rating`, `trg_users_touch`, `trg_pp_touch` | `auth.users` | no | CORE |
| 2 | `20260101000001_rls_policies.sql` | RLS día 1 | RLS en 6 tablas; 14 policies (`users_self_*`, `categories_read`, `cities_read`, `pp_*`, `reviews_*`, `contact_*`) | — | no | CORE |
| 3 | `20260101000002_seed_data.sql` | seed demo | 12 categorías FR, 15 ciudades marroquíes, 30 perfiles sin user_id (teléfonos `212612345601..630`, emails `@example.ma`) | — | **sí** (todo) | MA |
| 4 | `20260101000003_storage_photos.sql` | bucket fotos | bucket `photos` público; 4 policies `photos *` en `storage.objects` | `storage` | no | CORE |
| 5 | `20260724000000_user_type_explicit.sql` | elección explícita de tipo | col `users.user_type_explicit`; backfill; **redefine** `handle_new_user()` (lee `raw_user_meta_data`) | el trigger `on_auth_user_created` sobre `auth.users` **NO-REPO** | no | CORE |
| 6 | `20260724010000_professional_profiles_whatsapp_phone.sql` | 2.º número WhatsApp | col `pp.whatsapp_phone` | `pp.whatsapp_enabled` **NO-REPO** (comentario: «ya existía») | ejemplos `2126…` en comentarios | CORE |
| 7 | `20260724020000_rename_category_traiteur.sql` | renombrar categoría | `update categories where slug='traiteur'` | — | sí | MA |
| 8 | `20260724030000_delete_my_account_allow_storage.sql` | borrar cuenta borra fotos | **redefine** `delete_my_account()` (`storage.allow_delete_query`) | versión previa **NO-REPO** (`self_delete_account_rpc`) | no | FEATURE:account_deletion |
| 9 | `20260724040000_professional_profiles_phone_e164.sql` | teléfonos a E.164 | `update pp set phone='+'||phone` (y whatsapp_phone) | — | comentario `+212` | CORE (dato) |
| 10 | `20260729000000_legal_cgu_users_reports.sql` | CGU + denuncias | cols `users.cgu_accepted_at/cgu_version`; tabla `reports`(bigserial) + 2 índices + RLS 3 policies | `public.is_admin()` **NO-REPO** | «loi 09-08» | CORE |
| 11 | `20260729010000_cgu_from_metadata.sql` | CGU desde metadata | redefine `handle_new_user()` v3 | — | no | CORE |
| 12 | `20260801000000_blog_posts.sql` | blog | tabla `blog_posts`(bigserial, `locale` check fr/ar/en/es/de/nl, default `'fr'`, author default `'KhdemliDaba'`) + 3 índices + RLS 2 + fn `tg_blog_touch_updated`, trigger, RPC `blog_bump_views` | `is_admin()` **NO-REPO** | defaults `fr`/`KhdemliDaba` | CORE |
| 13 | `20260801100000_client_conversion.sql` | campaña cliente→pro | CHECK de `reminder_emails.kind`; vista `v_client_conversion_targets` | `reminder_emails`, `users.no_reminders` **NO-REPO** | no | FEATURE:reminders |
| 14 | `20260801200000_admin_notifications.sql` | avisos a admin | ext `pg_net`; col `users.admin_notifications_enabled`; vistas `v_pending_admin_signups`, `v_pending_profile_published`, `v_daily_contact_clicks`; tabla `internal_config` + RLS; **inserta `notify_admin_url=https://eiacoozyubxkbjwhgkml.supabase.co/functions/v1/notify-admin`**; fn `fire_notify_admin`, `tg_users_notify_admin`, `tg_pp_notify_admin`; triggers `users_notify_admin`, `pp_notify_admin` | `admin_notifications` **NO-REPO** (las 3 vistas fallan sin ella); edge fn `notify-admin` | URL del proyecto marroquí | FEATURE:admin_notifications |
| 15 | `20260812100000_categories_aliases_and_obra_metiers.sql` | alias de búsqueda | col `categories.aliases text[]` + índice GIN (CORE); +9 categorías construcción; 12 `update` de alias | — | **sí** (darija/árabe, slugs marroquíes) | CORE(col)+MA(datos) |
| 16 | `20260814100000_fix_search_professionals_legacy_category_fallback.sql` | búsqueda v1 | `search_professionals(text,text,boolean,int,int)` | `app_private.professional_categories` **NO-REPO** (LANGUAGE sql → falla al crear) | no | CORE |
| 17 | `20260815100000_fix_count_professionals_by_category_legacy.sql` | contador por categoría | `count_professionals_by_category()` | ídem | no | CORE |
| 18 | `20260816100000_sync_users_from_pp.sql` | nombre público = pp | 2 backfills; fn `tg_pp_sync_to_users`; trigger `trg_pp_sync_to_users` | — | no | CORE |
| 19 | `20260816200000_reclassify_mismatched_professionals.sql` | 9 perfiles reclasificados | DO block sobre 9 slugs concretos | pivote **NO-REPO** (no-op si no hay match) | sí (slugs/descr. árabe) | MA |
| 20 | `20260820100000_professional_socials.sql` | redes sociales | col `pp.socials jsonb` + CHECK `professional_profiles_socials_check` | — | no | CORE |
| 21 | `20260821200000_p0_security_hardening.sql` | P0 seguridad | fn `users_guard_privileged_cols` + trigger `trg_users_guard`; policies `users_self_update/upsert/admin_update`, drop `users_admin_read_all`; fn `pp_guard_privileged_cols` + `trg_pp_guard`; policies pp; `recompute_professional_rating` v2; 6 `revoke execute`; 9 `alter view … security_invoker`; grants | `register_device_token(text,text,text,text)`, `unregister_device_token(text)`, vistas `v_reminder_targets`, `v_top_cities_7d`, `v_gaps`, `v_daily_kpis`, `v_top_categories_7d`, cols `users.is_admin/last_seen_at/no_reminders` **NO-REPO** | «loi 09-08» | CORE |
| 22 | `20260821210000_backfill_cgu_consent_existing_accounts.sql` | backfill CGU | `disable trigger trg_users_guard`; `update users set cgu_* ` por fechas `v1-2026-07-29`/`v2-2026-08-19` | — | sí (versiones legales de KD) | MA |
| 23 | `20260821230000_user_notifications_inbox.sql` | campanita | tabla `notifications`(uuid, FK users) + 2 índices + RLS 4 policies + grants por columna; RPC `mark_all_notifications_read` | `is_admin()` **NO-REPO** | no | CORE |
| 24 | `20260822170953_p1_reviews_lockdown_and_rating_integrity.sql` | reseñas blindadas | drop 2 policies; revoke; `grant execute submit_review(text,smallint,text,text,text,timestamptz)`; índice único `reviews_unique_author_per_pro`; `recompute_professional_rating` v3 (filtra `status='approved'`) | `submit_review`, `reviews.status` **NO-REPO** | no | CORE |
| 25 | `20260822171037_p1_contact_events_and_idor.sql` | contactos sin spam | revoke en `contact_events`; `grant execute log_contact_event(uuid,text,text)`; revoke `unsubscribe_reminders(uuid)` | ambas fn **NO-REPO** | no | CORE |
| 26 | `20260822172452_p1_photos_bucket_limits.sql` | límites bucket | `update storage.buckets` photos 5 MB + 3 mimes | — | no | CORE |
| 27 | `20260822180000_p2_xff_last_hop_and_regressions.sql` | **traza** | sólo comentarios (describe `client_ip()`, `log_contact_event`, `submit_review` que viven en prod) | — | no | TRAZA |
| 28 | `20260822181000_p2_cap_postgrest_rows.sql` | tope filas | `alter role authenticator set pgrst.db_max_rows='1000'`; `notify pgrst` | rol `authenticator` | no | CORE |
| 29 | `20260826180000_account_deletions_audit.sql` | log anónimo de bajas | tabla `account_deletions`(bigserial) + 3 índices + RLS; fn `tg_snapshot_account_deletion` + trigger; `delete_my_account(p_reason,p_source)` v2 (drop 0-args) | — | «loi 09-08» | FEATURE:account_deletion |
| 30 | `20260826200000_p2_security_hardening.sql` | P2 seguridad | 3 revokes (`admin_list_reviews`, `set_professional_categories`, `delete_my_account`); DO `revoke all` + `comment` sobre `followups`, `ig_pending_replies`, `learned_examples`, `telegram_messages`; `tg_blog_touch_updated` y `tg_device_tokens_touch` con search_path | `admin_list_reviews`, `set_professional_categories`, las 4 tablas IG/TG **NO-REPO** | no | CORE(parcial)+MA(4 tablas) |
| 31 | `20260827100000_favorites.sql` | favoritos | tabla `favorites`(user_id→auth.users, professional_id) + índice + RLS 3 | — | no | CORE |
| 32 | `20260828100000_email_reorg.sql` | canales y digests | col `admin_notifications.channel` + CHECK + 2 índices; tabla `system_failures` + RLS; fn/triggers `tg_reviews_alert_low_rating`, `tg_reports_alert_new`, `tg_system_failures_alert`; vistas `v_email_sends_today`, `v_weekly_digest`, `v_weekly_top_cities/categories/pros`, `v_monthly_digest`, `v_monthly_category_pressure` | `admin_notifications`, `reminder_emails` **NO-REPO** | `Africa/Casablanca` | FEATURE:email_digests |
| 33 | `20260828230000_quality_review_safety.sql` | pasada de calidad | cols `pp.description_original`, `category_id_original`, `quality_reviewed_at` + índice | — | no | CORE |
| 34 | `20260829000000_add_8_categories.sql` | 8 categorías | `insert categories (…, family)` | col `categories.family` **NO-REPO** (`categories_family`) | **sí** (neggafa, caftan, darija) | MA |
| 35 | `20260829000100_fix_pivot_pp_category_id_drift.sql` | realinear category_id | `update pp from app_private.professional_categories` | pivote **NO-REPO** | no | CORE (dato) |
| 36 | `20260829120000_demandes_candidatures.sql` | tablón de demandas | tablas `demandes`, `candidatures` + 5 índices; vista `v_demandes_public`; RLS 8 policies; fn `_enforce_demande_limits`, `_enforce_candidature_limits` + 2 triggers; RPC `create_demande`, `apply_candidature`, `close_demande`, `mark_expired_demandes`; grants | `notifications`, `contact_events`; `is_admin()` **NO-REPO** | textos FR («Nouvelle demande dans ta catégorie», «à») | FEATURE:demandes |
| 37 | `20260829150000_cgu_acceptances_audit.sql` | journal CGU | tabla `cgu_acceptances` + 2 índices + RLS 2; RPC `record_cgu_acceptance`; backfill | — | «loi 09-08» | CORE |
| 38 | `20260829160000_fix_users_guard_allow_cgu_bump.sql` | guard permite re-aceptar | `users_guard_privileged_cols` v2 (security definer) | — | no | CORE |
| 39 | `20260829170000_search_professionals_v2_full_filters.sql` | filtros en SQL | `search_professionals` 9 args (`p_min_experience`, `p_min_rating`, `p_availability`, `p_sort`) | pivote **NO-REPO** | no | CORE |
| 40 | `20260829180000_admin_redesign_rpcs.sql` | admin | `drop search_professionals(5)`; cols `pp.verified_at`, `verified_by`; **cuerpos de 11 RPC admin NO incluidos** (`admin_kpis`, `admin_verification_queue`, `admin_verify_pro`, `admin_top_pros`, `admin_city_stats`, `admin_category_stats`, `admin_zero_contact_pros`, `admin_funnel`, `admin_demandes_stats`, `admin_global_search`, `admin_pro_contact_history`) | las 11 RPC **NO-REPO** | no | CORE(cols)+TRAZA(RPC) |
| 41 | `20260829190000_blog_faq_column_and_index.sql` | FAQ schema.org | col `blog_posts.faq jsonb` + índice | — | ejemplo «1200 DH» en comentario | CORE |
| 42 | `20260829200000_add_gender_column_and_rpc.sql` | género | col `pp.gender` CHECK `homme/femme`; drop todas las firmas; `search_professionals` 10 args | pivote | valores `homme`/`femme` (claves del front) | CORE |
| 43 | `20260829200100_backfill_gender_from_first_name.sql` | género por nombre | heurística con ~120 nombres marroquíes; `alter column gender set not null` | — | **sí** | MA(dato)+CORE(NOT NULL) |
| 44 | `20260830000000_admin_stats_inscriptions.sql` | stats admin | RPC `admin_stats_cities`, `admin_stats_categories`, `admin_stats_gender` | pivote | no | FEATURE:admin |
| 45 | `20260830100000_works_remote.sql` | «en línea» | cols `pp.works_remote`, `categories.allows_remote` + índice parcial; `allows_remote=true` para 11 slugs; backfill por descripción (FR/AR/ES); `works_remote=true` para `hamza-akesbi` | — | **sí** (slugs, árabe, seed) | CORE(cols)+MA(datos) |
| 46 | `20260830100100_search_professionals_add_p_mode.sql` | filtro local/remoto | `search_professionals` 11 args (`p_mode`) | pivote | no | CORE |
| 47 | `20260830200000_hide_city_and_more_remote_cats.sql` | ocultar ciudad | col `pp.hide_city` + CHECK `pp_hide_city_requires_remote`; 5 slugs remotos | — | sí (slugs) | CORE(col)+MA(datos) |
| 48 | `20260830200100_search_professionals_expose_hide_city.sql` | hide_city en salida | `search_professionals` v4 | pivote | no | CORE |
| 49 | `20260830210000_fix_v_demandes_public_visibility.sql` | vista pública real | `v_demandes_public` a `security_invoker=false`; revoke/grant | — | no | FEATURE:demandes |
| 50 | `20260901180000_diplomes_professions_reglementees.sql` | **traza** | `select 'voir docs…'` | describe `categories.requires_diploma`, `pp.diploma_*` (8 cols), enum `diploma_status`, `app_private.credential_submissions`, `diploma_notices`, bucket `credentials`, 8 fn — **todo NO-REPO** | «loi 43-13», ISPITS | TRAZA (FEATURE:diploma) |
| 51 | `20260901190000_fix_tuile_a_verifier.sql` | tuile admin | DO: reescribe `admin_kpis` con `replace()`; **`raise exception` si no la encuentra** | `admin_kpis`, `profile_requires_diploma` **NO-REPO** | no | FEATURE:diploma (falla) |
| 52 | `20260901191500_diploma_notices_envoi_reel.sql` | **roto** | línea 14 `(corps de la fonction : voir la migration appliquée…)` fuera de comentario → error de sintaxis | — | no | TRAZA (rompe) |
| 53 | `20260901193000_badge_verifie_suit_le_diplome.sql` | traza | sólo comentarios | — | no | TRAZA |
| 54 | `20260902170000_grille_ignore_delai_si_fermee.sql` | traza | sólo comentarios | — | no | TRAZA |
| 55 | `20260902173000_publier_des_le_numero.sql` | traza | sólo comentarios | — | no | TRAZA |
| 56 | `20260902180000_credentials_marge_taille_heic.sql` | bucket credentials | `update storage.buckets where id='credentials'` 15 MB + HEIC | bucket `credentials` **NO-REPO** (no-op si falta) | no | FEATURE:diploma |
| 57 | `20260910120000_promo_instagram.sql` | oferta post IG 200 DH | tablas `promo_settings`(singleton, `price_mad`, `ad_budget_mad`) y `promo_orders`(`amount_mad`, refs `KD-`) + 5 índices + trigger; RLS 2; fn `_promo_log_failure`, `_promo_week_start`(**Casablanca**), `_promo_slots_used`, `promo_availability`, `_promo_eligibility`, `promo_my_eligibility`, `promo_create_order`, `promo_submit_brief`, `promo_mark_paid`, `promo_mark_failed`, `admin_promo_orders`, `admin_promo_update`, `admin_promo_settings_update`; grants | `system_failures`, `notifications`; lee `pp.diploma_gate_blocked_at/diploma_status` **NO-REPO** (runtime) | **sí** (MAD/DH, @khdemlidaba, textos FR) | FEATURE:promo |
| 58 | `20260912100000_promo_featured.sql` | perfil destacado 50 DH | cols `promo_settings.featured_*`; `promo_orders.product/featured_until`; CHECKs; col `pp.featured_until` + índice + grant; fn `_promo_featured_used`; nuevas firmas `promo_availability(text,int)`, `_promo_eligibility(uuid,text)`, `promo_my_eligibility(text)`, `promo_create_order(text)`; `promo_mark_paid` v2; `admin_promo_settings_update`(11); `admin_promo_featured_stop`; **`search_professionals` v5 con `featured` y tope `least(p_limit,60)`** | — | sí (DH) | FEATURE:promo (+CORE search) |
| 59 | `20260912140000_promo_eligibility_allegee.sql` | elegibilidad | `_promo_eligibility` v3 | — | no | FEATURE:promo |
| 60 | `20260912160000_alertes_telegram_completes.sql` | alertas TG | fn+triggers `demandes_notify_admin`, `contact_events_notify_admin`, `contact_messages_notify_admin` | `contact_messages` **NO-REPO** (falla el 3.er trigger) | no | FEATURE:admin_notifications |
| 61 | `20260913090000_publication_minimum.sql` | mínimo para publicar | fn `pp_require_minimum_to_publish` + trigger `trg_zz_pp_minimum` | — | «8 chiffres… numéro marocain»; hint FR | CORE |
| 62 | `20260913100000_publication_minimum_v2.sql` | ciudad opcional si remoto | fn v2 | — | hint FR | CORE |
| 63 | `20260913120000_relance_sans_telephone.sql` | vista de relances | `v_reminder_targets` v2 (nombres sin esquema) | `reminder_emails`, `users.no_reminders` **NO-REPO** | no | FEATURE:reminders |
| 64 | `20260915120000_profile_edits_audit.sql` | journal de retoques | tabla `profile_edits_audit`(identity) + 2 índices + RLS; RPC `admin_revert_profile_edit` | pivote **NO-REPO** | no | FEATURE:admin_quality |
| 65 | `20260915130000_publication_minimum_v3_un_seul_nom.sql` | un nombre basta | fn v3 | — | hint FR | CORE |
| 66 | `20260915140000_retour_appel.sql` | «¿descolgó?» | tabla `call_outcomes` + índice + índice único por día; col `pp.no_answer_flagged_at`; 4 claves `internal_config`; RPC `log_call_outcome(uuid,bool)`; `admin_no_answer_pros` | `client_ip()`, clave `review_ip_salt` **NO-REPO**; `extensions.digest` | no | FEATURE:call_outcomes |
| 67 | `20260915150000_retour_appel_v2.sql` | tramos y purga | col `delay_bucket`; índice; 3 claves; fn `purge_call_outcome_hashes`; `log_call_outcome(uuid,bool,text)`; `admin_no_answer_pros` v2 | ídem | no | FEATURE:call_outcomes |
| 68 | `20260915155000_retour_appel_whatsapp.sql` | canal WhatsApp (parcial) | col `call_outcomes.channel` + índice único nuevo; **cuerpo de `log_call_outcome` 4 args «voir la base»** | — | no | FEATURE:call_outcomes (parcial) |
| 69 | `20260915160000_candidature_previent_le_client.sql` | avisar al cliente | fn+trigger `candidatures_notify_admin` | — | no | FEATURE:demandes |
| 70 | `20260917100000_diplome_un_mois_de_plus_preparation.sql` | preparación (parcial) | CHECK `profile_edits_audit_field_check` ampliado; **cuerpos «voir la base»** | — | no | FEATURE:diploma (parcial) |
| 71 | `20260917150000_diplome_reprise_cible.sql` | mail de reprise | fn `app_private.diploma_reprise_cible`, `public.diploma_reprise_targets` | `app_private.diploma_notices`, `pp.diploma_*` **NO-REPO** (LANGUAGE sql → falla) | no | FEATURE:diploma |
| 72 | `20260917170000_promo_virement_et_offre_entreprise.sql` | transferencia + oferta empresa | cols `promo_settings` (job_*, `transfer_hold_days`, `bank_*` ×6); cols `promo_orders` ×7; CHECK product; fn `_promo_slots_used` v3, `_promo_featured_used` v2, `promo_availability` v3, `_promo_eligibility` v4, `_promo_fire_mail`, `promo_create_order` v3, `promo_create_job_order`, `promo_submit_brief` v2, `promo_declare_transfer(uuid)`, `promo_bank_details`, `promo_mark_paid` v3, `admin_promo_mark_paid`, `admin_promo_orders` v3, `admin_promo_update` v2, `admin_promo_settings`, `admin_promo_settings_update`(21) | `notify_admin_url` (origen para validar fotos); edge `promo-mail` | **sí** (200/150 DH, «9 chiffres… marocain», RIB) | FEATURE:promo |
| 73 | `20260917200000_site_web_gratuit.sql` | «te hacemos la web» | tabla `website_requests` + 2 índices + trigger + RLS 1 + grants por columna; RPC `website_request_submit`, `website_my_request`, `admin_website_requests`, `admin_website_request_update` | `fire_notify_admin`, `_promo_fire_mail`, `_promo_log_failure` | «9 chiffres», «au Maroc», `site_lang` fr/ar/both, textos FR | FEATURE:website |
| 74 | `20260917210000_virement_justificatif.sql` | justificante | col `promo_orders.transfer_proof_path`; `promo_declare_transfer(uuid,text)` (drop 1-arg); `admin_promo_orders` v4 | policies del bucket `credentials` **NO-REPO** | no | FEATURE:promo |
| 75 | `20260917240000_soutien_don.sql` | donación | RPC pública `don_bank_details()` | `promo_settings.bank_*` | «1 dh» | FEATURE:soutien |
| 76 | `20260920113039_protect_profile_promotion_moderation.sql` | guard v2 | `pp_guard_privileged_cols` v2 (congela `featured_until`, `no_answer_flagged_at`, `diploma_*`) | cols `pp.diploma_*` **NO-REPO** (plpgsql: falla en runtime, no al crear) | no | CORE |
| 77 | `20260920113119_public_profile_projection.sql` | proyección pública | fn `app_private.get_public_professional_profiles` + wrapper `public.` (BEGIN ATOMIC); `search_professionals` v6 (enmascara ciudad); `notify pgrst` | **tipo `public.diploma_status` NO-REPO → falla al crear** | no | CORE |
| 78 | `20260920120000_campagne_offres.sql` | campaña 09/2026 | CHECK `reminder_emails.kind`; índice único; vista `v_campagne_offres_cibles` | `reminder_emails`, `diploma_notices` **NO-REPO** | sí (campaña KD) | MA |
| 79 | `20260920124643_product_funnel_and_city_inventory.sql` | analítica producto | tablas `app_private.product_events`, `product_measurement`, `professional_activation` (sin IF NOT EXISTS); fn `record_first_publication` + trigger `product_first_publication`; `log_product_event` (+wrapper); `get_city_inventory` (+wrapper); `admin_product_funnel` (+wrapper) | FK a `categories(slug)`, `cities(slug)` | no | FEATURE:product_analytics |
| 80 | `20260920134500_campagne_offres_ordre_et_format.sql` | campaña v2 | vista v2 | ídem 78 | sí | MA |
| 81 | `20260920153103_private_cv_library.sql` | CV privados | esquema `app_private`; tabla `cv_documents`; 7 fn `app_private.cv_*`/`admin_cv_*` + 6 wrappers `public`; bucket `cv-documents` + 4 policies; `grant usage on schema app_private`; trigger `cv_cleanup_before_account_delete` en `auth.users` | — | idiomas fr/ar/en/es/de/nl | FEATURE:cv |
| 82 | `20260921080401_audit_secure_contact_and_unsubscribe.sql` | tokens + formulario | tablas `app_private.reminder_unsubscribe_tokens`, `email_token_key`(secreto generado); fn `issue_reminder_unsubscribe_token`, `unsubscribe_reminders_token`, `unsubscribe_reminders(uuid)` v2; cols `contact_messages.reference/request_key` + 2 índices; tabla `app_private.contact_ingestion`; fn `contact_validate` + trigger; `submit_contact`; `claim_contact_notification` | `contact_messages` **NO-REPO** → falla; `client_ip()`, `review_ip_salt`; `extensions.hmac/digest/gen_random_bytes` | no | FEATURE:reminders+contact |
| 83 | `20260921080547_audit_storage_account_deletion.sql` | baja en 2 fases | tabla `app_private.account_delete_jobs`; fn `account_delete_begin/files/failed`; `account_storage_writable` + 2 policies restrictivas en `storage.objects`; `cv_require_storage_cleanup` v2 (todos los ficheros); `delete_my_account` v3; `tg_snapshot_account_deletion` v2 | — | mensaje «khdemlidaba.ma» | FEATURE:account_deletion |
| 84 | `20260921080701_audit_email_delivery.sql` | evidencia de entrega | tablas `app_private.email_delivery`, `email_delivery_events`, `email_suppressions`; fn `email_recipient_allowed`, `record_email_delivery_event`, `diploma_sync_delivery` + **trigger sobre `app_private.diploma_notices`**, `admin_email_delivery`, `my_email_delivery_status`, `sync_confirmed_email` + trigger en `auth.users` | `diploma_notices` **NO-REPO** → falla | no | FEATURE:email_delivery |
| 85 | `20260921200000_campagne_avis.sql` | campaña avis | índice único; vista `v_campagne_avis_cibles`; CHECK | `reminder_emails`, `diploma_notices` **NO-REPO** | sí | MA |
| 86 | `20260923120000_push_apns_trigger.sql` | push iOS | fn `fire_push_apns` + trigger `trg_notifications_push` | `device_tokens` **NO-REPO** (runtime); edge `push-apns` | «KhdemliDaba» como título por defecto | FEATURE:push |
| 87 | `20260923131407_audit_private_campaign_recipients.sql` | cerrar vista | revoke/grant en `v_campagne_avis_cibles` | vista de 85 | sí | MA |
| 88 | `20260925115759_add_internship_categories.sql` | 10 categorías «stage» | **`BEGIN;`/`COMMIT;` dentro del fichero**; CHECK `categories_family_check` (9 familias); 10 inserts con `requires_diploma` | col `requires_diploma`, `family` **NO-REPO** | sí (ستاج, practicas) | MA |
| 89 | `20260925210000_demandes_une_semaine.sql` | demandas 7 días | default `expires_at`; update; comment | edge `demandes-purge` (cron externo) | no | FEATURE:demandes |
| 90 | `20260925220000_campagne_bilan_2026_09.sql` | campaña bilan | CHECK; índice único; vista `v_campagne_bilan_cibles` | `reminder_emails`, `diploma_notices` **NO-REPO** | sí | MA |
| 91 | `20260926094150_contact_matching_and_analytics.sql` | regla única de elegibilidad | fn `app_private.matching_professionals`; `search_professionals` v7 (`search_path ''`); `create_demande` v2; `get_city_inventory` v2 | pivote, `categories.allows_remote` | textos FR | CORE |
| 92 | `20260926201956_client_growth_measurement.sql` | medición cliente | CHECKs `product_events` + col `page_path`; fn `measurement_page` (**rutas FR hardcodeadas**: `/recherche`, `/metiers`, `/demandes`, `/devis-gratuit`, `/salaires`, `/cv-gratuit`, `/site-web-gratuit`, `/professionnels`, `/ville/`, `/metier/`, prefijo `/ar`); `log_product_event_v2` (+wrapper); tabla `app_private.request_outcomes`; `my_request_outcomes`, `set_request_outcome` (+wrappers); `admin_client_results` (+wrapper) | 79 | rutas FR | FEATURE:product_analytics |
| 93 | `20260926202006_salary_observatory.sql` | observatorio salarial | tabla `app_private.salary_contributions` (`amount between 500 and 500000`); fn `contribute_salary`, `withdraw_salary`, `my_salary_contribution`, `salary_range` (+4 wrappers) | — | rangos pensados en MAD | FEATURE:salary |
| 94 | `20260927100000_suppression_compte_app_13.sql` | compat app 1.3 | `delete_my_account` v4 (borra filas `storage.objects` en 3 buckets) | — | no | FEATURE:account_deletion |
| 95 | `20260927100100_alertes_et_tri_ville_masquee.sql` | modo notify | `matching_professionals` v2; `create_demande` v3 | — | textos FR | CORE |
| 96 | `20260927100200_retours_clients_durables.sql` | retours sin cascada | cols en `request_outcomes`; drop FK; backfill; delete huérfanos; NOT NULL; 2 índices; `my_request_outcomes` v2, `set_request_outcome` v2, `admin_client_results` v2 | 92 | no | FEATURE:product_analytics |
| 97 | `20260927130000_retours_clients_trente_jours.sql` | 30 días | fn `request_outcome_window`, `request_outcome_deadline` (**Casablanca**); `result` nullable + CHECK; fn+trigger `tg_demandes_keep_outcome`; fn+trigger `tg_users_forget_outcomes`; `my_request_outcomes` v3 (drop+create); `set_request_outcome` v3; `purge_request_outcomes` (+wrapper); `admin_client_results` v3 | — | zona horaria | FEATURE:product_analytics |
| 98 | `20260928205855_louay_exchange_admin.sql` | bureau de change | esquema `private`; tablas `exchange_boards`, `exchange_editors`, `exchange_rate_history`; 5 policies; fn `private.validate_exchange_board`, `private.audit_exchange_board` + 2 triggers; **DO que lanza excepción si no existe la `website_request` de Louay (tel. 0536337383)**; inserts | `website_requests` con ese dato | **sí** (Nador, MAD) | MA (falla) |
| 99 | `20260928211935_louay_brand_and_verified_address.sql` | louay v2 | fn v2; `private.advance_exchange_version` + trigger; recrea trigger de auditoría; update | 98 | sí | MA |
| 100 | `20260929163557_website_quote_requests.sql` | **formulario `/creation-site-web`** | cols `website_requests.request_kind/project_brief/submitted_at`; `city_id` nullable; CHECK status v2 (draft…cancelled); índice único `website_one_quote_draft`; esquema `app_private`; tabla `app_private.website_quote_files`; bucket `website-briefs` + 3 policies; fn `website_quote_save`, `website_quote_file_access`, `website_quote_file`, `website_quote_my` (+3 wrappers); `website_request_submit` pasa a lanzar `SITE_QUOTE_REQUIRED`; `website_my_request` v2; `admin_website_requests` v2 (lee `p.diploma_status`); `admin_website_request_update` v2; `account_delete_files` v2 | `app_private.account_delete_jobs` (83); `pp.diploma_status` **NO-REPO** (runtime) | idiomas fr/ar/en/es/de/nl | FEATURE:website_quote |

Recuento por clase (sobre 100): CORE 44 (incluidos los «CORE(col)+MA(datos)» de 15, 45, 47 y los parciales 30, 40, 43), FEATURE 37, MA 14 (3, 7, 19, 22, 34, 78, 80, 85, 87, 88, 90, 98, 99 + la mitad de datos de 15/45/47), TRAZA 6 (27, 50, 52, 53, 54, 55; 52 además rompe). Objetos que el repo sí crea: 38 tablas (24 `public` + 14 `app_private`), 139 funciones distintas (102 `public` + 37 `app_private`), 33 triggers, 16 vistas, 4 buckets.

---

## 4. Lo que la cadena da por supuesto y nunca crea (la «capa fantasma»)

Objetos referenciados con esquema en los ficheros y **no creados por ningún fichero** (análisis automático sobre los 100 ficheros; recuento = ficheros que lo usan):

| Objeto | Usado en | Dónde nació en producción |
|---|---|---|
| `public.is_admin()` | 24 ficheros (desde `20260729000000`) | `auth_trigger_and_admin` (22/07, dashboard) |
| `app_private.professional_categories` (+ esquema) | 15 | `multi_categories_v2` (07/08) |
| `public.reminder_emails` | 6 | `reminder_emails_tracking` (01/08) |
| `app_private.diploma_notices` | 6 | `diploma_notices_and_pause` (01/09) |
| `public.client_ip()` | 3 | `p2_xff_last_hop_and_regressions` (22/08) — el fichero 27 sólo lo describe |
| `public.admin_notifications` | 2 | `admin_signup_notifications` (01/08) |
| `public.contact_messages` | 2 | `contact_messages` (27/07) |
| `public.device_tokens`, `register_device_token`, `unregister_device_token` | 1+1+1 | `device_tokens_push_notifications` (06/08) |
| `public.submit_review`, `reviews.status`, `admin_list_reviews`, `moderate_review` | 1, 1, 1, — | `reviews_public_submission` y siguientes (11/08) |
| `public.log_contact_event`, `contact_events.visitor_hash` uso, clave `review_ip_salt` | 1 | `p1_contact_events_bucket_and_idor` (22/08) |
| `public.set_professional_categories`, `get_professional_categories` | 1 | `multicat_v2_rpc_only_pipeline` (07/08) |
| `public.diploma_status` (enum), `pp.diploma_status/auth_status/diploma_grace_until/diploma_submitted_at/diploma_verified_at/auth_verified_at/diploma_origin/diploma_gate_blocked_at`, `categories.requires_diploma`, `profile_requires_diploma()`, `enforce_diploma_gate()` + trigger `trg_diploma_gate`, `submit_credential`, `admin_review_diploma`, `admin_review_authorization`, `diploma_next_notices`, `diploma_pause_expired`, `diploma_notice_sent`, `my_credential_state`, `record_email_event`, `admin_credential_queue`, `app_private.credential_submissions`, `app_private.verified_backup`, bucket `credentials` + 4 policies | 1 directo, muchos indirectos | 14 migraciones `diploma_*`/`verification_*` del 01/09 |
| `categories.family` + CHECK | 2 | `categories_family` (21/08) |
| vistas `v_daily_kpis`, `v_gaps`, `v_top_cities_7d`, `v_top_categories_7d`, `v_reminder_targets` | 1 | `daily_report_views` (02/08) |
| tablas `followups`, `ig_pending_replies`, `learned_examples`, `telegram_messages` | 1 | `ig_telegram_bot_tables` (19/08) |
| `users.is_admin`, `users.last_seen_at`, `users.no_reminders`, `sync_last_seen()` + trigger `on_auth_user_signin`, trigger `on_auth_user_created` | implícito en 21, 38 | `auth_trigger_and_admin`, `last_seen_sync`, `reminders_no_reminders_and_unsub_rpc` |
| `pp.onboarding_step`, `pp.whatsapp_enabled` | implícito en 6, 16 | `add_onboarding_step_and_whatsapp_enabled` (23/07) |
| 70 ciudades (`all_moroccan_cities`), ~70 categorías adicionales (`more_categories`, `add_qualified_categories`, `add_audiovisual_categories`, `add_management_categories`, `add_vitrier_category`, `add_category_nutritionniste`, `slim_categories_mano_de_obra`, `add_professeur`) | datos | 23/07–12/08 |
| 11 RPC admin (`admin_kpis`…), `admin_broadcast`, `tg_reviews_notify_admin` + trigger `reviews_notify_admin` | 40, 51 | `admin_redesign_rpcs` (29/08) y `admin_broadcast_notifications` (01/09) |
| `tbib_*` (9 tablas, 5 enums) | — | `tbibdaba_v1_schema` (31/08); **no lo usa ningún fichero ni el front de khdemlidaba: se poda** |

Consecuencia: **cualquier procedimiento que no empiece por un volcado de `eiacoozyubxkbjwhgkml` reproducirá un esquema incompleto** (sin diplomas, sin recordatorios, sin contacto, sin push, sin multi-categoría) y además fallará en 26 ficheros.

---

## 5. Puntos de la cadena que exigen adaptación para España

Agrupados por tema, con fichero y qué cambiar. Nada de esto se toca en esta fase.

**Seeds y taxonomía**
- `20260101000002_seed_data.sql`: sustituir íntegro por `cities` = provincias/ciudades españolas (hoy misautonomos guarda `provincia`/`ciudad`/`municipio` como texto: 12 provincias y 28 ciudades distintas en 46 perfiles) y `categories` = las 17 categorías españolas (`abogado, albanil-reformas, asesoria-gestoria, autonomo-limpieza, carpintero, cerrajero, climatizacion-calefaccion, electricista, empresa-multiservicios, fontanero, informatico-domicilio-soporte-it, jardinero, marketing-digital-diseno-web, peluqueria-estetica-domicilio, persianas-toldos, pintor, transportista`) con `emoji`, `aliases` (sinónimos castellanos, no darija), `family` (9 familias del CHECK de `20260925115759`: `batiment, maison, beaute, sante, restauration, logistique, evenementiel, bureau, stages` — renombrar o mantener como claves internas), `allows_remote`, `requires_diploma=false`. Los 30 perfiles demo no se importan.
- `20260812100000` (9 categorías + alias darija), `20260829000000` (8), `20260925115759` (10 «stage»), `20260724020000`, `20260816200000`: saltar; en su lugar un seed español.
- `20260830100000` / `20260830200000`: la lógica `works_remote`/`hide_city` es CORE; los `update … where slug in (…)` apuntan a slugs marroquíes → sustituir por los slugs españoles remotos (`marketing-digital-diseno-web`, `informatico-domicilio-soporte-it`, `asesoria-gestoria`, `abogado`…); el backfill por descripción ya incluye `'%en línea%'`/`'%online%'`.
- `20260829200100`: la heurística de género usa nombres marroquíes; para los 46 perfiles españoles hay que decidir el valor (`homme`/`femme` siguen siendo las claves que entiende el front) o dejarlos a un valor por defecto antes del `set not null`.

**Teléfonos**
- `20260724040000`: prefija `+`; para España los datos de `telefono_contacto`/`whatsapp_phone_number` (texto libre) deben normalizarse a `+34…` antes.
- `20260913090000/100000/130000`: regla «≥ 8 cifras» — un móvil español tiene 9, pasa; mantener.
- `20260917170000` (`promo_create_job_order`) y `20260917200000` (`website_request_submit`): «≥ 9 cifras» — pasa con 9; `20260929163557` (`website_quote_save`): `between 9 and 15` — pasa.

**Moneda**
- `20260910120000`, `20260912100000`, `20260917170000`: columnas `price_mad`, `ad_budget_mad`, `amount_mad`, `featured_price_mad`, `job_price_mad`, `job_ad_budget_mad`, y literales `format('Montant reçu %s DH…')`, defaults 200/100/50/200/150. Decisión: mantener nombres de columna (el front los lee así) y cambiar defaults/etiquetas a euros, o renombrar a `*_cents`/`*_eur` tocando front y SQL a la vez. `promo_settings.bank_rib/iban/bic/agency` → IBAN/BIC españoles (datos del dueño, no del SQL).
- `20260926202006`: `amount between 500 and 500000` está pensado en dirhams/mes; en euros el rango razonable es otro.
- `20260928205855`: `exchange_*` (MAD) → podar.

**Zona horaria**: `Africa/Casablanca` en `20260828100000` (`v_email_sends_today`), `20260910120000` (`_promo_week_start`), `20260927130000` (`request_outcome_deadline`) → `Europe/Madrid`.

**URL y proyecto**: `20260801200000` inserta `notify_admin_url = https://eiacoozyubxkbjwhgkml.supabase.co/functions/v1/notify-admin` → `https://dquxsethatxtptfviiwd.supabase.co/functions/v1/notify-admin` (las tres funciones de HTTP derivan `promo-mail` y `push-apns` de esa URL, y `promo_create_job_order`/`promo_submit_brief` validan el origen de las fotos con ella). `notify_admin_cron_key` y `review_ip_salt` se generan nuevos.

**Textos dentro del SQL (francés)**: `20260829120000` (3 RPC: títulos/cuerpos de notificaciones), `20260910120000`, `20260912100000`, `20260917170000` (notificaciones promo, «@khdemlidaba»), `20260917200000` (website), `20260913*` (hints `PROFILE_INCOMPLETE`), `20260921080547` («use account deletion on khdemlidaba.ma»), `20260923120000` (título por defecto «KhdemliDaba»), `20260801000000` (author default «KhdemliDaba», `locale` default `'fr'`), `20260921200000`/`20260925220000` (`languages = array['ar']`). El front de khdemlidaba muestra estos textos tal cual en la campanita: hay que traducirlos en SQL o pasar a claves i18n.

**Rutas**: `20260926201956` `measurement_page()` sólo acepta rutas francesas; si misautonomos conserva las rutas de khdemlidaba (`/recherche`, `/metiers`…) no hay cambio; si se traducen las URLs, hay que reescribir la lista.

**Legal**: `20260729000000`, `20260821210000`, `20260829150000` hablan de «loi 09-08» (CNDP); la mecánica (versión + timestamp) vale para RGPD, pero `20260821210000` (backfill con versiones `v1-2026-07-29`/`v2-2026-08-19` de KhdemliDaba) **no** se aplica.

**Campañas y Louay**: 78, 80, 85, 87, 90, 98, 99 no se aplican; en el volcado se podan las 5 vistas `v_campagne_*`, las 3 tablas `exchange_*`, el esquema `private`, las 9 `tbib_*` + 5 enums `tbib_*`, y las 4 tablas IG/Telegram.

---

## 6. Colisiones con lo que ya existe en dquxsethatxtptfviiwd

Consultado `information_schema.tables`, `pg_proc`, `pg_trigger`, `pg_policies`, `pg_event_trigger` en dquxsethatxtptfviiwd.

**Tablas (7)** — mismo nombre, otra forma (ids `text`, columnas Base44 `created_date/updated_date/created_by_id`):

| Tabla | Forma actual en misautonomos | Forma khdemlidaba |
|---|---|---|
| `users` | `id text`, `auth_user_id uuid`, `email not null`, `full_name`, `role` (`'admin'`), `user_type`, `phone`, `city`, 20 cols de suscripción/push, `email_unsubscribed`, `unsubscribe_token`; 3 policies (`users_admin_all`, `users_self_read`, `users_self_update`) | `id uuid = auth.users.id`, `user_type` check, `first_name/last_name`, `phone unique`, `email unique`, `is_admin`, `last_seen_at`, `user_type_explicit`, `cgu_*`, `no_reminders`, `admin_notifications_enabled`; 4 policies + guard trigger |
| `professional_profiles` | `id text`, `user_id text`, `business_name`, `cif_nif`, `iban`, `categories text[]`, `provincia/ciudad/municipio text`, `photos text[]`, `imagen_principal`, `social_links jsonb`, `average_rating`, `total_reviews`, `estado_perfil`, `visible_en_busqueda`, `slug_publico`, `years_experience numeric`…; 4 policies | `id uuid`, `user_id uuid unique`, `slug`, `first_name/last_name`, `category_id int`, `city_id int`, `gallery`, `avatar_url`, `socials`, `rating_avg/rating_count`, `published`, `verified`, `gender not null`, `works_remote`, `hide_city`, `diploma_*`, `featured_until`…; 4 policies + 5 triggers |
| `reviews` | `id text`, `professional_id text`, `client_id text`, `rating numeric`, `rapidez/comunicacion/calidad/precio_satisfaccion`, `conversation_id`, `professional_response`; 4 policies | `id uuid`, `professional_id uuid`, `author_id uuid`, `rating smallint 1..5`, `status`; índice único autor+pro |
| `favorites` | `id text`, `client_id text`, `professional_id text`, `business_name`; 4 policies | PK `(user_id uuid, professional_id uuid)`; 3 policies |
| `notifications` | `id text`, `user_id text`, `type`, `message`, `is_read`, `metadata`, `priority`; 4 policies | `id uuid`, `user_id uuid→users`, `kind`, `title`, `body`, `url`, `read_at`; 4 policies + trigger push |
| `blog_posts` | `id text`, `title_es/title_en`, `content_es/content_en`, `excerpt_*`, `meta_*_es/en`, `status`, `featured`, `publish_date`; 2 policies | `id bigserial`, `locale`, `title`, `content_md`, `published`, `published_at`, `faq jsonb`; 2 policies |
| `reports` | `id text`, `reporter_id`, `reported_user_id`, `conversation_id`, `message_id`, `status`; 2 policies | `id bigserial`, `target_type`, `target_id uuid`, `reason` check, `handled_at`; 3 policies |

No colisionan (sólo existen en un lado): en misautonomos `service_categories`, `tickets`, `messages`, `blocks`, `quote_requests`, `review_requests`, `profile_metrics`, `translations` y 37 tablas CRM/Base44; en khdemlidaba `categories`, `cities`, `contact_events`, `internal_config`, `demandes`, `candidatures`, `website_requests`, `promo_*`, etc.

**Funciones (nombre igual)**:
- `public.handle_new_user()` — existe en misautonomos (inserta `users(id,email,full_name)` con `NEW.id` sin cast) pero **no está enganchada a ningún trigger** (huérfana); khdemlidaba la redefine 3 veces (`20260724000000`, `20260729010000` + dashboard). `create or replace` la pisa sin error.
- `public.is_admin()` — misautonomos: `role = 'admin' from users where auth_user_id = auth.uid()`; khdemlidaba: `is_admin from users where id = auth.uid()`. **Las 137 policies legacy la invocan** (p.ej. `users_admin_all`, `bp_admin_all`, `sc_admin_all`): el instante en que se sustituya, el admin legacy (1 usuario) deja de ser admin sobre `legacy_*` hasta que exista su fila en la nueva `users` con `is_admin=true`.
- `public.submit_review(p_token text, p_rating numeric, p_comment text, p_comunicacion numeric, p_calidad numeric, p_rapidez numeric, p_precio_satisfaccion numeric, p_client_name text)` — khdemlidaba tiene `submit_review(text, smallint, text, text, text, timestamptz)`: **no se pisa, se sobrecarga**; PostgREST devolverá «ambiguous function» si ambas quedan expuestas. Hay que borrar la legacy (o renombrarla `legacy_submit_review`) antes de crear la nueva.
- Sin colisión pero relacionadas: `delete_account(p_uid uuid)` vs `delete_my_account(text,text)`; `get_admin_stats(date,date)` vs `admin_kpis(int)`; `handle_updated_at()` vs `touch_updated_at()`; `notify_send_push()` vs `fire_push_apns()`; `track_profile_metric` vs `log_product_event`; `get_pro_visibility`, `get_my_dashboard`, `create_review_request`, `get_review_request`, `fill_ticket_identity`, `notify_new_ticket`, `clean_message_names`, `enforce_message_block`, `prettify_name`, `current_app_user_id`, `current_app_user_email`, `rls_auto_enable` (event trigger).

**Triggers**:
- `on_auth_user_created` sobre `auth.users` → hoy `public.handle_auth_user_link()` (enlaza por email e inserta `users(id=new.id::text, auth_user_id, email, full_name, role='user')`). khdemlidaba espera el **mismo nombre** apuntando a `public.handle_new_user()` (lo creó `auth_trigger_and_admin`, no está en el repo). Hay que `drop trigger on_auth_user_created on auth.users` y recrearlo; durante la ventana se puede conservar el legacy con otro nombre (ver §9).
- `trg_clean_message_names`, `trg_enforce_message_block`, `trg_notify_send_push` (sobre `messages`), `trg_fill_ticket_identity`, `trg_notify_new_ticket` (sobre `tickets`): sin colisión.
- Event trigger `ensure_rls -> rls_auto_enable` (`ddl_command_end`): activa RLS automáticamente en toda tabla nueva de `public`. Los ficheros de khdemlidaba ya hacen `enable row level security` en todas sus tablas `public`; no cambia nada, pero conviene saber que está.
- Nombres de triggers de khdemlidaba (`trg_users_touch`, `trg_pp_touch`, `trg_reviews_rating`…) no existen en misautonomos: sin colisión. Nota: en producción el guard de perfiles se llama `trg_00_pp_guard` (renombrado desde el dashboard para ejecutarse antes de `trg_diploma_gate` y `trg_zz_pp_minimum`); el fichero `20260821200000` lo crea como `trg_pp_guard`. El volcado trae el nombre bueno.

**Policies**: los nombres `users_self_read` y `users_self_update` existen en ambos lados; como las policies pertenecen a la tabla, al renombrar `users → legacy_users` se van con ella y la nueva `users` recibe las suyas sin conflicto.

**Tipos/secuencias**: misautonomos no tiene enums en `public`; khdemlidaba necesita `public.diploma_status`. Las tablas Base44 usan `text default gen_random_uuid()::text` (sin secuencias), así que `reports_id_seq`, `blog_posts_id_seq`, `contact_events_id_seq`, `account_deletions_id_seq`, `system_failures_id_seq` se crean sin choque.

**Storage**: misautonomos tiene 1 bucket `uploads` (público, 183 objetos; ruta `src/api/base44Client.js:280-284`); khdemlidaba necesita `photos`, `credentials`, `cv-documents`, `website-briefs`. Sin colisión de nombres; la migración de ficheros `uploads/… → photos/<uid>/…` es de la capa de datos.

**Realtime**: la publicación `supabase_realtime` de misautonomos incluye `public.messages` (chat legacy); nada de khdemlidaba la usa.

---

## 7. Cómo aplica la cadena la suite pglite y qué pasó al ejecutarla

- Ningún test recorre `supabase/migrations` completo. Cada uno crea `new PGlite()` (memoria), ejecuta un bootstrap SQL propio y aplica ficheros concretos:
  - `scripts/product-database.test.mjs`: `scripts/fixtures/profile-security.sql` (150 líneas: roles `anon/authenticated/service_role`, `auth.uid()`, esquema `app_private`, `users(id,is_admin)`, `categories`, `cities`, `professional_profiles` con 43 columnas «captured from production on 2026-09-20», `professional_categories`, `is_admin()`, policies) + 3 ficheros: `20260920113039`, `20260920113119`, `20260920124643`.
  - `scripts/cv-database.test.mjs`: bootstrap + `20260920153103`.
  - `scripts/growth-database.test.mjs`: bootstrap + 5 ficheros (`20260920124643`, `20260926201956`, `20260927100200`, `20260927130000`, `20260926202006`).
  - `scripts/contact-matching-database.test.mjs`: bootstrap + 2 ficheros localizados por sufijo (`_contact_matching_and_analytics.sql`, `_alertes_et_tri_ville_masquee.sql`).
  - `scripts/audit-communications-database.test.mjs`: bootstrap (crea a mano `auth.users`, `public.users`, `storage.objects`, `is_admin()`, la vista `v_campagne_avis_cibles`…) + 5 ficheros (`20260921080401`, `20260921080547`, `20260921080701`, `20260923131407`, `20260927100000`).
- Ejecutado `node --test scripts/product-database.test.mjs` desde `/Users/bigseo/khdemlidaba` (sin modificar nada): **6 subtests, 6 pass, 0 fail**, `duration_ms 3387.9`, tiempo de pared `real 3.77 s` (`user 5.59 s`, `sys 1.30 s`), PGlite `0.5.8`. Es decir: el fixture + 3 migraciones se aplican limpios en ~3 s; **no mide la cadena de 100**.
- Si se intentara la cadena completa en pglite fallaría en el fichero 1 (`references auth.users`, esquema inexistente) y en el 28 (`alter role authenticator`); los autores lo saben y por eso usan fixtures.

**Simulación en seco sobre dquxsethatxtptfviiwd (sin baseline), fichero a fichero** — fallarían 26: 10 (`is_admin`), 13 (`reminder_emails`), 14 (vistas sobre `admin_notifications`), 16, 17 (pivote), 21 (revokes/vistas inexistentes), 24 (`submit_review`), 25 (`log_contact_event`), 30 (`admin_list_reviews`, tablas IG/TG), 32 (`admin_notifications`, `reminder_emails`), 34 (`family`), 51 (`raise`), 52 (sintaxis), 60 (`contact_messages`), 63 (`reminder_emails`), 71 (`diploma_notices`), 77 (enum `diploma_status`), 78, 80 (`reminder_emails`/`diploma_notices`), 82 (`contact_messages`), 84 (trigger sobre `diploma_notices`), 85, 90 (ídem 78), 88 (`requires_diploma`), 98 (`raise` Louay), 99 (depende de 98). Y 6 más se crearían pero fallarían en tiempo de ejecución (57, 76, 86, 100 por columnas `diploma_*`/`device_tokens`; 66, 67 por `client_ip()`/`review_ip_salt`).

---

## 8. Lista ordenada: qué se APLICARÍA y qué se SALTARÍA

Premisa obligatoria: **primero la migración 0 = volcado de esquema de eiacoozyubxkbjwhgkml** (ver §9, paso 2). Con ese volcado, el estado resultante ya *contiene* el efecto neto de los 100 ficheros: ninguno hay que re-ejecutar. La lista siguiente responde a la pregunta «si se quisiera reconstruir la base a partir de ficheros, cuáles entran» y sirve de checklist de lo que el volcado debe contener y de lo que hay que podar/adaptar.

**APLICARÍAN (74), en este orden** — se marca `[adaptar]` donde la sección 5 exige cambios:
1 initial_schema · 2 rls_policies · 4 storage_photos · 5 user_type_explicit · 6 whatsapp_phone · 8 delete_my_account_allow_storage · 9 phone_e164 `[adaptar +34]` · 10 legal_cgu_users_reports · 11 cgu_from_metadata · 12 blog_posts `[adaptar defaults locale/author]` · 13 client_conversion · 14 admin_notifications `[adaptar URL]` · 15 categories_aliases `[sólo columna+índice]` · 16 search v1 · 17 count_by_category · 18 sync_users_from_pp · 20 socials · 21 p0_security_hardening · 23 notifications_inbox · 24 p1_reviews · 25 p1_contact_events · 26 photos_bucket_limits · 28 cap_postgrest_rows · 29 account_deletions_audit · 30 p2_security_hardening `[sin el DO de las 4 tablas IG/TG]` · 31 favorites · 32 email_reorg `[Europe/Madrid]` · 33 quality_review_safety · 35 pivot_drift (no-op) · 36 demandes_candidatures `[textos]` · 37 cgu_acceptances · 38 fix_users_guard · 39 search v2 · 40 admin_redesign (cols) · 41 blog_faq · 42 gender · 43 gender NOT NULL `[otra heurística]` · 44 admin_stats · 45 works_remote `[slugs]` · 46 search p_mode · 47 hide_city `[slugs]` · 48 search hide_city · 49 v_demandes_public · 56 credentials_bucket_limits · 57 promo_instagram `[EUR, textos, TZ]` · 58 promo_featured `[EUR]` · 59 promo_eligibility · 60 alertes_telegram · 61, 62, 65 publication_minimum v1-v3 `[hints]` · 63 relance_sans_telephone · 64 profile_edits_audit · 66, 67 retour_appel v1-v2 · 68 retour_appel_whatsapp (parte ejecutable) · 69 candidature_previent · 70 diplome_preparation (parte ejecutable) · 71 diplome_reprise_cible · 72 promo_virement `[EUR, IBAN, textos]` · 73 site_web_gratuit `[textos]` · 74 virement_justificatif · 75 soutien_don · 76 guard v2 · 77 public_profile_projection · 79 product_funnel · 81 private_cv_library · 82 audit_secure_contact · 83 audit_storage_account_deletion `[mensaje]` · 84 audit_email_delivery · 86 push_apns `[título]` · 89 demandes_une_semaine · 91 contact_matching `[textos]` · 92 client_growth `[rutas]` · 93 salary_observatory `[rangos EUR]` · 94 suppression_compte_app_13 · 95 alertes_tri_ville · 96 retours_durables · 97 retours_trente_jours `[TZ]` · 100 website_quote_requests.

**SALTARÍAN (26)** y por qué:
- 3 seed_data — seed marroquí; se sustituye por seed español.
- 7 rename_traiteur, 19 reclassify, 34 add_8_categories, 88 add_internship_categories, y la parte de datos de 15/45/47 — categorías/alias/slugs marroquíes (88 además lleva `BEGIN;/COMMIT;` propios, que rompen el envoltorio transaccional del runner de Supabase).
- 22 backfill_cgu — versiones legales de KhdemliDaba y fechas de sus cuentas.
- 27, 50, 53, 54, 55 — sólo comentarios (no-op); su contenido real llega con el volcado.
- 51 fix_tuile_a_verifier — `raise exception` si `admin_kpis` no existe; su efecto ya está en el `admin_kpis` del volcado.
- 52 diploma_notices_envoi_reel — fichero roto (línea no SQL).
- 78, 80, 85, 87, 90 — campañas de email fechadas (`offres_2026_09`, `avis_2026_09`, `bilan_2026_09`) de KhdemliDaba; sus CHECK sobre `reminder_emails.kind` sí deben quedar en el volcado (ya están).
- 98, 99 — Louay/exchange (Nador, MAD; 98 lanza excepción sin la `website_request` de Louay).
- 43 se aplica sólo en su cláusula `set not null`, no en la heurística.

---

## 9. Procedimiento propuesto para producción (dquxsethatxtptfviiwd)

Objetivo: dejar en `public` el esquema de khdemlidaba, con las tablas Base44 renombradas a `legacy_*` y la web actual de misautonomos funcionando sobre ellas hasta el corte. Todo en un proyecto de ensayo primero (una rama de Supabase o un proyecto nuevo con el mismo dump de dquxsethatxtptfviiwd).

**Paso 1 — Congelar y copiar (fuera de la base)**
- Backup lógico de dquxsethatxtptfviiwd (`supabase db dump` + `--data-only`) y del bucket `uploads` (183 objetos). `auth.users` (34 filas) no se toca en ningún paso.

**Paso 2 — Construir la «migración 0» a partir del modelo (fuera de la base)**
- `supabase db dump --project-ref eiacoozyubxkbjwhgkml --schema public,app_private,private --file 00_baseline.sql` (esquema, sin datos; el CLI emite `--no-owner`). Añadir a mano: 4 `insert into storage.buckets` (`photos` 5 MB público; `credentials` 15 MB; `cv-documents` 4 MB; `website-briefs` 8 MB), las 17 policies de `storage.objects` (extraídas de `pg_policies where schemaname='storage'`), los 4 triggers sobre `auth.users` (`on_auth_user_created -> public.handle_new_user`, `on_auth_user_signin -> public.sync_last_seen`, `cv_cleanup_before_account_delete -> app_private.cv_require_storage_cleanup`, `sync_confirmed_email -> app_private.sync_confirmed_email`), `alter role authenticator set pgrst.db_max_rows='1000'`, y los `insert into internal_config` de las 10 claves de §2 con valores nuevos.
- Podar: `tbib_*` (9 tablas, 5 enums), `exchange_*` (3 tablas, esquema `private`, 5 policies, 4 funciones, 3 triggers), vistas `v_campagne_avis_cibles`, `v_campagne_bilan_cibles`, `v_campagne_diplome_casa_cibles`, `v_campagne_offres_cibles`, tablas `followups`, `ig_pending_replies`, `learned_examples`, `telegram_messages`, filas de `internal_config` `site_mail_*`/`relance_pro_*`/`jcsecours_mail_sent`. Las cuatro vistas `v_campagne_*` dependen de `reminder_emails`/`diploma_notices` pero nada depende de ellas: borrado limpio.
- Adaptar según §5 (TZ, URL, textos, defaults de moneda, rutas de `measurement_page`, slugs remotos).
- Separar el seed español en `01_seed_es.sql` (`cities`, `categories`); y la migración de datos legacy → nuevo en `02_data_from_legacy.sql` (capa de datos, fuera de este informe).
- Validar `00_baseline.sql` + `01_seed_es.sql` en pglite con un bootstrap como el de `scripts/fixtures/profile-security.sql` (roles, `auth.uid()`, `auth.users`, `storage.*`) y en la rama de ensayo.

**Paso 3 — Renombrar lo viejo (en la base, una transacción)**
```sql
begin;
alter table public.users                 rename to legacy_users;
alter table public.professional_profiles rename to legacy_professional_profiles;
alter table public.reviews               rename to legacy_reviews;
alter table public.favorites             rename to legacy_favorites;
alter table public.notifications         rename to legacy_notifications;
alter table public.blog_posts            rename to legacy_blog_posts;
alter table public.reports               rename to legacy_reports;
-- recomendable, para dejar public limpio aunque no colisionen:
alter table public.service_categories    rename to legacy_service_categories;
alter table public.tickets               rename to legacy_tickets;
-- (y así con las 43 restantes de Base44 si se quiere; policies, índices y triggers viajan con la tabla)
alter function public.submit_review(text,numeric,text,numeric,numeric,numeric,numeric,text) rename to legacy_submit_review;
alter function public.is_admin() rename to legacy_is_admin;          -- ver nota A
alter trigger on_auth_user_created on auth.users rename to legacy_on_auth_user_created;  -- ver nota B
commit;
```
Nota A — `is_admin()`: las 137 policies legacy la invocan **por nombre resuelto en el momento de crear la policy** (Postgres guarda el OID): renombrar la función no rompe las policies, siguen llamando a la misma función aunque ahora se llame `legacy_is_admin`. Así la nueva `public.is_admin()` del baseline no interfiere con `legacy_*`. Lo mismo vale para `current_app_user_id()`/`current_app_user_email()` (no colisionan, se dejan).
Nota B — el trigger legacy sigue ejecutando `handle_auth_user_link()`; en el paso 4 se reescribe para que inserte en `legacy_users`.

**Paso 4 — Reescribir las funciones legacy que nombran tablas (en la base)**
Son 16 de las 21 funciones de misautonomos; con `create or replace` y sustituyendo `public.X`/`X` por `public.legacy_X` en el cuerpo (`pg_get_functiondef` + reemplazo, revisando a mano porque `delete_account` y `get_admin_stats` usan nombres sin esquema):

| Función | Tablas que nombra (→ `legacy_*`) |
|---|---|
| `handle_auth_user_link()` (trigger legacy) | users |
| `handle_new_user()` legacy — **no reescribir: la pisa el baseline**; su versión legacy es huérfana | users |
| `is_admin()` → renombrada `legacy_is_admin` | users |
| `current_app_user_id()`, `current_app_user_email()` | users |
| `fill_ticket_identity()`, `prettify_name()` | users |
| `delete_account(uuid)` | users, professional_profiles, service_categories + 11 tablas CRM |
| `get_admin_stats(date,date)` | users, professional_profiles, reviews, blog_posts, messages, newsletter_subscribers, profile_metrics |
| `get_my_dashboard()` | users, professional_profiles, reviews, messages, profile_metrics, review_requests |
| `get_pro_visibility()` | professional_profiles, messages, profile_metrics |
| `get_review_request(text)` | professional_profiles, review_requests |
| `submit_review(…)` → `legacy_submit_review` | professional_profiles, reviews, review_requests |
| `create_review_request(text,text)` | review_requests |
| `track_profile_metric(text,text)` | profile_metrics |
| `enforce_message_block()` | blocks |
| `notify_new_ticket()`, `notify_send_push()`, `clean_message_names()`, `handle_updated_at()`, `rls_auto_enable()` | sin tablas colisionantes |

**Paso 5 — Aplicar `00_baseline.sql` + `01_seed_es.sql`** (vía `apply_migration` para que quede en el ledger, un fichero por paso). El event trigger `ensure_rls` activará RLS en las tablas nuevas que el baseline ya activa: inocuo. Comprobar al final: `select count(*) from pg_proc where pronamespace='public'::regnamespace` ≈ 136 + 21 legacy; `pg_trigger` sobre `auth.users` = 4 nuevos + 1 legacy renombrado; `storage.buckets` = 5.

**Paso 6 — Ventana de convivencia (la web vieja sigue sirviendo)**
- Front: en `src/api/base44Client.js` cambiar `TABLE_MAP` (líneas 9-28: `User`, `ServiceCategory`, `ProfessionalProfile`, `Review`, `Favorite`, `Notification`, `Ticket`, `BlogPost`… → `legacy_users`, `legacy_service_categories`, …), los tres `supabase.from('users')` (189, 192, 209 → `legacy_users`), y dejar `uploads` como está. `fallbackTable()` (línea 61) debe anteponer `legacy_`. Desplegar a mano (el dueño despliega; no se lanza `vercel deploy` desde aquí).
- Base: las policies legacy, el trigger legacy de alta y las 16 funciones reescritas mantienen el comportamiento de hoy. `notify pgrst, 'reload schema'` tras cada cambio. Realtime: `alter publication supabase_realtime` no cambia (sigue `public.messages`).
- Altas de usuario durante la ventana: `auth.users` tendrá **dos** triggers de INSERT: `legacy_on_auth_user_created → handle_auth_user_link` (escribe `legacy_users`) y `on_auth_user_created → handle_new_user` (escribe `users` nueva con `user_type` por metadata). Es deseable: la cuenta existe en los dos mundos.
- Admin: el admin legacy conserva su acceso vía `legacy_is_admin` (OID enlazado); para el admin nuevo, `update users set is_admin=true` tras `02_data_from_legacy.sql`.

**Paso 7 — Corte**
- Ejecutar `02_data_from_legacy.sql` (91 users → `users` uuid por `auth_user_id` para los 34 con cuenta; 46 perfiles → `professional_profiles` con `category_id`/`city_id` resueltos desde texto, `gender` decidido, `published = visible_en_busqueda`; 3 reseñas; 25 posts → `blog_posts(locale='es', content_md)` + 25 `locale='en'` si hay traducción; 1 notificación; 0 favoritos; 183 objetos `uploads` → `photos/<uid>/…`). Fuera de este informe.
- Desplegar el nuevo front. `drop trigger legacy_on_auth_user_created on auth.users`. Mantener `legacy_*` al menos un ciclo de backups; después `drop table legacy_* cascade` y `drop function legacy_is_admin, legacy_submit_review, handle_auth_user_link, delete_account, get_admin_stats, get_my_dashboard, get_pro_visibility, get_review_request, create_review_request, track_profile_metric, fill_ticket_identity, prettify_name, notify_new_ticket, notify_send_push, clean_message_names, enforce_message_block, current_app_user_id, current_app_user_email`.

**Retorno atrás** (hasta el paso 6 inclusive): `alter table legacy_X rename to X` ×7, `alter function legacy_is_admin() rename to is_admin` (tras `drop function public.is_admin()` nuevo), `alter trigger … rename`, redeploy del front anterior, `drop schema app_private cascade` + `drop` de las tablas nuevas. Nada de `auth.users` se ha tocado en ningún punto.

---

## 10. Riesgos concretos (de mayor a menor)

1. Tratar el repo como instalador: 26 ficheros fallan y faltan 93 migraciones de dashboard (diplomas, recordatorios, contacto, push, multi-categoría, 11 RPC admin, `client_ip`, `submit_review`, `log_contact_event`). Sólo el volcado del esquema vivo es completo.
2. `is_admin()` y `on_auth_user_created` cambian de semántica en el mismo instante que se aplica el baseline; sin el renombrado previo (§9 paso 3) el admin legacy y las altas de la web vieja se rompen.
3. `submit_review` queda sobrecargado con dos firmas → PostgREST «could not choose the best candidate function» en la web vieja (reseñas por token).
4. `professional_profiles.gender not null` y la pivote `app_private.professional_categories`: el seed/migración española debe rellenar género y pivote (`search_professionals` y `count_professionals_by_category` cuentan por pivote con fallback a `category_id`).
5. `internal_config.notify_admin_url` apunta al proyecto marroquí: si se copia tal cual, `fire_notify_admin`, `_promo_fire_mail` y `fire_push_apns` enviarían a edge functions de khdemlidaba con la cron key de misautonomos (fallarían en 401, pero saldrían peticiones).
6. `20260925115759` lleva `BEGIN;/COMMIT;` y `20260901191500` no es SQL válido: si alguien los reaplica con el runner de Supabase, el COMMIT prematuro deja medio aplicado lo que venga detrás en la misma transacción.
7. Zona horaria `Africa/Casablanca` en 3 funciones: cuotas diarias de email, semana de promo y vencimiento de retours se calcularían con hora marroquí.
8. `rls_auto_enable` (event trigger) no existe en khdemlidaba; en misautonomos sí: cualquier `create table` futuro sin `enable row level security` quedará protegido (bien) pero con 0 policies (deny-all) hasta que alguien lo note.
9. `pg_net` 0.20.0 en destino vs 0.20.4 en modelo: `net.http_post(url, headers, body, timeout_milliseconds)` existe en ambas; sin impacto conocido, pero conviene verificar en la rama de ensayo.
10. El bucket `uploads` es público y plano; `photos` exige carpeta `<auth.uid()>/` para escribir: los 183 objetos deben recolocarse o las policies de edición fallarán para los pros migrados.

## 11. Decisiones que sólo puede tomar el dueño

1. Moneda: ¿mantener los nombres de columna `*_mad` (cambiando sólo defaults/etiquetas a euros) o renombrar a `*_eur`/`*_cents` tocando front y SQL?
2. ¿Se trasplantan las ofertas de pago (promo Instagram, destacado, oferta empresa, transferencia con IBAN) y el botón de donación, o se dejan apagadas (`promo_settings.is_open=false`, `featured_is_open=false`, `job_is_open=false`)?
3. ¿Se conservan los módulos sin equivalente en España hoy: diplomas/profesiones reguladas (ISPITS, «loi 43-13»), observatorio salarial, CV gratis, tablón de demandas? El esquema se puede traer entero y mantener desactivado en el front, pero el dueño pidió «réplica total».
4. Rutas: ¿se mantienen las URL francesas de khdemlidaba (`/recherche`, `/metiers`, `/demandes`, `/site-web-gratuit`, `/creation-site-web`) o se traducen? Afecta a `measurement_page()` y a `notifications.url`.
5. Taxonomía española: ¿las 17 categorías actuales con familias y alias castellanos, y qué categorías se marcan `allows_remote`? ¿Provincias como `cities`, o ciudades reales (28 distintas hoy) con la provincia en `quartier`?
6. Género de los 46 perfiles existentes (columna obligatoria): ¿valor por defecto, inferencia por nombre, o pedirlo en el primer login?
7. Qué hacer con los 57 usuarios sin cuenta auth (91 − 34): no pueden entrar en `users` (FK a `auth.users`); ¿se descartan, se guardan en `legacy_users` para siempre, o se invitan?
8. Qué datos Base44 no se migran y se borran al final (CRM: `invoices`, `projects`, `tasks`, `subscriptions`, `tickets` ×3, `messages` ×10, `profile_metrics` ×1 980…).
9. Textos de notificación en SQL: ¿traducción directa al español dentro del SQL (simple, monolingüe) o claves i18n resueltas por el front (más trabajo, 6 idiomas)?
10. Ventana de convivencia: ¿se acepta una ventana con la web vieja sobre `legacy_*` (días) o un corte único con mantenimiento (horas)?
