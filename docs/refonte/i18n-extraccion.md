# Extracción de cadenas — brief para agentes

Estás migrando misautonomos.es al método de i18n de khdemlidaba. Antes, la
web se "traducía" en caliente escaneando el DOM (AutoTranslate) y una clave
que faltaba se inventaba a partir de su nombre. Ya no: ahora cada texto
visible pasa por `t('clave')` y vive en un JSON por idioma. Tu trabajo es
extraer las cadenas escritas a mano de un lote concreto de ficheros.

## Qué haces, exactamente

1. Lee este documento entero antes de tocar nada.
2. Para cada fichero de tu lote, sustituye todo texto visible escrito a mano
   por una llamada `t(...)`, y anota la cadena española original y su
   traducción inglesa en tu fichero de parte.
3. Verifica con las dos órdenes del apartado "Verificación".
4. Devuelve el informe del apartado "Informe".

No toques ficheros fuera de tu lote. No edites `src/i18n/locales/*.json`
(los fusiona un script al final). No hagas commit.

## Cómo escribir el código

### Hook

```jsx
import { useTranslation } from 'react-i18next';

export default function Componente() {
  const { t } = useTranslation();
  // ...
}
```

- `useTranslation()` va **al principio del componente, siempre, sin
  condición**. Nunca dentro de un `if`, un callback, un `.map()` o después
  de un `return` temprano. Si el fichero ya llama a otros hooks, ponlo entre
  ellos, arriba del todo.
- Si el fichero usa `useLanguage` de `@/components/ui/LanguageSwitcher`,
  cámbialo por `useTranslation`. Si necesitaba `language`, usa
  `i18n.language.split('-')[0]` con `const { t, i18n } = useTranslation()`.
- Si el fichero ya tiene `const { t } = useTranslation()`, reutilízalo.
- **Texto fuera de un componente** (constantes a nivel de módulo, arrays de
  opciones definidos fuera de la función, helpers puros): esas constantes se
  evalúan una vez al importar y no se retraducen al cambiar de idioma. Mueve
  la constante dentro del componente (o conviértela en función que reciba
  `t`). Si de verdad no puede vivir dentro (un helper llamado desde varios
  sitios), haz que reciba `t` como parámetro. Último recurso, sólo en código
  que se ejecuta en respuesta a una acción (no en render):
  `import i18n from '@/i18n'` y `i18n.t('clave')`.
- Componentes tipo flecha sin llaves (`const X = () => <div>…</div>`):
  conviértelos a cuerpo con llaves para poder llamar al hook.

### Interpolación, plurales, texto enriquecido

```jsx
t('crm.clients.count', { count: n })          // "3 clientes" — ver plurales
t('crm.clients.greeting', { name: user.name }) // "Hola, {{name}}"
```

Plurales, en el JSON:

```json
"count_one": "{{count}} cliente",
"count_other": "{{count}} clientes"
```

Texto con elementos dentro (negritas, enlaces):

```jsx
import { Trans } from 'react-i18next';
<Trans i18nKey="auth.login.noAccount">
  ¿No tienes cuenta? <Link to="/registro">Regístrate</Link>
</Trans>
```
JSON: `"noAccount": "¿No tienes cuenta? <1>Regístrate</1>"`.

No concatenes trozos: `t('a') + nombre + t('b')` está mal, usa interpolación.
No hagas `t(variable)` con claves dinámicas salvo que enumeres todas las
posibles en un mapa explícito en el mismo fichero.

## Qué extraer y qué no

**Sí:** todo lo que un usuario lee. Texto JSX, `placeholder`, `title`,
`aria-label`, `alt`, `label`, mensajes de toast/error/éxito, textos de
botones, cabeceras de tabla, opciones de select escritas a mano, textos en
`confirm()`/`alert()`, mensajes de validación, estados vacíos, tooltips.

**No:**
- La marca: `misautónomos`, `MisAutónomos`. Va literal.
- URLs, emails, teléfonos, códigos ISO, claves de API, identificadores
  técnicos, nombres de campo de la BD, valores que vienen de la BD.
- `className`, `href`, `src`, `data-*`, `key`, `id`, `name` de inputs.
- `console.*`, `throw new Error(...)`, comentarios.
- Texto que ya pasa por `t()`.
- Nada en `src/components/ui/` — esa carpeta se reescribe entera en la
  siguiente fase. Si tu lote no la incluye, no la toques.

Si dudas: si un usuario final lo ve en pantalla, se extrae.

## Claves

Tienes asignado uno o varios **namespaces** (te lo dice el encargo). Todas
tus claves nuevas cuelgan de ellos. Forma:

```
namespace.sección.nombreDescriptivo
```

- camelCase, sin números de orden (`title`, no `text1`), sin abreviaturas
  raras. La clave describe **qué es**, no dónde está ni qué pone:
  `crm.clients.emptyState`, `quotes.form.submit`, `invoices.status.paid`.
- Agrupa por pantalla o bloque lógico bajo el namespace: `crm.clients.*`,
  `crm.detail.*`, `crm.automations.*`.
- **Reutiliza antes de crear.** `src/i18n/locales/es.json` ya tiene
  `common.*` (Guardar, Cancelar, Eliminar, Editar, Cerrar, Confirmar,
  Volver, Siguiente, Buscar, Filtrar, Sí, No, Aceptar, Rechazar, Éxito,
  Error, Obligatorio, Opcional, Cargando...) y bastantes claves sueltas
  de nivel superior. Si tu cadena española coincide **exactamente** con una
  existente, usa esa clave y no la dupliques. Si es parecida pero no igual,
  crea la tuya en tu namespace.
- No crees claves en `common.*` ni en el nivel superior: si crees que un
  texto debería ser común, ponlo en tu namespace y dilo en el informe.
- Una clave = un valor string. No arrays, no objetos con texto dentro.

## Tu fichero de parte

Escribe **un único** fichero `src/i18n/parts/<nombre-del-lote>.json`:

```json
{
  "es": {
    "crm": {
      "clients": {
        "title": "Clientes",
        "emptyState": "Todavía no tienes clientes",
        "count_one": "{{count}} cliente",
        "count_other": "{{count}} clientes"
      }
    }
  },
  "en": {
    "crm": {
      "clients": {
        "title": "Clients",
        "emptyState": "You don't have any clients yet",
        "count_one": "{{count}} client",
        "count_other": "{{count}} clients"
      }
    }
  }
}
```

- `es` lleva el texto **exactamente** como estaba en el código (misma
  puntuación, mismas mayúsculas, mismos acentos). No corrijas ni
  "mejores" el español — si ves una errata, anótala en el informe.
- `en` lleva **inglés real y natural**, escrito por ti, del registro de un
  producto SaaS para autónomos en España (tono directo, tuteo → "you",
  sin traducir literalmente giros españoles). Los `{{marcadores}}` y las
  etiquetas `<1>…</1>` se conservan idénticos.
- La forma de `en` calca la de `es` clave por clave. Ni una de más ni una
  de menos.
- Las claves reutilizadas de `es.json` **no** se ponen en la parte.

## Verificación (obligatoria, antes de informar)

```bash
node scripts/i18n-inventory.mjs --files <tus ficheros, separados por espacio>
```
Debe decir `OK: 0 cadenas a mano`. Si lista alguna, todavía no has
terminado. (Si una cadena listada es legítimamente no extraíble —p. ej. es
la marca— dilo en el informe con el motivo.)

```bash
npx eslint <tus ficheros>
```
Sin errores. Los avisos pre-existentes que no sean tuyos, ignóralos.

```bash
node -e "JSON.parse(require('fs').readFileSync('src/i18n/parts/<tu-lote>.json','utf8'))"
```
Debe pasar sin error.

No ejecutes `npm run build` ni `vite build`: es lento y varios agentes
comparten `dist/`.

## Informe

Al terminar, devuelve:

1. Lista de ficheros tocados, con nº de cadenas extraídas en cada uno.
2. Nº de claves nuevas en tu parte y los namespaces que has usado.
3. Claves de `es.json` que has reutilizado (lista).
4. Cadenas que **no** has podido extraer y por qué (con fichero y línea).
5. Textos que te parecen candidatos a `common.*` (texto + dónde aparece).
6. Erratas o inconsistencias del español original que hayas visto.
7. Cualquier hook que hayas tenido que mover o constante que hayas metido
   dentro de un componente (fichero + nombre), para poder revisarlo.

## Reconstrucción de partes perdidas (segunda oleada)

La primera oleada de agentes se cortó por cuota. En varios lotes el JSX ya
está convertido a `t('clave')` pero la parte JSON nunca se escribió: esas
claves están **huérfanas** (pintan la clave cruda en pantalla). El nombrado
ya está hecho y es bueno — no lo rehagas. Lo que hay que recuperar es el
texto español original, y está en git.

### Cómo recuperar el español original

El commit **`bbde76d`** es el último ANTES de que ningún agente tocara
nada. Para cada fichero de tu lote:

```bash
git diff bbde76d -- src/pages/MiCampana.jsx
```

Cada clave nueva aparece en una línea `+` con `t('ads.campaign.x')`, y la
línea `-` correspondiente (la de justo encima o unas pocas más arriba) lleva
el texto español tal cual estaba. Ése es el valor de `es`, **carácter por
carácter** (misma puntuación, mismas mayúsculas, mismos acentos). Si la
línea original tenía interpolación a mano (`{nombre}` en JSX, o
`'Hola ' + nombre`), el valor de `es` lleva `{{nombre}}` y la llamada del
código debe pasar `{ nombre }` — comprueba que lo haga.

Lista las huérfanas de tus ficheros con:

```bash
node scripts/i18n-orphans.mjs --files <tus ficheros>
```

Al terminar debe decir `OK: 0 claves huérfanas`. Ese script tiene en cuenta
las partes ya escritas en `src/i18n/parts/` y los plurales (`x.count` con
`x.count_one`/`x.count_other` no es huérfana).

### Reglas que no cambian

- Tu parte se llama como tu lote: `src/i18n/parts/<lote>.json`. Si ya
  existe (otro agente la escribió parcialmente), **añade** a ella, no la
  sobrescribas: léela, fusiona, escribe.
- `es` calca el original; `en` es inglés natural tuyo. Misma forma clave a
  clave.
- No inventes valores para una huérfana que no encuentres en el diff: dilo
  en el informe con fichero y clave, y déjala.
- Después de reconstruir, sigue con la extracción normal de lo que quede a
  mano en tus ficheros (`node scripts/i18n-inventory.mjs --files …`), con
  las reglas de arriba.

### Verificación de la segunda oleada

Las tres de antes (inventario a cero, eslint, parte parseable) **más**:

```bash
node scripts/i18n-orphans.mjs --files <tus ficheros>
```

Y en el informe, añade un punto 8: claves que reconstruiste desde el diff
(número) y las que no pudiste (lista).
