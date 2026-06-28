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
| `SUPABASE_SERVICE_ROLE_KEY` | Scripts + serverless | Outreach, seed-leads, lead-convert, lead-opt-out |
| `VITE_STRIPE_PUBLIC_KEY` | Cliente | Stripe (legacy) |
| `RESEND_API_KEY` | Serverless | Emails admin + outreach |
| `RESEND_FROM_EMAIL` | Serverless | Remitente Resend |
| `GOOGLE_PLACES_API_KEY` | Script seed-leads | Descubrimiento de leads vía Places API |
| `CLARITY_API_TOKEN` | Serverless | Data Export API Clarity |
| `VITE_CLARITY_PROJECT_ID` | Cliente | Tracking Clarity |
| `MAX_OUTREACH_POR_RUN` | Script outreach | Límite mensajes/run (default 30) |

---

## Motor de oferta (Fase 2): leads + outreach + guías locales

**Regla dura:** los datos de Google Places son leads internos para outreach.
**Nunca** se publican como perfiles públicos. El perfil público existe solo
cuando el profesional se da de alta él mismo.

### Pipeline

```
Google Places API (searchText "fontanero en Sabadell")
    │
    ▼
scripts/seed-leads.mjs  →  outbound_leads.status='nuevo'
    │
    ▼
scripts/outreach.mjs  →  WhatsApp (si phone) | Email Resend (si email)
    │       │
    │       ├─ phone     → wa.me link en notes, status='pending_wa' (envío manual)
    │       └─ email     → enviado vía Resend, status='contactado'
    │
    ▼
URL de alta `/para-autonomos?ref=outreach&lead=<id>`
    │
    ▼
ProfileOnboarding.handleSubmit → POST /api/lead-convert
    │
    ▼
outbound_leads.status='convertido' + notify admin
```

### Comandos

```
node scripts/seed-leads.mjs                                    # matriz por defecto (Vallès × 8 gremios)
node scripts/seed-leads.mjs --cities=sabadell,terrassa --gremios=fontanero,cerrajero
node scripts/seed-leads.mjs --dry-run                          # no escribe en BD

node scripts/outreach.mjs                                      # hasta 30 leads/run
node scripts/outreach.mjs --limit=10 --dry-run                 # prueba en seco
node scripts/outreach.mjs --only-email                         # ignora leads con phone
```

### Cumplimiento RGPD

- Cada mensaje incluye identificación del remitente (MisAutónomos + URL).
- Cada mensaje incluye un link de baja con token único (`opt_out_token`).
- El endpoint `/api/lead-opt-out?token=...` marca `opt_out=true` permanentemente.
- Leads en `opt_out` o en estados avanzados (`contactado`, `respondido`,
  `convertido`) nunca se vuelven a contactar ni se sobreescriben.

### Guías editoriales locales (8 páginas)

Solo estas 8 combinaciones ciudad×gremio saltan el candado de densidad ≥3
porque llevan contenido editorial único (precios reales 2026, cómo elegir,
errores comunes, FAQ con `FAQPage` JSON-LD):

- `/categoria/fontanero/{sabadell,terrassa}`
- `/categoria/electricista/{sabadell,terrassa}`
- `/categoria/cerrajero/{sabadell,terrassa}`
- `/categoria/albanil-reformas/{sabadell,terrassa}`

Cada página incluye listing real si hay profesionales verificados en esa
ciudad+gremio. Si no, CTA honesto: **"¿Eres X en Y? Sé el primero"**.
Nada de listados fantasma.

Para añadir/quitar guías edita `EDITORIAL_GUIDES` en `scripts/prerender.mjs`
y el array `EDITORIAL` en `api/sitemap.xml.js`.

### Migración pendiente

`supabase/migrations/20260628120000_outbound_leads.sql` define la tabla con
RLS, índices y triggers. Hay que aplicarla en el dashboard de Supabase
(SQL editor) o vía `supabase db push` cuando se conecte el CLI. Sin esta
migración, los scripts `seed-leads`/`outreach` fallarán al insertar.
