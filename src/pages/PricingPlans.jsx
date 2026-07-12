import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  CheckCircle, Shield, Rocket, MessageSquare, Star,
  MapPin, FileText, BarChart2, Zap
} from "lucide-react";
import SEOHead from "../components/seo/SEOHead";

const INCLUDES = [
  "Perfil visible en búsquedas de toda España",
  "Foto, descripción y servicios completos",
  "Contacto directo: WhatsApp, llamada y chat interno",
  "Mensajes ilimitados con clientes",
  "Estadísticas de visitas a tu perfil",
  "Zona de cobertura geográfica personalizada",
  "Valoraciones y reseñas verificadas",
  "Acceso permanente · Sin tarjeta · Sin compromisos",
];

const WHY = [
  { icon: Shield, label: "Sin comisiones", desc: "Lo que ganes es 100% tuyo. Nunca cobramos por cada trabajo." },
  { icon: Zap, label: "Perfil en 10 minutos", desc: "Regístrate, completa tu perfil y empieza a recibir contactos hoy mismo." },
  { icon: Star, label: "Reseñas verificadas", desc: "Solo clientes reales que han contactado al profesional pueden opinar." },
  { icon: Rocket, label: "Publicidad incluida", desc: "Invertimos en publicidad en redes y Google para llevar clientes a la plataforma." },
];

export default function PricingPlansPage() {
  const navigate = useNavigate();

  const handleSignup = () => {
    // /registro?tipo=autonomo re-encamina automáticamente:
    //   - usuario nuevo → /login?mode=signup&role=profesional&next=/completar-perfil
    //   - cliente logueado que se pasa a pro → /completar-perfil
    //   - profesional con ficha → /dashboard
    navigate('/registro?tipo=autonomo');
  };

  return (
    <>
      <SEOHead
        title="Registro gratuito para autónomos - MisAutónomos"
        description="Regístrate gratis y empieza a recibir clientes. Sin tarjeta, sin permanencia, sin sorpresas. 100% gratuito para siempre."
        keywords="registro gratis autónomos, directorio profesionales gratis, autónomos España"
      />

      <div className="min-h-screen bg-gray-50 pb-24 md:pb-0">

        {/* BANNER */}
        <div className="bg-gradient-to-r from-green-600 via-emerald-600 to-green-700 text-white text-center py-3 px-4">
          <p className="text-sm font-semibold">
            🎉 <strong>100% Gratuito para autónomos</strong> — Sin tarjeta, sin permanencia, sin sorpresas
          </p>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-12">

          {/* HERO */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 font-bold text-sm px-4 py-2 rounded-full mb-5">
              <CheckCircle className="w-4 h-4" /> Sin coste · Sin tarjeta · Para siempre
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold text-gray-900 mb-4 leading-tight">
              MisAutónomos es<br className="hidden md:block" />{" "}
              <span className="text-green-600">completamente gratis</span><br className="hidden md:block" />{" "}
              para autónomos
            </h1>
            <p className="text-lg text-gray-500 max-w-xl mx-auto">
              Crea tu perfil hoy y empieza a recibir clientes. Sin ningún pago, sin letra pequeña.
            </p>
          </div>

          {/* CARD GRATUITA */}
          <div className="max-w-lg mx-auto mb-14">
            <div className="relative rounded-3xl bg-white border-2 border-green-500 shadow-2xl ring-4 ring-green-100 overflow-hidden">
              <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white text-sm font-bold text-center py-3 tracking-wide">
                ✓ GRATIS · SIEMPRE · PARA TODOS LOS AUTÓNOMOS
              </div>
              <div className="p-8">
                <div className="text-center mb-8">
                  <div className="text-7xl font-extrabold text-gray-900 mb-1">0€</div>
                  <div className="text-gray-500 text-lg">al mes · para siempre</div>
                  <div className="mt-3 inline-flex items-center gap-2 bg-green-50 text-green-700 text-sm font-semibold px-4 py-1.5 rounded-full">
                    <CheckCircle className="w-4 h-4" /> Sin tarjeta · Sin permanencia · Sin sorpresas
                  </div>
                </div>

                <Button
                  className="w-full h-14 text-lg font-bold rounded-2xl mb-8 bg-green-600 hover:bg-green-500 text-white shadow-lg"
                  onClick={handleSignup}
                >
                  Crear mi perfil gratis →
                </Button>

                <ul className="space-y-3">
                  {INCLUDES.map((f, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-gray-700">
                      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* GARANTÍA */}
          <div className="mb-10 bg-green-50 border border-green-200 rounded-2xl p-6 flex flex-col md:flex-row items-center gap-5 text-center md:text-left">
            <div className="w-14 h-14 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">🛡️ Gratuito garantizado · Sin letra pequeña</h3>
              <p className="text-gray-600 text-sm">
                Tu perfil en MisAutónomos es completamente gratuito para siempre. No existe ningún plan de pago para autónomos.
                Sin compromisos, sin sorpresas.
              </p>
            </div>
          </div>

          {/* POR QUÉ */}
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-6">¿Por qué unirte?</h2>
          <div className="grid sm:grid-cols-2 gap-5 mb-12">
            {WHY.map((item, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-6 flex items-start gap-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-11 h-11 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <div className="font-bold text-gray-900 mb-1">{item.label}</div>
                  <div className="text-sm text-gray-600">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* CTA FINAL */}
          <div className="text-center bg-gradient-to-r from-green-600 to-emerald-600 rounded-3xl p-10 text-white">
            <h3 className="text-2xl md:text-3xl font-extrabold mb-3">¿A qué esperas?</h3>
            <p className="text-green-100 mb-6 text-lg">Es gratis. Siempre lo ha sido. Siempre lo será.</p>
            <Button
              className="h-14 px-10 text-lg font-bold bg-white text-green-700 hover:bg-green-50 rounded-2xl shadow-lg"
              onClick={handleSignup}
            >
              Crear mi perfil gratis →
            </Button>
            <p className="mt-4 text-green-200 text-sm">Sin tarjeta · Sin permanencia · Perfil activo en 10 minutos</p>
          </div>
        </div>
      </div>
    </>
  );
}