import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { IconSpinner } from "@/components/Icons";

// /registro es el punto de entrada único para "Hazte autónomo · Gratis" y
// "Soy cliente". Esta página es un puente que reencamina al sitio correcto
// según el estado del usuario y el parámetro ?tipo:
//   ?tipo=autonomo (default)
//     - No logueado          → /login?mode=signup&role=profesional&next=/completar-perfil
//     - Logueado, no es pro  → /completar-perfil
//     - Logueado y ya es pro → /dashboard
//   ?tipo=cliente
//     - No logueado          → /login?mode=signup&role=cliente&next=/buscar
//     - Logueado             → /buscar
// Sin formularios, sin pantallas intermedias innecesarias.
export default function UserTypeSelectionPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const params = new URLSearchParams(location.search);
      const tipoRaw = (params.get('tipo') || '').toLowerCase();
      const isCliente = tipoRaw === 'cliente' || tipoRaw === 'client';

      try {
        const currentUser = await base44.auth.me().catch(() => null);
        if (cancelled) return;

        if (!currentUser) {
          if (isCliente) {
            const next = encodeURIComponent('/buscar');
            navigate(`/login?mode=signup&role=cliente&next=${next}`, { replace: true });
          } else {
            const next = encodeURIComponent('/completar-perfil');
            navigate(`/login?mode=signup&role=profesional&next=${next}`, { replace: true });
          }
          return;
        }

        if (isCliente) {
          navigate('/buscar', { replace: true });
          return;
        }

        if (currentUser.user_type === 'professionnel') {
          try {
            const profiles = await base44.entities.ProfessionalProfile.filter({
              user_id: currentUser.id,
            });
            if (cancelled) return;
            const profile = Array.isArray(profiles) && profiles[0];
            if (profile?.onboarding_completed) {
              navigate('/dashboard', { replace: true });
            } else {
              navigate('/completar-perfil', { replace: true });
            }
          } catch {
            if (!cancelled) navigate('/completar-perfil', { replace: true });
          }
          return;
        }

        navigate('/completar-perfil', { replace: true });
      } catch {
        if (isCliente) {
          const next = encodeURIComponent('/buscar');
          if (!cancelled) navigate(`/login?mode=signup&role=cliente&next=${next}`, { replace: true });
        } else {
          const next = encodeURIComponent('/completar-perfil');
          if (!cancelled) navigate(`/login?mode=signup&role=profesional&next=${next}`, { replace: true });
        }
      }
    })();

    return () => { cancelled = true; };
  }, [navigate, location.search]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas">
      <IconSpinner className="w-6 h-6 animate-spin text-c-muted" aria-label={t('onboarding.userType.loading')} />
    </div>
  );
}
