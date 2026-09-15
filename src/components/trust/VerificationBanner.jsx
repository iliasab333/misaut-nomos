import React, { useState } from "react";
import { useTranslation, Trans } from "react-i18next";
import { Shield, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

/**
 * Banner persistente para pros sin identidad verificada.
 * Se muestra en ProfessionalDashboard y MyProfile.
 * Se puede cerrar (solo en sesión), no se vuelve a mostrar hasta F5.
 */
export default function VerificationBanner({ profile }) {
  const { t } = useTranslation();
  const [dismissed, setDismissed] = useState(false);
  const navigate = useNavigate();

  if (!profile || profile.identity_verified === true || dismissed) return null;

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
      <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
        <Shield className="w-5 h-5 text-blue-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 text-sm">{t('verification.banner.title')}</p>
        <p className="text-xs text-gray-600 mt-0.5">
          <Trans i18nKey="verification.banner.body">
            Los perfiles verificados reciben hasta <strong>3× más contactos</strong>. Solo tarda 2 minutos.
          </Trans>
        </p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={() => navigate("/mi-perfil")}
          className="text-xs font-semibold text-blue-700 bg-blue-100 hover:bg-blue-200 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
        >
          {t('verification.banner.cta')}
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          aria-label={t('verification.banner.close')}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
