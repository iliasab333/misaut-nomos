import { useState, useEffect } from 'react';
import i18n from '@/i18n';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Cookie, Check, AlertCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { getCookieConsent, revokeAnalyticsCookies } from '@/services/cookieConsent';
import { toast } from 'sonner';

const SUPPORT_EMAIL = 'hola@misautonomos.com';

function CookieCategory({ title, description, checked, onChange, disabled }) {
  const { t } = useTranslation();
  return (
    <div className="flex items-start justify-between gap-3 p-4 border border-gray-100 rounded-lg hover:border-gray-200 transition-colors">
      <div className="flex-1">
        <h4 className="font-medium text-gray-900">{title}</h4>
        <p className="text-sm text-gray-600 mt-1">{description}</p>
      </div>
      <div>
        {disabled ? (
          <span className="text-xs bg-gray-100 text-gray-500 px-3 py-1.5 rounded font-medium whitespace-nowrap flex-shrink-0">
            {t('cookies.alwaysActive')}
          </span>
        ) : (
          <button
            onClick={onChange}
            className={`relative inline-flex w-12 h-7 rounded-full transition-colors flex-shrink-0 ${checked ? 'bg-gray-900' : 'bg-gray-200'}`}
            aria-pressed={checked}
            aria-label={checked ? t('cookies.preferences.toggleOn', { title }) : t('cookies.preferences.toggleOff', { title })}
          >
            <span className={`inline-block w-5 h-5 bg-white rounded-full shadow transition-transform mt-1 ml-0.5 ${checked ? 'translate-x-5' : 'translate-x-0'}`}/>
          </button>
        )}
      </div>
    </div>
  );
}

export default function CookiePreferencesPage() {
  const { t } = useTranslation();
  const [prefs, setPrefs] = useState({ essential: true, analytics: false, marketing: false });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const current = getCookieConsent();
    if (current) {
      setPrefs(current);
    }
  }, []);

  const updatePrefs = async (newPrefs) => {
    setLoading(true);
    setPrefs(newPrefs);

    const consentId = localStorage.getItem('consent_id');

    // Guardar en BD
    try {
      await base44.entities.CookieConsent.create({
        consent_id: consentId + '_' + Date.now(),
        accepted_essential: true,
        accepted_analytics: newPrefs.analytics,
        accepted_marketing: newPrefs.marketing,
        legal_version: 'cookies-v1',
        language: i18n.language?.split('-')[0] || 'es',
        user_agent: navigator.userAgent,
        consent_timestamp: new Date().toISOString()
      });
    } catch(e) {
      // Non-blocking
    }

    // Guardar en localStorage
    localStorage.setItem('cookie_consent', JSON.stringify({
      ...newPrefs,
      timestamp: new Date().toISOString(),
      version: 'cookies-v1'
    }));

    // Si desactiva analíticas, borrar cookies _ga*
    if (!newPrefs.analytics && prefs.analytics) {
      revokeAnalyticsCookies();
    }

    setLoading(false);
    toast.success(t('cookies.settingsSaved'));
  };

  const handleAnalyticsChange = () => {
    updatePrefs({ ...prefs, analytics: !prefs.analytics });
  };

  const handleMarketingChange = () => {
    updatePrefs({ ...prefs, marketing: !prefs.marketing });
  };

  const resetToDefault = () => {
    updatePrefs({ essential: true, analytics: false, marketing: false });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-2xl mx-auto p-4 md:p-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
            <Cookie className="w-5 h-5 text-amber-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">
            {t('cookies.preferencesTitle')}
          </h1>
        </div>
        <p className="text-gray-600 mb-8">
          {t('cookies.preferences.intro')}
        </p>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-8 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">{t('cookies.preferences.essentialTitle')}</p>
            <p>{t('cookies.preferences.essentialBody')}</p>
          </div>
        </div>

        {/* Preferences */}
        <div className="space-y-4 mb-8">
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
            onChange={handleAnalyticsChange}
            disabled={false}
          />

          <CookieCategory
            title={t('cookies.marketing')}
            description={t('cookies.marketingDesc')}
            checked={prefs.marketing}
            onChange={handleMarketingChange}
            disabled={false}
          />
        </div>

        {/* Actions */}
        <div className="flex flex-col md:flex-row gap-3 mb-8">
          <button
            onClick={resetToDefault}
            disabled={loading}
            className="text-sm font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 active:bg-gray-100 py-3 px-6 rounded-lg transition-colors disabled:opacity-50"
          >
            {t('cookies.preferences.rejectOptional')}
          </button>
          <button
            onClick={() => updatePrefs({ essential: true, analytics: true, marketing: true })}
            disabled={loading}
            className="text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 active:bg-gray-950 py-3 px-6 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4" />
            {t('cookies.acceptAll')}
          </button>
        </div>

        {/* Additional Info */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="font-semibold text-gray-900 mb-4">{t('cookies.moreInfo')}</h3>
          <ul className="space-y-2 text-sm">
            <li>
              <Link to="/cookies" className="text-blue-600 hover:underline font-medium">
                {t('cookies.preferences.fullPolicyLink')}
              </Link>
              <p className="text-gray-600 text-xs mt-1">{t('cookies.preferences.fullPolicyHint')}</p>
            </li>
            <li className="mt-3">
              <Link to="/privacidad" className="text-blue-600 hover:underline font-medium">
                {t('cookies.preferences.privacyLink')}
              </Link>
              <p className="text-gray-600 text-xs mt-1">{t('cookies.preferences.privacyHint')}</p>
            </li>
            <li className="mt-3">
              <a href={`mailto:${SUPPORT_EMAIL}`} className="text-blue-600 hover:underline font-medium">
                {t('cookies.preferences.contactLink', { email: SUPPORT_EMAIL })}
              </a>
              <p className="text-gray-600 text-xs mt-1">{t('cookies.preferences.contactHint')}</p>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
