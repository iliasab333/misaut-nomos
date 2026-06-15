import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Sube al inicio en cada cambio de ruta. Respeta los anchors (#) cuando existen,
// para no romper la navegación interna a IDs.
export default function ScrollToTop() {
  const { pathname, search, hash } = useLocation();

  useEffect(() => {
    if (hash) return;
    // `auto` evita una animación que se ve fea en navegaciones rápidas.
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname, search, hash]);

  return null;
}
