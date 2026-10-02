# 12 — Las promociones con Stripe

Cómo se cobra hoy en khdemlidaba, qué hay que cambiar para cobrar con Stripe en
España, y qué queda vivo de la etapa Stripe anterior de misautonomos que hay que
retirar o reaprovechar.

Fase de **sólo lectura**: no se ha tocado código, no se ha desplegado nada, no se
ha escrito en ninguna base. Todo el SQL ejecutado ha sido `select`,
`pg_get_functiondef` e `information_schema`. Código de khdemlidaba leído del árbol
de trabajo (`/Users/bigseo/khdemlidaba`, HEAD `bfa184b`); misautonomos, HEAD
`2fe07a7`.

---

## 0. Dos correcciones de partida, antes de nada

**0.1 — El identificador de proyecto del encargo era el equivocado.** El encargo
pedía comprobar `promo_orders` y `promo_settings` «project_id
eiacoozyubxkbjwhgkml». Ese proyecto es **KhdemliDaba** (región eu-west-3, creado
el 21/07/2026). misautonomos es **`dquxsethatxtptfviiwd`** (eu-west-2, creado el
04/04/2026). Lo he verificado con `list_projects` y cruzándolo con las edge
functions desplegadas de cada uno.

Importa porque las dos mitades del encargo viven en bases distintas:

| Lo que se pedía comprobar | Dónde está realmente |
|---|---|
| `promo_orders` (10 filas), `promo_settings` | `eiacoozyubxkbjwhgkml` (khdemlidaba) — el **origen** |
| `payment_records` (87), `subscriptions` (20) | `dquxsethatxtptfviiwd` (misautonomos) — el **destino** |

misautonomos **no tiene** hoy ninguna tabla `promo_*`: el trasplante de las
promociones todavía no ha empezado. Y khdemlidaba no tiene ni `payment_records`
ni `subscriptions`. He consultado las dos.

**0.2 — khdemlidaba ya no cobra con YouCan Pay.** El encargo dice que khdemlidaba
«cobra por transferencia bancaria, con una pasarela YouCan Pay». Lo segundo ya no
es cierto: YouCan Pay **nunca entró en producción**. El adaptador
(`_shared/payments.ts`), `promo-checkout` y `promo-webhook` siguen en el
repositorio y siguen **desplegados** en khdemlidaba, pero están dormidos:

- `getPaymentProvider()` lee el secreto `PAYMENT_PROVIDER`; si está vacío devuelve
  `null` y las dos funciones responden 503 / 501 sin crear nada
  (`_shared/payments.ts:62-68`).
- Los secretos `PAYMENT_PROVIDER` y `YOUCANPAY_*` nunca se pusieron
  (`docs/promo/README.md`, líneas 1-9).
- El front ya no llama a `promo-checkout`: `src/lib/promo.js` habla directamente
  con la RPC `promo_create_order`. Lo dice su propia cabecera: «il n'y a donc plus
  de fonction edge de checkout ni de redirection vers un prestataire».
- En la base lo confirman los datos: de las 10 comandas, **2 tienen
  `provider = 'youcanpay'`** y las dos están `cancelled` — son las pruebas de
  septiembre de 2026 que el README dice que se cerraron antes de abrir. Las 8
  restantes son `provider = 'virement'`.

Esto es **buena noticia** para el encargo: el adaptador YouCan Pay no hay que
desmontarlo, hay que **sustituirlo**, y la interfaz `PaymentProvider` que dejó
escrita es exactamente el sitio donde encaja Stripe sin tocar ni la base ni el
front.

---

## 1. El circuito de pago de khdemlidaba, de punta a punta

### 1.1 Las dos capas que existen

Hay **dos** circuitos en el código, no uno:

| Circuito | Estado | Camino |
|---|---|---|
| **Transferencia** | **en producción** desde el 17/09/2026 | navegador → RPC `promo_create_order` → página de IBAN → el admin marca pagado a mano |
| **Pasarela** | escrito, desplegado, **dormido** | navegador → `promo-checkout` → pasarela → `promo-webhook` → `promo_mark_paid` |

El segundo es el molde donde va Stripe. El primero es el que hoy mueve el dinero.

### 1.2 El recorrido real (transferencia)

1. **`src/pages/PromoInstagram.jsx:95`** llama a `createPromoOrder(PROMO_POST)`,
   que es `supabase.rpc('promo_create_order', { p_product })`
   (`src/lib/promo.js:214`). El navegador manda **el producto, nunca el precio**.
2. **`promo_create_order(p_product)`** (SECURITY DEFINER, 3 424 caracteres) hace,
   en este orden:
   - `auth.uid()` o excepción `PROMO_AUTH_REQUIRED`;
   - rechaza cualquier producto que no sea `instagram_post` o `featured` (la
     oferta de empleo tiene su propia función, `promo_create_job_order`, porque
     lleva el contenido del anuncio dentro);
   - **`pg_advisory_xact_lock`** por *capacidad*, no por producto: el post de
     Instagram y la oferta de empleo comparten las plazas de la semana y por
     tanto comparten el cerrojo; el destacado tiene el suyo;
   - **si ya existe una comanda `pending_payment` del mismo usuario y producto,
     la devuelve con `existing: true`** — un segundo clic no abre una segunda
     referencia;
   - `_promo_eligibility(uid, producto)` o excepción `PROMO_NOT_ELIGIBLE:<razón>`;
   - **fija el precio**: `v_amount := s.featured_price_mad` o `s.price_mad`,
     leídos de `promo_settings` donde `id = 1`;
   - genera la referencia `KD-XXXXXXXX` en bucle hasta que no colisione;
   - `insert into promo_orders (… provider) values (… 'virement')` — **el
     proveedor está escrito a mano en el INSERT**;
   - `_promo_fire_mail('instructions', v_id)` → `pg_net` tras el COMMIT → la edge
     function `promo-mail` manda el correo **con el IBAN**.
3. El front navega a `/mes-paiements/virement/:id`
   (`PromoInstagram.jsx:121`). **`PromoVirement.jsx`** lee la comanda con un
   `select` directo sobre `promo_orders` (RLS: `promo_orders_owner_read` por
   `user_id`) y las coordenadas bancarias con `promo_bank_details()`, que sólo
   responde a cuentas conectadas.
4. «He hecho la transferencia» → `promo_declare_transfer(order_id, proof_path)`.
   No prueba nada: pone `transfer_declared_at` (con `coalesce`, así que volver a
   pulsar no la mueve), guarda opcionalmente el justificativo en el bucket
   privado `credentials` y avisa al admin por Telegram.
5. El admin ve el ingreso en la cuenta y pulsa **Marcar pagado** →
   `admin_promo_mark_paid(order_id, bank_ref)`, que verifica `is_admin()` y llama
   a `promo_mark_paid(o.reference, 'virement', bank_ref, **o.amount_mad**)` — el
   importe sale **de la comanda**, el admin no lo escribe nunca.

### 1.3 ¿En qué momento se fija el precio?

**En `promo_create_order`, dentro de la base, en el instante de crear la
comanda** — y se congela ahí, en `promo_orders.amount_mad`. Tres consecuencias
que el diseño con Stripe tiene que respetar:

- El navegador no puede influir en el importe. Nunca lo envía.
- Si el admin cambia el precio en `promo_settings` mañana, las comandas abiertas
  siguen con el precio de ayer. Es lo correcto: el cliente ya vio un importe.
- `promo_mark_paid` **compara** el importe cobrado con el de la comanda
  (`if p_amount_mad is distinct from o.amount_mad`) y, si no coinciden, pone la
  comanda en `payment_failed`, escribe la diferencia en `admin_note` y registra
  `promo_payment_amount_mismatch`. Un fallo **visible**, nunca un falso «pagado».
  Es la red de seguridad contra los errores de unidad (céntimos frente a
  unidades), y es la razón por la que el apartado 4 insiste tanto en los
  céntimos.

### 1.4 ¿Dónde vive el estado de la comanda?

En **una sola columna**: `promo_orders.status`, con un `CHECK` de nueve valores
(verificado en la base):

```
pending_payment · paid · brief_submitted · scheduled · published · active
cancelled · refunded · payment_failed
```

No hay máquina de estados en el front; el front sólo agrupa
(`PromoVirement.jsx:42-45`: `PAID_STATUSES`, `CLOSED_STATUSES`) y
`src/lib/promo.js` exporta el orden que se muestra al cliente
(`PROMO_STEPS = ['paid','brief_submitted','scheduled','published']`). Quien
decide es la base. Las transiciones de pago sólo las hacen tres funciones:
`promo_mark_paid`, `promo_mark_failed` y `admin_promo_update`.

### 1.5 ¿Qué hace el webhook?

`supabase/functions/promo-webhook/index.ts` son 66 líneas y su comentario de
cabecera dice la frase que hay que conservar palabra por palabra en Stripe: *es
el único camino por el que una comanda pasa a «pagada»; la vuelta del navegador
no confirma nada*. Hace exactamente esto:

1. `verify_jwt = false` (una pasarela no tiene JWT de Supabase) — verificado en
   `config.toml:36` y en el despliegue real.
2. `const raw = await req.text()` — **lee el cuerpo en bruto**, requisito para
   verificar cualquier firma.
3. `provider.parseWebhook(req, raw)`: el adaptador **tiene que verificar la firma
   y devolver `null` si no vale**. Si devuelve `null`, el webhook escribe una fila
   en `system_failures` (`promo_webhook_bad_signature`, guardando sólo la
   longitud del cuerpo) y responde 400 sin revelar nada.
4. Si `status === 'paid'` → `promo_mark_paid(reference, provider, providerRef,
   amountMad)` con la **clave de servicio**. Si la RPC falla, registra
   `promo_mark_paid_error` y responde **500 a propósito**, para que la pasarela
   reintente: un pago real no se pierde por un error pasajero de la base.
5. Si `status === 'failed'` → `promo_mark_failed`, que sólo actúa sobre comandas
   `pending_payment`.

Y `promo_mark_paid` (5 399 caracteres, leída de la base) es la pieza que hace que
el webhook pueda ser tonto:

- `select … for update` sobre la comanda: serializa dos webhooks simultáneos;
- **si ya está en `paid`/`brief_submitted`/`scheduled`/`published`/`active`,
  devuelve `{ok:true, idempotent:true}` y no hace nada más** — ni segunda
  notificación, ni segundo correo, ni segunda plaza consumida;
- si está en `refunded`, se niega y registra `promo_payment_after_refund`;
- comprueba el importe (§1.3);
- según el producto: `featured` → prolonga `professional_profiles.featured_until`
  (nunca pierde días ya pagados) y pone `active`; `job_post` con el anuncio ya
  escrito → `brief_submitted`; el resto → `paid`;
- acepta **a propósito** venir desde `cancelled` y `payment_failed`: «el dinero
  está cobrado, la comanda también debe estarlo»;
- detecta doble pago del mismo pro y producto (`promo_double_payment`);
- notificación en la app + `_promo_fire_mail('paid')` + Telegram, cada uno en su
  propio `begin/exception` para que un correo caído no bloquee el cobro.

Y en la tabla hay un índice que es, de hecho, el seguro antifraude del webhook:

```sql
CREATE UNIQUE INDEX uq_promo_orders_provider_ref
  ON promo_orders (provider, provider_ref) WHERE provider_ref IS NOT NULL
```

Dos comandas no pueden compartir una referencia de proveedor. `admin_promo_mark_paid`
ya captura ese `unique_violation` y lo convierte en `PROMO_BANK_REF_DUPLICATE`.
**Con Stripe, esto es lo que impide cobrar dos comandas con el mismo
`payment_intent`.** Sale gratis si se reutiliza `provider_ref`.

---

## 2. La forma real de `promo_orders` y `promo_settings` (medida)

### 2.1 `promo_orders` — 34 columnas

| # | Columna | Tipo | Para qué |
|---|---|---|---|
| 1 | `id` | uuid PK | `gen_random_uuid()` |
| 2 | `reference` | text **UNIQUE** | `KD-XXXXXXXX` — el motivo de la transferencia |
| 3-6 | `professional_id`, `user_id`, `pro_name`, `city_id` | uuid/text/int | dueño; `user_id` es lo que lee la RLS |
| 7 | `status` | text, def. `pending_payment` | CHECK de 9 valores (§1.4) |
| 8 | **`amount_mad`** | **integer**, CHECK `> 0` | el importe congelado |
| 9-10 | `ad_budget_mad`, `reach_target` | integer | lo que se gasta en publicidad y el objetivo |
| 11 | **`provider`** | text | `virement` / `youcanpay` |
| 12 | **`provider_ref`** | text | referencia del proveedor; UNIQUE con `provider` |
| 13 | `paid_at` | timestamptz | — |
| 14-16 | `brief_text`, `brief_photos` (text[]), `brief_submitted_at` | | contenido del post; CHECK ≤ 600 car. y ≤ 5 fotos |
| 17-20 | `scheduled_for`, `published_at`, `instagram_url`, `reach_achieved` | | entrega; la URL con CHECK de dominio Instagram |
| 21-22 | `admin_note`, `admin_notified_at` | | |
| 23-24 | `created_at`, `updated_at` | | |
| 25 | `product` | text, def. `instagram_post` | CHECK: `instagram_post`/`featured`/`job_post` |
| 26 | `featured_until` | timestamptz | |
| 27 | **`transfer_declared_at`** | timestamptz | «he hecho la transferencia» |
| 28-31 | `company_name`, `job_title`, `contact_phone`, `contact_email` | | oferta de empleo |
| 32-33 | `instructions_mailed_at`, `paid_mailed_at` | | trazas de `promo-mail` |
| 34 | **`transfer_proof_path`** | text | ruta en el bucket privado `credentials` |

Ocho índices, de los cuales los dos que importan para el pago son
`promo_orders_reference_key` (UNIQUE `reference`) y `uq_promo_orders_provider_ref`
(UNIQUE parcial `(provider, provider_ref)`).

### 2.2 `promo_settings` — 23 columnas, **una sola fila (`id = 1`)**

Valores medidos hoy en khdemlidaba:

| Grupo | Columnas | Valor actual |
|---|---|---|
| Post Instagram | `is_open`, `price_mad`, `ad_budget_mad`, `reach_target`, `weekly_capacity`, `lead_days_min/max` | abierto, **150**, 100, 10 000, 10/semana, 1-2 días |
| Destacado | `featured_is_open`, `featured_price_mad`, `featured_days`, `featured_capacity_per_city` | abierto, **50**, 30 días, 3 por ciudad |
| Oferta de empleo | `job_is_open`, `job_price_mad`, `job_ad_budget_mad` | abierto, **200**, 150 |
| Transferencia | `transfer_hold_days`, `bank_holder/name/rib/iban/bic/agency` | 5 días; IBAN puesto |

Los `price_mad` por defecto del DDL (200 el post) **no** son los valores de
producción (150). El precio vive en la fila, no en el `DEFAULT`.

### 2.3 Los estados reales de las 10 comandas

| `status` | producto | `provider` | n | importe | `paid_at` | `transfer_declared_at` | `provider_ref` |
|---|---|---|---|---|---|---|---|
| `active` | `featured` | `virement` | 1 | 50 | 1 | 1 | 0 |
| `cancelled` | `featured` | **`youcanpay`** | 1 | 50 | 1 | 0 | 1 |
| `cancelled` | `instagram_post` | **`youcanpay`** | 1 | 200 | 1 | 0 | 1 |
| `cancelled` | `job_post` | `virement` | 3 | 200 | 0 | 2 | 0 |
| `pending_payment` | `featured` | `virement` | 4 | 50 | 0 | 1 | 0 |

**Total 10.** Lo que se lee aquí:

- **Una sola venta cobrada y viva**: un destacado de 50 DH.
- Las dos `youcanpay` tienen `paid_at` y `provider_ref` y están canceladas: son
  las pruebas de sandbox del 12/09 que el README dice que se cerraron. Son la
  única prueba de que el camino con pasarela llegó a funcionar alguna vez.
- 4 destacados `pending_payment` (sólo uno con transferencia declarada) y 3
  ofertas de empleo canceladas sin cobrar (2 declaradas): **la transferencia
  pierde ventas**. De 9 comandas de pago, 1 cobrada. Es el argumento más fuerte a
  favor de la tarjeta, y está en los datos, no en una opinión.
- Sólo aparecen 3 de los 9 estados posibles. `paid`, `brief_submitted`,
  `scheduled`, `published`, `refunded` y `payment_failed` **no se han dado nunca**
  en producción: el camino de reembolso y el de fallo de pago están escritos pero
  no probados contra datos reales.

---

## 3. La sustitución por Stripe Checkout

Principio de diseño, heredado de `_shared/payments.ts` y que conviene no perder:
**todo el sistema habla con una interfaz, nunca con un proveedor en directo**.
Cambiar de proveedor es escribir un adaptador y poner sus secretos. Lo que sigue
es un adaptador `stripe` dentro de ese molde, no una reescritura.

### 3.1 Qué cambia en `promo-checkout`

El esqueleto actual (CORS por lista de orígenes, JWT obligatorio, 4 pasos en
orden) **se conserva entero**. Los cambios:

**a) El paso 1 sigue siendo «¿hay proveedor?».** `getPaymentProvider()` gana un
`case 'stripe'`. Sigue devolviendo `null` si falta la clave → 503 **antes** de
crear la comanda, para no reservar una plaza que nadie va a pagar.

**b) El paso 2 cambia en un punto no obvio.** `promo_create_order` hoy escribe
`provider = 'virement'` a mano **y dispara el correo con el IBAN**
(`_promo_fire_mail('instructions')`). Si no se toca, cada cliente que pague con
tarjeta recibirá un correo pidiéndole una transferencia. Hay que añadir un
argumento:

```sql
promo_create_order(p_product text default 'instagram_post',
                   p_provider text default 'virement')  -- 'stripe' | 'virement'
```

con `p_provider` validado contra una lista blanca, escrito en el INSERT, y el
`_promo_fire_mail('instructions')` **condicionado a `p_provider = 'virement'`**.
Lo mismo en `promo_create_job_order`. El valor por omisión `'virement'` mantiene
compatible a cualquier llamador que no se actualice.

**c) El paso 3 crea una Checkout Session en vez de una comanda YouCan.**
Decisiones concretas:

- **`mode: 'payment'`**, no `'subscription'`. Son tres compras de una vez. (La
  `createCheckoutSession` que quedó en misautonomos es `mode: 'subscription'`:
  no sirve, ver §5.)
- **`line_items` con `price_data` en línea**, no un `price` de Stripe:
  ```js
  line_items: [{
    quantity: 1,
    price_data: {
      currency: 'eur',
      unit_amount: order.amount_cents,          // entero, de la base
      product_data: { name: '…', description: order.reference },
    },
  }]
  ```
  **Esto es deliberado**: con `price_data` el precio sigue viviendo **sólo** en
  `promo_settings` y no hay un segundo sitio que mantener sincronizado. El
  antecedente de lo contrario está en la propia base: `subscription_plans` tiene
  una columna `stripe_price_id` que está **vacía o nula en las 4 filas**, incluidas
  las de 30 € y 50 € — exactamente el desfase que `price_data` evita.
- **`client_reference_id: order.reference`** y `metadata: { reference, order_id,
  product }`, repetido en `payment_intent_data.metadata` (el `metadata` de la
  sesión no viaja al `payment_intent`, y los eventos de reembolso llegan por el
  cargo, no por la sesión).
- `customer_email` del JWT, `locale: 'es'`, `success_url` con
  `?session_id={CHECKOUT_SESSION_ID}`, `cancel_url` a la página del producto.
- **`expires_at`**: la sesión de Checkout caduca por omisión en 24 h (mínimo 30
  min, máximo 24 h). Conviene ponerla corta — 30-60 min — porque mientras la
  comanda está `pending_payment` **ocupa una plaza de la capacidad semanal**. Con
  transferencia ese plazo es `transfer_hold_days = 5`; con tarjeta, 5 días de
  plaza bloqueada por una pestaña abierta es absurdo.
- **`idempotencyKey: order.reference`** en la llamada a Stripe: dos clics no
  crean dos sesiones. Y mejor aún: si la comanda ya tiene `stripe_session_id` y
  la sesión sigue abierta, **reutilizar su `url`** en vez de crear otra. Encaja
  con el `existing: true` que ya devuelve `promo_create_order`.
- **Métodos de pago**: dejar que Stripe decida
  (`automatic_payment_methods`/configuración del panel) en vez de fijar
  `payment_method_types` a mano. Así activar Bizum o Apple Pay es un clic en el
  panel y no un despliegue.

**d) El paso 4 guarda las dos referencias de Stripe**, no una (§3.3).

**e) Lo que NO cambia y conviene no «limpiar»:** el `catch` que, si la pasarela
falla, llama a `promo_mark_failed` y escribe en `system_failures` antes de
devolver 502; la IP real del cliente desde `x-forwarded-for` (Stripe Radar la
usa igual que YouCan); y la lista `ORIGINS` — que hay que **reescribir** a
`misautonomos.es`, porque hoy dice `khdemlidaba.ma` (el informe 02 ya contó 71
referencias de ese tipo).

### 3.2 Qué cambia en `promo-webhook`

Las 66 líneas se conservan casi intactas; todo el cambio está dentro de
`parseWebhook`.

**a) Verificación de firma.** Cabecera **`stripe-signature`**. Y un detalle que
rompe en silencio si se ignora:

```js
// ✗ event = stripe.webhooks.constructEvent(raw, sig, whsec)
// ✓
const event = await stripe.webhooks.constructEventAsync(raw, sig, whsec);
```

La variante síncrona usa criptografía síncrona de Node y **no funciona en Deno /
edge**. Hay que usar `constructEventAsync`. El `raw` ya lo lee el esqueleto
actual (`await req.text()`), y hay que seguir pasándolo **sin parsear**: un
`JSON.parse` + `stringify` previo invalida la firma.

Si la firma no vale → devolver `null`, que es lo que el esqueleto ya traduce a
fila en `system_failures` + 400. No hay que tocar esa parte.

**b) Idempotencia por `event.id`.** Hoy la idempotencia es *por estado de la
comanda* (§1.5) y eso cubre bien `checkout.session.completed` repetido. **No cubre
los reembolsos ni los fallos**, que no tienen guarda de estado. Y Stripe reenvía
eventos. Lo mínimo honesto es una tabla:

```sql
create table promo_webhook_events (
  event_id   text primary key,      -- evt_…
  event_type text not null,
  reference  text,
  received_at timestamptz not null default now()
);
```

y un `insert … on conflict (event_id) do nothing returning 1`: si no devuelve
fila, el evento ya se procesó → responder 200 y salir. Primero el insert, después
el efecto. Dos líneas de SQL que ahorran un reembolso aplicado dos veces.

**c) Eventos a manejar.**

| Evento de Stripe | Qué hacer | Por qué |
|---|---|---|
| `checkout.session.completed` | **sólo si `payment_status === 'paid'`** → `promo_mark_paid` | una sesión puede «completarse» sin estar cobrada (métodos diferidos). Confundirlo es regalar el producto |
| `checkout.session.async_payment_succeeded` | → `promo_mark_paid` | el cobro diferido que llegó. Imprescindible si algún día se activa SEPA; inofensivo si no |
| `checkout.session.async_payment_failed` | → `promo_mark_failed` | |
| `checkout.session.expired` | → `promo_mark_failed` | **libera la plaza** de la capacidad semanal. Es el evento que hoy no existe y que hace que la tarjeta no desperdicie inventario |
| `payment_intent.payment_failed` | → `promo_mark_failed` | tarjeta rechazada, 3DS abandonado |
| `charge.refunded` | → **`promo_mark_refunded`** (nueva) | ver (e) |
| `charge.dispute.created` | → sólo `system_failures` + Telegram | un *chargeback* no es un reembolso; lo decide una persona |

**d) El importe, en enteros y sin dividir.** Del evento se sacan
`session.amount_total` (entero, en céntimos) y `session.currency`. Hay que
**rechazar** cualquier cosa que no sea `'eur'` (como el adaptador YouCan rechazaba
lo que no era MAD) y pasar `amount_total` **tal cual** a `promo_mark_paid`, contra
una columna que también esté en céntimos (§3.3 y §4). Así la comparación
`is distinct from` de `promo_mark_paid` es entero contra entero y **desaparece
toda una familia de errores de unidad**. El adaptador YouCan tenía que hacer
`Number(tx.amount) / 100` y comprobar `Number.isInteger` precisamente para no
caer en eso; con Stripe en céntimos no hace falta dividir nunca.

`provider_ref` = el **`payment_intent`** (`pi_…`), no el id de la sesión. Es lo
que identifica el dinero, es lo que se usa para reembolsar, y es lo que el índice
`uq_promo_orders_provider_ref` tiene que proteger.

**e) El reembolso, que hoy no existe.** El estado `refunded` está en el CHECK pero
sólo lo pone `admin_promo_update` a mano, y el README de khdemlidaba lo dice sin
rodeos: «"Marcar reembolsado" no envía nada; es una transferencia de vuelta que se
hace desde el banco». **Con Stripe eso cambia**: el dueño reembolsa desde el panel
de Stripe y el `charge.refunded` llega al webhook. Hace falta una RPC nueva:

```
promo_mark_refunded(p_provider_ref text, p_amount_cents int, p_full boolean)
```

que localice la comanda por `(provider, provider_ref)`, ponga `refunded`, y
—decisión importante— **si el producto es `featured`, recorte
`professional_profiles.featured_until`**: si no, el pro se queda con el destacado
después de que le devuelvan el dinero. `promo_mark_paid` ya trata el caso inverso
(se niega a cobrar una comanda `refunded`), así que el par queda cerrado.

**f) `verify_jwt = false` ya está puesto** en el despliegue real. No hay que
cambiarlo, hay que **no olvidarlo** al redesplegar: con `verify_jwt = true`,
Stripe recibiría 401 en cada intento y los pagos se quedarían sin confirmar sin
que nada parezca roto.

### 3.3 Qué columnas hacen falta en `promo_orders`

Lo justo. La tabla ya tiene el par `provider` / `provider_ref` con su índice
único, y duplicarlo en columnas `stripe_*` sería crear dos verdades.

| Columna | Tipo | ¿Necesaria? | Razón |
|---|---|---|---|
| `provider` | ya existe | **reutilizar** | pasa a valer `'stripe'` |
| `provider_ref` | ya existe | **reutilizar** | el `payment_intent` `pi_…`; el UNIQUE parcial ya impide el doble cobro |
| **`stripe_session_id`** | `text`, UNIQUE parcial | **sí** | es un objeto distinto del `pi_`. Hace falta para (1) reanudar un Checkout abierto en vez de crear otra sesión, (2) atar la vuelta del navegador (`?session_id=`) a la comanda sin confiar en ella, (3) reconciliar a mano en el panel |
| `refunded_at` | `timestamptz` | **sí** | hoy un reembolso no deja fecha, sólo cambia `status`. Para la contabilidad hace falta el cuándo |
| `refund_ref` | `text` | conveniente | el `re_…` de Stripe |
| `stripe_payment_intent` | — | **no** | sería `provider_ref` con otro nombre. Añadirla es renunciar al índice único que ya protege |
| `currency` | — | **no** por ahora | sólo euros. Si algún día hay otra, mejor una columna que un supuesto implícito |

Y el renombrado que **no** es cosmético:

```
promo_orders.amount_mad   → amount_cents   (integer, CHECK > 0)
promo_settings.price_mad  → price_cents    (y featured_price_mad, job_price_mad,
                                            ad_budget_mad, job_ad_budget_mad)
```

Toca `promo_create_order`, `promo_create_job_order`, `promo_mark_paid`,
`admin_promo_*`, `promo_availability`, `promo-mail`, `src/lib/promo.js`
(`formatMad` → `formatEur`) y las traducciones. Es trabajo mecánico y hay que
hacerlo **antes** de que entre el primer euro: renombrar una columna de importes
con dinero cobrado dentro es otra cosa.

### 3.4 ¿Se conserva la transferencia bancaria o se retira?

Lo que dicen los datos, no la intuición: **de 9 comandas de pago por
transferencia, 1 se cobró.** Cuatro destacados esperando, tres ofertas de empleo
canceladas sin pagar, dos de ellas con la transferencia «declarada» y nunca
llegada. El circuito funciona técnicamente y convierte mal.

Lo que cuesta mantenerlo vivo, en piezas concretas: la página
`/mes-paiements/virement/:id`, `promo_bank_details()` + las 6 columnas `bank_*`,
`promo_declare_transfer`, el bucket privado `credentials` con los justificativos
y su regex de ruta, `transfer_hold_days`, el correo `instructions` de
`promo-mail`, la pestaña «A cobrar» del admin, `admin_promo_mark_paid`, el aviso
de Telegram «transferencia anunciada». Son unas 700 líneas de código y un hábito
de trabajo: alguien tiene que mirar el banco.

Lo que gana: comisión cero (Stripe cobra del orden de 1,5 % + 0,25 € por tarjeta
europea, que sobre un ticket pequeño es un 3-4 %), es la vía normal en B2B
español cuando hay factura, y es la red cuando una tarjeta se rechaza.

**Recomendación: conservarla, pero no para todo.**

| Producto | Pago | Por qué |
|---|---|---|
| Post patrocinado | **Stripe únicamente** | ticket pequeño, compra impulsiva, el autónomo quiere acabar en 40 segundos |
| Perfil destacado | **Stripe únicamente** | ídem, y es el producto que más se queda a medias hoy |
| Oferta de empleo | **Stripe + transferencia** | lo compra una empresa, el ticket es el mayor, y una empresa española espera poder pagar por transferencia contra factura |

Con esto el segundo circuito sigue existiendo pero deja de ser el camino por
defecto, y sobre todo: **se conserva `admin_promo_mark_paid`**, que es la única
manera de registrar un cobro que llegó por fuera de Stripe, y sin ella el dueño
se queda sin salida cuando algo se tuerce.

**Si el dueño quiere un solo camino** (defendible: menos superficie, menos trabajo
manual), entonces retirar la *interfaz* de transferencia —página, correo de
instrucciones, justificativos, pestaña «A cobrar»— pero **conservar en la base**
`provider`, `admin_promo_mark_paid` y las columnas `transfer_*`. Borrar la
capacidad de registrar un pago a mano es lo único de esta lista que no tiene
vuelta atrás.

**Lo que no se decide aquí:** si la app nativa sigue enviando al sitio web para
comprar. khdemlidaba lo hace por la regla 3.1.1 de la App Store
(`src/lib/promo.js:200-213`: `if (isNative()) return { handedOff: true }`), y con
Stripe el problema es **idéntico** — una pasarela de terceros dentro de la app
para desbloquear funciones *dentro de la app* es exactamente lo que Apple mira.
El guard tiene que seguir ahí. Es materia del informe 07.

---

## 4. Los precios en euros

**No los invento: los pone el dueño.** Lo que sí puedo decir es dónde se ponen y
qué hay que tocar.

**Dónde viven.** `promo_settings`, fila única `id = 1`, columnas `price_mad` (post),
`featured_price_mad` (destacado), `job_price_mad` (oferta de empleo), más
`ad_budget_mad` y `job_ad_budget_mad` para la parte que se gasta en publicidad.
Hoy: **150 / 50 / 200 DH** (medido).

**Cómo se cambian.** Admin → Promos, sin redesplegar nada. La RPC es
`admin_promo_settings_update`, con **21 argumentos posicionales**. Eso significa
que renombrar `price_mad` a `price_cents` cambia la firma de la RPC **y** la
página de administración: hay que tocar los dos a la vez o el admin se queda sin
poder cambiar precios. Es la parte más frágil del renombrado.

**Y el aviso que importa: Stripe trabaja en céntimos enteros.** `unit_amount` y
`amount_total` son enteros de la unidad mínima; para el euro, céntimos. 9,99 €
son `999`. No hay decimales en ninguna parte de la API.

Consecuencias prácticas:

- Una columna `integer` llamada `price_mad` que guarde `12` significa hoy «12
  dirhams». Si se la reinterpreta como euros sin renombrarla ni multiplicar, el
  cliente paga **12 céntimos**. Y si se multiplica por 100 al vuelo en la función
  edge, el `promo_mark_paid` compara `1200` con `12` y pone la comanda en
  `payment_failed`. El fallo sería visible (eso está bien diseñado), pero la
  venta se pierde.
- **Guardar céntimos en la base y no dividir nunca** (§3.3). Céntimos entran,
  céntimos se comparan, céntimos salen. Para mostrar, formatear al final
  (`Intl.NumberFormat('es-ES', { style:'currency', currency:'EUR' })`).
- Un precio con decimales deja de ser un caso raro: 150 DH son unos 14 €, y en
  España un precio así se escribe 14,99 € mucho más a menudo que 15. Con enteros
  de dirhams nunca hizo falta; con euros sí.
- Y antes de fijar el número: **decidir si el precio mostrado incluye IVA** (§6.4).
  No es una cuestión de redacción, cambia lo que se le cobra a la tarjeta.

---

## 5. Lo que ya existe en misautonomos y hay que decidir

### 5.1 Las tres edge functions de Stripe: **retirar, y con prisa**

Están desplegadas (`ACTIVE`, `verify_jwt = true`, creadas el **06/06/2026**), su
código no está en el repositorio, y lo he recuperado del despliegue. Lo que hacen
de verdad **no es lo que su nombre dice**:

| Función | Lo que el nombre sugiere | Lo que el código hace |
|---|---|---|
| `createCheckoutSession` | crea una sesión de pago | **casi siempre activa el plan gratuito.** Sólo llega a Stripe si `plan.precio > 0` **y** `plan.stripe_price_id` está puesto. En las 4 filas de `subscription_plans`, `stripe_price_id` está **vacío o nulo** — incluidos los planes de 30 € y 50 € — así que la rama de pago **nunca se ejecuta**. Usa `npm:stripe@17.5.0` y `mode: 'subscription'` |
| `syncStripeSubscription` | sincroniza con Stripe | **no importa Stripe ni llama a su API en ninguna línea.** Lee la tabla local `subscriptions` y, si no hay nada vigente, auto-provisiona el plan gratuito |
| `getStripeInvoices` | lista facturas | `return json({ invoices: [] })`. Es un sello vacío, 14 líneas |

De aquí sale el hallazgo que explica el resto del apartado: **no existe ni ha
existido ningún camino que lea el estado de una suscripción desde Stripe.** No hay
webhook. No hay ninguna llamada a la API de Stripe salvo la rama muerta de
`createCheckoutSession`. La confirmación de un pago dependía de que el navegador
volviese a `/PaymentSuccess` — una página que, por cierto, **ya no existe** en el
repositorio.

Y hay tres razones para borrarlas, no sólo ignorarlas:

1. **`Access-Control-Allow-Origin: '*'`** en las tres. Con JWT obligatorio no es
   explotable desde cualquier sitio, pero es una política que no se sostiene.
2. **Escriben con la clave de servicio en tablas que el trasplante va a cambiar.**
   `createCheckoutSession` y `syncStripeSubscription` escriben en `subscriptions`,
   `users` (`subscription_status`, `subscription_start_date`,
   `subscription_end_date`, `user_type`) y `professional_profiles`
   (`estado_perfil`, `visible_en_busqueda`). **Las 11 columnas existen hoy**, lo
   he comprobado. Cuando el esquema de khdemlidaba se aplique encima, estas
   funciones seguirán ACTIVE escribiendo sobre un modelo que ya no entienden.
3. **Y la razón de seguridad.** `activateFreePlan` pone
   `estado_perfil = 'activo'` y `visible_en_busqueda = true` **sin pasar por
   ninguna moderación**, a petición de cualquier usuario autenticado. Hoy es
   inocuo porque los 47 perfiles ya están `activo` / `visible` (medido). Después
   del trasplante, khdemlidaba trae un modelo de moderación de fichas —y una
   migración entera para protegerlo,
   `20260920113039_protect_profile_promotion_moderation.sql`—: dejar vivo un
   endpoint con clave de servicio que publica una ficha a petición es abrir una
   puerta lateral a esa moderación. **Borrarlas es parte del trasplante, no
   limpieza posterior.**

**Reaprovechable: una sola cosa.** El patrón de `createCheckoutSession` — cliente
con el JWT del usuario para identificar, cliente de servicio para escribir,
`origin` para construir las URLs de vuelta — es el mismo que usa `promo-checkout`.
No hay nada más que salvar. La `promo-checkout` de khdemlidaba es mejor punto de
partida en todo: orden explícito de pasos, lista blanca de orígenes,
`system_failures`, el precio decidido por la base.

### 5.2 Los 87 `payment_records`: **exportar y retirar**

Medido: 87 filas, **del 19/11/2025 al 17/04/2026**, todas en **EUR**, 57
`succeeded` y 30 no (`pending`), todas con `stripe_invoice_id` (`in_…`) y
`stripe_payment_intent_id` (`pi_…`). Por meses: 50 en nov-2025, 27 en dic-2025, 3
en ene, 4 en feb, 1 en mar, 2 en abr-2026. El informe 05 cifra el total en
1 549,21 €.

Son **cobros reales** y son **justificantes contables**. No se reaprovechan: su
forma es de suscripción (`period_start`, `period_end`, `plan_id`,
`stripe_invoice_id`) y no hay nada equivalente en `promo_orders`. Lo que dice el
informe 05 se sostiene: **CSV obligatorio** antes de borrar (conservación fiscal
española: 4 años AEAT, 6 años Código de Comercio). Mi única añadidura: conservarlos
además en un esquema `legacy` de sólo lectura hasta que pase el plazo, en vez de
confiar sólo en un CSV en un disco.

**Un dato que importa para §5.4:** el último cobro registrado es del **17/04/2026**.
Las tres edge functions se crearon el **06/06/2026**, casi dos meses después. Es
decir: estos 87 cobros los hizo la integración de Stripe de **base44** (la
plataforma sobre la que se construyó misautonomos), no el código que hay
desplegado hoy. **Puede que la cuenta de Stripe que generó esos `cus_` / `sub_` no
sea una cuenta que el dueño controle directamente, sino una cuenta conectada de
base44.** No puedo comprobarlo sin credenciales, y es lo primero que hay que
aclarar (§6.1).

### 5.3 Las 20 `subscriptions`: **retirar, exportando los 18 identificadores primero**

| `estado` | `renov. autom.` | `metodo_pago` | n | ¿vigente por fecha? |
|---|---|---|---|---|
| `activo` | **sí** | `gratis` | 1 | sí (caduca en **2126**) |
| `activo` | **sí** | `stripe` | 3 | **0** |
| `cancelado` | no | `stripe` | 3 | 0 |
| `expirado` | no | `stripe` | 2 | 0 |
| `expirado` | **sí** | `manual` | 6 | 2 (!) |
| `expirado` | **sí** | `stripe` | 5 | 1 (!) |

**Verificado el informe 05, con un matiz.** El 05 dice «activo=4 pero 0
vigentes». Es correcto **para los planes de pago**: los 3 `activo` + `stripe`
caducaron el 05/06/2026, el 28/06/2026 y el 02/08/2026, y hoy es 02/10/2026. El
cuarto `activo` es el plan gratuito de 0 €, cuya caducidad es **14/06/2126** —
cien años, puestos por `exp.setFullYear(exp.getFullYear() + 100)` en
`activateFreePlan`. Así que «0 vigentes» es verdad si se habla de dinero, y falso
si se cuenta filas con fecha futura.

Y hay **3 filas incoherentes** que conviene no pasar por alto: marcadas
`expirado` pero con caducidad en el **futuro** (03/12/2027 ×2, 04/11/2029). Dos
dicen `metodo_pago = 'manual'`. Esa tabla no es un reflejo fiable de nada.

**Ninguna se reaprovecha**: el modelo de khdemlidaba no tiene suscripciones, tiene
compras de una vez. Pero **antes de borrarla hay que exportar los 18
`stripe_subscription_id` y `stripe_customer_id`**, porque son la única lista que
existe de quién podría seguir siendo cobrado. Ver el apartado siguiente.

### 5.4 El dinero: ¿sigue cobrando Stripe? — **hay que mirarlo hoy**

Esto es lo que hay que decirle al dueño con claridad, y conviene decirlo sin
adornos.

**Lo que está comprobado:**

- 18 de las 20 filas de `subscriptions` tienen `stripe_subscription_id` (`sub_…`)
  y `stripe_customer_id` (`cus_…`) reales.
- **4 filas tienen `estado = 'activo'` Y `renovacion_automatica = true`.** Tres
  son de pago: `Mensual` 33 €, `Trimestral` 89,10 €, `Plan Ads+` 33 €.
- Las tres caducaron hace meses (05/06, 28/06 y 02/08/2026). Hoy es 02/10/2026.
- El último `payment_records` es del **17/04/2026**. Desde entonces, **cinco meses
  y medio sin registrar ni un cobro**.
- **Ninguna línea de código del proyecto le pregunta nada a Stripe.**
  `syncStripeSubscription` no importa Stripe. No hay webhook. No hay cron.

**Lo que eso significa, y es el punto:** una caducidad congelada en el pasado
prueba que **la contabilidad local dejó de actualizarse**. No prueba en absoluto
que Stripe haya dejado de cobrar. Son dos cosas distintas y aquí se han
confundido. Si esas tres suscripciones no se cancelaron **en el panel de Stripe**,
Stripe ha seguido pasando el cargo todos los meses a esas tarjetas, sin que nada
en este proyecto lo registre ni lo muestre.

**El orden de magnitud, como hipótesis explícita y no como medición:** 33 + 33 =
66 €/mes durante unos 5 meses, más dos trimestres de 89,10 € ≈ **500 € en cobros
posiblemente no registrados**. Puede ser cero —si las suscripciones se cancelaron
a mano en Stripe, o si las tarjetas caducaron, o si base44 las cerró al
desconectar la cuenta—. **No puedo saberlo sin acceso al panel de Stripe**, y no
lo tengo.

**Lo que tiene que hacer el dueño, antes de cualquier trabajo de Stripe:**

1. Entrar en `dashboard.stripe.com` → **Billing → Subscriptions**, filtrar por
   `active` (y por `past_due` y `trialing`).
2. Comparar con los 18 `sub_…` exportados de `subscriptions`.
3. **Cancelar en Stripe todo lo que no deba seguir cobrando.** Cancelar en Stripe,
   no en esta base: la base no manda nada.
4. Mirar **Payments** de los últimos 6 meses. Si hay cargos posteriores al
   17/04/2026, son cobros que esta base no conoce — y si corresponden a un
   servicio que ya no se presta, **hay que devolverlos**: son clientes que han
   pagado por nada.
5. Y de paso, **Customers**: si hay métodos de pago guardados de clientes que ya
   no son clientes, borrarlos.

Mientras eso no se haya hecho, **no conviene conectar Stripe para las
promociones**: se mezclarían cobros nuevos con un rastro antiguo que nadie ha
cuadrado, en una cuenta cuya titularidad real todavía está por confirmar (§5.2).

---

## 6. Secretos, panel de Stripe, y lo que trae cobrar en España

### 6.1 Antes de pedir una sola clave

**Averiguar de quién es la cuenta de Stripe.** Los `cus_` / `sub_` de §5.3 los
creó la integración de base44 (§5.2). Posibles situaciones:

- es una cuenta de Stripe del dueño, conectada en su día a base44 → se reutiliza;
- es una cuenta conectada **propiedad de base44** → el dueño **no** puede
  reutilizarla y hay que abrir una cuenta nueva; y hay que recuperar de allí el
  histórico de cobros antes de perder el acceso.

Esto determina todo lo demás, y sólo lo puede comprobar el dueño entrando.

### 6.2 Secretos: dónde va cada uno

**En Supabase (secretos de edge functions). Nunca en el repositorio, nunca en
Vercel:**

| Secreto | Valor | Lo lee |
|---|---|---|
| `STRIPE_SECRET_KEY` | `sk_test_…` en pruebas, `sk_live_…` en real | `promo-checkout`, `promo-webhook` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` | `promo-webhook` |
| `PAYMENT_PROVIDER` | `stripe` | `_shared/payments.ts` |

Sobre el modo: YouCan Pay necesitaba un `YOUCANPAY_MODE` explícito porque sus
claves de prueba y de producción **tienen el mismo formato** y no se puede
adivinar. **Las de Stripe sí se distinguen** (`sk_test_` / `sk_live_`), así que un
`STRIPE_MODE` es opcional. Si se quiere mantener la misma disciplina, que el
adaptador **compruebe la coherencia**: `sk_live_` con `whsec_` de prueba es un
error que si no se detecta sólo se ve cuando un pago real no se confirma.

**En Vercel (cliente): ninguno nuevo.** Y aquí una corrección útil: `VITE_STRIPE_PUBLIC_KEY`
**no hace falta**. La clave publicable sólo se necesita para cargar Stripe.js /
Elements, es decir para un formulario de tarjeta integrado. Con Checkout alojado
—la función edge devuelve `session.url` y el navegador se redirige— **no se carga
Stripe.js en ningún momento**. El informe 02 ya proponía retirar esa variable: se
confirma, y no hay que volver a ponerla.

### 6.3 Pasos en el panel de Stripe

1. **Activar la cuenta**: perfil de empresa, actividad, NIF/CIF, IBAN de abono,
   verificación de identidad. Sin esto sólo hay modo prueba.
2. **Empezar en modo prueba, entero.** Clave `sk_test_`, tarjetas de prueba de
   Stripe, un pago completo de punta a punta (incluido el webhook y el `paid` en
   `promo_orders`) antes de tocar `sk_live_`.
3. **Crear el endpoint de webhook**: Developers → Webhooks → Add endpoint →
   `https://dquxsethatxtptfviiwd.supabase.co/functions/v1/promo-webhook`,
   seleccionando los eventos de §3.2(c), y copiar el `whsec_…`.
4. **Dos endpoints, dos secretos.** Modo prueba y modo producción tienen endpoints
   distintos y **`whsec_` distintos**. No se comparten. Es la causa número uno de
   «el webhook devuelve 400 y no sé por qué» al pasar a producción.
5. **Métodos de pago** (Settings → Payment methods):
   - **Tarjeta**: activada por omisión. Con SCA obligatorio en la UE, el 3DS lo
     gestiona Checkout solo.
   - **Bizum**: disponible en España para EUR y soportado en Checkout; hay que
     activarlo en el panel. Es redirigido (el cliente confirma en su app
     bancaria), así que el webhook es obligatorio para confirmarlo, no opcional.
     Vale la pena: en España es un método muy extendido entre autónomos.
   - **Apple Pay / Google Pay**: gratis, y suben bastante la conversión en móvil.
     Apple Pay en web exige **verificar el dominio** `misautonomos.es` en el panel
     de Stripe.
   - **SEPA Direct Debit**: no, para esto. Tarda días en liquidar y obligaría a
     manejar los eventos `async_payment_*` como camino principal.
6. **Correos a clientes** (Settings → Customer emails): activar el recibo
   automático de Stripe. Útil, y **no es una factura española** (§6.4).
7. **Radar**: las reglas por omisión bastan para un ticket pequeño. No hace falta
   configurar nada.
8. **Calendario de abonos**: revisar cada cuánto Stripe transfiere al banco.

### 6.4 Lo que trae cobrar en España

**No soy asesor fiscal, y esto hay que confirmarlo con el asesor del dueño antes
de cobrar el primer euro.** Lo que sí se puede afirmar con seguridad:

**a) IVA al 21 %.** Los tres productos son servicios de publicidad y visibilidad
prestados a autónomos y empresas españolas: **tipo general, 21 %**. No hay
exención ni tipo reducido aplicable. Esto es nuevo frente al modelo: khdemlidaba
no repercute IVA de este modo.

**b) Factura completa, no recibo.** Y aquí la réplica **tiene que separarse del
modelo**. khdemlidaba decidió explícitamente «recibo, no factura» («une facture
exige ICE, IF et mentions fiscales», `docs/promo/README.md`), y su página «Mis
pagos» muestra sólo referencia, importe y fecha. **En España eso no basta**: el
cliente es un autónomo o una empresa que necesita la factura para deducir el
gasto y el IVA, así que hace falta **factura completa**, no ticket simplificado,
con: serie y número correlativo, fecha de expedición, fecha de la operación si es
distinta, datos y NIF del emisor, datos y NIF del destinatario, descripción, base
imponible, tipo, cuota de IVA y total.

**c) ¿El precio incluye IVA?** Decisión del dueño, con efecto técnico directo. Lo
que Stripe cobra es **un solo importe total**. Mi recomendación: que
`promo_settings` guarde el **total que se cobra** en céntimos, más el tipo de IVA
en una columna aparte, y que la factura **derive** la base (`base = round(total /
1,21)`). Al revés —guardar la base y calcular el total— los redondeos de la
factura y el importe cobrado por Stripe se separan en algunos precios, y entonces
la factura no cuadra con el extracto. Para un público de autónomos lo habitual es
anunciar «+ IVA», pero sea lo que sea, **tiene que estar escrito en la página**.

**d) La factura: no construirla.** Hay una obligación española de que el software
de facturación cumpla el sistema **Verifactu** (RD 1007/2023), con un calendario
de entrada en vigor por tipo de obligado que **el asesor tiene que confirmar para
el caso del dueño** — no doy fechas porque no quiero dar precisión falsa sobre
algo con consecuencias. Lo que sí es claro: **escribir un módulo de facturación
propio es el camino caro y arriesgado**. Dos salidas razonables:

- **Stripe Invoicing**: emite facturas numeradas con IVA desde la propia cuenta, y
  Stripe Tax puede calcular el impuesto. Hay que verificar con el asesor si
  satisface Verifactu para este caso.
- **El programa del asesor**: la función edge manda los datos del cobro y las
  facturas se emiten donde ya se emiten todas las demás.

**e) Un activo que ya está en la base.** misautonomos tiene una tabla `invoices`
(**0 filas**) con exactamente la forma de una factura española: `serie`, `numero`,
`emisor_razon_social`, `emisor_nif`, `client_nif`, `subtotal`, `total_iva`,
`aplica_retencion`, `porcentaje_retencion`, `total`, `legal_text`, `pdf_url`.
Está pensada para que **el autónomo facture a sus clientes**, no para que la
plataforma le facture a él, así que no sirve tal cual. Pero es lo único con forma
de factura española que hay en el proyecto, y el informe 05 la retira junto con
todo el bloque de facturación: **conviene decidirlo a sabiendas**, no por
descarte.

**f) Fuera de España.** Si algún día se cobra a un cliente de otro país de la UE
con NIF-IVA válido, cambian las reglas (inversión del sujeto pasivo). Hoy
misautonomos vende sólo en España; si eso cambia, Stripe Tax lo resuelve, pero es
una decisión, no un automatismo.

---

## 7. Lo que hace falta decidir, y lo que hace falta mirar

**Hay que mirarlo hoy, en el panel de Stripe (es dinero):**

1. ¿De quién es la cuenta de Stripe que generó los 18 `sub_` / `cus_`: del dueño o
   de base44?
2. ¿Hay suscripciones `active` / `past_due` cobrando ahora mismo? Las 3 candidatas
   son `Mensual` 33 €, `Trimestral` 89,10 € y `Plan Ads+` 33 €.
3. ¿Hay cargos posteriores al **17/04/2026** que esta base no conoce? Si los hay y
   el servicio ya no se presta, hay que devolverlos.

**Decisiones del dueño:**

4. Los tres precios en euros, y si se anuncian con IVA incluido o «+ IVA».
5. ¿La transferencia se conserva sólo para la oferta de empleo (recomendado), para
   los tres productos, o se retira?
6. ¿La factura se emite con Stripe Invoicing o con el programa del asesor?
7. ¿Se conserva `invoices` o se retira con el resto del bloque de facturación?
8. ¿Dónde se guardan los CSV de `payment_records` (87 cobros) y `subscriptions`
   (20) antes de borrar las tablas?

**Trabajo técnico, en este orden:**

9. **Borrar** `createCheckoutSession`, `syncStripeSubscription` y
   `getStripeInvoices` del proyecto `dquxsethatxtptfviiwd` (§5.1 — es seguridad,
   no limpieza), después de exportar los 18 identificadores de Stripe.
10. Renombrar los importes a céntimos **antes** del primer cobro: `amount_mad` →
    `amount_cents`, los 5 precios de `promo_settings`, y con ellos
    `admin_promo_settings_update` (21 argumentos) y la página de administración.
11. `promo_create_order` / `promo_create_job_order` con `p_provider`, y el correo
    `instructions` condicionado a `'virement'`.
12. Adaptador `stripe` en `_shared/payments.ts`; `promo-checkout` en
    `mode: 'payment'` con `price_data`; `promo-webhook` con
    `constructEventAsync` y la tabla `promo_webhook_events`.
13. Columnas nuevas: `stripe_session_id`, `refunded_at`, `refund_ref`. Y la RPC
    `promo_mark_refunded`.
14. `ORIGINS` de `promo-checkout` a `misautonomos.es`.
15. Prueba completa en modo test: pago, webhook, `paid`, correo; sesión caducada
    que libera la plaza; reembolso que recorta `featured_until`; y el caso de
    importe que no cuadra, que tiene que acabar en `payment_failed` y no en
    `paid`.
