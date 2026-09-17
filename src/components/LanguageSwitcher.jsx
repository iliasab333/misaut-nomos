// Selector de idioma + hook de compatibilidad `useLanguage`.
//
// Antes: dos botones ES/EN a mano, y cada cambio escribía localStorage
// 'language' y document.lang por su cuenta — tres sitios que había que
// mantener sincronizados. Ahora la lista sale de `SUPPORTED` (src/i18n): un
// idioma aparece aquí en cuanto su JSON está completo y `ready: true`, y el
// motor se encarga de persistir y de <html lang>/<html dir>.
//
// `useLanguage` sigue existiendo porque ~50 ficheros lo importan. Cuando esos
// ficheros se migren a `useTranslation` directamente, este hook desaparece.

import { useTranslation } from 'react-i18next';
import { SUPPORTED, SUPPORTED_CODES, DEFAULT_LANG } from '@/i18n';

function shortLang(language) {
  const short = (language || DEFAULT_LANG).split('-')[0];
  return SUPPORTED_CODES.includes(short) ? short : DEFAULT_LANG;
}

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const current = shortLang(i18n.language);

  // Con un solo idioma publicado, no hay nada que elegir.
  if (SUPPORTED.length < 2) return null;

  return (
    <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5" role="group" aria-label="Idioma">
      {SUPPORTED.map(({ code, label }) => (
        <button
          key={code}
          type="button"
          onClick={() => i18n.changeLanguage(code)}
          className={`px-2 py-1 text-xs font-medium rounded transition-all ${
            current === code ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-200'
          }`}
          aria-label={label}
          aria-pressed={current === code}
          lang={code}
        >
          {code.toUpperCase()}
        </button>
      ))}
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
