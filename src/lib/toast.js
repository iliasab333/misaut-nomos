// Toast mínimo, imperativo — método de khdemlidaba. Sin sonner, sin Radix,
// sin portal de React: creamos un nodo, lo animamos con una clase CSS
// (ver .ma-toast en index.css) y lo quitamos tras `duration`. Pensado para
// usarse desde eventos (click, submit, respuesta de red), no en render.
//
// Superficie de llamada IDÉNTICA a la que ya usan los 391 toasts de la app
// (venían de sonner), para que migrar sea cambiar el import y nada más:
//
//   import { toast } from '@/lib/toast';
//   toast.success('Guardado');
//   toast.error('No se pudo guardar');
//   toast.info('Sesión a punto de caducar');
//   toast('Texto neutro');
//
// Sólo se acepta un string. sonner admitía `{ description, action, … }` y
// aquí no lo usaba nadie salvo UNA llamada legacy con `toast({ title })` en
// components/notifications/NotificationPermissionBanner.jsx; ésa se adapta
// a mano en el swap.

const DEFAULT_DURATION = 3800;
const EXIT_MS = 250;

function show(message, { duration = DEFAULT_DURATION, variant } = {}) {
  if (typeof document === 'undefined') return;
  const text = typeof message === 'string' ? message : String(message ?? '');
  if (!text) return;

  const el = document.createElement('div');
  el.className = variant ? `ma-toast ma-toast-${variant}` : 'ma-toast';
  el.textContent = text;
  // Los errores van en assertive para que el lector de pantalla los
  // anuncie ya; el resto en polite.
  el.setAttribute('role', variant === 'error' ? 'alert' : 'status');
  el.setAttribute('aria-live', variant === 'error' ? 'assertive' : 'polite');
  document.body.appendChild(el);

  // Entrada y salida animadas con requestAnimationFrame para que la
  // transición CSS aplique (el nodo tiene que pintarse una vez sin la
  // clase -show).
  requestAnimationFrame(() => el.classList.add('ma-toast-show'));
  setTimeout(() => {
    el.classList.remove('ma-toast-show');
    setTimeout(() => { el.remove(); }, EXIT_MS);
  }, duration);
}

export function toast(message, opts) {
  return show(message, opts);
}
toast.success = (message, opts) => show(message, { ...opts, variant: 'success' });
toast.error = (message, opts) => show(message, { ...opts, variant: 'error' });
toast.info = (message, opts) => show(message, { ...opts, variant: 'info' });

export default toast;
