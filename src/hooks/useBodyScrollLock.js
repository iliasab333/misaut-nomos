// Scroll lock seguro en iOS para modales, hojas y desplegables a pantalla
// completa. Portado de khdemlidaba.
//
// Un simple `body.style.overflow = 'hidden'` NO basta en iOS Safari: el
// usuario sigue pudiendo desplazar el fondo con el dedo, y al cerrar la
// posición de scroll se pierde o se descoloca. Patrón canónico:
//
//   1. Capturar window.scrollY.
//   2. body.style.position = 'fixed'; body.style.top = `-${scrollY}px`;
//      + left:0 right:0 width:100% overflow:hidden → fondo congelado, no se
//      mueve bajo el dedo.
//   3. Al cerrar, restaurar los estilos Y window.scrollTo(0, scrollY) al
//      instante (sin smooth — el usuario ya está visualmente arriba, un
//      scroll animado se percibe como un fallo).
//
// En Capacitor nativo, body ya tiene position:fixed + overflow:hidden y el
// verdadero scroller es main.native-scroll. Ahí bloqueamos overflow en main
// y restauramos scrollTop.
//
// Uso:  useBodyScrollLock(open);

import { useEffect } from 'react';

export default function useBodyScrollLock(active) {
  useEffect(() => {
    if (!active) return undefined;
    if (typeof document === 'undefined') return undefined;

    const html = document.documentElement;
    const isNativeShell = html.classList.contains('capacitor-native');

    // ---- Nativo: el scroller es main.native-scroll, NO body ----
    if (isNativeShell) {
      const scroller = document.querySelector('main.native-scroll');
      if (!scroller) return undefined;
      const scrollTop = scroller.scrollTop;
      const prevOverflow = scroller.style.overflow;
      const prevOverscroll = scroller.style.overscrollBehavior;
      scroller.style.overflow = 'hidden';
      scroller.style.overscrollBehavior = 'none';
      return () => {
        scroller.style.overflow = prevOverflow;
        scroller.style.overscrollBehavior = prevOverscroll;
        scroller.scrollTop = scrollTop;
      };
    }

    // ---- Web: patrón iOS-safe (position:fixed + top negativo) ----
    const scrollY = window.scrollY || window.pageYOffset || 0;
    const body = document.body;
    const prev = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
      overflow: body.style.overflow,
    };
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';
    body.style.overflow = 'hidden';
    return () => {
      body.style.position = prev.position;
      body.style.top = prev.top;
      body.style.left = prev.left;
      body.style.right = prev.right;
      body.style.width = prev.width;
      body.style.overflow = prev.overflow;
      window.scrollTo(0, scrollY);
    };
  }, [active]);
}
