# 05 — Mapeo de datos: misautonomos.es → esquema de khdemlidaba

Capa de datos del trasplante. Origen: proyecto Supabase `dquxsethatxtptfviiwd` (MisAutónomos, eu-west-2, Postgres 17.6). Destino de referencia (sólo para ver la forma): `eiacoozyubxkbjwhgkml` (KhdemliDaba, eu-west-3, Postgres 17.6). Ambos viven en la misma organización Supabase (`tyoqlllakmrcljcgiyrt`), lo que importa para las transformaciones de imagen (§14).

Todo lo que sigue sale de SQL de solo lectura ejecutado el 2026-10-01 contra las dos bases, del repo `/Users/bigseo/khdemlidaba` en HEAD `794e657` y del repo `/Users/bigseo/Desktop/misaut-nomos`. No se ha modificado nada.

---

## 0. Lo esencial en diez líneas

1. El origen tiene **52 tablas** en `public`; sólo **14 tienen filas** y sólo **9 tienen destino** en el esquema de khdemlidaba. El resto (CRM, facturación, suscripciones, Stripe, referidos, tickets avanzados) se retira.
2. **Identidad**: 91 filas en `users`, pero sólo **34 tienen cuenta en `auth.users`** (34/34 confirmadas; 16 Google, 18 email; 26 con login en los últimos 90 días). En khdemlidaba `users.id = auth.users.id` con FK, así que **sólo 34 usuarios migran como usuarios**. Los otros 57 no pueden existir en `public.users`.
3. **Perfiles**: 46, todos `activo` + `visible_en_busqueda=true` + `onboarding_completed=true`. 26 pertenecen a un usuario con cuenta; **20 no**. Los 20 se importan con `user_id = NULL` y `published = true` sin inventar cuentas (§15): la columna admite NULL, hay 28 perfiles así en khdemlidaba y la seed oficial de khdemlidaba creó 30 de esa forma.
4. **Categorías**: 17 → 17 (15 con perfiles; `Abogado` y `Fontanero` sin ninguno). Hay que asignar `family` (CHECK con 9 valores franceses) y `allows_remote`.
5. **Geografía**: khdemlidaba sólo tiene `cities(id, slug, name)`, sin provincia. Los 46 perfiles usan 28 ciudades distintas (2 con ciudad vacía) de 12 provincias. Propuesta: `cities` = los **376 municipios** de `locationsData.jsx` (52 provincias), sin provincia como entidad; la provincia sólo sobrevive si el dueño acepta añadir 2 columnas (§5).
6. **Blog**: 25 posts en HTML (`content_es`), todos publicados; 4 con versión inglesa. `content_md` de khdemlidaba pasa por `marked` + `DOMPurify`, que dejan pasar HTML: **el HTML sirve tal cual**. El `slug` es UNIQUE sin importar el `locale`, así que las 4 versiones EN no caben con el mismo slug.
7. **Reseñas**: 3 (una es una auto‑reseña de prueba del dueño). `reviews.professional_id` en el origen apunta a `users.id`, **no** a `professional_profiles.id`.
8. **Métricas**: 1.980 filas diarias de `profile_metrics` (515 visitas, 6.828 apariciones, 26 clics de contacto). Sólo los **26 clics** tienen destino (`contact_events`, una fila por clic).
9. **Fotos**: bucket público `uploads`, 183 objetos, 180,7 MB, URLs absolutas guardadas en la BD. **Sirve tal cual** (§14): el endpoint `/render/image/public/` responde HTTP 200 en `dquxsethatxtptfviiwd` (el comentario de `src/lib/supabaseImage.js` que dice que devuelve 403 está desfasado). Pero 15 documentos de identidad (DNI/NIE + selfie) están en ese bucket público: hay que moverlos a un bucket privado.
10. **Slugs**: 46 `slug_publico` únicos, 0 alias, 0 duplicados; **23 cambian** al normalizarlos con el `slugify` de khdemlidaba (acentos, comas, guiones finales), **0 colisiones** tras normalizar. Hace falta una tabla de redirecciones de 23 líneas (46 si se cuenta la URL anidada `/autonomo/<cat>-en-<ciudad>/<slug>`).

---

## 1. Inventario

### 1.1 Origen (`dquxsethatxtptfviiwd`, esquema `public`): 52 tablas, 14 con datos

| Tabla | Filas | Destino en khdemlidaba |
|---|---:|---|
| `users` | 91 | `public.users` (sólo 34) |
| `professional_profiles` | 46 | `public.professional_profiles` + `app_private.professional_categories` |
| `service_categories` | 17 | `public.categories` |
| `blog_posts` | 25 | `public.blog_posts` |
| `profile_metrics` | 1.980 | `public.contact_events` (sólo los 26 clics) |
| `payment_records` | 87 | **ninguno** (retirado; exportar por obligación contable) |
| `subscriptions` | 20 | **ninguno** (retirado) |
| `translations` | 469 | **ninguno** (caché DeepL `EN`=3 / `EN-US`=466; khdemlidaba traduce con JSON estáticos) |
| `messages` | 10 | **ninguno** (khdemlidaba no tiene chat interno) |
| `identity_verifications` | 5 | `app_private.credential_submissions` (kind `cin`) + `professional_profiles.verified` |
| `subscription_plans` | 4 | ninguno |
| `reviews` | 3 | `public.reviews` |
| `tickets` | 3 | `public.contact_messages` |
| `review_requests` | 2 | ninguno (khdemlidaba tiene su propia campaña `demande-avis`) |
| `notifications` | 1 | `public.notifications` (pero la fila es de un usuario sin cuenta → 0) |
| `cookie_consents` | 1 | ninguno (khdemlidaba guarda el consentimiento en el navegador) |
| `invoicing_settings` | 1 | ninguno (NIF + IBAN: dato fiscal, exportar y borrar) |
| `favorites` | 0 | `public.favorites` (nada que mover) |
| otras 34 tablas (`admin_alerts`, `ads_briefings`, `automation_executions`, `blocks`, `client_*`, `crm_automations`, `email_logs`, `faqs`, `follow_up_reminders`, `free_month_grants`, `invoice_templates`, `invoices`, `jobs`, `newsletter_subscribers`, `outbound_leads`, `plan_audit_logs`, `project_*`, `projects`, `push_tokens`, `quote_requests`, `quotes`, `redirect_logs`, `referrals`, `reports`, `resend_events`, `saved_searches`, `tasks`, `ticket_events`, `ticket_messages`, `time_logs`, `trial_usage_logs`) | 0 | ninguno |

Además: `auth.users` = 34 filas (0 sin fila en `public.users`; 0 emails de `users` sin enlazar que coincidan con una cuenta). 21 funciones en `public` (`track_profile_metric`, `submit_review`, `get_my_dashboard`, `handle_new_user`, `handle_auth_user_link`, `rls_auto_enable`, …) que desaparecen con el esquema viejo. Storage: 1 bucket (`uploads`).

### 1.2 Destino (forma del esquema de khdemlidaba que recibe datos)

```
public.users(id uuid PK FK auth.users ON DELETE CASCADE, user_type text! CHECK(client|professionnel),
             first_name, last_name, phone UNIQUE, email UNIQUE, created_at!, updated_at!, is_admin! d=false,
             last_seen_at, user_type_explicit! d=false, cgu_accepted_at, cgu_version, no_reminders! d=false,
             admin_notifications_enabled! d=true)
public.professional_profiles(id uuid PK d=gen_random_uuid(), user_id uuid NULL FK users UNIQUE, slug text! UNIQUE,
             first_name text!, last_name text!, category_id int FK categories, city_id int FK cities, quartier,
             years_experience int! d=0, description, avatar_url, gallery text[]! d={}, languages text[]! d={},
             availability text! d='week' CHECK(today|week|unavailable), phone, email, verified! d=false,
             published! d=true, rating_avg numeric! d=0, rating_count int! d=0, created_at!, updated_at!,
             onboarding_step int! d=0, whatsapp_enabled! d=true, whatsapp_phone, socials jsonb! d={} CHECK(…https…),
             description_original, category_id_original, quality_reviewed_at, verified_at, verified_by FK auth.users,
             gender text! CHECK(homme|femme), works_remote! d=false, hide_city! d=false CHECK(hide_city ⇒ works_remote),
             diploma_status enum! d=none, diploma_grace_until, diploma_submitted_at, diploma_verified_at,
             auth_status enum! d=none, auth_verified_at, diploma_origin CHECK, diploma_gate_blocked_at,
             featured_until, no_answer_flagged_at)
app_private.professional_categories(professional_id uuid FK, category_id int FK, is_primary! d=false, created_at!) PK(professional_id, category_id)
public.categories(id serial, slug! UNIQUE, name!, emoji, aliases text[]! d={}, family! CHECK(batiment|maison|beaute|sante|restauration|logistique|evenementiel|bureau|stages), allows_remote! d=false, requires_diploma! d=false)
public.cities(id serial, slug! UNIQUE, name!)
public.reviews(id uuid, professional_id! FK pp CASCADE, author_id FK users SET NULL, author_name, rating smallint! CHECK 1..5, comment, created_at!, status! d='pending' CHECK(pending|approved|rejected), ip_hash, user_agent_hash, moderated_at, moderated_by FK users)
public.favorites(user_id uuid FK auth.users, professional_id FK pp, created_at) PK(user_id, professional_id)
public.notifications(id uuid, user_id! FK users CASCADE, kind! d='message', title!, body!, url, read_at, created_at!)
public.blog_posts(id bigserial, slug! UNIQUE, locale! d='fr' CHECK(fr|ar|en|es|de|nl), title!, excerpt, content_md!, cover_url, category_slug, city_slug, author! d='KhdemliDaba', tags text[]!, meta_title, meta_description, published! d=false, published_at, created_at!, updated_at!, views int! d=0, faq jsonb d=[])
public.contact_messages(id bigserial, name!, email, phone, message!, created_at!, reference uuid!, request_key uuid)
public.contact_events(id bigserial, professional_id! FK pp CASCADE, channel! CHECK(whatsapp|phone|email|candidature), source, visitor_hash, created_at!)
app_private.credential_submissions(id uuid, professional_id uuid, kind text, storage_path text, sha256 text, submitted_at, reviewed_at, reviewer_id uuid, decision text, reason text)
app_private.professional_activation(professional_id uuid, first_published_at timestamptz)
public.cgu_acceptances(id uuid, user_id uuid, version text, accepted_at, source, user_agent, ip_hash)
```

Valores reales observados en khdemlidaba (para no inventar): `users.user_type` ∈ {client, professionnel}; `pp.availability` ∈ {today, week, unavailable}; `pp.gender` ∈ {homme, femme}; `pp.languages` ∈ {ar, ber, de, en, es, fr, it, nl}; `pp.phone` en formato `+212XXXXXXXXX` (1.315 de 1.394); `pp.onboarding_step` = 9 en 1.072 de 1.394 (fin del asistente); `contact_events.channel` ∈ {candidature, phone, whatsapp}; `contact_events.source` ∈ {card, profile, profile_button, profile_sticky, search_card, app:…}; `reviews.status` ∈ {approved, pending} (24 de 52 con `author_id` NULL); `credential_submissions.kind` ∈ {diplome, autorisation, cin}, `decision` ∈ {accepte, refuse, NULL}; `blog_posts`: 37 filas, todas `locale='fr'`, `content_md` 0/37 con HTML, `cover_url` siempre ruta local `/blog/covers/*.webp`, `faq` `[]`; `avatar_url`/`gallery` = URL absoluta `https://<proyecto>.supabase.co/storage/v1/object/public/photos/<auth uid>/avatar-<ts>.jpg`.

---

## 2. `users` (91) → `public.users` (34)

### 2.1 Qué hay en el origen

- `id` text: 29 son UUID (y en esos 29 `id = auth_user_id`), 62 son ObjectId de 24 hex heredados de Base44.
- `auth_user_id`: 34 no nulos, los 34 existen en `auth.users`.
- `role`: admin=1 (`bigseo.online.com@gmail.com`, con cuenta), user=90. `app_role`: vacío en los 91.
- `user_type`: professionnel=51, client=11, NULL=29.
- Cruce cuenta × tipo × perfil profesional:
  - con cuenta (34): 25 `professionnel` con perfil, 1 sin tipo con perfil (`Fernando`), 4 `professionnel` sin perfil, 2 `client`, 2 sin tipo sin perfil.
  - sin cuenta (57): **20 `professionnel` con perfil**, 2 `professionnel` sin perfil, 9 `client`, 26 sin tipo.
- `phone`: 9 no vacíos, 0 duplicados. `city`: 10. `profile_picture`: 18 (todas en `uploads`). `is_verified`: 62. `email_unsubscribed`: 2. `disabled`: 3 `false`, 88 NULL. `push_token`: ver §12. Emails: 0 duplicados.
- `full_name`: 1 vacío; palabras: 1=22, 2=36, 3=19, 4=8, 5=3, 6=1, 8=1, 9=1.

### 2.2 Mapeo columna a columna

| Origen `users` | Destino `users` | Regla |
|---|---|---|
| `auth_user_id` | `id` | sólo filas con `auth_user_id IS NOT NULL` (34). El `id` text viejo se guarda en una tabla puente `legacy.id_map` para resolver `reviews.client_id`, `notifications.user_id`, `tickets.user_id`, `identity_verifications.user_id`. |
| `email` | `email` | tal cual (UNIQUE: 0 duplicados). |
| `full_name` | `first_name`, `last_name` | misma regla que `handle_new_user` de khdemlidaba: `split_part(full_name,' ',1)` y el resto. |
| `phone` | `phone` | normalizar a `+34` + 9 dígitos (UNIQUE: 0 duplicados). |
| `user_type` | `user_type` | `professionnel` si tiene perfil o `user_type='professionnel'`; si no `client` (NOT NULL + CHECK). |
| — | `user_type_explicit` | `true` (lo eligieron en el alta). |
| `role='admin'` | `is_admin` | 1 fila. **El trigger `trg_users_guard` fuerza `is_admin=false` en INSERT salvo que `is_admin()` sea true**, y `is_admin()` depende de `auth.uid()`, que es NULL en una migración: hay que desactivar el trigger durante el import (§16). |
| `created_date`, `updated_date` | `created_at`, `updated_at` | tal cual. |
| `auth.users.last_sign_in_at` | `last_seen_at` | tal cual (en khdemlidaba lo mantiene `sync_last_seen`). |
| `professional_profiles.acepta_terminos` + `created_date` | `cgu_accepted_at`, `cgu_version` | 26 (los pros con cuenta); versión propuesta `misautonomos-legacy`. Decisión del dueño (§19). |
| `email_unsubscribed` | `no_reminders` | 2 filas. |
| — | `admin_notifications_enabled` | default `true`. |
| `city`, `profile_picture`, `subscription_*`, `last_payment_date`, `profile_completeness`, `has_used_trial`, `push_token`, `push_enabled`, `push_last_activated`, `notification_preferences`, `tags`, `is_verified`, `disabled*`, `force_password_reset`, `is_service`, `collaborator_role`, `app_id`, `unsubscribe_token` | **sin destino** | `profile_picture` (18) coincide con `imagen_principal` de los perfiles; `push_token` iría a `device_tokens` pero el formato Expo/OneSignal no es el APNs de khdemlidaba. |

### 2.3 Los 57 sin cuenta

No pueden insertarse (`users.id` es FK a `auth.users`). De ellos:
- 20 tienen perfil profesional → el perfil migra con `user_id = NULL` (§15). Sus emails quedan en `legacy.users` para invitarlos más adelante: `pinturasdiamonds@…`, `misautonomos.sl@…`, `estictreball@…`, `electriclima2025@…`, `testingmisautonomos@…`, `fastserviceasesoria@…`, `seletto9@…`, `sstus8579@…`, `bigseovulito@…`, `benchellal122@…`, `milautonomos25@…`, `kassim.kone27@…`, `estradaservice0953@…`, `bencharkizaid@…`, `brokeemasteriloas@…`, `ilias.ahmed@euncet.es`, `moujtabakh123@…`, `rubencardenastorres@…`, `emaar.estates@…`, `nahuelvilches.tbv@…`. Varios son claramente cuentas de prueba del dueño (`testingmisautonomos`, `bigseovulito`, `benchellal122`, `misautonomos.sl`).
- 37 no tienen nada enganchado (9 `client`, 2 `professionnel`, 26 sin tipo) → se pierden como usuarios; sólo quedan en el CSV de exportación.

---

## 3. `professional_profiles` (46) → `professional_profiles` (46) + `professional_categories` (46)

### 3.1 Distribución real del origen

- `estado_perfil` activo=46; `visible_en_busqueda` true=46; `onboarding_completed` true=46; `fecha_publicacion` no nula=24.
- `categories[]`: 46 con exactamente 1 categoría. Pintor=8, Albañil / Reformas=6, Asesoría o gestoría=5, Cerrajero=5, Electricista=5, Empresa multiservicios=4, Marketing digital / diseño web=3, Informático a domicilio / soporte IT=2, Carpintero=2, y 1 cada: Autónomo de limpieza, Peluquería y estética a domicilio, Climatización / Calefacción, Persianas y toldos, Transportista, Jardinero.
- `provincia`: Barcelona=24, Alicante=6, Madrid=3, Girona=2, Valencia=2, Islas Baleares=2, Málaga=2, Zamora=1, Badajoz=1, Ciudad Real=1, Granada=1, Tarragona=1. `ciudad`: 28 distintas + 2 vacías (`ANDRES F RODRIGUEZ ESTRADA` y `Esdrújulo`, ambos provincia Barcelona). `municipio`: vacío en 46. `service_area`: "Ciudad, Provincia" redundante. `radio_servicio_km`: 25 en 45, 10 en 1.
- `metodos_contacto`: chat_interno+telefono+whatsapp=34, chat_interno+whatsapp=9, **sólo chat_interno=3** (`Joselito`, `Marwan El Haddadi`, `Florentín Gabriel Tudor`).
- `telefono_contacto`: 46 no vacíos (34 de 9 dígitos, 12 con `+34`). El número `644853733` aparece en **6 perfiles** (perfiles de prueba). `whatsapp_phone_number` y `whatsapp_notifications_enabled`: 0.
- `disponibilidad_tipo`: ambos=44, laborables=2. Horario: `09:00-18:00` sin días en 43; 3 personalizados.
- `business_name`: 46 no vacíos; 23 iguales a `users.full_name`. Palabras: 1=11, 2=16, 3=9, 4=4, 5=3, 6=1, 8=1, 9=1.
- `description`: 46 no vacías (7 < 40 chars, 28 < 200, 11 < 1000), 0 con HTML. `descripcion_corta`: igual a `description` en 41, prefijo en 1, distinta en 4.
- `photos`: 81 URLs en total; 18 perfiles con 0, 17 con 1, 3 con 2, 1 con 3, 1 con 4, 1 con 5, 1 con 7, 1 con 9, 3 con 10. `imagen_principal`: 30 (13 de ellas también están en `photos`). Las 111 URLs apuntan a `https://dquxsethatxtptfviiwd.supabase.co/storage/v1/object/public/uploads/…`; 0 rotas; 0 con `/render/image/`.
- `years_experience`: 0..35 (todos enteros). `website`: 6 (`fastservices.es`, `https://fixtic.lovable.app/`, `www.ecosmartsl.com`, `nvmontseny.com`, `Tik tok`, `https://www.zaask.es/avaliar-sp/658175`). `social_links`: instagram=10, facebook=3, tiktok=2; **6 valores son handles sin URL** (`fastserviceasesores`, `fastservices_asesores`, `guccitooi`, `_.moha._x77`, `serralleria_nv_montseny`, `amigdecor`).
- `identity_verified`: 1 (`Guccito`, `identity_verified_at` 2026-04-19, `dni`). `is_ads_plus`: 6 (`Oleksandr`, `Fast Services Asesores`, `ANDRES F RODRIGUEZ ESTRADA`, `Zaid Bencharki`, `Ruben cárdenas torres`, `Guccito`). `tarifa_base`: 0 en 29; 30=6, 35=4, 40=2, y 1 cada 20/25/28/48/90. `cif_nif`: 27 no vacíos. `iban`: 1. `skills`: 4 perfiles (13 ítems). `certifications`: 1 (`Carnet instalador gas`). `services_offered`: 4 perfiles (10 ítems con nombre/descripción/unidad/precio vacío). `portfolio_items`: 2 perfiles (4 ítems, 1 con imagen). `faq_items`: 0. `referral_code`: 25. `average_rating/total_reviews`: `5.00/2`=1, `5.00/1`=1, `0/0`=44.
- `email_contacto`: 46, 45 iguales al email del usuario (`Cerrajeria Cabello`: `rraulcabhi@hotmail.com` vs `raulcabhi@gmail.com`).
- `id`: 46 ObjectId de 24 hex → hay que generar UUID nuevos y guardar el puente (`profile_metrics`, `reviews`, `favorites`, `identity_verifications`, redirecciones de slug).

### 3.2 Mapeo columna a columna

| Origen | Destino | Regla / observación |
|---|---|---|
| `id` (text 24 hex) | `id` uuid | `gen_random_uuid()`; guardar `(legacy_id, new_id)` en `legacy.id_map`. |
| `user_id` → `users.auth_user_id` | `user_id` | 26 con cuenta; **20 NULL** (§15). |
| `slug_publico` | `slug` | normalizar con el `slugify` de khdemlidaba (`src/lib/slugify.js`: NFD, sin diacríticos, minúsculas, sin apóstrofes, `[^a-z0-9]+`→`-`, sin guiones extremos). 23 cambian, 0 colisionan (§13). |
| `business_name` (+ `users.full_name`) | `first_name`, `last_name` | ambos NOT NULL, pero khdemlidaba acepta `last_name=''` (28 filas así). Regla propuesta: si `business_name = full_name` y tiene 2–3 palabras → persona: primera palabra / resto; en caso contrario (empresas: "ECOSMART INSTALACIONES", "Cerrajeros y Persianistas Feltrer", "Nacho Narvaez Ruiz- Cerrajeria Residencial y del automovil") → todo en `first_name`, `last_name=''`. Revisar las 46 a ojo. Ojo: `trg_pp_sync_to_users` copia estos nombres a `users.first_name/last_name` del dueño. |
| `categories[1]` (nombre) | `category_id` + 1 fila en `app_private.professional_categories` (`is_primary=true`) | join por `service_categories.name`; los 46 tienen 1 categoría. khdemlidaba usa `professional_categories` para búsqueda multi‑categoría y `category_id` como principal (`set_professional_categories` rellena ambas). |
| `ciudad` (+`provincia`) | `city_id` | join por `slugify(ciudad)` contra `cities.slug`. Las 28 ciudades usadas existen en `locationsData.jsx`. Los 2 perfiles con `ciudad=''` → decisión (§19): capital de la provincia (`Barcelona`) o `published=false`. |
| `municipio` (vacío) | `quartier` | NULL. |
| `years_experience` numeric | `years_experience` int | `::int`. |
| `description` (+`descripcion_corta`) | `description` | `description`; en los 4 casos en que `descripcion_corta` es distinta y no es prefijo, anteponerla (`corta || E'\n\n' || larga`). |
| `imagen_principal` | `avatar_url` | tal cual (30); NULL en 16 (la UI pinta iniciales). |
| `photos` | `gallery` | tal cual (81), quitando `imagen_principal` si está repetida (13). |
| — | `languages` | `'{es}'` (no hay dato; decisión). |
| `disponibilidad_tipo` | `availability` | `'week'` para los 46 (ambos/laborables no distinguen `today`); horario y `horario_dias` se pierden. |
| `telefono_contacto` + `metodos_contacto` | `phone`, `whatsapp_phone`, `whatsapp_enabled` | normalizar a `+34XXXXXXXXX`. `phone` = tel si `'telefono' = ANY(metodos_contacto)` (34); `whatsapp_phone` = tel y `whatsapp_enabled=true` si `'whatsapp' = ANY(…)` (43); si no `whatsapp_enabled=false`. Los **3 "sólo chat"** no cumplen el mínimo de publicación (≥ 8 dígitos en `phone` o `whatsapp_phone`) → decisión (§19). |
| `email_contacto` | `email` | 46 (es público en la proyección de khdemlidaba, igual que hoy). |
| `identity_verified`, `identity_verified_at` | `verified`, `verified_at` | 1 fila (`Guccito`). `trg_00_pp_guard` pone `verified=false` en todo INSERT (también como `postgres`) y lo congela en UPDATE → desactivar el trigger en el import. `verified_by` NULL. |
| `visible_en_busqueda` | `published` | `true` en 46, sujeto a §15. |
| `average_rating`, `total_reviews` | `rating_avg`, `rating_count` | **no copiar**: recalcular desde `reviews` tras el import (el guard también los pone a 0). |
| `created_date`, `updated_date` | `created_at`, `updated_at` | tal cual. |
| `onboarding_completed=true` | `onboarding_step` | `9` (valor de "asistente terminado" en khdemlidaba). |
| `social_links` + `website` | `socials` jsonb | CHECK: sólo claves `instagram/facebook/tiktok/linkedin/website`, cada una `https://…` de 12–300 chars. Transformar handles: `instagram` → `https://www.instagram.com/<handle>`, `tiktok` → `https://www.tiktok.com/@<handle>`; `website` sin esquema → `https://` + valor; descartar `Tik tok`. Resultado: ≈ 10 instagram, 3 facebook, 2 tiktok, 5 website. |
| `fecha_publicacion` (24) | `app_private.professional_activation.first_published_at` | 24 filas; para los 22 sin fecha, `created_date` (decisión menor). |
| — | `gender` | NOT NULL con CHECK `homme|femme`, sin dato en origen. El asistente de khdemlidaba pone `'homme'` por defecto (`OnboardingPro.jsx:301`). Decisión del dueño (§19): default `homme`, o relajar el CHECK para admitir un tercer valor, lo que toca el filtro `p_gender`. |
| — | `works_remote`, `hide_city` | `false`. Las categorías con `allows_remote` (asesoría, abogado, marketing, informático) quedan sin ningún perfil "en línea" hasta que el pro lo active. No inventar. |
| `is_ads_plus` (6) | `featured_until` | el plan Ads+ está retirado y `subscriptions.vigentes = 0`: propuesta `NULL`. Si el dueño quiere regalarles destacado, `now() + 30 days`. El guard sólo deja tocar `featured_until` a `postgres`/`service_role`. |
| — | `diploma_status`, `auth_status` | `'none'` (ninguna categoría española tendrá `requires_diploma`; `enforce_diploma_gate` queda inerte). |
| — | `description_original`, `category_id_original`, `quality_reviewed_at`, `diploma_*`, `no_answer_flagged_at` | NULL. |
| `cif_nif` (27), `iban` (1), `tarifa_base` (17 ≠ 0), `price_range` (€€ ×46), `facturacion` (autonomo ×46), `formas_pago` (46), `service_area`, `radio_servicio_km`, `opening_hours`, `horario_dias`, `horario_apertura`, `horario_cierre`, `skills` (13 ítems en 4 perfiles), `certifications` (1), `portfolio_items` (4 ítems en 2 perfiles), `faq_items` (0), `services_offered` (10 ítems en 4 perfiles), `referral_*` (25 códigos), `referred_by_code`, `whatsapp_notifications_enabled`, `whatsapp_phone_number`, `whatsapp_last_test`, `identity_document_type`, `activity_other`, `estado_perfil`, `acepta_*`, `consiente_contacto_clientes`, `slug_publico_aliases` (0), `metodos_contacto='chat_interno'` | **sin destino** | ver §18. Opción para no perder texto útil: anexar `skills`, `certifications` y los nombres de `services_offered` al final de `description` como líneas "Servicios: …" / "Certificaciones: …" (afecta a 6 perfiles). |

---

## 4. `service_categories` (17) → `categories` (17)

Origen: `id` ObjectId, `name`, `slug` (ya kebab), `icon` (emoji), `description`. Destino exige `family` (CHECK con 9 valores: `batiment, maison, beaute, sante, restauration, logistique, evenementiel, bureau, stages`) y `allows_remote`; las etiquetas de familia ya existen en los 6 JSON de i18n de khdemlidaba (`families.batiment` = "Construcción y reforma", `families.maison` = "Hogar y mantenimiento", …), así que mapear a esas familias cuesta menos que alterar el CHECK.

| `service_categories.name` | `slug` (igual) | emoji | perfiles | `family` propuesta | `allows_remote` |
|---|---|---|---:|---|---|
| Abogado | `abogado` | ⚖️ | 0 | bureau | true |
| Albañil / Reformas | `albanil-reformas` | 🏗️ | 6 | batiment | false |
| Asesoría o gestoría | `asesoria-gestoria` | 📊 | 5 | bureau | true |
| Autónomo de limpieza | `autonomo-limpieza` | 🧹 | 1 | maison | false |
| Carpintero | `carpintero` | 🪚 | 2 | batiment | false |
| Cerrajero | `cerrajero` | 🔑 | 5 | batiment | false |
| Climatización / Calefacción | `climatizacion-calefaccion` | ❄️ | 1 | batiment | false |
| Electricista | `electricista` | ⚡ | 5 | batiment | false |
| Empresa multiservicios | `empresa-multiservicios` | 🛠️ | 4 | maison | false |
| Fontanero | `fontanero` | 🔧 | 0 | batiment | false |
| Informático a domicilio / soporte IT | `informatico-domicilio-soporte-it` | 💻 | 2 | maison (como `informatique` en khdemlidaba) | true |
| Jardinero | `jardinero` | 🌿 | 1 | maison | false |
| Marketing digital / diseño web | `marketing-digital-diseno-web` | 📱 | 3 | bureau | true |
| Peluquería y estética a domicilio | `peluqueria-estetica-domicilio` | 💇 | 1 | beaute | false |
| Persianas y toldos | `persianas-toldos` | 🪟 | 1 | batiment | false |
| Pintor | `pintor` | 🎨 | 8 | batiment | false |
| Transportista | `transportista` | 🚚 | 1 | logistique | false |

`requires_diploma=false` en las 17. `aliases` (sinónimos de búsqueda; en khdemlidaba 59 de 118 los tienen, p.ej. `electricien → {trisyan, tricien, electricite, كهربائي}`): proponer una lista corta por categoría (`albanil-reformas → {albañil, paleta, reformas, obra}`, `fontanero → {lampista, plomero}`, `cerrajero → {cerrajería, serrallería}`, `autonomo-limpieza → {limpieza, limpiador}`, `asesoria-gestoria → {gestor, gestoría, asesor, contable}`…). El nombre mostrado sale de `t('categories.<slug>', name)` (`src/hooks/useCategories.js:164-190`): hay que añadir las 17 claves en `es/en/fr/de/nl/ar.json` (capa de código), con `name` español como respaldo. `description` se pierde (khdemlidaba no la tiene; `localLandingContent.js` genera el texto de la landing).

Decisión del dueño: ¿se queda sólo con estas 17 o se amplía el catálogo? (khdemlidaba tiene 118; la web española ha funcionado con 17 y 15 en uso).

---

## 5. Geografía: `provincia` + `ciudad` → `cities`

### 5.1 Lo que hay

- Origen: dos campos de texto libre validados contra `src/components/utils/locationsData.jsx`: **52 provincias** y **376 municipios** (todos distintos; 42 municipios se llaman igual que su provincia: Barcelona, Madrid, Girona, Málaga…). Los perfiles usan 12 provincias y 28 ciudades; la búsqueda actual filtra por provincia y luego ciudad (select en cascada).
- Destino: `cities(id, slug, name)` plano. No hay noción de provincia/región en ningún sitio del código de khdemlidaba (`grep -ril 'region\|province' src` = 0 ficheros fuera de `src/lib/localLandingContent.js`). La lista se carga entera del cliente con `useCities()` (`src/hooks/useCities.js`, caché en localStorage, orden por `sortByNameFR`), alimenta el combobox de búsqueda, `/ville/<slug>` (`CityLanding`), `/<cat>-<ville>` (`ComboLanding`), `search_professionals(p_city_slug)`, `get_city_inventory`, `admin_city_stats`, y `professional_profiles.quartier` es un texto libre (barrio).

### 5.2 Opciones

| Modelo | `cities` | Qué se gana | Qué se pierde |
|---|---|---|---|
| **A. Sólo municipios** (propuesta) | 376 filas, `slug = slugify(name)`, `name` tal cual | esquema idéntico, landings `/ciudad/<slug>` con el nivel que ya usan las URLs actuales (`…-en-<ciudad>`), 0 colisiones de slug | el filtro provincial de la web actual; un combobox de 376 entradas (khdemlidaba vive bien con 70; el combobox filtra por texto) |
| B. Provincias como ciudades | 52 filas; `quartier` ← municipio | lista corta | el municipio deja de ser filtrable/indexable; `quartier` es texto libre sin landing; las URLs actuales por ciudad no tienen equivalente |
| C. Municipios + 2 columnas (`province_slug`, `province_name`) | 376 filas | A + poder reconstruir el filtro provincial y una landing `/provincia/<slug>` más adelante | rompe el "mismo esquema" en 2 columnas y obliga a tocar `useCities`, `get_city_inventory`, el prerender y el sitemap |

Recomendación: **A** para el trasplante, por fidelidad al esquema y porque los datos (28 ciudades, 2 vacías) no justifican más. Si el dueño exige mantener el desplegable provincia→ciudad, C es el camino y se decide ahora, antes de la seed (§19). En cualquier caso, **no** mezclar provincias y municipios en la misma tabla: 42 slugs colisionarían.

Seed esbozada (A):

```sql
insert into public.cities (slug, name)
select slugify(c), c   -- slugify = misma función que src/lib/slugify.js portada a SQL
from legacy.locations_data  -- 376 filas volcadas desde locationsData.jsx (nombre, provincia)
on conflict (slug) do nothing;
-- 376 filas esperadas
```

---

## 6. `reviews` (3) → `reviews` (2 o 3)

Filas reales:

| id | professional_id (= `users.id`, **no** perfil) | client_id | rating | comment | otros |
|---|---|---|---:|---|---|
| `691f37e3…` | `690076ad…` (usuario de `Juan Pérez`, el dueño) | `690076ad…` (el mismo) | 5 | "Muy buen trabajo!" | auto‑reseña de prueba |
| `6a2ed30a…` | `694fbb5f…` (usuario de `Oscar Barambio`) | `694fbb5f…` (con cuenta) | 5 | "" | `professional_response='gracias!'` |
| `9497fdda…` | `694fbb5f…` | `692980f8…` (sin cuenta) | 5 | NULL | `client_verified=true`, `client_name='Cliente'` |

| Origen | Destino | Regla |
|---|---|---|
| `professional_id` | `professional_id` | `legacy.users.id` → `professional_profiles.user_id` → nuevo `pp.id`. |
| `client_id` | `author_id` | `users.auth_user_id` si existe (2), si no NULL (1). |
| `client_name` | `author_name` | tal cual. |
| `rating` numeric | `rating` smallint | `::smallint` (5,5,5). |
| `comment` | `comment` | `nullif(comment,'')`. |
| `is_verified=true` | `status` | `'approved'` (en khdemlidaba `pending` es el default y sólo `approved` cuenta y se muestra); `moderated_at = created_date`. |
| `created_date` | `created_at` | tal cual. |
| `rapidez`, `comunicacion`, `calidad`, `precio_satisfaccion`, `professional_response`, `conversation_id`, `client_verified`, `is_reported` | **sin destino** | las subnotas y la respuesta del profesional (1) se pierden. |

Decisión (§19): descartar la auto‑reseña `691f37e3…` (khdemlidaba la bloquea en `submit_review` con `blocked_self`). Tras el import, `rating_avg/rating_count` se recalculan con la misma fórmula que `recompute_professional_rating` (Oscar Barambio → 5.00/2).

Triggers en `reviews` que hay que silenciar durante el import: `reviews_notify_admin`, `trg_reviews_alert_low_rating`, `trg_reviews_rating`.

---

## 7. `favorites` (0) y `notifications` (1)

- `favorites`: 0 filas. Nada. (Destino `favorites(user_id → auth.users, professional_id)`.)
- `notifications`: 1 fila (`new_message` para el usuario `69fdf960f9d7f75bbdc3c937`, **sin cuenta**, enlace a `/mensajes?conv=…` que ya no existirá). FK `user_id → users` obligatoria → **0 migran**.

---

## 8. `blog_posts` (25) → `blog_posts` (25, o 29 con las versiones EN)

Origen: 25 posts, `status='published'` en los 25, slugs únicos, `category` editorial (autonomos=10, legal_fiscal=7, actualidad=3, clientes=3, herramientas=2), 2 `featured`, `publish_date` 2025-01-15 → 2026-07-12, `views` total 50, `read_time_minutes` 4–9, `tags` 3–9, `meta_title_es`/`meta_description_es` en los 25, `related_articles` vacío, `author_name='Equipo MisAutónomos'`, `author_avatar/bio` vacíos, `og_image` en 2.

`content_es`: HTML en los 25 (etiquetas: `li`=146, `p`=131, `h2`=128, `strong`=125, `td`=52, `ul`=42, `h3`=25, `tr`=17, `th`=7, `a`=6, `article`=4, `blockquote`=3, `table`=2, `ol`=2, `em`=2, `div`=1), 0 `<img>`, 4 con enlaces internos `href="/…"`, 1 con `misautonomos.es`. Longitud 523–4.940 chars. `content_en`: 4 posts (482, 2.626, 2.804 y 3.052 chars); `title_en` en 5.

`featured_image`: 20 hotlinks a `images.unsplash.com` (`?w=800&q=80` o `?w=1200&h=675&fit=crop`) + 2 PNG en `uploads/rehosted/` (1,4 MB cada uno); 3 sin imagen.

Destino: `content_md` se renderiza con `marked` + `DOMPurify` (`src/lib/markdown.js`), y `marked` deja pasar los bloques HTML: **el HTML actual se muestra tal cual**; convertirlo a Markdown (turndown) es opcional. `cover_url` en khdemlidaba es siempre un `.webp` local en `/blog/covers/` (37/37). `category_slug` es un **slug de categoría profesional** (filtro en `Blog.jsx:50`, `BlogContextualCTA`, `BlogCover`), no una sección editorial. `Blog.jsx` **no filtra por `locale`** (select en línea 41 sin `.eq('locale')`): si se insertan filas `en`, aparecen mezcladas en el listado.

| Origen | Destino | Regla |
|---|---|---|
| `slug` | `slug` | tal cual (25 únicos). |
| — | `locale` | `'es'`. |
| `title_es`, `excerpt_es`, `content_es` | `title`, `excerpt`, `content_md` | tal cual (HTML). |
| `featured_image` | `cover_url` | tal cual (20 Unsplash + 2 uploads). Decisión: re‑alojar en `photos/blog/` como hace `AdminBlog.jsx:176` o dejar los hotlinks. |
| `category` (editorial) | `category_slug` | **NULL**; conservar la sección editorial en `tags` (`tags || category`). `city_slug` NULL. |
| `author_name` | `author` | `'Equipo MisAutónomos'`. |
| `tags` | `tags` | tal cual. |
| `meta_title_es`, `meta_description_es` | `meta_title`, `meta_description` | tal cual. |
| `status='published'`, `publish_date` | `published`, `published_at` | `true`, `publish_date`. |
| `created_date`, `updated_date`, `views` | `created_at`, `updated_at`, `views` | tal cual. |
| — | `faq` | `'[]'` (`faqs` tiene 0 filas). |
| `title_en`, `excerpt_en`, `content_en`, `meta_*_en` (4 posts) | fila aparte con `locale='en'` y `slug = slug || '-en'` | o no migrar. Decisión (§19). |
| `featured`, `og_image` (2), `read_time_minutes`, `related_articles`, `author_avatar`, `author_bio`, `id` text | **sin destino** | khdemlidaba calcula el tiempo de lectura (`readingTimeMinutes`) y no tiene destacados. |

---

## 9. `tickets` (3) → `contact_messages`

Filas: 2 son basura de prueba (`qweertyui` / `rydsrycthj`, `bebesfdgh…`) y 1 es real (`ECOSMART INSTALACIONES`, 2026-09-03: "Tengo pendiente de verificar los documentos"). `ticket_messages` y `ticket_events`: 0.

| Origen | Destino | Regla |
|---|---|---|
| `creator_name` | `name` | tal cual. |
| `creator_email` | `email` | tal cual. |
| `title` + `description` | `message` | `title || E'\n\n' || description` (mínimo 10 chars). |
| `created_date` | `created_at` | tal cual. |
| — | `reference` | `gen_random_uuid()`. |
| `status`, `type`, `priority`, `user_id`, `tags`, `attachments` | **sin destino** | — |

El trigger `contact_validate_before_insert` (`app_private.contact_validate`) exige `internal_config.review_ip_salt` (si falta lanza `CONTACT_UNAVAILABLE`), llama a `client_ip()` (devuelve `'unknown'` fuera de PostgREST), aplica límites por IP y **sobrescribe `created_at := now()`** → desactivarlo para el import. Propuesta: migrar sólo el ticket real (1).

---

## 10. `profile_metrics` (1.980) → `contact_events` (26)

Origen: 1 fila por profesional y día (46 profesionales × 2026-06-14 → 2026-10-01; 0 duplicados `(professional_id, date)`; 0 huérfanas). Sumas: `profile_views`=515 (306 filas > 0), `search_appearances`=6.828, `messages_received`=0, `contact_clicks`=26 (25 filas; 1 fila con 2). Top: Fernando 107 visitas, Luis adolfo pintor 82, Ruben cárdenas torres 32/4 clics. Lo alimenta el RPC `track_profile_metric` desde `src/lib/trackMetric.js`, y `contact_click` agrupa "Contactar / Llamar / WhatsApp" sin distinguir canal.

Destino: `contact_events` es **un evento por clic** con `channel` obligatorio ∈ {whatsapp, phone, email, candidature} y lo escribe `log_contact_event(p_professional_id, p_channel, p_source)` (sólo `phone`/`whatsapp`, con hash de IP y límite de 60/h). No hay tabla de visitas por perfil: `app_private.product_events` (`profile_view`, `page_view`, `search_results`…) no tiene `professional_id`.

| Origen | Destino | Regla |
|---|---|---|
| `contact_clicks` (26) | 26 filas `contact_events` | `generate_series(1, contact_clicks)`; `channel='phone'` (no se sabe; decisión), `source='legacy:misautonomos'`, `visitor_hash=NULL`, `created_at = date::timestamptz`. |
| `profile_views` (515), `search_appearances` (6.828), `messages_received` (0) | **sin destino** | exportar a CSV; los paneles de khdemlidaba (`v_daily_contact_clicks`, `admin_pro_contact_history`) empiezan de cero en visitas. |

Silenciar `contact_events_notify_admin` durante el import (si no, 26 `net.http_post` a `notify_admin_url`; en un proyecto recién migrado `internal_config` está vacío y `fire_notify_admin` sale sin hacer nada, pero no conviene depender de eso).

---

## 11. `identity_verifications` (5) → `verified` / `credential_submissions`

Filas: 5, todas `status='pending'`, `document_type` dni=4, nie=1, `user_id` = UUID de `auth.users` en los 5: `Soraya Principal López` (sin perfil profesional), `ECOSMART INSTALACIONES`, `Luís Reformas`, `Adrian Avila`, `Marjorie Orellana`. Cada fila trae 3 ficheros (`document_front_url`, `document_back_url`, `selfie_url`) = **15 objetos en el bucket público `uploads`** (cualquiera con la URL ve el DNI).

En khdemlidaba el equivalente es `app_private.credential_submissions` con `kind='cin'` (84 aceptadas, 21 rechazadas, 8 pendientes allí), ficheros en el bucket **privado** `credentials` (`<auth uid>/<kind>-<ts>.<ext>`, 15 MB, jpeg/png/webp/pdf/heic), cola en `admin_verification_queue` y aprobación con `admin_verify_pro` → `professional_profiles.verified`. `auth_status` es otra cosa (autorización profesional) y se deja en `'none'`.

| Origen | Destino | Regla |
|---|---|---|
| `user_id` (auth uid) → perfil | `credential_submissions.professional_id` | 4 (Soraya no tiene perfil → se pierde). |
| `document_type` | `kind` | `'cin'`. |
| `document_front_url`, `document_back_url`, `selfie_url` | `storage_path` | copiar cada objeto a `credentials/<auth uid>/cin-<ts>-{front,back,selfie}.<ext>` y borrar el original de `uploads`; 1 fila por fichero (12) o 1 por persona con el anverso (4): comprobar cómo agrupa `AdminVerifier.jsx`. `sha256` calculado al copiar. |
| `created_date` | `submitted_at` | tal cual; `decision`, `reviewed_at`, `reviewer_id` NULL. |
| `professional_profiles.identity_verified=true` (`Guccito`) | `pp.verified=true`, `verified_at='2026-04-19'` | sin fichero (no hay fila en `identity_verifications` para él). |
| `user_name`, `user_email`, `rejection_reason`, `reviewed_by` | sin destino | — |

---

## 12. Tablas que NO migran

| Tabla | Filas | Por qué | Qué hacer antes de borrar |
|---|---:|---|---|
| `subscriptions` | 20 (activo=4 pero 0 vigentes, expirado=13, cancelado=3; planes "Mensual"=10, "Plan Visibilidad"=3, "Plan Ads+"=2…) | retirado por el dueño | CSV |
| `payment_records` | 87 (1.549,21 EUR, 2 trial, status succeeded/pending, con `stripe_invoice_id`) | retirado | **CSV obligatorio**: son justificantes de cobro; la normativa fiscal española exige conservarlos (4 años AEAT / 6 Código de Comercio) |
| `subscription_plans`, `plan_audit_logs`, `free_month_grants`, `referrals`, `trial_usage_logs` | 4/0/0/0/0 | retirado | nada |
| `invoicing_settings` | 1 (NIF + IBAN de 1 pro) | sin equivalente | CSV y borrar (dato sensible) |
| `messages` | 10 (6 conversaciones, 1 con presupuesto adjunto, 2026-06-14 → 08-15), `review_requests` 2, `notifications` 1 | khdemlidaba no tiene chat: el contacto es teléfono/WhatsApp (`metodos_contacto='chat_interno'` deja de existir) | CSV |
| `translations` | 469 (caché DeepL) | khdemlidaba traduce con `src/i18n/locales/*.json` | nada |
| `cookie_consents` | 1 (anónimo) | khdemlidaba no lo persiste en BD | nada |
| `users.push_token`/`push_tokens` | 0 | — | nada |
| CRM/facturación (`client_contacts`, `jobs`, `invoices`, `quotes`, `projects`, `tasks`, `time_logs`, `crm_automations`…) | 0 | — | nada |

---

## 13. Slugs y URLs

- Origen: `slug_publico` 46 no vacíos, 0 duplicados, `slug_publico_aliases` vacío en los 46, 0 alias que colisionen. 23 son kebab limpio; 23 no (acentos, comas, guiones dobles/finales): `esdrújulo-`, `andriy,-montador-de-pladur`, `sergi---fixtic---informàtica,-formació-i-consultoria-it-ia`, `juan-josé-melitón---cerrajero-24h`, `nacho-narvaez-ruiz--cerrajeria-residencial-y-del-automovil`, `oscar-gómez`, `luís-reformas-`, `juan-pérez-5e8405`, `ruben-cárdenas-torres`, `florentín-gabriel-tudor`, `javier-fernández-mateo-`, `soy-de-cimentaciónes-de-pilotes`, `oleksandr-`, `rayan-`, `zaid-bencharki-`, `youssef-khairi-`, `adrian-avila-`, `ailton-silva-`, `fast-services-asesores-`, `ba-pintores-terrassa-`, `andres-f-rodriguez-estrada-`, `alberto---carpintero-evanista`, `javier-maciel---reforma-integral`. El propio `src/lib/slugify.js` de misautonomos ya normaliza igual que el de khdemlidaba (los datos son anteriores a esa función).
- Tras normalizar con el `slugify` de khdemlidaba: **46 slugs distintos, 0 colisiones** (p.ej. `oscar-gomez` ≠ `oscar-barambio`, `luis-adolfo-pintor` ≠ `luis-reformas`).
- Ruta actual: `/autonomo/:cityCategory/:slug` y legado `/autonomo/:slug` (`src/App.jsx:285-287`, `getProfileSeoUrl` en `src/lib/seoUrl.js`). Ruta de khdemlidaba: `/professionnel/:slug` (una sola, slug único global). La URL anidada desaparece: hacen falta **46 redirecciones 301** (`/autonomo/<cat>-en-<ciudad>/<slug_viejo>` y `/autonomo/<slug_viejo>` → nueva ficha), 23 de ellas con cambio de slug. khdemlidaba no tiene columna de alias: la lista vive en `vercel.json` o en el prerender (`api/prerender.js`); el que elija la capa de rutas.
- Nuevos slugs generados por khdemlidaba: `slugify(first_name + ' ' + last_name)` con sufijo `-<6 chars del uid>` si colisiona (`OnboardingPro.jsx:308-311`). Coherente con lo anterior.

---

## 14. Fotos y storage

Bucket `uploads` (origen): público, **sin `file_size_limit` ni `allowed_mime_types`**, 183 objetos, 180,7 MB. Nombres planos `<24hex>-<nombre original>.<ext>` (136) y `rehosted/<24hex>.<ext>` (47, de los que 45 están referenciados). MIME: `image/jpeg`=145, **`application/octet-stream`=20** (avif 1, jpeg 4, jpg 11, png 4), `image/png`=17, `audio/mp4`=1 (nota de voz `.webm` del chat). Extensiones: jpg 121, jpeg 39, png 21, avif 1, webm 1. Tamaño: máx. 4,85 MB, media 1,01 MB, **41 objetos > 2 MB**. Referencias: 98 por perfiles (`imagen_principal`/`photos`), 2 por blog, 18 por `users.profile_picture`, 15 por documentos de identidad; 0 referencias rotas. ≈50 objetos sin referencia.

Bucket `photos` (khdemlidaba): público, 5 MB, `image/jpeg|png|webp`, ruta `<auth uid>/avatar-<ts>.<ext>` y `<auth uid>/gallery-<ts>.<ext>` (`src/lib/image.js:118-138`), RLS de borrado/actualización por carpeta `= auth.uid()`, miniaturas con `transformSupabaseImage(url, {width, height, quality, resize})` que sustituye `/object/public/` por `/render/image/public/` (`src/lib/image.js:112`) y acepta cualquier URL que contenga `/storage/v1/object/public/`.

**¿Sirve `uploads` tal cual?** Sí para servir:
- Las 111 URLs de perfil y las 2 del blog son absolutas y ya apuntan al mismo proyecto; `transformSupabaseImage` las reescribe igual que a las de `photos`.
- El endpoint de transformación **está activo** en `dquxsethatxtptfviiwd` (misma organización que khdemlidaba): `GET …/render/image/public/uploads/rehosted/6a247e54c97ec369bb0d6175.png?width=120&quality=60` → HTTP 200, `image/png`, 188 KB (el original pesa 1.476 KB); un JPEG → 13 KB; un objeto guardado como `octet-stream` → 70 KB. El comentario de `src/lib/supabaseImage.js` ("403 FeatureNotEnabled") está desfasado y se puede retirar junto con el fichero.

Pero conviene hacer cuatro cosas:
1. **Mover los 15 documentos de identidad** fuera del bucket público (§11) y borrar la nota de voz `.webm`.
2. Poner a `uploads` el mismo límite y lista MIME que `photos` y quitarle el INSERT a usuarios (bucket de sólo lectura, legado); las subidas nuevas van a `photos/<uid>/…` por el código de khdemlidaba.
3. Corregir el `content-type` de los 20 `application/octet-stream` (12 son fotos de perfil): el render funciona, pero cachés y herramientas los tratan mal.
4. Decidir si se copian los 98 + 18 objetos de los 26 pros con cuenta a `photos/<auth uid>/…` para que **el pro pueda borrarlos desde la app** (RLS por carpeta) y para que `delete_my_account` / `account_delete_files` los elimine (hoy sólo barre `photos/<uid>`): sin copia, un pro que borre su cuenta deja sus fotos públicas en `uploads`. Para los 20 sin cuenta no hay carpeta posible; se quedan en `uploads`.

Las 20 portadas Unsplash del blog son hotlinks externos: khdemlidaba no los usa (todo local `.webp`); funcionan, pero el prerender y el LCP salen mejor re‑alojándolas.

---

## 15. Los 20 perfiles sin cuenta: triggers, constraints y cómo importarlos

Comprobado en `eiacoozyubxkbjwhgkml`:

- `professional_profiles.user_id` **admite NULL** (`uuid`, sin `NOT NULL`), FK `users(id) ON DELETE CASCADE`, `UNIQUE(user_id)` (varios NULL conviven). Hay **28 perfiles con `user_id IS NULL`** (1 publicado, 1 verificado) y la seed `supabase/migrations/20260101000002_seed_data.sql` insertó 30 "profils sans user_id (démonstration publique)" con `published=true`.
- Constraints que sí afectan: `slug` UNIQUE; `first_name`/`last_name` NOT NULL (vacío permitido); `gender` NOT NULL + CHECK; `availability` CHECK; `socials` CHECK (URLs https); `pp_hide_city_requires_remote`.
- Triggers (orden alfabético = orden de ejecución en BEFORE):
  - `trg_00_pp_guard` (`pp_guard_privileged_cols`): en INSERT, salvo `is_admin()`, pone `verified=false`, `verified_at=NULL`, `rating_*=0`, `quality_reviewed_at=NULL`…; sólo `postgres`/`service_role` pueden escribir `featured_until`. No mira `user_id`. **Bloquea** `verified=true` para Guccito y cualquier rating precargado.
  - `trg_diploma_gate` (`enforce_diploma_gate`): sólo actúa si `profile_requires_diploma(id)`; con 17 categorías `requires_diploma=false` no hace nada.
  - `trg_zz_pp_minimum` (`pp_require_minimum_to_publish`): si `published`, exige nombre (first o last), `category_id`, `city_id` o `works_remote`, y ≥ 8 dígitos en `phone` o `whatsapp_phone`. **No exige `user_id`.** Falla con los 2 perfiles sin ciudad y los 3 "sólo chat" si se respeta su preferencia.
  - `trg_pp_sync_to_users`: `UPDATE users WHERE id = NEW.user_id` → con NULL no hace nada.
  - `product_first_publication` (`app_private.record_first_publication`): inserta en `professional_activation`; inocuo.
  - `pp_notify_admin`: sólo AFTER UPDATE.
- RLS `pp_public_read`: `published = true OR user_id = auth.uid()` → visibles para anónimos. `search_professionals` y `get_public_professional_profiles` filtran por `published`, no por `user_id`.

Conclusión: los 20 se insertan con `user_id = NULL`, `published = true` (si cumplen el mínimo), `onboarding_step = 9`, y nadie inventa cuentas. Cuando uno de ellos se registre con su email, `handle_new_user` creará su `users`; **khdemlidaba no tiene flujo de "reclamar ficha"** (`pp_owner_update` exige `user_id = auth.uid()`), así que el enganche `update professional_profiles set user_id = <auth uid> where id = …` lo hace el admin (SQL o un RPC nuevo en la capa de código). Recomendación: guardar el email legado del dueño de cada ficha huérfana en una tabla privada `app_private.legacy_owner_emails(professional_id, email)` para que ese enganche sea automático en `handle_new_user` (3 líneas) — decisión de la capa de código.

Para los 26 con cuenta, lo mismo pero con `user_id` relleno; `trg_pp_sync_to_users` copiará `first_name/last_name` a `users`.

---

## 16. Orden de ejecución y SQL esbozado

Estrategia: **no se toca `auth.users`**. Se renombra el esquema viejo, se aplican las 100 migraciones de khdemlidaba sobre un `public` limpio y se rellenan las tablas con `INSERT … SELECT` desde `legacy`.

```sql
-- 0. Copia de seguridad completa (pg_dump) + CSV de payment_records, subscriptions,
--    messages, profile_metrics, translations, invoicing_settings, users (los 57 sin cuenta).

-- 1. Apartar el esquema viejo sin perder datos.
create schema legacy;
-- primero: quitar los triggers que el origen tenga sobre auth.users (handle_new_user /
-- handle_auth_user_link) y el event trigger de rls_auto_enable; luego:
do $$ declare r record; begin
  for r in select tablename from pg_tables where schemaname='public' loop
    execute format('alter table public.%I set schema legacy', r.tablename);
  end loop; end $$;
-- borrar las 21 funciones y las policies viejas de public.

-- 2. Aplicar supabase/migrations/*.sql de khdemlidaba (100 ficheros) en orden.
--    Saltarse la seed marroquí 20260101000002_seed_data.sql (12 categorías, 15 ciudades,
--    30 perfiles) y las seeds posteriores de categorías (20260925115759_add_internship_categories…)
--    o vaciarlas después: en el destino final sólo deben quedar las 17 categorías españolas.

-- 3. Import en UNA transacción con triggers de usuario apagados.
begin;
set local session_replication_role = 'replica';   -- apaga trg_00_pp_guard, trg_zz_pp_minimum,
                                                   -- notify_admin, contact_validate, reviews_rating…

create table legacy.id_map (kind text, legacy_id text, new_id uuid, primary key (kind, legacy_id));

-- 3a. categorías (17)
insert into public.categories (slug, name, emoji, family, allows_remote, requires_diploma, aliases)
select slug, name, icon,
       case slug when 'abogado' then 'bureau' when 'asesoria-gestoria' then 'bureau'
                 when 'marketing-digital-diseno-web' then 'bureau'
                 when 'autonomo-limpieza' then 'maison' when 'empresa-multiservicios' then 'maison'
                 when 'informatico-domicilio-soporte-it' then 'maison' when 'jardinero' then 'maison'
                 when 'peluqueria-estetica-domicilio' then 'beaute' when 'transportista' then 'logistique'
                 else 'batiment' end,
       slug in ('abogado','asesoria-gestoria','marketing-digital-diseno-web','informatico-domicilio-soporte-it'),
       false, '{}'
from legacy.service_categories;

-- 3b. ciudades (376) — ver §5
insert into public.cities (slug, name) select slug, name from legacy.locations_data;

-- 3c. usuarios (34)
insert into public.users (id, email, first_name, last_name, phone, user_type, user_type_explicit,
                          is_admin, created_at, updated_at, last_seen_at, no_reminders)
select u.auth_user_id, u.email,
       split_part(trim(u.full_name),' ',1),
       nullif(regexp_replace(trim(u.full_name),'^\S+\s*',''),''),
       case when u.phone ~ '^\d{9}$' then '+34'||u.phone else nullif(u.phone,'') end,
       case when u.user_type='professionnel' or exists (select 1 from legacy.professional_profiles p where p.user_id=u.id)
            then 'professionnel' else 'client' end,
       true, (u.role='admin'), u.created_date, u.updated_date, a.last_sign_in_at, u.email_unsubscribed
from legacy.users u join auth.users a on a.id = u.auth_user_id;
insert into legacy.id_map select 'user', id, auth_user_id from legacy.users where auth_user_id is not null;

-- 3d. perfiles (46)
with src as (
  select p.*, u.auth_user_id, u.full_name,
         regexp_replace(p.telefono_contacto,'\D','','g') as digits
  from legacy.professional_profiles p join legacy.users u on u.id = p.user_id
), ins as (
  insert into public.professional_profiles
    (user_id, slug, first_name, last_name, category_id, city_id, years_experience, description,
     avatar_url, gallery, languages, availability, phone, whatsapp_phone, whatsapp_enabled, email,
     verified, verified_at, published, onboarding_step, socials, gender, works_remote, hide_city,
     created_at, updated_at)
  select s.auth_user_id,
         legacy.slugify(s.slug_publico),
         /* regla de nombre §3.2 */ s.business_name, '',
         (select id from public.categories c where c.name = s.categories[1]),
         (select id from public.cities ci where ci.slug = legacy.slugify(s.ciudad)),
         s.years_experience::int,
         case when s.descripcion_corta<>'' and s.descripcion_corta<>s.description
                   and s.description not like s.descripcion_corta||'%'
              then s.descripcion_corta||E'\n\n'||s.description else s.description end,
         nullif(s.imagen_principal,''),
         array_remove(s.photos, s.imagen_principal),
         '{es}', 'week',
         case when 'telefono' = any(s.metodos_contacto) then '+34'||right(s.digits,9) end,
         case when 'whatsapp' = any(s.metodos_contacto) then '+34'||right(s.digits,9) end,
         ('whatsapp' = any(s.metodos_contacto)),
         nullif(s.email_contacto,''),
         s.identity_verified, s.identity_verified_at,
         s.visible_en_busqueda, 9,
         legacy.socials_json(s.social_links, s.website),   -- normaliza handles → https
         'homme',                                           -- decisión §19
         false, false, s.created_date, s.updated_date
  from src s
  returning id, slug
)
insert into legacy.id_map
select 'profile', s.id, i.id from src s join ins i on i.slug = legacy.slugify(s.slug_publico);

insert into app_private.professional_categories (professional_id, category_id, is_primary)
select m.new_id, p.category_id, true
from public.professional_profiles p join legacy.id_map m on m.new_id = p.id and m.kind='profile';

insert into app_private.professional_activation (professional_id, first_published_at)
select m.new_id, coalesce(l.fecha_publicacion, l.created_date)
from legacy.professional_profiles l join legacy.id_map m on m.kind='profile' and m.legacy_id = l.id
where l.visible_en_busqueda;

-- 3e. reseñas (2: sin la auto-reseña)
insert into public.reviews (professional_id, author_id, author_name, rating, comment, created_at, status, moderated_at)
select pm.new_id, um.new_id, r.client_name, r.rating::smallint, nullif(r.comment,''),
       r.created_date, 'approved', r.created_date
from legacy.reviews r
join legacy.professional_profiles lp on lp.user_id = r.professional_id      -- ¡apunta a users.id!
join legacy.id_map pm on pm.kind='profile' and pm.legacy_id = lp.id
left join legacy.id_map um on um.kind='user' and um.legacy_id = r.client_id
where r.client_id <> r.professional_id;                                     -- fuera la auto-reseña
update public.professional_profiles p set
  rating_avg   = coalesce((select round(avg(rating)::numeric,2) from public.reviews r where r.professional_id=p.id and r.status='approved'),0),
  rating_count = coalesce((select count(*) from public.reviews r where r.professional_id=p.id and r.status='approved'),0);

-- 3f. clics de contacto (26)
insert into public.contact_events (professional_id, channel, source, created_at)
select pm.new_id, 'phone', 'legacy:misautonomos', m.date::timestamptz
from legacy.profile_metrics m join legacy.id_map pm on pm.kind='profile' and pm.legacy_id = m.professional_id,
     generate_series(1, m.contact_clicks::int)
where m.contact_clicks > 0;

-- 3g. blog (25)
insert into public.blog_posts (slug, locale, title, excerpt, content_md, cover_url, category_slug, author, tags,
                               meta_title, meta_description, published, published_at, created_at, updated_at, views, faq)
select slug, 'es', title_es, excerpt_es, content_es, nullif(featured_image,''), null, 'Equipo MisAutónomos',
       tags || category, meta_title_es, meta_description_es, status='published', publish_date,
       created_date, updated_date, views::int, '[]'
from legacy.blog_posts;

-- 3h. contacto (1)
insert into public.contact_messages (name, email, message, created_at)
select creator_name, creator_email, title||E'\n\n'||description, created_date
from legacy.tickets where id = '7923ec49-449d-4411-8c81-e7d9f35fda58';

-- 3i. verificaciones pendientes (4 personas): tras mover los ficheros a credentials/ (script fuera de SQL)
insert into app_private.credential_submissions (professional_id, kind, storage_path, submitted_at)
select pm.new_id, 'cin', legacy.new_credential_path(i.id, 'front'), i.created_date
from legacy.identity_verifications i
join legacy.users u on u.auth_user_id::text = i.user_id
join legacy.professional_profiles lp on lp.user_id = u.id
join legacy.id_map pm on pm.kind='profile' and pm.legacy_id = lp.id;

-- 3j. CGU (26)
insert into public.cgu_acceptances (user_id, version, accepted_at, source)
select u.auth_user_id, 'misautonomos-legacy', p.created_date, 'migration'
from legacy.professional_profiles p join legacy.users u on u.id=p.user_id
where p.acepta_terminos and u.auth_user_id is not null;
update public.users us set cgu_accepted_at = c.accepted_at, cgu_version = c.version
from public.cgu_acceptances c where c.user_id = us.id;

-- 4. Validación antes de confirmar: replicar pp_require_minimum_to_publish a mano.
select slug from public.professional_profiles
where published and (category_id is null or (city_id is null and not works_remote)
   or greatest(length(regexp_replace(coalesce(phone,''),'\D','','g')),
               length(regexp_replace(coalesce(whatsapp_phone,''),'\D','','g'))) < 8);
-- debe devolver 0 filas (o las que el dueño haya decidido dejar sin publicar).
commit;
```

`legacy.slugify`, `legacy.socials_json` y `legacy.new_credential_path` son tres funciones auxiliares de 10 líneas que se escriben en la fase de ejecución; el import real se hará como `postgres` con `session_replication_role = replica`, que es lo que deja escribir `verified`, `is_admin` y `featured_until` sin pelearse con `trg_00_pp_guard` / `trg_users_guard`.

---

## 17. Recuentos esperados

| Tabla destino | Antes (public limpio tras migraciones, sin seed marroquí) | Después del import |
|---|---:|---:|
| `categories` | 0 | 17 |
| `cities` | 0 | 376 (modelo A) |
| `users` | 0 | 34 (1 admin, 30 `professionnel`, 4 `client`) |
| `professional_profiles` | 0 | 46 (26 con `user_id`, 20 NULL; `published` = 46 si se resuelven §19.3–4, si no 41) |
| `app_private.professional_categories` | 0 | 46 |
| `app_private.professional_activation` | 0 | 46 (24 con fecha real) |
| `reviews` | 0 | 2 (3 si se conserva la auto‑reseña) |
| `contact_events` | 0 | 26 |
| `blog_posts` | 0 | 25 (29 con las EN) |
| `contact_messages` | 0 | 1 (3 con las de prueba) |
| `app_private.credential_submissions` | 0 | 4 o 12 |
| `cgu_acceptances` | 0 | 26 |
| `favorites`, `notifications`, `demandes`, `candidatures`, `website_requests`, `promo_orders`, … | 0 | 0 |
| `auth.users` | 34 | **34 (intacto)** |
| storage `uploads` | 183 objetos / 180,7 MB | 167 (−15 DNI −1 audio) y, tras purga de huérfanos, ≈117 |
| storage `credentials` | 0 | 12 |

Comprobaciones de cierre: `select count(*) from professional_profiles where published` = 46; `select count(*) from professional_profiles p where user_id is not null and not exists (select 1 from users u where u.id=p.user_id)` = 0; `select count(*) from professional_profiles where category_id is null or (city_id is null and not works_remote)` = 0; `select slug, count(*) from professional_profiles group by 1 having count(*)>1` = 0 filas; `search_professionals(p_category_slug=>'pintor')` devuelve 8; `search_professionals(p_city_slug=>'barcelona')` devuelve 9.

---

## 18. Lo que se PIERDE (campos sin destino)

Por perfil (46): `cif_nif` (27 con dato), `iban` (1), `tarifa_base` (17 con valor: 20–90 €), `price_range`, `facturacion`, `formas_pago` (46; Bizum/Tarjeta/Efectivo/Transferencia), `service_area`, `radio_servicio_km`, horario (`opening_hours`, `horario_dias`, `horario_apertura`, `horario_cierre`; 3 personalizados), `descripcion_corta` (4 distintas; salvables anteponiéndolas), `skills` (13 ítems en 4 perfiles), `certifications` (1), `services_offered` (10 ítems en 4 perfiles), `portfolio_items` (4 ítems en 2 perfiles, 1 imagen), `faq_items` (0), programa de referidos (25 códigos, 0 referidos), `whatsapp_notifications_*` (0), `identity_document_type`, `is_ads_plus` (6; sólo si se decide `featured_until=NULL`), `metodos_contacto='chat_interno'` (46: el chat desaparece), `slug_publico_aliases` (0), la URL anidada por categoría‑ciudad.

Por usuario: 57 usuarios sin cuenta (37 sin nada más), `city` (10), `profile_picture` (18, duplicado de `imagen_principal`), `notification_preferences`, `is_verified` (62), `tags`, `subscription_*`.

Reseñas: subnotas `rapidez/comunicacion/calidad/precio_satisfaccion` y `professional_response` (1), `client_verified`.

Blog: `featured` (2), `og_image` (2), `read_time_minutes`, `related_articles`, categoría editorial como campo propio (va a `tags`), traducciones EN (4 cuerpos, 5 títulos) si no se crean filas `en`.

Métricas: 515 visitas de perfil y 6.828 apariciones en búsqueda (sólo sobreviven 26 clics). Mensajería: 10 mensajes, 6 conversaciones, 1 presupuesto en chat, 2 `review_requests`, 1 notificación. Pagos: 87 cobros y 20 suscripciones (a CSV). Caché de traducciones (469). Consentimiento de cookies (1). Ticket de prueba (2).

---

## 19. Decisiones que necesita el dueño

1. **Geografía** (§5): modelo A (376 municipios, sin provincia, esquema idéntico) o C (municipios + 2 columnas de provincia para conservar el desplegable provincia→ciudad). Se decide antes de la seed.
2. **Nombre de la ficha** (§3.2): regla "persona → nombre/apellidos; empresa → todo en `first_name`" y revisar las 46 a ojo, o todo en `first_name` sin excepción.
3. **Los 2 perfiles sin ciudad** (`ANDRES F RODRIGUEZ ESTRADA`, `Esdrújulo`, provincia Barcelona): asignar `Barcelona` o dejarlos `published=false`.
4. **Los 3 perfiles "sólo chat interno"** (`Joselito`, `Marwan El Haddadi`, `Florentín Gabriel Tudor`): publicar con el teléfono que dieron como `phone` (no eligieron mostrarlo) o `published=false` hasta que lo activen. Sin chat en khdemlidaba no hay tercera vía.
5. **`gender`** obligatorio sin dato: `homme` por defecto para los 46 (como hace el asistente de khdemlidaba), o relajar el CHECK con un tercer valor (toca el filtro `p_gender` y la UI).
6. **`is_ads_plus` → `featured_until`**: `NULL` (plan retirado, 0 suscripciones vigentes) o regalar 30 días de destacado a los 6.
7. **Auto‑reseña** `691f37e3…` (Juan Pérez se valora a sí mismo): descartar (propuesto) o conservar.
8. **Blog EN**: no migrar las 4 versiones inglesas, o crearlas como filas `locale='en'` con slug `-en` y añadir el filtro de idioma en `Blog.jsx` (capa de código).
9. **Portadas del blog**: dejar los 20 hotlinks de Unsplash o re‑alojar en `photos/blog/` (y los 2 PNG de 1,4 MB → webp).
10. **Fotos de los 26 pros con cuenta**: copiarlas a `photos/<uid>/` (borrables por el pro y por `delete_my_account`) o dejarlas en `uploads` como legado de sólo lectura.
11. **Documentos de identidad** (§11): mover los 15 ficheros a `credentials/` y crear 4 (o 12) `credential_submissions` pendientes, o descartar las 5 verificaciones y pedirles que vuelvan a subir. En ambos casos salen del bucket público.
12. **`skills` / `services_offered` / `certifications`** (6 perfiles): anexar como texto a `description` o perderlos.
13. **Categorías**: quedarse con las 17 o ampliar antes de lanzar; y aprobar la tabla de `family`/`allows_remote` del §4 (afecta a las landings por familia y al filtro "en línea").
14. **Tickets**: migrar sólo el real de ECOSMART (propuesto) o los 3.
15. **CGU**: dar por aceptadas las condiciones (`cgu_accepted_at = created_date`, versión `misautonomos-legacy`) para los 26 con cuenta, o dejarlas en NULL y que khdemlidaba se las pida en el próximo login.
16. **Exportaciones legales**: confirmar dónde se guardan los CSV de `payment_records` (87 cobros, 1.549,21 €) e `invoicing_settings` (NIF + IBAN) antes de borrar `legacy`.
17. **Cuentas de prueba del propio dueño** (`Juan Pérez`, `Guccito`, `Oscar Barambio`, `Ilias`, `Rayan`, `Esdrújulo`, `Leonor`, `Oscar Gómez`, `Electricistas SL`, `Inmobiliaria Traspasos` y los 6 perfiles con el teléfono `644853733`): ¿migran como fichas públicas o se limpian antes?
