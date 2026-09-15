import React from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation, Trans } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  CheckCircle, Shield, Rocket, MessageSquare, Star,
  MapPin, FileText, BarChart2, Zap
} from "lucide-react";
import SEOHead from "../components/seo/SEOHead";

export default function PricingPlansPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Antes eran constantes de módulo (INCLUDES, WHY): se evaluaban una vez al
  // importar y no se retraducían al cambiar de idioma. Dentro del componente sí.
  const includes = [
    t('pricing.free.includes.visibleSearch'),
    t('pricing.free.includes.fullProfile'),
    t('pricing.free.includes.directContact'),
    t('pricing.free.includes.unlimitedMessages'),
    t('pricing.free.includes.stats'),
    t('pricing.free.includes.coverageArea'),
    t('pricing.free.includes.verifiedReviews'),
    t('pricing.free.includes.permanentAccess'),
  ];

  const why = [
    { icon: Shield, label: t('landing.feature_no_fees'), desc: t('pricing.free.why.noFeesText') },
    { icon: Zap, label: t('pricing.free.why.fastProfileTitle'), desc: t('pricing.free.why.fastProfileText') },
    { icon: Star, label: t('pricing.free.why.verifiedReviewsTitle'), desc: t('pricing.free.why.verifiedReviewsText') },
    { icon: Rocket, label: t('pricing.free.why.adsIncludedTitle'), desc: t('pricing.free.why.adsIncludedText') },
  ];

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
        title={`${t('pricing.free.seoTitle')} - MisAutónomos`}
        description={t('pricing.free.seoDescription')}
        keywords="registro gratis autónomos, directorio profesionales gratis, autónomos España"
      />

      <div className="min-h-screen bg-gray-50 pb-24 md:pb-0">

        {/* BANNER */}
        <div className="bg-gradient-to-r from-green-600 via-emerald-600 to-green-700 text-white text-center py-3 px-4">
          <p className="text-sm font-semibold">
            <Trans i18nKey="pricing.free.banner" components={{ strong: <strong /> }} />
          </p>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-12">

          {/* HERO */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 font-bold text-sm px-4 py-2 rounded-full mb-5">
              <CheckCircle className="w-4 h-4" /> {t('pricing.free.hero.badge')}
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold text-gray-900 mb-4 leading-tight">
              <Trans
                i18nKey="pricing.free.hero.title"
                components={{
                  br: <br className="hidden md:block" />,
                  highlight: <span className="text-green-600" />,
                }}
              />
            </h1>
            <p className="text-lg text-gray-500 max-w-xl mx-auto">
              {t('pricing.free.hero.subtitle')}
            </p>
          </div>

          {/* CARD GRATUITA */}
          <div className="max-w-lg mx-auto mb-14">
            <div className="relative rounded-3xl bg-white border-2 border-green-500 shadow-2xl ring-4 ring-green-100 overflow-hidden">
              <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white text-sm font-bold text-center py-3 tracking-wide">
                {t('pricing.free.card.ribbon')}
              </div>
              <div className="p-8">
                <div className="text-center mb-8">
                  <div className="text-7xl font-extrabold text-gray-900 mb-1">0€</div>
                  <div className="text-gray-500 text-lg">{t('pricing.free.card.perMonthForever')}</div>
                  <div className="mt-3 inline-flex items-center gap-2 bg-green-50 text-green-700 text-sm font-semibold px-4 py-1.5 rounded-full">
                    <CheckCircle className="w-4 h-4" /> {t('pricing.free.card.noCard')}
                  </div>
                </div>

                <Button
                  className="w-full h-14 text-lg font-bold rounded-2xl mb-8 bg-green-600 hover:bg-green-500 text-white shadow-lg"
                  onClick={handleSignup}
                >
                  {t('pricing.free.card.cta')}
                </Button>

                <ul className="space-y-3">
                  {includes.map((f, i) => (
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
              <h3 className="text-lg font-bold text-gray-900 mb-1">{t('pricing.free.guarantee.title')}</h3>
              <p className="text-gray-600 text-sm">
                {t('pricing.free.guarantee.text')}
              </p>
            </div>
          </div>

          {/* POR QUÉ */}
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-6">{t('pricing.free.why.title')}</h2>
          <div className="grid sm:grid-cols-2 gap-5 mb-12">
            {why.map((item, i) => (
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
            <h3 className="text-2xl md:text-3xl font-extrabold mb-3">{t('pricing.free.finalCta.title')}</h3>
            <p className="text-green-100 mb-6 text-lg">{t('pricing.free.finalCta.text')}</p>
            <Button
              className="h-14 px-10 text-lg font-bold bg-white text-green-700 hover:bg-green-50 rounded-2xl shadow-lg"
              onClick={handleSignup}
            >
              {t('pricing.free.card.cta')}
            </Button>
            <p className="mt-4 text-green-200 text-sm">{t('pricing.free.finalCta.note')}</p>
          </div>
        </div>
      </div>
    </>
  );
}
