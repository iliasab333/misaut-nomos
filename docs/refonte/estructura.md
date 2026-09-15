# Fase 4 — Estructura (App.jsx, Layout.jsx, lib/, hooks/)

Objetivo: que el esqueleto de misautonomos.es sea el de khdemlidaba. No es
cosmética: es donde vive la mitad de la deuda de Base44.

## Diagnóstico

| | misautonomos (hoy) | khdemlidaba |
|---|---|---|
| Rutas | `pages.config.js` (mapa nombre→componente, 40 `lazy()`) **y** `App.jsx` (81 `<Route>`, otros 40 `lazy()`, varios duplicados: `AdminDashboard`, `Invoices`, `Calendar`… se declaran lazy en los dos ficheros) | `App.jsx`: una función `AllRoutes()` con cada `<Route>` explícita, `Home` eager, todo lo demás `lazyWithRetry` |
| Layout | `Layout.jsx`, 1.158 líneas: `HomeLogoLink`, `SidebarContentComponent` (200 líneas), `LayoutContent` (940 líneas: header, sidebar, nav móvil, footer lazy, cookie banner lazy, `PageTransitions`), `Layout` | `Header.jsx`, `Footer.jsx`, `NativeTabBar.jsx`, `NativeShell.jsx`, `CookieBanner.jsx` — cada uno un fichero; `App.jsx` decide shell web vs nativo con `isNative()` |
| Auth | `AuthProvider` + `AppProvider` en `lib/`, `useAuth` | `contexts/AuthContext.jsx`, `RequireAuth`/`RequireAdmin` como envoltorios de ruta |
| Datos | `@tanstack/react-query` (60 ficheros) sobre `base44Client` | hooks propios (`useProfessionals`, `useCategories`…) con `resultsCache.js`; sin librería |
| Chunks caídos | reload manual en `App.jsx` (`CHUNK_RELOAD_FLAG`) alrededor de cada lazy | `lib/lazyWithRetry.js` (ya portado) |
| Guardas de build | ninguna | `check-hook-order`, `verify-tracking`, `verify-ios-entitlements`, `generate-sitemap`, `check-i18n-slugs`, smoke tests |

## Plan

1. **`App.jsx`**: una sola lista de `lazyWithRetry`, sin `pages.config.js`.
   `AllRoutes()` explícita, agrupada: públicas · auth · cliente · pro ·
   admin (`RequireAdmin`). `Home` eager (LCP). Borrar el `ErrorBoundary`
   con reload manual (lo hace `lazyWithRetry`) y dejar uno que sólo pinta
   la pantalla de error con botón. Borrar `VisualEditAgent`,
   `NavigationTracker` e `iframe-messaging` si son de Base44 (comprobar
   que no los use nada).
2. **`Layout.jsx` → cuatro ficheros**: `components/Header.jsx` (logo, nav
   de escritorio, menú de cuenta, `LangSwitcher`), `components/MobileMenu.jsx`
   (ya existe; recibe el drawer), `components/Footer.jsx` (ya movido),
   `components/NativeTabBar.jsx` (la nav inferior móvil de hoy —
   `.mobile-bottom-nav` en globals.css — pasa a ser una tab bar como la de
   khdemlidaba, sólo en Capacitor). `App.jsx` decide shell web vs nativo.
3. **`lib/` y `hooks/`** al estilo khdemlidaba: `lib/native.js` (ya hay
   `lib/native/`), `lib/format.js`, `lib/dates.js` (fuera `moment` y
   `date-fns`… medir qué se usa), `lib/slugify.js` (ya existe),
   `hooks/useBodyScrollLock.js` (ya), `hooks/useNotifications.js`.
   `@tanstack/react-query` se queda en esta fase — 60 ficheros; quitarlo es
   una fase propia y hay que decidir si merece la pena.
4. **Guardas de build**: `check:hooks` (ya), `check:i18n` (ya), portar
   `generate-sitemap.js` + `validate-sitemap.mjs` (hoy hay `check-sitemap.mjs`
   y `api/sitemap.xml.js`: unificar), `verify-ios-entitlements.mjs`,
   smoke de rutas (`smoke-native-routes.mjs`).
5. **`globals.css`**: 966 líneas, 146 `!important`, overrides de
   `[data-radix-*]`, `.mobile-bottom-nav`, `#root > div > div`. Muere con
   shadcn: lo que sobreviva (`.mobile-bottom-nav` → tab bar) se reescribe
   en `index.css` con tokens. Objetivo: `index.css` único, como khdemlidaba.

## Orden

Después del swap de UI (fase 3) y antes del reset de paleta/deps: el
`Layout` nuevo ya nace sin shadcn, y el reset borra `globals.css` de una vez.

## Lo que NO cambia

Rutas públicas (URLs) — ni una. SEO adquirido intacto. Lógica de negocio
(`base44Client`, `api/`, `supabase/`) intacta.
