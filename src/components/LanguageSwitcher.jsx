// Selector de idioma + hook de compatibilidad `useLanguage`.
//
// Forma portada de khdemlidaba (src/components/LangSwitcher.jsx): un botón
// compacto con globo + código y un desplegable, en vez de la fila de píldoras
// ES/EN. Dos variantes:
//   - "header" (por defecto) — botón + menú flotante.
//   - "block"                — rejilla de botones para el cajón móvil, donde
//                              un desplegable dentro de otro desplegable es
//                              una trampa táctil.
//
// La lista sale de `SUPPORTED` (src/i18n): un idioma aparece aquí en cuanto su
// JSON está completo y `ready: true`, y el motor se encarga de persistir y de
// <html lang>/<html dir>.
//
// `useLanguage` sigue existiendo porque ~50 ficheros lo importan. Cuando esos
// ficheros se migren a `useTranslation` directamente, este hook desaparece.

import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SUPPORTED, SUPPORTED_CODES, DEFAULT_LANG } from '@/i18n';

function shortLang(language) {
  const short = (language || DEFAULT_LANG).split('-')[0];
  return SUPPORTED_CODES.includes(short) ? short : DEFAULT_LANG;
}

function IconGlobe({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3c2.5 3 2.5 15 0 18M12 3c-2.5 3-2.5 15 0 18" />
    </svg>
  );
}

export default function LanguageSwitcher({ variant = 'header', onChange }) {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const current = shortLang(i18n.language);

  useEffect(() => {
    if (variant !== 'header' || !open) return undefined;
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open, variant]);

  // Con un solo idioma publicado, no hay nada que elegir.
  if (SUPPORTED.length < 2) return null;

  const change = (code) => {
    setOpen(false);
    onChange?.(code);
    i18n.changeLanguage(code);
  };

  if (variant === 'block') {
    return (
      <div className="grid grid-cols-2 gap-2">
        {SUPPORTED.map((l) => (
          <button
            key={l.code}
            type="button"
            onClick={() => change(l.code)}
            className={`rounded-lg border px-3 py-2 text-sm text-start transition-colors ${current === l.code ? 'border-ink bg-surface font-semibold' : 'border-c-border hover:border-ink'}`}
            aria-pressed={current === l.code}
            lang={l.code}
          >
            <span className="uppercase font-semibold me-2">{l.code}</span>
            <span className="text-c-muted">{l.label}</span>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-c-muted hover:text-brand-navy transition-colors"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Idioma"
      >
        <IconGlobe />
        <span>{current.toUpperCase()}</span>
        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M2 3l3 4 3-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
      {open && (
        <div role="menu" className="absolute end-0 top-full mt-2 w-40 rounded-xl border border-c-border bg-surface shadow-card overflow-hidden z-50">
          {SUPPORTED.map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={() => change(l.code)}
              className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm text-start hover:bg-soft ${current === l.code ? 'font-semibold text-ink' : 'text-ink'}`}
              lang={l.code}
            >
              <span className="uppercase font-semibold w-6 text-c-muted">{l.code}</span>
              <span>{l.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Hook de compatibilidad para el código que usa `useLanguage`.
export function useLanguage() {
  const { t, i18n } = useTranslation();
  return {
    t,
    language: shortLang(i18n.language),
    changeLanguage: (code) => i18n.changeLanguage(code),
  };
}

// Provider de compatibilidad: i18next lleva el estado, esto no hace nada.
export function LanguageProvider({ children }) {
  return children;
}
