import { useState, useEffect } from 'react';
import i18n from '@/i18n';
import { Link } from 'react-router-dom';
import { Cookie, X, Check } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useLanguage } from '@/components/LanguageSwitcher';

function CookieCategory({ title, description, checked, onChange, disabled }) {
  return (
    <div className="flex items-start justify-between gap-3 p-3 border border-gray-100 rounded-lg">
      <div className="flex-1">
        <h4 className="font-medium text-gray-900 text-sm">{title}</h4>
        <p className="text-xs text-gray-600 mt-0.5">{description}</p>
      </div>
      <div>
        {disabled ? (
          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded whitespace-nowrap flex-shrink-0">Siempre activo</span>
        ) : (
          <button 
            onClick={onChange}
            className={`relative inline-flex w-10 h-6 rounded-full transition-colors flex-shrink-0 ${checked ? 'bg-gray-900' : 'bg-gray-200'}`}
            aria-pressed={checked}
            aria-label={`${title}: ${checked ? 'activado' : 'desactivado'}`}
          >
            <span className={`inline-block w-4 h-4 bg-white rounded-full shadow transition-transform mt-1 ml-0.5 ${checked ? 'translate-x-4' : 'translate-x-0'}`}/>
          </button>
        )}
      </div>
    </div>
  );
}

export default function CookieBanner() {
  const { t } = useLanguage();
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
      await base44.entities.CookieConsent.create(consent);
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

  return (
    <div 
      className="fixed inset-x-0 bottom-0 z-[100] p-3 md:p-4 pointer-events-none"
      role="region"
      aria-label="Consentimiento de cookies"
      aria-live="polite"
    >
      <div 
        className="max-w-3xl mx-auto bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 md:p-5 pointer-events-auto"
        style={{paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0))'}}
      >
        
        {!showDetail ? (
          // Vista inicial
          <>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-amber-50 rounded-full flex items-center justify-center flex-shrink-0">
                <Cookie className="w-5 h-5 text-amber-600" aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 text-sm md:text-base">
                  {t('cookies.bannerTitle') || 'Usamos cookies'}
                </h3>
                <p className="text-xs md:text-sm text-gray-600 mt-1 leading-relaxed">
                  {t('cookies.bannerText') || 'Utilizamos cookies propias y de terceros para mejorar tu experiencia, analizar el uso de la plataforma y personalizar contenido. Puedes aceptar todas, rechazar las opcionales o configurar tus preferencias.'}{' '}
                  <Link to="/cookies" className="text-blue-600 hover:underline font-medium" aria-label="Consulta nuestra política de cookies">
                   {t('cookies.moreInfo') || 'Consulta nuestra política de cookies'}
                  </Link>
                </p>
              </div>
              <button
                onClick={() => setVisible(false)}
                className="text-gray-400 hover:text-gray-600 flex-shrink-0 mt-0.5"
                aria-label="Cerrar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-4">
              <button 
                onClick={rejectAll}
                className="text-sm font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 active:bg-gray-100 py-2.5 px-4 rounded-lg transition-colors"
              >
                {t('cookies.rejectAll') || 'Rechazar opcionales'}
              </button>
              <button 
                onClick={() => setShowDetail(true)}
                className="text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 py-2.5 px-4 rounded-lg transition-colors"
              >
                {t('cookies.customize') || 'Personalizar'}
              </button>
              <button 
                onClick={acceptAll}
                className="text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 active:bg-gray-950 py-2.5 px-4 rounded-lg transition-colors"
              >
                {t('cookies.acceptAll') || 'Aceptar todas'}
              </button>
            </div>
          </>
        ) : (
          // Vista detallada
          <>
            <div className="flex items-start justify-between mb-4">
              <h3 className="font-semibold text-gray-900 text-base">
                {t('cookies.preferencesTitle') || 'Preferencias de cookies'}
              </h3>
              <button 
                onClick={() => setShowDetail(false)} 
                className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                aria-label="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-3 mb-4">
              <CookieCategory 
                title={t('cookies.essential') || 'Esenciales'}
                description={t('cookies.essentialDesc') || 'Necesarias para el funcionamiento básico (sesión, idioma, seguridad). No se pueden desactivar.'}
                checked={true}
                disabled={true}
              />
              
              <CookieCategory 
                title={t('cookies.analytics') || 'Analíticas'}
                description={t('cookies.analyticsDesc') || 'Nos ayudan a entender cómo usas la plataforma para mejorarla (Google Analytics, estadísticas anónimas).'}
                checked={prefs.analytics}
                onChange={() => setPrefs({...prefs, analytics: !prefs.analytics})}
              />
              
              <CookieCategory 
                title={t('cookies.marketing') || 'Marketing'}
                description={t('cookies.marketingDesc') || 'Permiten mostrarte anuncios relevantes en otras webs según tus intereses.'}
                checked={prefs.marketing}
                onChange={() => setPrefs({...prefs, marketing: !prefs.marketing})}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <button 
                onClick={rejectAll}
                className="text-sm font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 active:bg-gray-100 py-2.5 px-4 rounded-lg transition-colors"
              >
                {t('cookies.rejectAll') || 'Rechazar opcionales'}
              </button>
              <button 
                onClick={savePreferences}
                className="text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 active:bg-gray-950 py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                {t('cookies.savePreferences') || 'Guardar preferencias'}
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
