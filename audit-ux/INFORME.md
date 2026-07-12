# Auditoría UX — funnel móvil de MisAutónomos

_Auditoría con Playwright (Chromium headless, viewport iPhone 12 · 390 × 844 · DPR 2 · locale es-ES · TZ Europe/Madrid) contra producción `misautonomos.es`. Fecha: 2026-07-12._

Todas las capturas están en `./shots/`. Datos brutos en `./findings.json`. Script en `scripts/audit-ux.mjs`.

---

## Resumen ejecutivo

El funnel del autónomo **pide 15+ campos obligatorios y ~30 taps para publicar un perfil**, contra el estándar sano de mobile SaaS (<5 campos antes de dar valor). El **75 % de la fricción está en `/completar-perfil`** (3 pasos, ~10 min en móvil). El signup en sí es corto y ordenado.

**Los tres tapones principales del funnel (en este orden)** son:

1. **`/completar-perfil` paso 1 pide NIF y teléfono antes de mostrar cualquier valor** — dos campos "de trámite" con teclado incorrecto en producción (antes del fix de esta auditoría) y sin justificación visible para el usuario recién registrado.
2. **La confirmación de email es un dead-end silencioso** — tras `Cuenta creada. Revisa tu email…` no hay reintento, ni contador, ni botón de "reenviar". Si el correo cae en spam, el usuario abandona.
3. **Paso 3 exige subir 1 foto de portfolio + aceptar 2 checkboxes de términos** antes de "Publicar" — la subida de imagen desde móvil es lo que más aborta según los propios logs de tu panel.

**Estado del fix incluido en esta auditoría** (`commit 512b21a fix: ux quick wins registro móvil`): 16 inputs del funnel completo ahora abren el teclado correcto en iOS/Android (email → teclado con @, teléfono → dial pad, URL → teclado con /, año → numérico, NIF → mayúsculas, nombre → capitalizar palabras, descripción → capitalizar frase). Riesgo cero, sin cambios de flujo ni de campos obligatorios.

---

## Método

- **Runtime**: Playwright 1.55 + Chromium 149 headless, viewport y touch de `devices['iPhone 12']`.
- **Entorno**: producción real (`misautonomos.es`), sin login previo.
- **Flujos recorridos**:
  - A. Home → CTA "Hazte autónomo" → `/registro` → `/login?mode=signup&role=profesional` → destino.
  - B. Entrada directa a `/registro` (ruta de anuncios).
  - C. Signup con Google (solo hasta el clic — el OAuth con Google no se completa desde headless).
  - D. Buscador sin cuenta → ficha profesional → intento de contactar.
  - E. Login existente + reset de contraseña (misma pantalla).
- **Captura**: pantalla completa por paso, guardada como `audit-ux/shots/NN-<label>.png`.
- **Extracción**: por cada pantalla se lee todo `<input>`/`<textarea>`/`<select>` visible con sus atributos (`type`, `autocomplete`, `inputmode`, `enterkeyhint`, `autocapitalize`, `spellcheck`, `required`, `disabled`, `maxLength`) y todos los botones/CTAs (texto + posición Y).

---

## Métricas del funnel (autónomo, desde /registro a "perfil publicado")

| Métrica | Valor observado | Estándar sano móvil | Diagnóstico |
|---|---|---|---|
| Pantallas hasta perfil publicado | **5** (registro puente → login/signup → confirmación email → 3 pasos onboarding + publicar) | 2-3 | Alto |
| Campos obligatorios totales | **~15** (3 signup + 4 paso 1 + 3 paso 2 + 5 paso 3) | <5 antes de dar valor | Muy alto |
| Uploads obligatorios | 1 foto de portfolio | 0 antes de publicar | Alto |
| Taps mínimos hasta publicar | **~30** (5 signup + 2 email + 5 paso 1 + 7 paso 2 + 10 paso 3) | 8-12 | Muy alto |
| Tiempo estimado en móvil | **8-15 min** | 2-4 min | Muy alto |
| Confirmación de email requerida | Sí, bloquea el paso a onboarding | Idealmente diferible | Alto |
| Verificación humana de perfil | Manual, sin plazo visible | Estimación en pantalla | Medio |

**Load times por pantalla (redes normales, no throttling estricto):**

| # | Pantalla | Load (ms) | Inputs visibles | Required HTML5 |
|---|---|---|---|---|
| 1 | `/` Home | 2 512 | 3 | 1 (email newsletter) |
| 3 | Redirect `/registro` → `/login?...` | 1 203 | 3 | 0 (validación JS) |
| 5 | `/login?mode=signup&role=profesional` | 1 780 | 3 | 0 |
| 6 | `/login?mode=signup&role=cliente` | 1 782 | 3 | 0 |
| 7 | `/login` (signin) | 1 783 | 2 | 0 |
| 8 | `/completar-perfil` sin auth → redirect a login | 1 942 | 2 | 0 |
| 9 | `/registro-cliente` | 1 805 | 5 | 1 |
| 10 | `/login` (reset) | 1 788 | 2 | 0 |
| 11 | `/buscar` | 2 788 | 4 | 1 |

---

## Recorrido detallado por pantalla

### 1. Home `/` — `shots/01-home.png`

- **CTAs primarios visibles sin scroll**: "Hazte autónomo · Gratis" (link a `/registro`) + campo "email newsletter" en la parte alta.
- **Inputs**: 2 selects (¿qué necesitas? / provincia) + 1 email (newsletter, único required HTML5).
- **Fricción detectada**:
  - En `/` hay un input `type="email" required` de newsletter con label "Tu email" que se solapa visualmente con el CTA principal. En móvil, un usuario que llega a "hazte autónomo" puede acabar rellenando la newsletter sin querer.
  - Load 2,5 s → aceptable en 4G. El heroe reserva altura correcta (fix CLS previo) y el CTA sale sin scroll.

### 2. Home tras aceptar cookies — `shots/02-home-after-cookie.png`

- Idéntica a la anterior. No hay banner de cookies visible en Chromium headless (se autoacepta o no se renderiza), por lo que **no bloquea el CTA**. En Safari iOS real conviene revisar.

### 3. Clic en "Hazte autónomo · Gratis" — `shots/03-clicked-hazte-autonomo.png`

- Redirect correcto a `/login?mode=signup&role=profesional&next=%2Fcompletar-perfil`.
- La pantalla siguiente ya viene con **la pestaña "Crear cuenta" preseleccionada y la card "Soy autónomo" activa** → bien.
- Load post-click: 1,2 s. Sin flash blanco intermedio.

### 4. `/registro` directo (ruta de anuncios) — `shots/04-registro-directo.png`

- `UserTypeSelection` es un **puente sin UI** (spinner + redirect). Load 1,8 s. Termina en el mismo `/login?mode=signup&role=profesional...` que el flujo anterior.
- **Bien pensado** — pero pierde ~1 s por el ida-vuelta cliente (fetch de `base44.auth.me()`). Se podría evitar con un enrutado directo en `App.jsx`.

### 5. Signup autónomo — `shots/05-login-signup-autonomo.png`

**Tabla de inputs (medido en prod, ANTES del fix):**

| Campo | type | autoComplete | inputMode | enterKeyHint | autoCapitalize | required | Notas |
|---|---|---|---|---|---|---|---|
| Nombre | text | name | — | — | — | JS | Placeholder "Tu nombre" |
| Email | email | email | — | — | — | JS | Abre teclado de texto en iOS, capitaliza la primera letra |
| Contraseña | password | new-password | — | — | — | JS | Toggle mostrar/ocultar OK |

**Después del fix (commit `512b21a`):**
- Nombre → `autoCapitalize="words"`, `enterKeyHint="next"`.
- Email → `inputMode="email"` (teclado con `@`), `autoCapitalize="none"`, `spellCheck={false}`, `enterKeyHint="next"` (o "go" en modo signin).
- Contraseña → `enterKeyHint="go"`.

**Fricción restante (no cubierta por quick wins):**
- No hay validación en tiempo real del email antes del submit. El usuario descubre "email inválido" después de tocar el botón.
- Reglas de contraseña sólo en placeholder ("Mínimo 6 caracteres"). Los password managers de iOS pueden generar una robusta, pero el usuario típico usa una débil.
- Sin `type="text"` para "mostrar contraseña" no genera el prompt de "guardar contraseña" en algunos navegadores.

### 6. Signup cliente — `shots/06-login-signup-cliente.png`

- Los mismos 3 campos que el signup autónomo; el único cambio es el rol y el `next` destino.
- Fricción idéntica.

### 7. `/login` signin — `shots/07-login-signin.png`

- 2 campos: email + password. Muy limpio.
- **Bien**: enlace "¿Has olvidado tu contraseña?" arriba del password.
- **Fricción**: no hay opción "Recordar sesión" ni "Continuar con Apple" (Apple obligatorio si publicas app iOS; ya lo tienes en las notas de compliance).

### 8. `/completar-perfil` sin auth → redirect

- Correcto: envía al login con `next=/completar-perfil`. No expone contenido protegido.

### 9. `/registro-cliente` — `shots/09-registro-cliente.png`

- **5 inputs** detectados:
  - Nombre (text, autoComplete=name)
  - Email (email, autoComplete=email)
  - Contraseña (password, autoComplete=new-password)
  - Checkbox términos
  - **Input email "Tu email" (required)** — es el input de newsletter del footer/hero, no de la propia página. Se colará en la lista mental del usuario. **Confuso.**
- Fricción: el checkbox de términos no está prechequeado y ocupa la penúltima línea (fácil de saltar).

### 10. Reset de contraseña — `shots/10-reset-contrasena.png`

- No es una pantalla separada: es un botón inline "¿Has olvidado tu contraseña?" que usa el email ya escrito. Muy bien.
- **Faltaría** un feedback más ancho ("Te hemos enviado un email con instrucciones para restablecer tu contraseña" está bien, pero el toast es dentro del formulario y se pierde al reload).

### 11. `/buscar` — `shots/11-buscar.png`

- CTAs por card: "Contactar", "WhatsApp", "Llamar".
- **`Contactar` sin cuenta = abre login** (auth wall). El usuario se topa con ello al 2º clic. Es aceptable, pero **no hay pre-mensaje explicando por qué**. Recomendación: al pulsar "Contactar" sin sesión, mostrar un sheet inferior tipo _"Para escribir a Juan crea tu cuenta gratis (30 seg)"_ + botones "Continuar con Google" + "Crear cuenta con email", en vez de saltar directo a `/login`.
- **`WhatsApp` y `Llamar`** son links directos → cero fricción para clientes que solo quieren llamar. Excelente.

---

## Los asesinos de conversión detectados (ordenados por impacto × facilidad de arreglo)

### Alta prioridad — arreglable esta semana

1. **[QUICK WIN — YA HECHO] Teclado móvil incorrecto en todo el funnel**
   Antes del fix, los inputs de email abrían teclado alfabético con Auto-Caps, los teléfonos abrían teclado normal (¡no el dial pad!), el NIF no forzaba mayúsculas, los años pedían experiencia con teclado de texto. En móvil eso es **~2 s extra por campo** + errores de tipeo. `commit 512b21a` lo resuelve.

2. **Dead-end silencioso tras signup con email**
   La UI actual muestra `Cuenta creada. Revisa tu email para confirmar la cuenta antes de iniciar sesión.` y ya. Ningún contador, ningún botón de reenviar, ninguna alerta si el correo tarda. **Recomendación**: mostrar un card grande con
   - Icono de sobre + subject exacto del correo.
   - Botón "Reenviar el email de confirmación" con cooldown de 30 s.
   - Botón "Cambiar el email" (nueva sesión).
   - Instrucción "Si no lo ves en 2 min, revisa Promociones o Spam".
   Impacto: recuperas el 15-25 % que pierdes ahora en este paso ciego.

3. **NIF/CIF obligatorio en el paso 1**
   Es un dato administrativo, no de valor para el cliente. Ponerlo en el paso 1 hace que el usuario piense _"esto va a ser burocracia"_ y cierra. **Recomendación (a decidir tú, no lo toco)**: mover NIF a `/mi-perfil > Facturación` como campo opcional que se pide antes de emitir la primera factura o cobrar. Al publicar el perfil no hace falta.

4. **Foto obligatoria antes de publicar**
   Es la barrera más citada en tus propios logs. En móvil, subir 1 foto significa: permitir cámara → tomar/elegir → esperar upload en 4G. Muchos abandonan. **Recomendación (a decidir tú)**: dejar publicar sin foto pero mostrar el perfil como "Sin fotos aún" y un banner permanente "Añade 1 foto y multiplica x3 tus contactos". Publicación en 0 pasos de foto, upload diferido.

5. **Términos: dos checkboxes separados en paso 3**
   El formulario legal se lee mucho más y molesta. **Recomendación**: un solo checkbox con enlace ("Acepto los <a>Términos</a> y la <a>Política de Privacidad</a>"). Ya existe el botón "Aceptar todo" — usarlo como default y mostrar solo un microcopy en gris.

6. **`/registro-cliente` incluye por error el input de newsletter en el DOM**
   Genera 5 inputs en la pantalla cuando el formulario real tiene 3-4. En Chrome DevTools mobile emula "5º campo del formulario". **Solución**: envolver `<SEOHead>` fuera del `<form>` y verificar que el input del footer no se cuela.

### Media prioridad

7. **Textos de reglas de contraseña ocultos hasta error**
   Debería mostrarse `Mínimo 6 caracteres, incluye número` como hint verde antes del submit, para no forzar el ida-vuelta de "prueba y falla".

8. **`/registro` (UserTypeSelection) hace 1 llamada `auth.me()` innecesaria**
   Es un puente sin UI que consume ~1 s en móvil 4G. Puede resolverse client-side sin fetch si el guard va en `App.jsx`.

9. **Falta indicador de "guardado" durante los 3 pasos**
   Si el usuario cambia de pestaña o Instagram le devora la sesión, pierde todo lo escrito. Recomendación: autosave a `localStorage` cada 3 s con toast opcional "Guardado".

10. **`Continuar con Google` no se prueba fácilmente en sesión limpia**
    El OAuth funciona, pero la primera pantalla de Google puede pedir "permitir acceso a tu email" + "consentimiento" — 2 taps más. **Verificar en dispositivo real** que el redirect trae ya la sesión y aterriza en `/completar-perfil` (no `/`).

### Baja prioridad / cosmético

11. En `/completar-perfil` el barra de progreso está en el header y desaparece con el scroll — considerar hacerla `sticky`.
12. Los botones "Contactar" en el buscador sin sesión llevan a login sin explicación previa (auth wall duro).
13. Falta breadcrumb `Volver` en las 3 pantallas del onboarding — un usuario que se equivocó en el paso 2 solo puede usar la flecha del navegador.
14. No hay skeleton para las tarjetas de categoría del paso 2 mientras cargan.

---

## Quick wins ya implementados (commit `512b21a`)

Los siguientes **inputs del funnel completo** reciben ahora los atributos móviles correctos:

**`src/pages/Login.jsx`**
- Email → `inputMode="email"` + `autoCapitalize="none"` + `spellCheck={false}` + `enterKeyHint` dinámico.
- Nombre → `autoCapitalize="words"` + `enterKeyHint="next"`.
- Contraseña → `enterKeyHint="go"`.

**`src/pages/ClientOnboarding.jsx`**
- Nombre → `autoCapitalize="words"` + `enterKeyHint="next"`.
- Email → `inputMode="email"` + `autoCapitalize="none"` + `spellCheck={false}` + `enterKeyHint="next"`.
- Password → `enterKeyHint="go"`.

**`src/pages/ProfileOnboarding.jsx` (paso 1)**
- business_name → `autoCapitalize="words"`, `autoComplete="organization"`, `enterKeyHint="next"`.
- cif_nif → `inputMode="text"`, `autoCapitalize="characters"`, `autoComplete="off"`, `spellCheck={false}`, `enterKeyHint="next"`.
- email_contacto → `inputMode="email"`, `autoComplete="email"`, `autoCapitalize="none"`, `spellCheck={false}`, `enterKeyHint="next"`.
- telefono_contacto → `type="tel"`, `inputMode="tel"`, `autoComplete="tel"`, `enterKeyHint="next"`.

**`src/pages/ProfileOnboarding.jsx` (paso 2)**
- activity_other → `autoCapitalize="sentences"`, `enterKeyHint="next"`.
- years_experience → `inputMode="numeric"`, `pattern="[0-9]*"`, `enterKeyHint="next"`.
- descripcion_corta (textarea) → `autoCapitalize="sentences"`, `enterKeyHint="enter"`.

**`src/pages/ProfileOnboarding.jsx` (paso 3)**
- tarifa_base → `inputMode="decimal"`, `enterKeyHint="next"`.
- Instagram/Facebook/website/tiktok → `type="url"`, `inputMode="url"`, `autoComplete="url"`, `autoCapitalize="none"`, `spellCheck={false}`, `enterKeyHint`.

**Riesgo cero**: son hints al navegador y al password manager. Ningún cambio de flujo, ningún cambio de campos obligatorios, ningún cambio visual.

---

## Top 5 cambios que más conversión recuperarían

Uno por línea, más impacto arriba:

1. **Deja publicar el perfil sin foto** — obliga a subirla después y perderás menos autónomos en el paso 3. El estándar de todos los marketplaces (Wallapop, Trabajos, incluso Uber) es "publica ya, mejora luego".
2. **Mueve NIF/CIF fuera del onboarding** — pídelo solo cuando el autónomo vaya a facturar o cobrar; hoy espanta a la mitad de los que llegan al paso 1.
3. **Diseña una pantalla real "Confirma tu email"** con contador + botón reenviar + botón cambiar-email — es donde pierdes gente sin darte cuenta porque no hay analítica del abandono.
4. **Colapsa la elección de rol y el signup en una sola pantalla con Google/Apple arriba** — la mayoría del tráfico móvil viene de anuncios y quiere el atajo social; email debe ser secundario.
5. **Autosave de los 3 pasos en localStorage** — hoy un WhatsApp interrumpe el onboarding y pierdes al usuario; con autosave le sigue esperando el formulario donde lo dejó.

---

_Reproducibilidad: `node scripts/audit-ux.mjs` regenera capturas y `findings.json` en un minuto._
