import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Gift, ArrowRight, Star, Users, CheckCircle } from "lucide-react";

export default function ReferralRedirect() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const profiles = await base44.entities.ProfessionalProfile.filter({ referral_code: code });
        if (profiles.length > 0) {
          const p = profiles[0];
          setProfile(p);
          // Guardar en localStorage con expiración de 30 días
          try {
            localStorage.setItem("referral_code", code);
            localStorage.setItem("referral_referrer_name", p.business_name || "");
            localStorage.setItem("referral_expires", String(Date.now() + 30 * 24 * 60 * 60 * 1000));
          } catch {}
          // Incrementar contador de visitas (fire-and-forget)
          base44.entities.ProfessionalProfile.update(p.id, {
            referral_visits: (p.referral_visits || 0) + 1
          }).catch(() => {});
        } else {
          setInvalid(true);
        }
      } catch {
        setInvalid(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [code]);

  const handleCTA = () => {
    navigate("/precios?from=referral&code=" + code);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (invalid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Gift className="w-8 h-8 text-gray-400" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Código no encontrado</h1>
          <p className="text-gray-500 text-sm mb-6">Este enlace de referido no es válido o ha expirado.</p>
          <button
            onClick={() => navigate("/precios")}
            className="bg-blue-600 text-white font-semibold px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors"
          >
            Ver MisAutónomos
          </button>
        </div>
      </div>
    );
  }

  const referrerName = profile?.business_name || "Un profesional";

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 flex flex-col items-center justify-center px-4 py-12">
      {/* Logo */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2 mb-4">
          <img
            src="/logo-192.png"
            alt="MisAutónomos"
            className="w-7 h-7 rounded-lg"
            width="28" height="28"
          />
          <span className="text-white font-bold text-sm">MisAutónomos</span>
        </div>
      </div>

      {/* Card principal */}
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header con gift */}
        <div className="bg-gradient-to-r from-amber-400 to-orange-400 p-6 text-center">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <Gift className="w-9 h-9 text-white" />
          </div>
          <p className="text-white/90 font-medium text-sm">Invitación personal de</p>
          <h1 className="text-white font-extrabold text-xl mt-1">{referrerName}</h1>
        </div>

        <div className="p-6">
          {/* Mensaje principal */}
          <div className="text-center mb-6">
            <h2 className="text-2xl font-extrabold text-gray-900 mb-2">
              🎁 1 mes gratis para los dos
            </h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              <strong>{referrerName}</strong> te invita a unirte a MisAutónomos.
              Si te registras como autónomo, <strong>los dos os lleváis 1 mes gratis</strong> en el plan.
            </p>
          </div>

          {/* Beneficios */}
          <div className="space-y-3 mb-6">
            {[
              { icon: Users, text: "Consigue clientes en tu zona fácilmente" },
              { icon: Star, text: "Destaca tu perfil frente a la competencia" },
              { icon: CheckCircle, text: "1 mes gratis al activar con este enlace" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-green-600" />
                </div>
                <p className="text-sm text-gray-700 font-medium">{text}</p>
              </div>
            ))}
          </div>

          {/* Código */}
          <div className="bg-amber-50 border-2 border-amber-200 rounded-xl px-4 py-3 text-center mb-6">
            <p className="text-xs text-amber-700 font-medium mb-1">Código de referido aplicado</p>
            <p className="text-2xl font-extrabold text-gray-900 tracking-widest">{code}</p>
          </div>

          {/* CTA */}
          <button
            onClick={handleCTA}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-95 text-white font-bold text-base py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg transition-opacity"
          >
            Empezar gratis
            <ArrowRight className="w-5 h-5" />
          </button>

          <p className="text-center text-xs text-gray-400 mt-3">
            Sin tarjeta de crédito · Cancela cuando quieras
          </p>
        </div>
      </div>

      {/* Footer */}
      <p className="text-white/60 text-xs mt-8 text-center">
        © {new Date().getFullYear()} MisAutónomos · La plataforma de autónomos españoles
      </p>
    </div>
  );
}