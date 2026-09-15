// Envoltorio de React.lazy que sobrevive a los redespliegues de Vercel.
// Portado de khdemlidaba.
//
// Problema: tras un despliegue, los chunks con hash del build anterior
// (Search-DDUpzl3D.js, MyProfile-CRBcionc.js…) desaparecen del CDN. Una
// pestaña que sigue abierta con el HTML viejo los referencia todavía y cae
// en "Failed to fetch dynamically imported module" en cuanto navega a una
// ruta lazy → ErrorBoundary global, pantalla de error.
//
// Solución: al primer fallo de tipo "chunk load", marcamos la sesión y
// forzamos un location.reload(). El reload trae el HTML nuevo, que apunta
// a los hashes nuevos, y la navegación siguiente funciona.
//
// Guardarraíl: sessionStorage evita el bucle infinito. Si el reload TAMBIÉN
// falla (el error no es un chunk caducado sino red/servidor), dejamos que
// suba al ErrorBoundary, que enseña su pantalla con botón "Recargar".
//
// App.jsx tenía esta misma lógica escrita a mano alrededor de cada lazy();
// esto la concentra en un sitio y la hace igual en las 82 rutas.

import { lazy } from 'react';
import { ensureAppLocale } from '@/i18n';

const RELOAD_FLAG = 'ma.chunk-reloaded';

// Firmas del error de carga dinámica según navegador:
//   - Chromium/Safari: "Failed to fetch dynamically imported module"
//   - Safari (iOS):    "Importing a module script failed"
//   - Firefox:         "error loading dynamically imported module"
//   - webpack legacy:  "ChunkLoadError" / "Loading chunk N failed"
// Se matchea ancho pero NO cualquier TypeError — un bug de la app no debe
// disparar un reload en bucle.
function isChunkLoadError(err) {
  if (!err) return false;
  const msg = String(err.message || err.name || err);
  return (
    /Failed to fetch dynamically imported module/i.test(msg)
    || /Importing a module script failed/i.test(msg)
    || /error loading dynamically imported module/i.test(msg)
    || /Loading chunk [\d]+ failed/i.test(msg)
    || err.name === 'ChunkLoadError'
  );
}

export function lazyWithRetry(factory) {
  return lazy(async () => {
    try {
      return await factory();
    } catch (err) {
      if (!isChunkLoadError(err)) throw err;
      const alreadyReloaded = typeof sessionStorage !== 'undefined'
        && sessionStorage.getItem(RELOAD_FLAG) === '1';
      if (alreadyReloaded) {
        // Ya recargamos una vez esta sesión: el problema NO es un chunk
        // caducado. Que se ocupe el ErrorBoundary.
        throw err;
      }
      try { sessionStorage.setItem(RELOAD_FLAG, '1'); } catch { /* privado / cuota */ }
      if (typeof window !== 'undefined') window.location.reload();
      // Promesa que nunca resuelve: React no pinta nada durante el reload
      // (evita un flash del ErrorBoundary).
      return new Promise(() => {});
    }
  });
}

// Página que además necesita el bundle de traducciones de aplicación
// (admin, CRM, facturación, presupuestos… — ver src/i18n/namespaces.js).
//
// Encadena las dos descargas en la MISMA promesa que React.lazy espera, así
// que el <Suspense> de las rutas no pinta la página hasta tener sus textos.
// Es lo que evita el destello de claves crudas («admin.users.title») que
// tendría cualquier solución basada en cargar el bundle en un useEffect.
//
// Las dos peticiones salen a la vez (Promise.all, no secuencial): el chunk de
// la página y el del idioma viajan en paralelo.
//
//   const CRM = lazyApp(() => import('./pages/CRM.jsx'));
//
// Una página pública normal sigue usando `lazyWithRetry`.
export function lazyApp(factory) {
  return lazyWithRetry(async () => {
    const [mod] = await Promise.all([factory(), ensureAppLocale()]);
    return mod;
  });
}

// Limpieza del flag al arrancar bien: si estamos aquí, el reload anterior
// funcionó → reseteamos para que un futuro redespliegue vuelva a poder
// disparar el mecanismo.
if (typeof sessionStorage !== 'undefined') {
  try { sessionStorage.removeItem(RELOAD_FLAG); } catch { /* ignorar */ }
}
