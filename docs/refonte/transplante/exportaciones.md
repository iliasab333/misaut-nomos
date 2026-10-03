# Exportaciones previas al corte

Generadas el 2026-10-03, antes de que la fase C mueva una sola tabla. **No
están en el repositorio y no deben estarlo**: son NIF, IBAN, teléfonos y
correos de 93 personas reales, y este repositorio se empuja a GitHub.

Viven en `docs/refonte/transplante/exportaciones/`, ignorado por git.

| Fichero | Filas | Por qué se conserva |
|---|---|---|
| `payment_records.csv` | 87 | **Obligación fiscal**: justificantes de cobro. AEAT 4 años, Código de Comercio 6. |
| `invoicing_settings.csv` | 1 | NIF, dirección fiscal e IBAN del titular. |
| `subscriptions.csv` | 20 | Histórico de suscripciones; ninguna cobra (último cobro 17/04/2026). |
| `profile_metrics.csv` | 2 068 | 515 visitas de perfil y 6 828 apariciones en búsqueda que el esquema nuevo **no tiene dónde guardar**: sólo sobreviven los clics como `contact_events`. Esto es su única copia. |
| `messages.csv` | 10 | La mensajería interna desaparece en la réplica. |
| `translations.csv` | 469 | Caché de traducción de perfiles, que deja de usarse. |
| `users.csv` | 93 | Incluidos los 57 sin cuenta de acceso, que no viajan. |
| `professional_profiles.csv` | 48 | Estado de partida, para poder contrastar lo migrado. |
| `tickets.csv` · `reviews.csv` · `blog_posts.csv` · `identity_verifications.csv` · `notifications.csv` · `cookie_consents.csv` | — | Estado de partida. |

## Lo que hay que saber

`profile_metrics` salió primero con **exactamente 1 000 filas**. No era el
total: es el tope por defecto de PostgREST. Un export truncado en una cifra
redonda es la clase de error que nadie mira hasta el día que hace falta el
dato. Se rehízo paginando: 2 068.

`translations` no tiene columna `id` —su clave es `(source_hash,
target_lang)`— así que no se puede paginar por ella; sus 469 filas caben de
una vez bajo el tope, así que el export de la primera pasada está completo.

## Antes de borrar nada

Estos ficheros son la única copia de lo que el esquema nuevo no recibe.
Guárdalos fuera de este ordenador antes del `DROP SCHEMA legacy`.
