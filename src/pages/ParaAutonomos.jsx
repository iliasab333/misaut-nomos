import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ShieldCheck,
  BadgeCheck,
  Clock3,
  MessageSquare,
  Wallet,
  Megaphone,
  Star,
  ArrowRight,
  Check,
} from 'lucide-react';
import SEOHead from '@/components/seo/SEOHead';

const NAVY = '#00255C';
const GOLD = '#F5C13D';

// /registro (UserTypeSelection) decide automáticamente:
//   - no logueado → /login?mode=signup&role=profesional&next=/completar-perfil
//   - logueado como cliente o sin user_type → /completar-perfil
//   - logueado como profesional con ficha → /dashboard
// Así los CTAs funcionan tanto para visitantes nuevos como para clientes que
// quieren hacerse profesionales sin tener que volver a "iniciar sesión".
const CTA_HREF = '/registro?tipo=autonomo';

export default function ParaAutonomos() {
  const { t } = useTranslation();

  // Textos dentro del componente para que se retraduzcan al cambiar de idioma.
  const benefits = [
    { icon: BadgeCheck, title: t('landing.hero.trustVerified'), body: t('forPros.benefits.verified.body') },
    { icon: Wallet, title: t('forPros.benefits.noFees.title'), body: t('forPros.benefits.noFees.body') },
    { icon: MessageSquare, title: t('landing.feature_direct_contact'), body: t('forPros.benefits.directContact.body') },
    { icon: Megaphone, title: t('forPros.benefits.promotion.title'), body: t('forPros.benefits.promotion.body') },
    { icon: Star, title: t('home.whyTrust.slides.verifiedReviews.title'), body: t('forPros.benefits.reviews.body') },
    { icon: Clock3, title: t('forPros.benefits.fast.title'), body: t('forPros.benefits.fast.body') },
  ];

  const steps = [
    { n: '01', title: t('forPros.steps.createAccount.title'), body: t('forPros.steps.createAccount.body') },
    { n: '02', title: t('forPros.steps.completeProfile.title'), body: t('landing.howItWorks.pro.createProfile.body') },
    { n: '03', title: t('forPros.steps.receiveClients.title'), body: t('forPros.steps.receiveClients.body') },
  ];

  const differences = [
    t('forPros.differences.noPerContact'),
    t('forPros.differences.noCut'),
    t('forPros.differences.noDataSale'),
    t('forPros.differences.noAnonymousReviews'),
    t('forPros.differences.noLockIn'),
    t('forPros.differences.noFalsePromises'),
  ];

  const faqs = [
    { q: t('forPros.faq.cost.q'), a: t('forPros.faq.cost.a') },
    { q: t('forPros.faq.verified.q'), a: t('forPros.faq.verified.a') },
    { q: t('forPros.faq.badReviews.q'), a: t('forPros.faq.badReviews.a') },
    { q: t('forPros.faq.cancel.q'), a: t('forPros.faq.cancel.a') },
  ];

  return (
    <>
      <SEOHead
        title={t('forPros.seo.title')}
        description={t('forPros.seo.description')}
        keywords="autónomos, profesionales, alta autónomo, conseguir clientes, sin comisiones"
      />

      <main className="bg-white text-slate-900">
        {/* HERO */}
        <section className="relative" style={{ background: '#FBFCFE' }}>
          <div className="max-w-5xl mx-auto px-4 pt-16 pb-12 md:pt-24 md:pb-16">
            <div
              className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium"
              style={{ backgroundColor: 'rgba(0,37,92,0.06)', color: NAVY }}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              {t('forPros.hero.eyebrow')}
            </div>

            <h1
              className="mt-5 font-semibold tracking-tight"
              style={{ color: NAVY, fontSize: 'clamp(2.1rem, 5.6vw, 3.5rem)', lineHeight: 1.06, letterSpacing: '-0.025em' }}
            >
              {t('forPros.hero.title')}{' '}
              <span style={{ color: GOLD }}>{t('forPros.hero.titleHighlight')}</span>
            </h1>

            <p className="mt-5 max-w-2xl text-slate-600 text-[17px] md:text-lg leading-relaxed">
              {t('forPros.hero.subtitle')}
            </p>

            <div className="mt-8 flex">
              <Link
                to={CTA_HREF}
                className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-xl font-semibold text-[15px] transition-colors"
                style={{ backgroundColor: GOLD, color: NAVY }}
              >
                {t('nav.becomeProFree')}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1.5"><BadgeCheck className="w-3.5 h-3.5" style={{ color: NAVY }} />{t('landing.hero.trustVerified')}</span>
              <span className="inline-flex items-center gap-1.5"><Wallet className="w-3.5 h-3.5" style={{ color: NAVY }} />{t('landing.feature_no_fees')}</span>
              <span className="inline-flex items-center gap-1.5"><MessageSquare className="w-3.5 h-3.5" style={{ color: NAVY }} />{t('landing.feature_direct_contact')}</span>
            </div>
          </div>
        </section>

        {/* BENEFICIOS — banda gris suave */}
        <section style={{ background: 'hsl(var(--brand-surface))' }}>
          <div className="max-w-5xl mx-auto px-4 py-16 md:py-20">
            <h2 className="text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-500 mb-3">{t('forPros.benefits.eyebrow')}</h2>
            <p className="text-2xl md:text-[28px] font-semibold tracking-tight text-slate-900 max-w-2xl">
              {t('forPros.benefits.title')}
            </p>

            <div className="mt-10 grid gap-4 md:gap-5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
              {benefits.map(({ icon: Icon, title, body }) => (
                <article key={title} className="rounded-2xl bg-white border border-slate-200 p-5">
                  <span
                    className="inline-flex items-center justify-center w-10 h-10 rounded-xl"
                    style={{ backgroundColor: 'rgba(0,37,92,0.08)', color: NAVY }}
                  >
                    <Icon className="w-5 h-5" />
                  </span>
                  <h3 className="mt-4 font-semibold text-slate-900">{title}</h3>
                  <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">{body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* CÓMO FUNCIONA — banda blanca */}
        <section className="bg-white">
          <div className="max-w-5xl mx-auto px-4 py-16 md:py-20">
            <h2 className="text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-500 mb-3">{t('footer.how_it_works')}</h2>
            <p className="text-2xl md:text-[28px] font-semibold tracking-tight text-slate-900 max-w-2xl">
              {t('landing.howItWorks.title')}
            </p>

            <ol className="mt-10 grid gap-4 md:gap-5 md:grid-cols-3">
              {steps.map(({ n, title, body }) => (
                <li key={n} className="rounded-2xl border border-slate-200 p-5">
                  <span className="text-xs font-semibold tracking-[0.12em]" style={{ color: GOLD }}>{n}</span>
                  <h3 className="mt-3 font-semibold text-slate-900">{title}</h3>
                  <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">{body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* COMPARATIVA HONESTA — banda gris muy suave */}
        <section style={{ background: 'hsl(var(--brand-surface))' }}>
          <div className="max-w-5xl mx-auto px-4 py-16 md:py-20">
            <h2 className="text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-500 mb-3">{t('forPros.differences.eyebrow')}</h2>
            <p className="text-2xl md:text-[28px] font-semibold tracking-tight text-slate-900 max-w-2xl">
              {t('forPros.differences.title')}
            </p>

            <ul className="mt-8 grid gap-3 md:gap-4 md:grid-cols-2">
              {differences.map((line) => (
                <li key={line} className="flex items-start gap-3 rounded-2xl bg-white border border-slate-200 p-4">
                  <span className="mt-0.5 inline-flex items-center justify-center w-6 h-6 rounded-full flex-shrink-0" style={{ background: 'rgba(0,37,92,0.08)' }}>
                    <Check className="w-3.5 h-3.5" style={{ color: NAVY }} />
                  </span>
                  <span className="text-sm text-slate-700">{line}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* FAQ — banda blanca */}
        <section className="bg-white">
          <div className="max-w-3xl mx-auto px-4 py-16 md:py-20">
            <h2 className="text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-500 mb-3">{t('nav.faq')}</h2>
            <p className="text-2xl md:text-[28px] font-semibold tracking-tight text-slate-900">{t('forPros.faq.title')}</p>

            <dl className="mt-8 space-y-3">
              {faqs.map(({ q, a }) => (
                <details key={q} className="group rounded-2xl border border-slate-200 bg-white">
                  <summary className="list-none cursor-pointer p-5 flex items-center justify-between gap-4 font-semibold text-slate-900 text-[15px]">
                    {q}
                    <span className="text-slate-400 group-open:rotate-180 transition-transform">▾</span>
                  </summary>
                  <p className="px-5 pb-5 text-slate-600 text-sm leading-relaxed">{a}</p>
                </details>
              ))}
            </dl>
          </div>
        </section>

        {/* CTA FINAL — banda navy */}
        <section style={{ background: NAVY }}>
          <div className="max-w-4xl mx-auto px-4 py-16 md:py-24 text-center text-white">
            <h2 className="font-semibold tracking-tight" style={{ fontSize: 'clamp(1.7rem, 4.4vw, 2.5rem)', lineHeight: 1.1 }}>
              {t('forPros.finalCta.title')}
            </h2>
            <p className="mt-4 text-white/80 max-w-xl mx-auto">
              {t('forPros.finalCta.body')}
            </p>
            <div className="mt-8 flex justify-center">
              <Link
                to={CTA_HREF}
                className="inline-flex items-center justify-center gap-2 h-12 px-7 rounded-xl font-semibold"
                style={{ backgroundColor: GOLD, color: NAVY }}
              >
                {t('nav.becomeProFree')}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
