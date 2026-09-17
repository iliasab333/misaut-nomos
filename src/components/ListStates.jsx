// Los tres estados que una lista puede tener aparte de «aquí están los
// datos»: carga, ha fallado, está vacía. Método de khdemlidaba.
//
// Estaban escritos a mano en cada pantalla, y cada pantalla tenía su
// versión: «Cargando…» en gris sobre blanco aquí, un spinner allí; un error
// con botón de reintentar en una página, un callejón sin salida en las
// demás. Regla de la casa, aplicada por estos componentes:
//
//   - CARGA: un esqueleto con la forma de lo que llega, nunca un spinner
//     sobre el vacío. El spinner dice «espera»; el esqueleto dice «esto es
//     lo que viene», y ocupa el sitio, así nada salta.
//   - ERROR: siempre una salida. Un error sin botón es un callejón, y en
//     móvil un callejón se cierra matando la app. `onRetry` repite el
//     fetch SIN recargar la página (recargar en nativo es volver a pasar
//     por el splash y la restauración de sesión: tres segundos para
//     reintentar una petición de cien milisegundos).
//   - VACÍO: una frase que explica y una acción. «No tienes favoritos»
//     solo es un reproche; «No tienes favoritos — explora profesionales»
//     es una invitación.

import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { IconArrowRight } from './Icons.jsx';

export function ErrorState({ message, onRetry, className = '' }) {
  const { t } = useTranslation();
  return (
    <div className={`card p-8 sm:p-10 text-center ${className}`.trim()} role="alert">
      <p className="text-lg font-semibold text-ink">{t('common.errorGenericTitle')}</p>
      <p className="text-sm text-c-muted mt-2">{message || t('common.errorGenericBody')}</p>
      {onRetry && (
        <button type="button" className="btn-secondary btn-sm mt-6" onClick={onRetry}>
          {t('common.retry')}
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, body, ctaLabel, ctaTo, onCta, icon = null, className = '' }) {
  return (
    <div className={`card p-8 sm:p-10 text-center ${className}`.trim()}>
      {icon && <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-soft text-c-muted flex items-center justify-center">{icon}</div>}
      <p className="text-lg font-semibold text-ink">{title}</p>
      {body && <p className="text-sm text-c-muted mt-2">{body}</p>}
      {ctaLabel && ctaTo && (
        <Link to={ctaTo} className="btn-primary btn-sm mt-6 inline-flex">
          {ctaLabel}<IconArrowRight size={14} />
        </Link>
      )}
      {ctaLabel && !ctaTo && onCta && (
        <button type="button" className="btn-primary btn-sm mt-6 inline-flex" onClick={onCta}>
          {ctaLabel}<IconArrowRight size={14} />
        </button>
      )}
    </div>
  );
}

// Esqueletos genéricos. Cada pantalla con una carta propia debe tener el
// SUYO, calcado en tamaño (un esqueleto que miente sobre el tamaño es peor
// que nada: el contenido salta al llegar). Éstos valen para listas de
// filas simples y bloques de texto.
export function SkeletonLine({ width = '100%', height = 14, className = '' }) {
  return <div className={`skeleton ${className}`.trim()} style={{ width, height, borderRadius: 6 }} aria-hidden="true" />;
}

export function SkeletonRow({ avatar = true }) {
  return (
    <div className="card p-4 flex items-center gap-3" aria-hidden="true">
      {avatar && <div className="skeleton shrink-0" style={{ width: 44, height: 44, borderRadius: '50%' }} />}
      <div className="flex-1 min-w-0 space-y-2">
        <SkeletonLine width="55%" />
        <SkeletonLine width="80%" height={12} />
      </div>
    </div>
  );
}

export function SkeletonList({ count = 4, avatar = true }) {
  return (
    <div className="grid grid-cols-1 gap-3">
      {Array.from({ length: count }, (_, i) => <SkeletonRow key={i} avatar={avatar} />)}
    </div>
  );
}

export function SkeletonBlock({ lines = 3 }) {
  return (
    <div className="space-y-2" aria-hidden="true">
      {Array.from({ length: lines }, (_, i) => (
        <SkeletonLine key={i} width={i === lines - 1 ? '60%' : '100%'} />
      ))}
    </div>
  );
}
