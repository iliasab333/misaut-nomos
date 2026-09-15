import React from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation, Trans } from "react-i18next";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Briefcase, Search, ShieldCheck, Zap, BadgeCheck } from "lucide-react";

export default function FinalCTASection() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Antes constante de módulo (TRUST_ITEMS): vive aquí para que se retraduzca
  // al cambiar de idioma.
  const trustItems = [
    { icon: Zap, label: t('home.finalCta.profileTime') },
    { icon: ShieldCheck, label: t('landing.feature_no_fees') },
    { icon: BadgeCheck, label: t('home.whyUs.verifiedClients.title') },
  ];

  return (
    <section className="relative py-20 md:py-28 overflow-hidden bg-gradient-to-br from-[#0d2a5e] via-[#1040a0] to-[#0a5940] text-white">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_30%_30%,rgba(56,189,248,0.15),transparent_60%)]" />
        <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(ellipse_at_70%_80%,rgba(52,211,153,0.15),transparent_60%)]" />
        <motion.div
          className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full border border-white/5"
          animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 12, repeat: Infinity }}
        />
      </div>

      <div className="relative max-w-4xl mx-auto px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 bg-white/15 text-white border border-white/20 text-sm px-4 py-1.5 rounded-full font-semibold mb-6">
            {t('home.finalCta.badge')}
          </div>

          <h2 className="text-4xl md:text-6xl font-extrabold mb-5 leading-tight tracking-tight">
            <Trans i18nKey="home.finalCta.title">
              Únete ahora —
              <br />
              <span className="bg-gradient-to-r from-emerald-300 to-cyan-300 bg-clip-text text-transparent">
                Es gratis para siempre
              </span>
            </Trans>
          </h2>

          <p className="text-white/80 text-xl mb-10 max-w-xl mx-auto leading-relaxed">
            {t('home.finalCta.subtitle')}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10">
            <Button
              onClick={() => navigate('/completar-perfil')}
              className="group h-14 px-10 text-lg font-bold bg-gradient-to-r from-emerald-400 to-green-400 hover:from-emerald-300 hover:to-green-300 text-gray-900 rounded-2xl shadow-[0_15px_50px_-10px_rgba(52,211,153,0.6)] hover:scale-[1.03] transition-all"
            >
              <Briefcase className="w-5 h-5 mr-2 group-hover:rotate-6 transition-transform" />
              {t('home.finalCta.createProfile')}
            </Button>
            <Button
              onClick={() => navigate(createPageUrl("Search"))}
              variant="outline"
              className="h-14 px-8 text-lg font-semibold rounded-2xl border-white/25 text-white hover:bg-white/10 hover:border-white/40 transition-all"
            >
              <Search className="w-5 h-5 mr-2" />
              {t('home.hero.viewProfessionals')}
            </Button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 md:gap-8">
            {trustItems.map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-white/70">
                <item.icon className="w-4 h-4 text-emerald-300" />
                <span>{item.label}</span>
              </div>
            ))}
          </div>

          <p className="mt-8 text-white/50 text-sm">
            {t('home.finalCta.footnote')}
          </p>
        </motion.div>
      </div>
    </section>
  );
}
