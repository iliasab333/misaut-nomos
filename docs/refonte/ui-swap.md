# Swap de la capa UI — brief para agentes

Estás quitando shadcn/Radix de misautonomos.es y dejándolo como khdemlidaba:
sin librería de componentes, clases semánticas de Tailwind + un puñado de
componentes propios. La base ya está escrita y verificada; tu trabajo es
migrar un lote concreto de ficheros para que dejen de importar nada de
`@/components/ui/*` (salvo lo que diga la tabla de abajo) ni de `lucide-react`.

Lee este documento entero antes de tocar nada. Después lee, para tener el
contrato exacto:

- `src/index.css` — bloque «REFONTE» al final: los tokens y todas las clases.
- `src/components/Modal.jsx`, `src/components/Icons.jsx`,
  `src/components/ListStates.jsx`, `src/lib/toast.js`.

## Qué haces, exactamente

1. Para cada fichero de tu lote, sustituye cada componente de shadcn por su
   equivalente de la tabla. Mismo aspecto (colores, tamaños, espaciado) y
   mismo comportamiento. **No rediseñas**: si un botón era azul y grande,
   sigue siendo azul y grande.
2. Conserva TODAS las llamadas `t(...)` y los hooks de i18n que ya haya.
   Otra oleada de agentes acaba de extraer las cadenas: no las vuelvas a
   escribir a mano, no cambies claves.
3. La lógica de negocio no se toca: mismas llamadas a Supabase/base44,
   mismos handlers, mismo estado. Cambias la piel, no el músculo.
4. Verifica (apartado «Verificación») e informa (apartado «Informe»).

No toques ficheros fuera de tu lote. No edites `src/components/ui/*`,
`src/index.css`, `tailwind.config.js` ni los locales. No hagas commit.

## Tabla de equivalencias

| shadcn (`@/components/ui/…`) | Ahora |
|---|---|
| `Button` | `<button className="btn-primary">` (default) · `variant="outline"`/`"secondary"` → `btn-secondary` · `variant="ghost"`/`"link"` → `btn-ghost` · `variant="destructive"` → `btn-danger-solid` · `size="sm"` → añade `btn-sm` · `size="lg"` → `btn-lg` · `size="icon"` → `btn-icon` · `asChild` con `<Link>` → pon la clase en el `<Link>` directamente |
| `Input` | `<input className="input">` (misma altura 48px, texto 16px) |
| `Textarea` | `<textarea className="textarea">` |
| `Label` | `<label className="label" htmlFor=…>` |
| `Select` + `SelectTrigger/Value/Content/Item` | `<select className="select">` nativo con `<option>`. Es la regla de khdemlidaba: el select nativo del móvil es mejor que cualquier menú custom. Si el select tenía búsqueda o >30 opciones, dilo en el informe (candidato a Combobox, fase posterior) y deja el nativo mientras tanto. |
| `Checkbox` | `<input type="checkbox" className="checkbox">` |
| `RadioGroup` + `RadioGroupItem` | `<input type="radio" className="radio" name=…>` |
| `Switch` | `<input type="checkbox" role="switch" className="switch">` |
| `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter` | `<div className="card">` y dentro `div`/`h3`/`p` con las utilidades que hagan falta (`p-6`, `text-lg font-semibold text-ink`, `text-sm text-c-muted`…). Sin subcomponentes. |
| `Badge` | `<span className="badge-accent">` (default) · `secondary` → `badge-muted` · `destructive` → `badge-error` · `outline` → `badge-outline` · y usa `badge-success`/`badge-warning` donde el color hardcoded era verde/ámbar |
| `Separator` | `<hr className="separator">` (o `<div className="separator" role="separator">`) |
| `Skeleton` | `<div className="skeleton" style={{height, width}}>` o los de `ListStates.jsx` |
| `Avatar`, `AvatarImage`, `AvatarFallback` | `<img className="w-10 h-10 rounded-full object-cover">` con `onError` que muestre iniciales, o `InitialsAvatar` si el fichero ya lo usaba |
| `Dialog`, `DialogContent/Header/Title/Description/Footer`, `DialogTrigger` | `<Modal open onClose title description>` de `src/components/Modal.jsx`. El trigger es un botón normal que hace `setOpen(true)`. El footer son botones dentro del modal. |
| `AlertDialog` (+ Action/Cancel) | `<Modal dismissible={false}>` con dos botones: `btn-secondary` cancelar, `btn-danger-solid` (o `btn-primary`) confirmar |
| `Sheet`, `Drawer`, `ResponsiveModal` | `<Modal>` — en móvil ya es una hoja pegada abajo |
| `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` | `useState` para la pestaña activa + `<div role="tablist">` con `<button role="tab" aria-selected className={active ? 'chip-active' : 'chip'}>` y el contenido condicional. Si las pestañas eran una barra subrayada (no chips), usa `border-b-2 border-c-accent text-ink` en la activa y `text-c-muted` en el resto. |
| `Tooltip` | Atributo `title` en el elemento. Si el tooltip llevaba contenido rico, dilo en el informe. |
| `DropdownMenu`, `Popover` | `useState` + un `div` absoluto con `card p-1` y botones `w-full text-left px-3 py-2 rounded hover:bg-soft`. Cierra con click fuera (`useEffect` + `mousedown` en `document`) y con Escape. Mira `HeaderWeb` de khdemlidaba para el patrón: `/Users/bigseo/khdemlidaba/src/components/Header.jsx`. |
| `Progress` | `<div className="h-2 rounded-full bg-soft overflow-hidden"><div className="h-full bg-c-accent" style={{width: pct+'%'}}/></div>` |
| `Alert`, `AlertTitle`, `AlertDescription` | `<div role="alert" className="card p-4 border-l-4 …">` con `border-l-error`/`border-l-success`/`border-l-c-accent` según variante |
| `ScrollArea` | `<div className="overflow-y-auto">` |
| `Toggle`, `ToggleGroup` | botones `chip`/`chip-active` |
| `Slider` | `<input type="range">` con `accent-color` vía `style` |
| `Accordion` | `<details>`/`<summary>` nativos, o `useState` + botón |
| `toast` de `sonner` / `use-toast` / `@/components/ui/toaster` | `import { toast } from '@/lib/toast'` — **misma llamada** `toast.success('…')`, `toast.error('…')`, `toast.info('…')`. La única llamada con objeto (`toast({ title, description })`) está en `NotificationPermissionBanner.jsx`: pásala a `toast.info(title)`. |
| `cn(...)` de `@/lib/utils` | Plantillas literales: `` className={`btn-primary ${disabled ? 'opacity-50' : ''}`} ``. `cn`/`clsx`/`tailwind-merge` desaparecen con shadcn. |
| iconos de `lucide-react` | `import { IconX } from '@/components/Icons'`. Si el icono que necesitas no está en `Icons.jsx`, **añádelo ahí** (una línea `export const IconNombre = mk(Nombre);` + el import de lucide arriba) — es el único sitio donde se importa lucide. No importes lucide en tu fichero. |
| `Loader` (`ui/Loader.jsx`) | `<IconSpinner className="text-c-muted" />` (ya gira) o un esqueleto de `ListStates.jsx` |
| `PageTransitions` (`ui/PageTransitions.jsx`, framer-motion) | Se elimina: renderiza los `children` directamente. khdemlidaba no tiene transiciones de página. |
| `ScrollToTop` (`ui/ScrollToTop.jsx`) | Se elimina el import: `App.jsx` ya monta `@/lib/ScrollToTop`. |
| `InitialsAvatar`, `MobileSelect`, `PullToRefresh`, `OptimizedImage`, `LanguageSwitcher`, `CookieBanner`, `Footer` | **Se quedan** (no son shadcn). Ya viven en `@/components/<Nombre>`; lo que hay en `ui/<Nombre>.jsx` es un re-export temporal. Cambia el import a `@/components/<Nombre>` (también los `lazy(() => import(…))`). `useLanguage` de LanguageSwitcher: si el fichero sólo lo usaba para `t`, pásalo a `useTranslation`. Si usaba `language`, **`uiLang(i18n.language)`** de `@/i18n` — NO `i18n.language.split('-')[0]`, que no es equivalente y rompió tres páginas: `i18n.language` puede valer `fr`/`de`/`nl`/`ar` (los acepta `supportedLngs` y el detector lee `?lang=XX`), y una pantalla que hace `language === 'es' ? textoEs : textoEn` se pintaba entonces en inglés mientras la cabecera seguía en español. `uiLang()` acota a los idiomas realmente publicados, cayendo a `es`. |

Estados de lista (carga / error / vacío): si el fichero tenía un spinner
sobre vacío, un «Error» sin botón o un «No hay X» sin acción, usa
`SkeletonList`/`ErrorState`/`EmptyState` de `ListStates.jsx`. Es la regla de
la casa y es el momento de aplicarla.

## Colores: los mismos, con nombre

El aspecto no cambia. Lo que cambia es que el color tiene nombre:

| Antes (hardcoded) | Ahora |
|---|---|
| `bg-blue-600`, `text-blue-600` (primario) | `bg-c-accent`, `text-c-accent` |
| `hover:bg-blue-700` | `hover:bg-accent-hover` |
| `text-blue-700` (enlaces, acento fuerte) | `text-c-accent` |
| `text-gray-900`, `text-slate-900` | `text-ink` |
| `text-gray-700`, `text-gray-600`, `text-slate-600` | `text-ink` si es texto principal, `text-c-muted` si es secundario — usa el criterio del contexto |
| `text-gray-500`, `text-gray-400`, `text-slate-500` | `text-c-muted` |
| `border-gray-200`, `border-slate-200`, `border-gray-100` | `border-c-border` |
| `bg-gray-100`, `bg-gray-50`, `bg-slate-50` | `bg-soft` |
| `bg-white` (superficie de carta/modal) | `bg-surface` |
| `text-green-600`, `bg-green-*` (éxito) | `text-success`, `bg-success/10` |
| `text-red-600`, `bg-red-*` (error, borrar) | `text-error`, `bg-error/10` |
| `text-amber-*`, `text-yellow-*` (aviso, estrellas) | `text-warning` / `text-star` |
| `bg-[#25D366]` (WhatsApp) | `bg-whatsapp` |

Los nombres con prefijo `c-` (`c-accent`, `c-muted`, `c-border`) son
provisionales: chocan con los nombres que shadcn usa para otra cosa y se
renombran con un `sed` cuando el último fichero esté migrado. Úsalos tal
cual; no inventes alternativas.

No cambies colores que no estén en la tabla (un `bg-purple-100` decorativo
de una tarjeta de plan se queda como está — dilo en el informe si te parece
que debería ser un token).

## Reglas de código

- **Hooks arriba, siempre.** Al pasar de `Dialog` a `Modal` o de `Tabs` a
  `useState`, el `useState` nuevo va al principio del componente, con los
  demás hooks, nunca después de un `return` condicional. `npm run
  check:hooks` lo comprueba.
- **Tamaño táctil 48px** en botones y campos (las clases ya lo llevan; no
  lo anules con `h-8` ni `py-1`). Si un botón era deliberadamente pequeño
  (icono en una tabla), `btn-icon` o `btn-sm`.
- **Nada de `dangerouslySetInnerHTML`** nuevo.
- **Accesibilidad mínima:** botones con texto o `aria-label`; `role="tab"`
  + `aria-selected` en pestañas; `role="dialog"` lo pone Modal solo.
- Componentes de clase o `forwardRef` de shadcn que envolvías: quítalos,
  usa el elemento nativo.
- Si un fichero de tu lote tiene más de ~600 líneas y mezcla tres pantallas,
  **no lo partas ahora** — es fase 4 (estructura). Migra la piel y sigue.

## Verificación (obligatoria)

```bash
grep -nE "@/components/ui/|from ['\"]lucide-react['\"]|from ['\"]sonner['\"]|@/lib/utils" <tus ficheros>
```
Debe devolver **nada**, salvo imports permitidos de la última fila de la
tabla (InitialsAvatar, etc.) si aún no se han movido.

```bash
npx eslint <tus ficheros>
node scripts/check-hook-order.mjs <tus ficheros>
```
Sin errores.

Después, con el servidor de desarrollo (ya hay uno en http://localhost:5174;
no arranques otro), abre la ruta de cada página de tu lote y comprueba en la
consola que no hay errores nuevos y que la página pinta. Si no tienes
navegador, dilo en el informe y describe qué has podido verificar.

No ejecutes `npm run build`.

## Informe

1. Ficheros migrados, y para cada uno qué primitivas de shadcn quitaste.
2. Iconos que añadiste a `Icons.jsx`.
3. Selects con búsqueda / muchas opciones que dejaste nativos (candidatos a
   Combobox).
4. Tooltips con contenido rico, dropdowns complejos u otras cosas que no
   tenían equivalente directo y cómo las resolviste.
5. Colores que no estaban en la tabla y qué hiciste con ellos.
6. Imports a `ui/<NoShadcn>` que dejaste porque la ruta nueva aún no existía.
7. Cualquier duda sobre comportamiento (algo que antes hacía shadcn y no
   estás seguro de haber replicado: foco, teclado, cierre con click fuera).
