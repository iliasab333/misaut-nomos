import React, { Suspense, lazy, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  IconArrowRight,
  IconUsers,
  IconSearch,
  IconMessageSquare,
  IconFilePlus,
  IconVerified,
  IconMapPin,
  IconWallet,
  IconStarOutline,
  IconMegaphone,
} from '@/components/Icons';
import SEOHead from '@/components/seo/SEOHead';
import LandingHero from '@/components/home/LandingHero';
import { slugify } from '@/lib/seoUrl';

const TrustSlider = lazy(() => import('@/components/search/TrustSlider'));

const NAVY = '#00255C';
const GOLD = '#F5C13D';

// Ciudades con cobertura (los 12 mercados principales). Honesto: estas son
// las ciudades donde ya tenemos autónomos activos o publicidad en curso.
const COVERAGE_CITIES = [
  'Madrid', 'Barcelona', 'Valencia', 'Sevilla', 'Málaga', 'Bilbao',
  'Zaragoza', 'Alicante', 'Murcia', 'Palma', 'Granada', 'A Coruña',
];

function StepTabs() {
  const { t } = useTranslation();
  const [tab, setTab] = useState('cliente');

  // Antes constantes de módulo (CLIENT_STEPS, PRO_STEPS): viven aquí para que
  // se retraduzcan al cambiar de idioma.
  const clientSteps = [
    { n: '01', icon: IconSearch, title: t('landing.howItWorks.client.filter.title'), body: t('landing.howItWorks.client.filter.body') },
    { n: '02', icon: IconUsers, title: t('landing.howItWorks.client.compare.title'), body: t('landing.howItWorks.client.compare.body') },
    { n: '03', icon: IconMessageSquare, title: t('landing.howItWorks.client.contact.title'), body: t('landing.howItWorks.client.contact.body') },
  ];
  const proSteps = [
    { n: '01', icon: IconFilePlus, title: t('landing.howItWorks.pro.createProfile.title'), body: t('landing.howItWorks.pro.createProfile.body') },
    { n: '02', icon: IconMapPin, title: t('landing.howItWorks.pro.appear.title'), body: t('landing.howItWorks.pro.appear.body') },
    { n: '03', icon: IconMessageSquare, title: t('landing.howItWorks.pro.receiveClients.title'), body: t('landing.howItWorks.pro.receiveClients.body') },
  ];
  const steps = tab === 'cliente' ? clientSteps : proSteps;

  return (
    <div>
      <div className="inline-flex p-1 rounded-xl bg-soft mb-8" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'cliente'}
          onClick={() => setTab('cliente')}
          className={`text-sm font-medium px-4 py-2 rounded-lg transition ${
            tab === 'cliente'
              ? 'bg-surface text-ink shadow-sm'
              : 'text-c-muted hover:text-slate-700'
          }`}
        >
          {t('nav.sign_up_client')}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'pro'}
          onClick={() => setTab('pro')}
          className={`text-sm font-medium px-4 py-2 rounded-lg transition ${
            tab === 'pro'
              ? 'bg-surface text-ink shadow-sm'
              : 'text-c-muted hover:text-slate-700'
          }`}
        >
          {t('nav.iAmPro')}
        </button>
      </div>

      <ol className="grid gap-4 md:gap-5 md:grid-cols-3">
        {steps.map(({ n, icon: Icon, title, body }) => (
          <li key={n} className="rounded-2xl border border-c-border p-5 bg-surface">
            <div className="flex items-center gap-3">
              <span
                className="inline-flex items-center justify-center w-10 h-10 rounded-xl"
                style={{ backgroundColor: 'rgba(0,37,92,0.08)', color: NAVY }}
                aria-hidden="true"
              >
                <Icon className="w-5 h-5" />
              </span>
              <span className="text-xs font-semibold tracking-[0.12em]" style={{ color: GOLD }}>{n}</span>
            </div>
            <h3 className="mt-4 font-semibold text-ink">{title}</h3>
            <p className="mt-1.5 text-sm text-c-muted leading-relaxed">{body}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}

function CoverageGrid() {
  // Cuando hay ciudad, el formato canónico de URL es /categoria/<slug>-en-<ciudad>,
  // pero la home apunta a /buscar?ciudad=<ciudad> para que el usuario filtre desde ahí
  // sin forzar categoría.
  const cities = useMemo(() => COVERAGE_CITIES, []);
  return (
    <div
      className="grid gap-3"
      style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}
    >
      {cities.map((city) => (
        <Link
          key={city}
          to={`/buscar?ciudad=${encodeURIComponent(city)}`}
          className="rounded-xl border border-c-border bg-surface p-3 hover:border-slate-300 hover:shadow-sm transition group"
        >
          <span className="inline-flex items-center gap-2 text-sm font-medium text-ink">
            <IconMapPin className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600" />
            {city}
          </span>
        </Link>
      ))}
    </div>
  );
}

export default function Landing() {
  const { t } = useTranslation();

  // Antes constante de módulo (TRUST_POINTS): vive aquí para que se retraduzca
  // al cambiar de idioma.
  const trustPoints = [
    { icon: IconVerified, title: t('landing.hero.trustVerified'), body: t('landing.trust.verified.body') },
    { icon: IconWallet, title: t('landing.feature_no_fees'), body: t('landing.trust.noFees.body') },
    { icon: IconStarOutline, title: t('landing.trust.reviews.title'), body: t('landing.trust.reviews.body') },
    { icon: IconMegaphone, title: t('landing.trust.promotion.title'), body: t('landing.trust.promotion.body') },
  ];

  return (
    <>
      <SEOHead
        title={t('landing.seo.title')}
        description={t('landing.seo.description')}
      />

      <main className="bg-surface text-ink">
        {/* HERO con buscador guiado (no lista profesionales) */}
        <LandingHero />

        {/* CÓMO FUNCIONA — banda blanca con tabs cliente/autónomo */}
        <section className="bg-surface border-t border-slate-100">
          <div className="max-w-5xl mx-auto px-4 py-16 md:py-20">
            <h2 className="text-[12px] font-semibold uppercase tracking-[0.08em] text-c-muted mb-3">{t('footer.how_it_works')}</h2>
            <p className="text-2xl md:text-[28px] font-semibold tracking-tight text-ink max-w-2xl mb-6">
              {t('landing.howItWorks.title')}
            </p>
            <StepTabs />
          </div>
        </section>

        {/* CONFIANZA — banda suave navy soft */}
        <section style={{ background: 'hsl(var(--brand-surface))' }}>
          <div className="max-w-5xl mx-auto px-4 py-16 md:py-20">
            <h2 className="text-[12px] font-semibold uppercase tracking-[0.08em] text-c-muted mb-3">{t('landing.trust.eyebrow')}</h2>
            <p className="text-2xl md:text-[28px] font-semibold tracking-tight text-ink max-w-2xl">
              {t('landing.trust.title')}
            </p>
            <div
              className="mt-10 grid gap-4 md:gap-5"
              style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}
            >
              {trustPoints.map(({ icon: Icon, title, body }) => (
                <article key={title} className="rounded-2xl bg-surface border border-c-border p-5">
                  <span
                    className="inline-flex items-center justify-center w-10 h-10 rounded-xl"
                    style={{ backgroundColor: 'rgba(0,37,92,0.08)', color: NAVY }}
                  >
                    <Icon className="w-5 h-5" />
                  </span>
                  <h3 className="mt-4 font-semibold text-ink">{title}</h3>
                  <p className="mt-1.5 text-sm text-c-muted leading-relaxed">{body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* TRUST SLIDER existente — banda blanca.
            Reservamos altura mínima en el fallback para que su llegada
            no empuje al CTA de abajo (anti-CLS). Mismas dimensiones que
            la sección real ya rendereada. */}
        <Suspense fallback={<div className="trust-slider-reserve" aria-hidden="true" />}>
          <TrustSlider />
        </Suspense>

        {/* COBERTURA POR CIUDAD — banda blanca */}
        <section className="bg-surface border-t border-slate-100">
          <div className="max-w-5xl mx-auto px-4 py-16 md:py-20">
            <h2 className="text-[12px] font-semibold uppercase tracking-[0.08em] text-c-muted mb-3">{t('landing.coverage.eyebrow')}</h2>
            <p className="text-2xl md:text-[28px] font-semibold tracking-tight text-ink max-w-2xl mb-8">
              {t('landing.coverage.title')}
            </p>
            <CoverageGrid />
            <p className="mt-6 text-xs text-c-muted">
              {t('landing.coverage.note')}
            </p>
          </div>
        </section>

        {/* CTA FINAL AUTÓNOMOS — banda navy */}
        <section style={{ background: NAVY }}>
          <div className="max-w-4xl mx-auto px-4 py-16 md:py-20 text-center text-white">
            <h2
              className="font-semibold tracking-tight"
              style={{ fontSize: 'clamp(1.7rem, 4.4vw, 2.5rem)', lineHeight: 1.1, color: '#ffffff' }}
            >
              <span style={{ color: '#ffffff' }}>{t('landing.cta_pro_title')}</span>{' '}
              <span style={{ color: GOLD }}>{t('landing.finalCta.title')}</span>
            </h2>
            <p className="mt-4 max-w-xl mx-auto" style={{ color: 'rgba(255,255,255,0.88)' }}>
              {t('landing.finalCta.body')}
            </p>
            <div className="mt-8 flex justify-center">
              <Link
                to="/registro?tipo=autonomo"
                className="inline-flex items-center justify-center gap-2 h-12 px-7 rounded-xl font-semibold"
                style={{ backgroundColor: GOLD, color: NAVY }}
              >
                {t('nav.becomeProFree')}
                <IconArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
