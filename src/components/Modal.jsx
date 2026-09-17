// Modal genérico — método de khdemlidaba, sin Radix.
//
// Sustituye a `dialog`, `alert-dialog`, `sheet`, `drawer` y
// `ResponsiveModal` de shadcn (27 + 9 + 2 + 1 + 1 importadores). Una sola
// pieza:
//
//   - createPortal al <body>: escapa de cualquier overflow/stacking del
//     padre.
//   - useBodyScrollLock: el fondo no se mueve bajo el dedo en iOS.
//   - Escape cierra. Click en el fondo cierra (salvo `dismissible={false}`
//     para confirmaciones destructivas donde un toque fuera no debe
//     perder el formulario).
//   - role="dialog" aria-modal, título enlazado por aria-labelledby, foco
//     inicial al primer elemento enfocable y devolución al abridor.
//   - Móvil: hoja pegada abajo. Escritorio: centrado. (CSS en index.css,
//     .ma-modal-overlay / .ma-modal-card.)
//
// Uso:
//   <Modal open={open} onClose={() => setOpen(false)} title={t('…')}>
//     …contenido…
//     <div className="mt-6 flex gap-3 justify-end">
//       <button className="btn-secondary" onClick={onClose}>{t('common.cancel')}</button>
//       <button className="btn-primary" onClick={onSave}>{t('common.save')}</button>
//     </div>
//   </Modal>
//
// `size`: 'md' (480px, por defecto) · 'lg' (720) · 'xl' (960).

import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import useBodyScrollLock from '../hooks/useBodyScrollLock.js';
import { IconClose } from './Icons.jsx';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function Modal({
  open,
  onClose,
  title,
  description,
  children,
  size = 'md',
  dismissible = true,
  showClose = true,
  className = '',
}) {
  // Sin hooks antes de este return: si `open` cambiara entre renders con
  // hooks por encima, React vería menos hooks que antes y desmontaría el
  // árbol entero. El cuerpo con hooks vive en ModalBody, que sólo existe
  // mientras el modal está abierto.
  if (!open) return null;
  return (
    <ModalBody
      onClose={onClose}
      title={title}
      description={description}
      size={size}
      dismissible={dismissible}
      showClose={showClose}
      className={className}
    >
      {children}
    </ModalBody>
  );
}

function ModalBody({ onClose, title, description, children, size, dismissible, showClose, className }) {
  const { t } = useTranslation();
  const titleId = useId();
  const descId = useId();
  const cardRef = useRef(null);
  const openerRef = useRef(null);

  useBodyScrollLock(true);

  useEffect(() => {
    if (!dismissible) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [dismissible, onClose]);

  // Foco: guardamos quién lo tenía, lo movemos al primer control del
  // modal, y al desmontar lo devolvemos. Sin esto un lector de pantalla
  // se queda "detrás" del modal, y al cerrar el foco cae al <body>.
  useEffect(() => {
    openerRef.current = document.activeElement;
    const first = cardRef.current?.querySelector(FOCUSABLE);
    (first || cardRef.current)?.focus?.();
    return () => { openerRef.current?.focus?.(); };
  }, []);

  const sizeClass = size === 'xl' ? 'ma-modal-card-xl' : size === 'lg' ? 'ma-modal-card-lg' : '';

  return createPortal(
    <div
      className="ma-modal-overlay"
      onMouseDown={(e) => {
        // Sólo el fondo: un mousedown que empieza dentro de la tarjeta y
        // acaba fuera (selección de texto) no debe cerrar.
        if (dismissible && e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={`ma-modal-card ${sizeClass} ${className}`.trim()}
      >
        {(title || showClose) && (
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="min-w-0">
              {title && <h2 id={titleId} className="text-lg font-semibold text-ink leading-snug">{title}</h2>}
              {description && <p id={descId} className="text-sm text-c-muted mt-1">{description}</p>}
            </div>
            {showClose && (
              <button
                type="button"
                onClick={onClose}
                className="btn-icon -mr-2 -mt-2 rounded-lg hover:bg-soft"
                aria-label={t('common.close')}
              >
                <IconClose size={22} />
              </button>
            )}
          </div>
        )}
        {children}
      </div>
    </div>,
    document.body,
  );
}
