import React from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation, Trans } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Megaphone, Target, BarChart3, Clock, CheckCircle, 
  Sparkles, TrendingUp, Users, Eye, MessageSquare,
  ChevronRight, Zap, Shield, Star
} from "lucide-react";
import SEOHead from "../components/seo/SEOHead";

export default function PlanAdsPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Antes eran constantes de módulo: se evaluaban una vez al importar y no se
  // retraducían al cambiar de idioma. Dentro del componente pasan por t().
  const HOW_IT_WORKS = [
    { icon: Target, title: t('ads.plan.steps.setupTitle'), desc: t('ads.plan.steps.setupDesc') },
    { icon: Clock, title: t('ads.plan.steps.briefingTitle'), desc: t('ads.plan.steps.briefingDesc') },
    { icon: Sparkles, title: t('ads.plan.steps.launchTitle'), desc: t('ads.plan.steps.launchDesc') },
    { icon: BarChart3, title: t('ads.plan.steps.resultsTitle'), desc: t('ads.plan.steps.resultsDesc') },
  ];

  const COMPARISON = [
    { feature: t('ads.plan.comparison.profileVisible'), visibility: true, adsplus: true },
    { feature: t('ads.plan.comparison.directContact'), visibility: true, adsplus: true },
    { feature: t('ads.plan.comparison.unlimitedMessages'), visibility: true, adsplus: true },
    { feature: t('ads.plan.comparison.visitStats'), visibility: true, adsplus: true },
    { feature: t('ads.plan.comparison.realBudget'), visibility: false, adsplus: true },
    { feature: t('ads.plan.comparison.managedCampaign'), visibility: false, adsplus: true },
    { feature: t('ads.plan.comparison.proCreatives'), visibility: false, adsplus: true },
    { feature: t('ads.plan.comparison.optimizedCopy'), visibility: false, adsplus: true },
    { feature: t('ads.plan.comparison.weeklyReport'), visibility: false, adsplus: true },
    { feature: t('ads.plan.comparison.prioritySupport'), visibility: false, adsplus: true },
  ];

  const FAQS = [
    { q: t('ads.plan.faq.includesQ'), a: t('ads.plan.faq.includesA') },
    { q: t('ads.plan.faq.platformQ'), a: t('ads.plan.faq.platformA') },
    { q: t('ads.plan.faq.noBriefingQ'), a: t('ads.plan.faq.noBriefingA') },
    { q: t('ads.plan.faq.budgetQ'), a: t('ads.plan.faq.budgetA') },
    { q: t('ads.plan.faq.cancelQ'), a: t('ads.plan.faq.cancelA') },
    { q: t('ads.plan.faq.launchTimeQ'), a: t('ads.plan.faq.launchTimeA') },
  ];

  // Los nombres de las redes son marcas: van literales.
  const PLATFORMS = [
    { name: 'Instagram', desc: t('ads.plan.platforms.instagramDesc'), users: t('ads.plan.platforms.usersInSpain', { millions: 18 }) },
    { name: 'Facebook', desc: t('ads.plan.platforms.facebookDesc'), users: t('ads.plan.platforms.usersInSpain', { millions: 20 }) },
    { name: 'TikTok', desc: t('ads.plan.platforms.tiktokDesc'), users: t('ads.plan.platforms.usersInSpain', { millions: 13 }) },
    { name: 'LinkedIn', desc: t('ads.plan.platforms.linkedinDesc'), users: t('ads.plan.platforms.usersInSpain', { millions: 11 }) },
    { name: 'Google', desc: t('ads.plan.platforms.googleDesc'), users: t('ads.plan.platforms.usersInSpain', { millions: 35 }) },
  ];

  return (
    <>
      <SEOHead
        title={t('ads.plan.seoTitle')}
        description={t('ads.plan.seoDescription')}
        keywords={t('ads.plan.seoKeywords')}
      />
      
      <div className="min-h-screen bg-white">
        
        {/* HERO */}
        <section className="bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-800 text-white py-16 md:py-24 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-semibold mb-6">
              <Megaphone className="w-4 h-4" />
              {t('ads.plan.heroBadge')}
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold leading-tight mb-6">
              <Trans i18nKey="ads.plan.heroTitle" components={{ br: <br className="hidden md:block" /> }} />
            </h1>
            <p className="text-xl md:text-2xl text-blue-100 mb-8 max-w-3xl mx-auto">
              {t('ads.plan.heroSubtitle')}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button 
                size="lg" 
                className="bg-white text-blue-700 hover:bg-blue-50 font-bold px-8 h-14 text-lg"
                onClick={() => navigate("/precios")}
              >
                {t('ads.plan.heroCta')}
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="border-white text-white hover:bg-white/10 font-semibold px-8 h-14 text-lg"
                onClick={() => navigate("/precios")}
              >
                {t('ads.plan.heroSecondaryCta')}
              </Button>
            </div>
            <p className="text-sm text-blue-200 mt-4">
              {t('ads.plan.heroFootnote')}
            </p>
          </div>
        </section>

        {/* CÓMO FUNCIONA */}
        <section className="py-16 md:py-20 px-4 bg-gray-50">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-3">
                {t('ads.plan.howTitle')}
              </h2>
              <p className="text-lg text-gray-500">
                {t('ads.plan.howSubtitle')}
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {HOW_IT_WORKS.map((step, i) => (
                <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                    <step.icon className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">{step.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* COMPARATIVA */}
        <section className="py-16 md:py-20 px-4 bg-white">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-3">
                {t('ads.plan.comparisonTitle')}
              </h2>
              <p className="text-lg text-gray-500">
                {t('ads.plan.comparisonSubtitle')}
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-gray-100">
                    <th className="text-left py-4 px-4 font-bold text-gray-900">{t('ads.plan.comparison.featureHeader')}</th>
                    <th className="text-center py-4 px-4 font-bold text-gray-600">{t('ads.plan.visibilityPlanName')}<br/><span className="text-sm font-normal">{t('ads.plan.pricePerMonth', { price: 13 })}</span></th>
                    <th className="text-center py-4 px-4 font-bold text-blue-700 bg-blue-50 rounded-t-lg">{t('ads.plan.adsPlusPlanName')}<br/><span className="text-sm font-normal">{t('ads.plan.pricePerMonth', { price: 33 })}</span></th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON.map((row, i) => (
                    <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-4 px-4 text-gray-900 font-medium">{row.feature}</td>
                      <td className="text-center py-4 px-4">
                        {row.visibility ? (
                          <CheckCircle className="w-5 h-5 text-green-600 inline" />
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="text-center py-4 px-4 bg-blue-50/50">
                        {row.adsplus ? (
                          <CheckCircle className="w-5 h-5 text-blue-600 inline" />
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-8 text-center">
              <p className="text-sm font-semibold text-blue-700 bg-blue-50 rounded-lg p-4 inline-block">
                {t('ads.plan.comparisonNote')}
              </p>
            </div>
          </div>
        </section>

        {/* PLATAFORMAS */}
        <section className="py-16 md:py-20 px-4 bg-gradient-to-br from-gray-50 to-blue-50">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-3">
              {t('ads.plan.platformsTitle')}
            </h2>
            <p className="text-lg text-gray-500 mb-10">
              {t('ads.plan.platformsSubtitle')}
            </p>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {PLATFORMS.map((platform, i) => (
                <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                  <h3 className="font-bold text-gray-900 mb-1">{platform.name}</h3>
                  <p className="text-xs text-gray-500 mb-2">{platform.desc}</p>
                  <p className="text-xs font-semibold text-blue-600">{platform.users}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-16 md:py-20 px-4 bg-white">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 text-center mb-12">
              {t('nav.faq')}
            </h2>
            <div className="space-y-4">
              {FAQS.map((faq, i) => (
                <details key={i} className="bg-gray-50 rounded-2xl overflow-hidden group">
                  <summary className="flex items-center justify-between px-6 py-5 cursor-pointer font-semibold text-gray-900 text-sm hover:bg-gray-100 transition-colors">
                    {faq.q}
                    <ChevronRight className="w-5 h-5 text-gray-400 group-open:rotate-90 transition-transform" />
                  </summary>
                  <div className="px-6 pb-5 pt-2 text-sm text-gray-600 leading-relaxed">
                    {faq.a}
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* CTA FINAL */}
        <section className="py-16 md:py-20 px-4 bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-800 text-white">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-extrabold mb-4">
              {t('ads.plan.ctaTitle')}
            </h2>
            <p className="text-xl text-blue-100 mb-8">
              {t('ads.plan.ctaSubtitle')}
            </p>
            <Button 
              size="lg" 
              className="bg-white text-blue-700 hover:bg-blue-50 font-bold px-10 h-14 text-lg shadow-xl"
              onClick={() => navigate("/precios")}
            >
              {t('ads.plan.ctaButton')}
            </Button>
            <p className="text-sm text-blue-200 mt-4">
              {t('ads.plan.ctaNoCard')}
            </p>
          </div>
        </section>

      </div>
    </>
  );
}
