// Compat shim — misma API que en khdemlidaba (`useT` / `useLocale` /
// `LocaleProvider`), delegando en react-i18next. Los componentes que se vayan
// migrando pueden usar `useTranslation` directamente; este shim existe para
// que el port página a página no tenga que tocar dos cosas a la vez.

import { useTranslation } from 'react-i18next';
import i18n, { SUPPORTED, SUPPORTED_CODES, DEFAULT_LANG } from './index.js';

export function LocaleProvider({ children }) {
  // No-op: i18next se inicializa por su side effect al importar './index.js'.
  return children;
}

export function useT() {
  const { t } = useTranslation();
  return t;
}

export function useLocale() {
  const { i18n: instance } = useTranslation();
  const short = (instance.language || DEFAULT_LANG).split('-')[0];
  const locale = SUPPORTED_CODES.includes(short) ? short : DEFAULT_LANG;
  return {
    locale,
    setLocale: (code) => instance.changeLanguage(code),
    supported: SUPPORTED,
  };
}

export { SUPPORTED, SUPPORTED_CODES, i18n };
