import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Loader2 } from "lucide-react";

// /registro es el punto de entrada único para "Hazte autónomo · Gratis".
// Esta página solo es un puente que reencamina al sitio correcto según el
// estado del usuario:
//   - No logueado          → /login?mode=signup&role=profesional&next=/completar-perfil
//   - Logueado, no es pro  → /completar-perfil
//   - Logueado y ya es pro → /dashboard
// Sin formularios, sin pantallas intermedias innecesarias.
export default function UserTypeSelectionPage() {
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const currentUser = await base44.auth.me().catch(() => null);

        if (cancelled) return;

        if (!currentUser) {
          const next = encodeURIComponent('/completar-perfil');
          navigate(`/login?mode=signup&role=profesional&next=${next}`, { replace: true });
          return;
        }

        if (currentUser.user_type === 'professionnel') {
          // Si ya es pro, ¿tiene onboarding completo?
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

        // Logueado pero no es pro: empezar onboarding profesional.
        navigate('/completar-perfil', { replace: true });
      } catch {
        const next = encodeURIComponent('/completar-perfil');
        if (!cancelled) navigate(`/login?mode=signup&role=profesional&next=${next}`, { replace: true });
      }
    })();

    return () => { cancelled = true; };
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <Loader2 className="w-6 h-6 animate-spin text-slate-400" aria-label="Cargando" />
    </div>
  );
}
