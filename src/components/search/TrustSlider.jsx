import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  IconChevronLeft,
  IconChevronRight,
  IconTrophy,
  IconMegaphone,
  IconStarOutline,
  IconShieldOff,
  IconLock,
  IconFileCheck,
} from "@/components/Icons";

// Paleta de marca
const NAVY = "#00255C";

// Número de tarjetas: fijo, para que los callbacks de navegación no dependan
// del array traducido (que se construye en cada render).
const CARD_COUNT = 6;

export default function TrustSlider() {
  const { t } = useTranslation();
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);

  // Textos dentro del componente para que se retraduzcan al cambiar de idioma.
  const cards = [
    { icon: IconTrophy, title: t('home.whyTrust.slides.bestOnly.title'), text: t('search.trust.bestOnly.body') },
    { icon: IconMegaphone, title: t('search.trust.promotion.title'), text: t('search.trust.promotion.body') },
    { icon: IconStarOutline, title: t('home.whyTrust.slides.verifiedReviews.title'), text: t('search.trust.verifiedReviews.body') },
    { icon: IconShieldOff, title: t('search.trust.zeroTolerance.title'), text: t('search.trust.zeroTolerance.body') },
    { icon: IconLock, title: t('home.whyTrust.slides.noCommitment.title'), text: t('search.trust.noCommitment.body') },
    { icon: IconFileCheck, title: t('search.trust.completeProfiles.title'), text: t('search.trust.completeProfiles.body') },
  ];

  const next = useCallback(() => setCurrent((c) => (c + 1) % CARD_COUNT), []);
  const prev = useCallback(() => setCurrent((c) => (c - 1 + CARD_COUNT) % CARD_COUNT), []);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(next, 5000);
    return () => clearInterval(id);
  }, [next, paused]);

  return (
    <section className="py-14 md:py-20 border-t border-c-border" style={{ background: 'hsl(var(--brand-surface))' }}>
      <div className="max-w-5xl mx-auto px-4">
        <div className="text-center mb-8 md:mb-10">
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight" style={{ color: NAVY }}>
            {t('home.whyTrust.title')}
          </h2>
          <p className="text-c-muted mt-2 text-sm md:text-base">
            {t('search.trust.subtitle')}
          </p>
        </div>

        {/* Desktop: 3 columnas, todas visibles */}
        <div className="hidden md:grid md:grid-cols-3 gap-4">
          {cards.map(({ icon: Icon, title, text }, i) => (
            <div
              key={i}
              className="bg-surface rounded-2xl border border-c-border p-5 flex flex-col"
            >
              <span
                className="inline-flex items-center justify-center w-10 h-10 rounded-xl mb-4"
                style={{ backgroundColor: "rgba(0, 37, 92, 0.08)", color: NAVY }}
              >
                <Icon className="w-5 h-5" />
              </span>
              <h3 className="font-semibold text-ink text-base mb-1.5">{title}</h3>
              <p className="text-c-muted text-sm leading-relaxed">{text}</p>
            </div>
          ))}
        </div>

        {/* Móvil: slider de una tarjeta */}
        <div
          className="md:hidden relative"
          onTouchStart={() => setPaused(true)}
          onTouchEnd={() => setPaused(false)}
        >
          <div
            className="bg-surface rounded-2xl border border-c-border p-6 flex flex-col items-start text-left"
            style={{ minHeight: "180px" }}
            key={current}
          >
            <span
              className="inline-flex items-center justify-center w-11 h-11 rounded-xl mb-4"
              style={{ backgroundColor: "rgba(0, 37, 92, 0.08)", color: NAVY }}
            >
              {React.createElement(cards[current].icon, { className: "w-5 h-5" })}
            </span>
            <h3 className="font-semibold text-ink text-lg mb-1.5">
              {cards[current].title}
            </h3>
            <p className="text-c-muted text-sm leading-relaxed">{cards[current].text}</p>
          </div>

          <button
            onClick={prev}
            aria-label={t('home.whyTrust.previous')}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 w-9 h-9 rounded-full bg-surface border border-c-border shadow-sm flex items-center justify-center"
          >
            <IconChevronLeft className="w-4 h-4 text-c-muted" />
          </button>
          <button
            onClick={next}
            aria-label={t('common.next')}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 w-9 h-9 rounded-full bg-surface border border-c-border shadow-sm flex items-center justify-center"
          >
            <IconChevronRight className="w-4 h-4 text-c-muted" />
          </button>

          <div className="flex justify-center gap-2 mt-5">
            {cards.map((_, i) => (
              <button
                key={i}
                onClick={() => {
                  setCurrent(i);
                  setPaused(true);
                  setTimeout(() => setPaused(false), 5000);
                }}
                aria-label={t('search.trust.slideAria', { number: i + 1 })}
                className="rounded-full transition-all duration-300"
                style={{
                  width: i === current ? "24px" : "8px",
                  height: "8px",
                  background: i === current ? NAVY : "#cbd5e1",
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
