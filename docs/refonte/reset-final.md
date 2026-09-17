# Reseteo final — lo que se hace cuando el último fichero deje de importar shadcn

El swap de UI es aditivo a propósito: `bg-blue-600` sigue funcionando
mientras quedan consumidores sin migrar, y los tokens nuevos conviven con la
paleta de shadcn. Eso deja tres cosas a medio camino que sólo se pueden
cerrar cuando el contador llegue a cero. Esta lista existe para que ninguna
se olvide.

Comprobación de que ha llegado el momento:

```bash
grep -rlE "@/components/ui/|from ['\"]lucide-react['\"]|from ['\"]sonner['\"]|@/lib/utils" src --include='*.jsx' --include='*.js' --include='*.tsx' | grep -v '^src/components/ui/'
```

Tiene que devolver **nada** (`src/components/Icons.jsx` es la excepción: es el
único sitio donde se importa lucide, y así debe seguir).

## 1. Renombrar los tokens provisionales

`accent`, `muted` y `border` chocaban con los nombres que shadcn usa para
otra cosa —`bg-accent` allí es el gris de hover de los menús—, así que
durante la migración van con prefijo `c-`. Pisarlos antes habría cambiado el
aspecto de ficheros sin migrar.

```bash
grep -rl 'c-accent\|c-muted\|c-border' src | xargs sed -i '' \
  -e 's/\bbg-c-accent\b/bg-accent/g'   -e 's/\btext-c-accent\b/text-accent/g' \
  -e 's/\bborder-c-accent\b/border-accent/g' -e 's/\bring-c-accent\b/ring-accent/g' \
  -e 's/\btext-c-muted\b/text-muted/g'  -e 's/\bbg-c-muted\b/bg-muted/g' \
  -e 's/\bborder-c-border\b/border-border/g' -e 's/\bbg-c-border\b/bg-border/g'
```

Y en `tailwind.config.js`: quitar las entradas `'c-accent'`, `'c-muted'` y
`'c-border'`, y hacer que `accent`, `muted` y `border` apunten a
`rgb(var(--c-accent) / <alpha-value>)` y compañía en lugar de a los
`hsl(var(--accent))` de shadcn.

## 2. Resetear la paleta de Tailwind

Hoy `colors` es aditiva: los tokens nuevos conviven con los de shadcn y con
la paleta por defecto de Tailwind (`blue-600`, `gray-500`…). khdemlidaba
resetea `colors` entera, de modo que un `bg-blue-600` deja de compilar y el
sistema de diseño se vuelve obligatorio en vez de recomendado.

Antes de hacerlo, medir cuánto queda sin migrar:

```bash
grep -rhoE "(bg|text|border|from|to|ring)-(blue|indigo|amber|yellow|slate|gray|emerald|green|red|orange|purple|pink)-[0-9]{2,3}" src --include='*.jsx' | sort | uniq -c | sort -rn | head -20
```

Con eso a cero (o sólo con decorativos justificados), sustituir el bloque
`colors` de `tailwind.config.js` por el de khdemlidaba: `transparent`,
`current`, `inherit`, `white`, `black` y los tokens `--c-*`. Nada más.

## 3. Borrar lo que sobra

```bash
git rm -r src/components/ui            # incluidos los shims de re-export
```

Los shims (`ui/Footer.jsx`, `ui/CookieBanner.jsx`, `ui/LanguageSwitcher.jsx`,
`ui/InitialsAvatar.jsx`, `ui/MobileSelect.jsx`, `ui/PullToRefresh.jsx`,
`ui/OptimizedImage.jsx`) son de una línea y sólo existen para que los
importadores no se rompieran a mitad de migración.

Dependencias que mueren con ellos:

```bash
npm uninstall $(node -e "const p=require('./package.json').dependencies;console.log(Object.keys(p).filter(d=>/^@radix-ui\//.test(d)||['class-variance-authority','clsx','tailwind-merge','sonner','tailwindcss-animate','vaul','framer-motion'].includes(d)).join(' '))")
```

Ojo: `tailwindcss-animate` está en `plugins` de `tailwind.config.js` — quitar
también esa línea, o el build falla.

## 4. Purgar `globals.css`

966 líneas, 146 `!important`, 20 reglas con selectores `[data-radix-*]` que
apuntan a componentes que ya no existen. De sus 18 clases propias, sólo 5 se
usan en algún JSX (`skeleton`, `scrollbar-hide`, `mobile-main-content`,
`mobile-bottom-nav`, `animate-fade-in`), y `skeleton` está DUPLICADA: hay
tres definiciones en `globals.css` y una en `index.css`, y la de
`globals.css` gana por cascada porque no está en `@layer`.

El objetivo es el de khdemlidaba: **un solo fichero de estilos**. Lo que
sobreviva se reescribe en `index.css` con tokens, dentro de `@layer`, y
`globals.css` desaparece junto con su import en `main.jsx`.

## 5. Volver a medir

```bash
npm run build && npm run check:i18n && npm run check:hooks
node scripts/i18n-orphans.mjs
```

Y comparar con khdemlidaba, que es la vara de medir de toda la refonte:

| | misautonomos | khdemlidaba |
|---|---|---|
| Líneas en `src/` | — | 29.820 |
| Dependencias | — | 30 |
| Ficheros de estilos | — | 1 |
| Bundle de entrada | — | — |
