// Cabecera única — portada de khdemlidaba (src/components/Header.jsx).
//
// Qué había antes
// ───────────────
// Tres barras distintas según quién mirara: una cabecera de escritorio que
// SÓLO existía sin sesión (`{!user && <header …>}`), una barra fija de 56 px
// en móvil con hamburguesa/atrás, y una barra inferior de pestañas. Al
// iniciar sesión, la cabecera de escritorio desaparecía y en su lugar salía
// un sidebar de 260 px: la misma web cambiaba de forma según el estado de la
// sesión, y ninguna de las tres versiones se parecía a khdemlidaba.
//
// Ahora: UNA cabecera, 64 px (h-16), igual para todos. Los enlaces de la
// cuenta viven en el desplegable del avatar; en móvil, en el cajón. Es la
// forma de khdemlidaba, con los nombres y los colores de misautonomos.
//
// El usuario NO se lee aquí: llega por props desde Layout, que ya lo tiene
// cargado y cacheado. Una segunda fuente de verdad sobre la sesión es cómo
// se consiguen dos cabeceras que no coinciden.

import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import InitialsAvatar from '@/components/InitialsAvatar';
import { IconMenu, IconClose } from '@/components/Icons';
import useBodyScrollLock from '@/hooks/useBodyScrollLock';

const LOGO_32 = '/logo-192.png';
const BRAND = 'MisAutónomos';

const navLinkClass = ({ isActive }) =>
  `font-medium transition-colors ${isActive ? 'text-brand-navy' : 'text-c-muted hover:text-brand-navy'}`;

export default function Header({
  user,
  isAdmin = false,
  isProfessional = false,
  navigationItems = [],
  displayName = '',
  avatarUrl = null,
  notificationsSlot = null,
  onLogout,
}) {
  const { t } = useTranslation();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // "Hazte autónomo" se enseña a todo el que no sea ya profesional: al
  // visitante anónimo (va al registro) y al cliente con cuenta. El que ya es
  // autónomo no lo ve — para él ese sitio lo ocupa su panel.
  const canBecomePro = !user || (!isProfessional && !isAdmin);

  useBodyScrollLock(open);

  // Dos salidas del cajón, no una. useBodyScrollLock pone el <body> en
  // position:fixed, así que una cabecera `sticky` se descuelga hasta su
  // sitio natural en el documento — scrollY píxeles POR ENCIMA de la
  // pantalla. Abierto tras 900 px de scroll, el botón de cerrar quedaba
  // fuera. Por eso `fixed` mientras está abierto, y Escape además.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  // El botón "atrás" del móvil no pasa por ningún onClick de los enlaces:
  // sin esto, se volvía a la página anterior con el cajón aún desplegado.
  useEffect(() => { setOpen(false); setMenuOpen(false); }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onDown = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [menuOpen]);

  const doSignOut = () => {
    setMenuOpen(false);
    setOpen(false);
    onLogout?.();
  };

  return (
    // z-50 al abrir: el cajón a pantalla completa tiene que pasar por encima
    // de las barras pegajosas de las fichas (Llamar / WhatsApp), que viven
    // más abajo en el DOM y ganaban a igualdad de z-index.
    <header className={`${open ? 'fixed inset-x-0 z-50' : 'sticky z-40'} top-0 bg-surface border-b border-c-border`}>
      <div className="container-page flex items-center justify-between h-16">
        {/* Ya en la portada, el logo hace scroll arriba en vez de no hacer
            nada — era el comportamiento de la cabecera anterior. */}
        <Link
          to="/"
          aria-label={t('nav.home')}
          className="flex items-center gap-2"
          onClick={(e) => {
            if (location.pathname === '/') {
              e.preventDefault();
              window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
            }
          }}
        >
          <img
            src={LOGO_32}
            alt={t('layout.header.logoAlt')}
            className="w-8 h-8 rounded"
            width="32"
            height="32"
            loading="eager"
            decoding="async"
          />
          <span className="font-bold text-lg text-brand-navy notranslate" translate="no">{BRAND}</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm">
          <NavLink to="/buscar" className={navLinkClass}>{t('nav.search')}</NavLink>
          <NavLink to="/blog" className={navLinkClass}>{t('nav.blog')}</NavLink>
          {canBecomePro && (
            <NavLink to="/para-autonomos" className={navLinkClass}>{t('nav.forPros')}</NavLink>
          )}
          <LanguageSwitcher />
          {user && notificationsSlot}
          {user ? (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-2 focus:outline-none"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
              >
                <InitialsAvatar name={displayName} src={avatarUrl} size={36} />
                <span className="font-medium text-ink max-w-[140px] truncate">{displayName}</span>
              </button>
              {menuOpen && (
                <div role="menu" className="absolute end-0 top-full mt-2 w-56 rounded-xl border border-c-border bg-surface shadow-card overflow-hidden">
                  {navigationItems.map((item) => (
                    <Link
                      key={item.url}
                      to={item.url}
                      onClick={() => setMenuOpen(false)}
                      onMouseEnter={item.prefetch}
                      className="block px-4 py-3 text-sm text-ink hover:bg-soft"
                    >
                      {item.title}
                    </Link>
                  ))}
                  <button
                    type="button"
                    onClick={doSignOut}
                    className="block w-full text-start px-4 py-3 text-sm text-ink border-t border-c-border hover:bg-soft"
                  >
                    {t('nav.logout')}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link to="/login" className="text-sm font-medium text-c-muted hover:text-brand-navy transition-colors">
                {t('nav.login')}
              </Link>
              <Link to="/registro?tipo=autonomo" className="btn btn-sm bg-brand-gold text-brand-navy font-semibold hover:bg-brand-gold-deep">
                {t('nav.becomeProFree')}
              </Link>
            </>
          )}
        </nav>

        <div className="md:hidden flex items-center gap-1 -me-2">
          {user && notificationsSlot}
          <button
          type="button"
          className="inline-flex items-center justify-center w-11 h-11 text-ink"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? t('layout.mobileMenu.close') : t('layout.mobileMenu.open')}
          aria-expanded={open}
        >
            {open ? <IconClose className="w-6 h-6" /> : <IconMenu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden fixed inset-x-0 top-16 bottom-0 bg-surface border-t border-c-border overflow-y-auto">
          <div className="container-page py-6 flex flex-col gap-3">
            {user && (
              <div className="flex items-center gap-3 mb-2 pb-4 border-b border-c-border">
                <InitialsAvatar name={displayName} src={avatarUrl} size={44} />
                <div className="min-w-0">
                  <div className="font-semibold text-ink truncate">{displayName}</div>
                  <div className="text-xs text-c-muted truncate">{user.email}</div>
                </div>
              </div>
            )}
            <Link to="/buscar" onClick={() => setOpen(false)} className="btn-secondary btn-lg w-full">
              {t('nav.search')}
            </Link>
            <Link to="/blog" onClick={() => setOpen(false)} className="btn-secondary btn-lg w-full">
              {t('nav.blog')}
            </Link>
            {canBecomePro && (
              <Link to="/para-autonomos" onClick={() => setOpen(false)} className="btn-secondary btn-lg w-full">
                {t('nav.forPros')}
              </Link>
            )}

            <div className="h-px bg-c-border my-2" />
            <div className="mb-1">
              <p className="text-xs text-c-muted uppercase tracking-widest mb-2">{t('nav.language')}</p>
              <LanguageSwitcher variant="block" onChange={() => setOpen(false)} />
            </div>
            <div className="h-px bg-c-border my-2" />

            {user ? (
              <>
                {navigationItems.map((item) => (
                  <Link
                    key={item.url}
                    to={item.url}
                    onClick={() => setOpen(false)}
                    className="btn-secondary btn-lg w-full"
                  >
                    {item.title}
                  </Link>
                ))}
                <button type="button" onClick={doSignOut} className="btn-secondary btn-lg w-full">
                  {t('nav.logout')}
                </button>
              </>
            ) : (
              <>
                <Link to="/login" onClick={() => setOpen(false)} className="btn-secondary btn-lg w-full">
                  {t('nav.login')}
                </Link>
                <Link
                  to="/registro?tipo=autonomo"
                  onClick={() => setOpen(false)}
                  className="btn btn-lg w-full bg-brand-gold text-brand-navy font-semibold hover:bg-brand-gold-deep"
                >
                  {t('nav.becomeProFree')}
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
