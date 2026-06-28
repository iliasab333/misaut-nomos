# MisAutónomos

SPA Vite + React + Supabase desplegada en Vercel, con **prerender estático** post-build
para SEO real por ruta.

## Comandos

```
npm run dev          # Vite dev server
npm run build        # vite build + node scripts/prerender.mjs
npm run build:nossr  # solo vite build (sin prerender, útil para debugging)
npm run prerender    # solo prerender (requiere dist/ ya construido)
```

## Cómo funciona el prerender

Tras `vite build`, `scripts/prerender.mjs` consulta Supabase (con `VITE_SUPABASE_ANON_KEY`)
y, partiendo de `dist/index.html` como plantilla, genera HTMLs estáticos por ruta:

- **Estáticas**: `/`, `/buscar`, `/precios`, `/preguntas-frecuentes`, `/ayuda`, `/blog`,
  `/para-autonomos`, `/contacto`, `/privacidad`, `/terminos`, `/cookies`, `/aviso-legal`.
- **Categorías**: `/categoria/{slug}` — 17 categorías con intro único de ~150 palabras +
  listing de profesionales reales.
- **Perfiles**: `/autonomo/{cat-en-ciudad}/{slug}` — solo `visible_en_busqueda = true`,
  con JSON-LD `LocalBusiness` (+ `AggregateRating` si hay reseñas).
- **Blog**: `/blog/{slug}` — solo `status = 'published'`, con JSON-LD `BlogPosting`.
- **City × Category** (`/categoria/{slug}/{ciudad}`): solo se generan combinaciones con
  `≥ MIN_PROS_POR_CIUDAD_CATEGORIA = 3` perfiles visibles, para evitar doorway pages.
  Hoy ninguna combinación supera el umbral; aparecerán solas en builds futuros conforme
  crezca la oferta.
- **404**: `dist/404.html` con `noindex,nofollow`. Vercel lo sirve con HTTP 404 para
  cualquier URL que no matchee un rewrite ni un archivo estático.

Cada HTML incluye, en el `<head>`: `<title>`, `meta description`, `link rel="canonical"`,
Open Graph, Twitter Card y (cuando aplica) `application/ld+json` con schema apropiado.
Dentro de `#root` se inserta un bloque oculto (`position:absolute; left:-9999px;`) con
`<h1>` + intro + listing — lo que ven Googlebot e IAs sin ejecutar JS. React hidrata
sobre `#root` al cargar el bundle SPA.

## Slugs limpios y 301

`src/lib/seoUrl.js#slugify` normaliza a ASCII (sin acentos, sin guiones colgantes).
Cuando un perfil legacy tiene `slug_publico` "sucio", el prerender:
1. Escribe el HTML en la ruta limpia.
2. Añade un 301 en `vercel.json` del slug viejo al limpio (revisa el bloque `redirects`).

Tras añadir nuevos perfiles con slugs sucios, regenera y commitea `vercel.json` con los
nuevos redirects (saldrán listados en `dist/slug-redirects.json` tras correr el build).

## Sitemap

`api/sitemap.xml.js` es una serverless function que lee Supabase en cada request,
genera el XML completo (estáticas + categorías + city×category con candado ≥3 + perfiles
visibles + blog publicado) y lo cachea 6 h en el CDN.

## Rebuild diario (datos cambiantes)

Como `professional_profiles`, `blog_posts` y `service_categories` se editan desde el
admin sin redeploy, el prerender solo se refresca cuando hay un nuevo build.

Para que los cambios se publiquen sin intervención manual, configura **un Deploy Hook
en Vercel** y dispárelo a diario:

1. Vercel → Project Settings → **Git → Deploy Hooks** → Create Hook
   - Name: `daily-rebuild`
   - Branch: `main`
2. Copia la URL (formato `https://api.vercel.com/v1/integrations/deploy/<id>/<token>`).
3. Programa un cron externo que haga `curl -X POST <hook-url>` una vez al día.
   Opciones: GitHub Actions con `schedule`, cron-job.org, EasyCron, o el propio
   trigger remoto de claude.ai (la routine que ya tenemos para PSI puede ampliarse).

Alternativamente, Vercel Cron Jobs (sección **Cron Jobs** del proyecto) puede ejecutar
una serverless function en horario fijo; la función llamaría al Deploy Hook.

## Variables de entorno

| Var | Dónde | Uso |
|---|---|---|
| `VITE_SUPABASE_URL` | Cliente + build | Cliente Supabase del frontend y del prerender |
| `VITE_SUPABASE_ANON_KEY` | Cliente + build | Igual |
| `VITE_STRIPE_PUBLIC_KEY` | Cliente | Stripe (legacy) |
| `RESEND_API_KEY` | Serverless | Emails admin |
| `RESEND_FROM_EMAIL` | Serverless | Remitente Resend |
| `CLARITY_API_TOKEN` | Serverless | Data Export API Clarity |
| `VITE_CLARITY_PROJECT_ID` | Cliente | Tracking Clarity (pendiente) |
