import React, { useEffect, useState } from "react";
import { useTranslation, Trans } from "react-i18next";
import { Shield, X, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

const STORAGE_KEY = "verify_prompt_shown";

/**
 * Modal único (per-session) para pros con onboarding completo pero sin identidad verificada.
 * Se muestra solo una vez — usa sessionStorage para no repetir.
 */
export default function VerificationPromptModal({ profile }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!profile) return;
    if (profile.identity_verified === true) return;
    if (!profile.onboarding_completed) return;
    if (sessionStorage.getItem(STORAGE_KEY)) return;

    // Esperar 3s para no interrumpir la carga inicial
    const timer = setTimeout(() => {
      setOpen(true);
      sessionStorage.setItem(STORAGE_KEY, "1");
    }, 3000);

    return () => clearTimeout(timer);
  }, [profile]);

  if (!open) return null;

  const handleVerify = () => {
    setOpen(false);
    navigate("/mi-perfil");
  };

  const benefits = [
    t('verification.modal.benefits.searches'),
    t('verification.modal.benefits.trust'),
    t('verification.modal.benefits.reviews'),
  ];

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-50"
        onClick={() => setOpen(false)}
      />
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 pointer-events-auto relative">
          <button
            onClick={() => setOpen(false)}
            className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="text-center mb-5">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">{t('verification.modal.title')}</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              <Trans i18nKey="verification.modal.body" components={{ strong: <strong /> }} />
            </p>
          </div>

          <div className="space-y-2.5 mb-6">
            {benefits.map((item) => (
              <div key={item} className="flex items-center gap-2.5">
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span className="text-sm text-gray-700">{item}</span>
              </div>
            ))}
          </div>

          <button
            onClick={handleVerify}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            {t('verification.modal.cta')}
          </button>
          <button
            onClick={() => setOpen(false)}
            className="w-full text-center text-sm text-gray-400 mt-3 py-1"
          >
            {t('notifications.not_now')}
          </button>
        </div>
      </div>
    </>
  );
}
