import React, { useState, lazy, Suspense, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Shield, Clock, CheckCircle, ArrowRight, ChevronDown
} from "lucide-react";

import HeroSection from "../components/home/HeroSection";
import CategoriesGrid from "../components/home/CategoriesGrid";
const TestimonialsSection = lazy(() => import("../components/home/TestimonialsSection"));
const FinalCTASection = lazy(() => import("../components/home/FinalCTASection"));
const WhyTrustSlider = lazy(() => import("../components/home/WhyTrustSlider"));

export default function Home() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [openFaq, setOpenFaq] = React.useState(null);

  // Antes constantes de módulo (HOW_IT_WORKS, FAQS, WHY_US): viven aquí para
  // que se retraduzcan al cambiar de idioma.
  const howItWorks = useMemo(() => [
    {
      step: "01",
      title: t('home.howItWorks.createProfile.title'),
      desc: t('home.howItWorks.createProfile.desc'),
      color: "from-blue-500 to-cyan-500",
      soft: "bg-blue-50 text-blue-700",
    },
    {
      step: "02",
      title: t('home.howItWorks.getFound.title'),
      desc: t('home.howItWorks.getFound.desc'),
      color: "from-emerald-500 to-green-500",
      soft: "bg-emerald-50 text-emerald-700",
    },
    {
      step: "03",
      title: t('home.howItWorks.connect.title'),
      desc: t('home.howItWorks.connect.desc'),
      color: "from-amber-500 to-orange-500",
      soft: "bg-amber-50 text-amber-700",
    },
  ], [t]);

  const faqs = useMemo(() => [
    { q: t('home.faq.cost.q'), a: t('home.faq.cost.a') },
    { q: t('home.faq.clientsPay.q'), a: t('home.faq.clientsPay.a') },
    { q: t('home.faq.whenActive.q'), a: t('home.faq.whenActive.a') },
  ], [t]);

  const whyUs = useMemo(() => [
    { icon: Shield, title: t('landing.feature_no_fees'), desc: t('home.whyUs.noFees.desc'), gradient: "from-blue-500 to-cyan-500" },
    { icon: Clock, title: t('home.whyUs.profileTime.title'), desc: t('home.whyUs.profileTime.desc'), gradient: "from-emerald-500 to-green-500" },
    { icon: CheckCircle, title: t('home.whyUs.verifiedClients.title'), desc: t('home.whyUs.verifiedClients.desc'), gradient: "from-purple-500 to-violet-500" },
  ], [t]);

  return (
    <div className="bg-white" style={{overflowX:'hidden', width:'100%', maxWidth:'100vw'}}>
      <HeroSection />

      {/* ===== CÓMO FUNCIONA ===== */}
      <section className="py-16 md:py-20 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-12">
            <Badge className="mb-3 bg-blue-100 text-blue-700 border-0 font-semibold">
              {t('home.howItWorks.badge')}
            </Badge>
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">
              {t('home.howItWorks.title')}
            </h2>
            <p className="text-gray-600 mt-3 text-lg">{t('home.howItWorks.subtitle')}</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 md:gap-8">
            {howItWorks.map((step, i) => (
              <div
                key={i}
                className="relative group"
              >
                <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100 hover:shadow-lg transition-shadow h-full">
                  <div className={`inline-flex w-14 h-14 rounded-2xl bg-gradient-to-br ${step.color} items-center justify-center mb-5 shadow-md group-hover:scale-110 transition-transform`}>
                    <span className="text-white font-extrabold text-lg">{step.step}</span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{step.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{step.desc}</p>
                </div>
                {i < howItWorks.length - 1 && (
                  <div className="hidden md:block absolute top-12 -right-4 z-10 text-gray-300">
                    <ArrowRight className="w-6 h-6" />
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="text-center mt-10">
            <Button
              onClick={() => navigate('/completar-perfil')}
              className="bg-blue-700 hover:bg-blue-600 text-white h-12 px-8 text-base font-semibold rounded-xl transition-all hover:scale-[1.02]"
            >
              {t('home.finalCta.createProfile')} <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </section>

      <CategoriesGrid />

      {/* ===== SLIDER ¿POR QUÉ CONFIAR? ===== */}
      <Suspense fallback={null}><WhyTrustSlider /></Suspense>

      {/* ===== POR QUÉ NOSOTROS ===== */}
      <section className="py-16 md:py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">
              {t('home.whyUs.title')}
            </h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-6 md:gap-8">
            {whyUs.map((item, i) => (
              <div
                key={i}
                className="group text-center p-6 rounded-2xl border border-gray-100 hover:border-transparent hover:shadow-xl transition-all bg-white hover:bg-gradient-to-br hover:from-white hover:to-gray-50"
              >
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${item.gradient} flex items-center justify-center mx-auto mb-5 shadow-md group-hover:scale-110 transition-transform`}>
                  <item.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="font-bold text-gray-900 text-lg mb-2">{item.title}</h3>
                <p className="text-gray-600 leading-relaxed text-sm md:text-base">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Suspense fallback={null}><TestimonialsSection /></Suspense>

      {/* ===== FAQ ===== */}
      <section className="py-16 md:py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4">
          <div className="text-center mb-10">
            <Badge className="mb-3 bg-gray-100 text-gray-700 border-0 font-semibold">
              {t('nav.faq')}
            </Badge>
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">
              {t('home.faq.title')}
            </h2>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div key={i}>
                <div
                  className={`rounded-2xl border cursor-pointer transition-all duration-200 overflow-hidden ${openFaq === i ? "border-blue-200 bg-blue-50/50 shadow-sm" : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"}`}
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <div className="flex items-center justify-between p-5">
                    <h3 className={`font-semibold text-base pr-4 ${openFaq === i ? "text-blue-900" : "text-gray-900"}`}>
                      {faq.q}
                    </h3>
                    <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center transition-all ${openFaq === i ? "bg-blue-600 text-white rotate-180" : "bg-gray-100 text-gray-500"}`}>
                      <ChevronDown className="w-4 h-4" />
                    </div>
                  </div>
                  {openFaq === i && (
                    <div className="px-5 pb-5 text-gray-600 leading-relaxed border-t border-blue-100 pt-4">
                      {faq.a}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-8">
            <Link to="/preguntas-frecuentes" className="inline-flex items-center gap-2 text-blue-600 font-semibold hover:text-blue-800 transition-colors text-sm">
              {t('home.faq.viewAll')} <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      <Suspense fallback={null}><FinalCTASection /></Suspense>
    </div>
  );
}
