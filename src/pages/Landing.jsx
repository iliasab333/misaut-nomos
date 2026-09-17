// Portada de MisAutónomos.
//
// Maqueta portada de khdemlidaba, con los colores y el contenido de
// MisAutónomos:
//   1. HERO a dos columnas — titular, buscador, señales de confianza y carril
//      de oficios a la izquierda; la maqueta de móvil a la derecha (debajo de
//      los chips, en versión compacta, cuando no hay sitio).
//   2. GRATIS + CÓMO FUNCIONA — el bloque de lo que no cuesta nada, y los tres
//      pasos en iconos.
//   3. SOBRE NOSOTROS — qué es MisAutónomos, dicho con todas las letras.
//   4. CTA final para el autónomo, sobre fondo azul marino.
//
// Lo que NO se ha portado: el tablón de «publica tu demanda» y el programa de
// promoción en Instagram de khdemlidaba (PromoInstagramSection,
// PromoFeaturedCard, PromoJobCard). MisAutónomos no tiene ninguna de las dos
// cosas, y anunciarlas sería mentir. El sitio que ocupaban en la sección 2 —
// una carta grande y dos cartas horizontales detrás — lo llenan cosas que sí
// existen: el bloque «gratis» (alta y perfil gratis, cero comisiones y la
// promoción que ya pagamos nosotros) y, tras él, el blog y el centro de
// ayuda, que tampoco cuestan nada.

import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  IconArrowRight,
  IconSearch,
  IconUsers,
  IconMessageSquare,
  IconVerified,
  IconStarOutline,
  IconWhatsApp,
  IconCheck,
  IconMegaphone,
  IconBook,
  IconLifeBuoy,
} from '@/components/Icons';
import SEOHead from '@/components/seo/SEOHead';
import HeroSearch, { useServiceCategories } from '@/components/home/HeroSearch';
import { HeroMockupDesktop, HeroMockupMobile } from '@/components/home/HeroMockup';

// Oficios del carril del hero, por orden de intención de búsqueda. Son slugs:
// si uno no está en la base de datos no se pinta, y el carril se completa con
// las categorías que haya, hasta ocho. Así la portada nunca enseña un chip que
// lleve a una categoría vacía.
const HERO_CHIP_SLUGS = [
  'electricista',
  'fontanero',
  'pintor',
  'albanil-reformas',
  'cerrajero',
  'carpintero',
  'jardinero',
  'autonomo-limpieza',
];
const HERO_CHIP_COUNT = 8;

function HeroChips() {
  const { categories } = useServiceCategories();
  if (!categories.length) return null;

  const bySlug = new Map(categories.map((c) => [c.slug, c]));
  const picked = HERO_CHIP_SLUGS.map((slug) => bySlug.get(slug)).filter(Boolean);
  const rest = categories.filter((c) => !picked.includes(c));
  const chips = [...picked, ...rest].slice(0, HERO_CHIP_COUNT);

  return (
    <div className="scroll-x -mx-5 px-5 sm:mx-0 sm:px-0 sm:flex-wrap sm:overflow-visible pb-1">
      {chips.map((c) => (
        <Link key={c.slug} to={`/categoria/${c.slug}`} className="chip">
          {c.name}
        </Link>
      ))}
    </div>
  );
}

function Step({ icon: Icon, title, body }) {
  return (
    <div>
      <div className="w-12 h-12 rounded-lg border border-c-border flex items-center justify-center mb-4 sm:mb-6">
        <Icon className="w-6 h-6 text-brand-navy" />
      </div>
      <h3 className="text-ink font-semibold text-lg">{title}</h3>
      <p className="mt-2 sm:mt-3 text-c-muted leading-relaxed">{body}</p>
    </div>
  );
}

function Benefit({ children }) {
  return (
    <li className="flex items-start gap-3">
      <span className="w-9 h-9 flex-shrink-0 rounded-lg border border-c-border flex items-center justify-center">
        <IconCheck className="w-[18px] h-[18px] text-brand-navy" />
      </span>
      <span className="text-ink font-medium pt-1.5 leading-snug">{children}</span>
    </li>
  );
}

// Carta secundaria de la sección «gratis»: el mismo gabarito horizontal que
// khdemlidaba usa para las ofertas que van detrás de la carta grande —
// antetítulo con icono, titular, cuerpo y el botón a la derecha. Aquí no
// vende nada: son dos cosas que MisAutónomos ya tiene y que tampoco cuestan
// nada, el blog y la ayuda.
function OfferCard({ icon: Icon, eyebrow, title, body, cta, to }) {
  return (
    <div className="card p-5 sm:p-6 mt-4 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-brand-navy inline-flex items-center gap-2">
          <Icon className="w-4 h-4" /> {eyebrow}
        </p>
        <p className="mt-1.5 text-ink font-semibold" style={{ fontSize: '1.1rem' }}>{title}</p>
        <p className="mt-1.5 text-sm text-c-muted leading-relaxed">{body}</p>
      </div>
      <Link to={to} className="btn-secondary flex-shrink-0 self-start sm:self-center">
        {cta}
        <IconArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}

export default function Landing() {
  const { t } = useTranslation();

  return (
    <>
      <SEOHead title={t('landing.seo.title')} description={t('landing.seo.description')} />

      <main className="bg-canvas text-ink">
        {/* ── HERO ─────────────────────────────────────────────────────── */}
        <section className="pt-6 pb-8 sm:pt-16 sm:pb-8">
          <div className="container-page">
            <div className="grid grid-cols-1 lg:grid-cols-[55%_45%] gap-10 lg:gap-8 items-center">
              {/* Izquierda — texto, buscador, confianza, oficios */}
              <div className="min-w-0">
                <h1
                  className="hero-enter text-brand-navy font-bold leading-[1.05]"
                  style={{ fontSize: 'clamp(2rem, 5.5vw, 3.75rem)', letterSpacing: '-0.02em' }}
                >
                  {t('landing.hero.headlineA')}{' '}
                  <span className="text-brand-gold-deep">{t('landing.hero.headlineB')}</span>
                </h1>

                <p
                  className="hero-enter hero-enter-delay-1 mt-3 sm:mt-4 text-c-muted"
                  style={{ fontSize: 'clamp(1rem, 1.5vw, 1.15rem)', lineHeight: 1.5 }}
                >
                  {t('landing.hero.pitch')}
                </p>

                <div className="hero-enter hero-enter-delay-1 mt-5 sm:mt-6">
                  <HeroSearch />
                </div>

                {/* Salida secundaria: ver el listado entero sin elegir nada. */}
                <div className="hero-enter hero-enter-delay-2 mt-3">
                  <Link
                    to="/buscar"
                    className="group inline-flex items-center gap-2 text-sm text-c-muted hover:text-ink transition-colors"
                  >
                    <span>{t('landing.hero.browseAllHint')}</span>
                    <IconArrowRight className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition-opacity" />
                  </Link>
                </div>

                {/* Tres señales de confianza, sin cifras inventadas. */}
                <ul className="hero-enter hero-enter-delay-2 mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm text-c-muted">
                  <li className="inline-flex items-center gap-1.5">
                    <IconVerified className="w-3.5 h-3.5 text-success" />
                    <span>{t('landing.hero.trustVerified')}</span>
                  </li>
                  <li className="inline-flex items-center gap-1.5">
                    <IconStarOutline className="w-3.5 h-3.5 text-star" />
                    <span>{t('landing.trust.reviews.title')}</span>
                  </li>
                  <li className="inline-flex items-center gap-1.5">
                    <IconWhatsApp size={14} className="text-whatsapp" />
                    <span>{t('landing.hero.trustWhatsapp')}</span>
                  </li>
                </ul>

                <div className="hero-enter hero-enter-delay-3 mt-5">
                  <HeroChips />
                </div>

                {/* Móvil: la maqueta, compacta, después de los chips. */}
                <div className="lg:hidden mt-6">
                  <HeroMockupMobile />
                </div>
              </div>

              {/* Derecha — maqueta de móvil */}
              <div className="hidden lg:block relative">
                <HeroMockupDesktop />
              </div>
            </div>
          </div>
        </section>

        {/* ── GRATIS + CÓMO FUNCIONA ───────────────────────────────────── */}
        <section className="section border-t border-c-border">
          <div className="container-page">
            <div className="max-w-2xl mx-auto sm:text-center mb-8 sm:mb-12">
              <p className="text-sm font-semibold text-brand-navy inline-flex items-center gap-2">
                <IconMegaphone className="w-4 h-4" /> {t('landing.free.eyebrow')}
              </p>
              <h2
                id="landing-free-title"
                className="mt-2 font-semibold tracking-tight text-brand-navy"
                style={{ fontSize: 'clamp(1.6rem, 3.6vw, 2.25rem)', lineHeight: 1.15 }}
              >
                {t('landing.free.title')}
              </h2>
            </div>

            <div className="card grid grid-cols-1 lg:grid-cols-[1.4fr_1fr]" aria-labelledby="landing-free-title">
              <div className="p-6 sm:p-10">
                <p className="text-c-muted leading-relaxed max-w-xl" style={{ fontSize: 'clamp(1rem, 1.3vw, 1.08rem)' }}>
                  {t('landing.free.body')}
                </p>
                <ul className="mt-7 space-y-4">
                  <Benefit>{t('landing.free.b1')}</Benefit>
                  <Benefit>{t('landing.free.b2')}</Benefit>
                  <Benefit>{t('landing.free.b3')}</Benefit>
                </ul>
              </div>

              <div className="p-6 sm:p-10 bg-soft flex flex-col">
                <p
                  className="text-brand-navy font-bold tabular-nums"
                  style={{ fontSize: 'clamp(2.25rem, 5vw, 3rem)', lineHeight: 1 }}
                >
                  {t('landing.free.price')}
                </p>
                <p className="mt-5 text-sm text-c-muted leading-relaxed">{t('landing.free.note')}</p>
                <div className="mt-auto pt-7">
                  <Link
                    to="/para-autonomos"
                    className="btn btn-lg w-full bg-brand-navy text-white hover:bg-brand-navy-deep"
                  >
                    {t('landing.free.cta')}
                    <IconArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>

            <OfferCard
              icon={IconBook}
              eyebrow={t('landing.guides.eyebrow')}
              title={t('landing.guides.title')}
              body={t('landing.guides.body')}
              cta={t('landing.guides.cta')}
              to="/blog"
            />
            <OfferCard
              icon={IconLifeBuoy}
              eyebrow={t('landing.help.eyebrow')}
              title={t('landing.help.title')}
              body={t('landing.help.body')}
              cta={t('landing.help.cta')}
              to="/ayuda"
            />

            <div className="max-w-2xl mx-auto sm:text-center mb-10 sm:mb-16 mt-16 sm:mt-24">
              <h2
                className="font-semibold tracking-tight text-brand-navy"
                style={{ fontSize: 'clamp(1.6rem, 3.6vw, 2.25rem)', lineHeight: 1.15 }}
              >
                {t('landing.howItWorks.title')}
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-14">
              <Step
                icon={IconSearch}
                title={t('landing.howItWorks.client.filter.title')}
                body={t('landing.howItWorks.client.filter.body')}
              />
              <Step
                icon={IconUsers}
                title={t('landing.howItWorks.client.compare.title')}
                body={t('landing.howItWorks.client.compare.body')}
              />
              <Step
                icon={IconMessageSquare}
                title={t('landing.howItWorks.client.contact.title')}
                body={t('landing.howItWorks.client.contact.body')}
              />
            </div>
          </div>
        </section>

        {/* ── SOBRE NOSOTROS ───────────────────────────────────────────── */}
        <section className="section border-t border-c-border">
          <div className="container-page">
            <div className="max-w-2xl mx-auto">
              <h2
                className="mb-6 sm:mb-8 font-semibold tracking-tight text-brand-navy"
                style={{ fontSize: 'clamp(1.6rem, 3.6vw, 2.25rem)', lineHeight: 1.15 }}
              >
                {t('landing.about.title')}
              </h2>
              <div className="space-y-4 text-ink leading-relaxed" style={{ fontSize: 'clamp(1rem, 1.3vw, 1.05rem)' }}>
                <p>{t('landing.about.p1')}</p>
                <p>{t('landing.about.p2')}</p>
                <p>{t('landing.about.p3')}</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA FINAL — autónomos ────────────────────────────────────── */}
        <section className="section border-t border-c-border">
          <div className="container-page">
            <div className="bg-brand-navy text-white rounded-xl p-8 sm:p-16 text-center">
              <h2
                className="font-semibold tracking-tight text-white"
                style={{ fontSize: 'clamp(1.7rem, 4.4vw, 2.5rem)', lineHeight: 1.1 }}
              >
                {t('landing.cta_pro_title')}{' '}
                <span className="text-brand-gold">{t('landing.finalCta.title')}</span>
              </h2>
              <p className="mt-4 text-white/80 text-base sm:text-lg max-w-xl mx-auto">
                {t('landing.finalCta.body')}
              </p>
              <div className="mt-8">
                <Link
                  to="/registro?tipo=autonomo"
                  className="btn btn-lg w-full sm:w-auto bg-brand-gold text-brand-navy hover:bg-brand-gold-deep"
                >
                  {t('landing.finalCta.button')}
                  <IconArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
