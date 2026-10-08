import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import { Link } from 'react-router-dom';
import { IconCookie, IconClose, IconCheck } from '@/components/Icons';
import { base44 } from '@/api/base44Client';

function CookieCategory({ title, description, checked, onChange, disabled }) {
  const { t } = useTranslation();
  return (
    <div className="flex items-start justify-between gap-3 p-3 border border-c-border rounded-lg">
      <div className="flex-1">
        <h4 className="font-medium text-ink text-sm">{title}</h4>
        <p className="text-xs text-c-muted mt-0.5">{description}</p>
      </div>
      <div>
        {disabled ? (
          <span className="text-xs bg-soft text-c-muted px-2 py-1 rounded whitespace-nowrap flex-shrink-0">{t('cookies.alwaysActive')}</span>
        ) : (
          <button
            onClick={onChange}
            className={`relative inline-flex w-10 h-6 rounded-full transition-colors flex-shrink-0 ${checked ? 'bg-ink' : 'bg-c-border'}`}
            aria-pressed={checked}
            aria-label={checked ? t('cookies.preferences.toggleOn', { title }) : t('cookies.preferences.toggleOff', { title })}
          >
            <span className={`inline-block w-4 h-4 bg-surface rounded-full shadow transition-transform mt-1 ml-0.5 ${checked ? 'translate-x-4' : 'translate-x-0'}`}/>
          </button>
        )}
      </div>
    </div>
  );
}

export default function CookieBanner() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [prefs, setPrefs] = useState({
    essential: true,
    analytics: false,
    marketing: false
  });

  useEffect(() => {
    const stored = localStorage.getItem('cookie_consent');
    if (!stored) {
      // Mostrar banner solo después de que el LCP haya pintado — no bloquear render crítico
      const show = () => setVisible(true);
      if (typeof requestIdleCallback !== 'undefined') {
        requestIdleCallback(show, { timeout: 3000 });
      } else {
        setTimeout(show, 1500);
      }
    }
  }, []);

  const generateConsentId = () => {
    return 'cc_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
  };

  const saveConsent = async (acceptedAnalytics, acceptedMarketing) => {
    const consentId = localStorage.getItem('consent_id') || generateConsentId();

    const consent = {
      consent_id: consentId,
      accepted_essential: true,
      accepted_analytics: acceptedAnalytics,
      accepted_marketing: acceptedMarketing,
      legal_version: 'cookies-v1',
      language: i18n.language?.split('-')[0] || 'es',
      user_agent: navigator.userAgent,
      consent_timestamp: new Date().toISOString()
    };

    try {
      // `devolverFila: false`: sin esto el insert entra pero la lectura de
      // vuelta devuelve 401 —un visitante anónimo no puede, ni debe, leer
      // los consentimientos de nadie— y el catch de abajo se lo tragaba.
      // Resultado: 1 consentimiento guardado en toda la historia del sitio,
      // que es justo el registro que hay que poder enseñar si lo piden.
      await base44.entities.CookieConsent.create(consent, { devolverFila: false });
    } catch(e) {
      // Non-blocking — continuar incluso si falla la BD
    }

    localStorage.setItem('cookie_consent', JSON.stringify({
      essential: true,
      analytics: acceptedAnalytics,
      marketing: acceptedMarketing,
      timestamp: new Date().toISOString(),
      version: 'cookies-v1'
    }));
    localStorage.setItem('consent_id', consentId);
    // Aviso en caliente: el gate de analítica monta o desmonta los scripts de
    // Vercel sin recargar la página.
    window.dispatchEvent(new Event('consent:changed'));

    // Activar/desactivar scripts según preferencia
    if (acceptedAnalytics) enableAnalytics();
    if (acceptedMarketing) enableMarketing();

    // Recargar Google Analytics si está activo
    if (acceptedAnalytics && window.gtag) {
      window.gtag('consent', 'update', {
        analytics_storage: 'granted'
      });
    }

    setVisible(false);
  };

  const acceptAll = () => saveConsent(true, true);
  const rejectAll = () => saveConsent(false, false);
  const savePreferences = () => saveConsent(prefs.analytics, prefs.marketing);

  if (!visible) return null;

  // `bottom` sale de una variable y no es `bottom-0` fijo: si la página tiene
  // una barra de acciones pegada abajo —la ficha de autónomo la tiene en
  // móvil, con «WhatsApp» y «Llamar»— este aviso se colocaba ENCIMA y la
  // tapaba entera, porque va con z-100 y la barra con z-30.
  //
  // Medido en producción el 2026-10-08, pantalla de 812 px: el banner ocupaba
  // de 449 a 812 (el 45% del alto) y la barra de 739 a 812. Resultado: en la
  // primera visita —la que llega de Google— no había forma de contactar con el
  // autónomo sin quitar antes el aviso. En toda la historia del sitio hay 776
  // visitas de ficha, 30 contactos y UN consentimiento guardado.
  //
  // La variable la publica la propia barra al medirse. Donde no hay barra vale
  // 0 y el aviso se queda exactamente donde estaba.
  return (
    <div
      className="fixed inset-x-0 z-[100] p-3 md:p-4 pointer-events-none"
      style={{ bottom: 'var(--barra-accion-alto, 0px)' }}
      role="region"
      aria-label={t('cookies.regionLabel')}
      aria-live="polite"
    >
      <div
        className="max-w-3xl mx-auto bg-surface rounded-2xl shadow-2xl border border-c-border p-4 md:p-5 pointer-events-auto"
        style={{paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0))'}}
      >

        {!showDetail ? (
          // Vista inicial
          <>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-warning/10 rounded-full flex items-center justify-center flex-shrink-0">
                <IconCookie className="w-5 h-5 text-warning" aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-ink text-sm md:text-base">
                  {t('cookies.bannerTitle')}
                </h3>
                <p className="text-xs md:text-sm text-c-muted mt-1 leading-relaxed">
                  {t('cookies.bannerText')}{' '}
                  <Link to="/cookies" className="text-c-accent hover:underline font-medium">
                   {t('cookies.moreInfo')}
                  </Link>
                </p>
              </div>
              <button
                onClick={() => setVisible(false)}
                className="text-c-muted hover:text-ink flex-shrink-0 mt-0.5"
                aria-label={t('common.close')}
              >
                <IconClose className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-4">
              <button
                onClick={rejectAll}
                className="btn-secondary btn-sm w-full"
              >
                {t('cookies.rejectAll')}
              </button>
              <button
                onClick={() => setShowDetail(true)}
                className="btn btn-sm w-full bg-soft text-ink hover:bg-c-border"
              >
                {t('cookies.customize')}
              </button>
              <button
                onClick={acceptAll}
                className="btn-dark btn-sm w-full"
              >
                {t('cookies.acceptAll')}
              </button>
            </div>
          </>
        ) : (
          // Vista detallada
          <>
            <div className="flex items-start justify-between mb-4">
              <h3 className="font-semibold text-ink text-base">
                {t('cookies.preferencesTitle')}
              </h3>
              <button
                onClick={() => setShowDetail(false)}
                className="text-c-muted hover:text-ink flex-shrink-0"
                aria-label={t('common.close')}
              >
                <IconClose className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 mb-4">
              <CookieCategory
                title={t('cookies.essential')}
                description={t('cookies.essentialDesc')}
                checked={true}
                disabled={true}
              />

              <CookieCategory
                title={t('cookies.analytics')}
                description={t('cookies.analyticsDesc')}
                checked={prefs.analytics}
                onChange={() => setPrefs({...prefs, analytics: !prefs.analytics})}
              />

              <CookieCategory
                title={t('cookies.marketing')}
                description={t('cookies.marketingDesc')}
                checked={prefs.marketing}
                onChange={() => setPrefs({...prefs, marketing: !prefs.marketing})}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <button
                onClick={rejectAll}
                className="btn-secondary btn-sm w-full"
              >
                {t('cookies.rejectAll')}
              </button>
              <button
                onClick={savePreferences}
                className="btn-dark btn-sm w-full"
              >
                <IconCheck className="w-4 h-4" />
                {t('cookies.savePreferences')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function enableAnalytics() {
  if (typeof window === 'undefined' || window.gtag) return;

  // Si ya existe, no cargar de nuevo
  const existingScript = document.querySelector('script[src*="googletagmanager.com"]');
  if (existingScript) return;
}

function enableMarketing() {
  if (typeof window === 'undefined') return;
  // Meta Pixel u otros scripts de marketing
}
