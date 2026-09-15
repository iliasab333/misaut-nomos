import React, { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";

// Animación de entrada del slide: CSS, no texto.
const FADE_IN_KEYFRAMES = `
  @keyframes trustFadeIn {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
  }
`;

export default function WhyTrustSlider() {
  const { t } = useTranslation();
  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Antes constante de módulo (SLIDES): vive aquí para que se retraduzca al
  // cambiar de idioma. Colores y emojis no son texto y se quedan tal cual.
  const slides = [
    { emoji: "🏆", title: t('home.whyTrust.slides.bestOnly.title'), desc: t('home.whyTrust.slides.bestOnly.desc'), from: "#1e3a8a", to: "#2563eb", accent: "#93c5fd" },
    { emoji: "📣", title: t('home.whyTrust.slides.promotion.title'), desc: t('home.whyTrust.slides.promotion.desc'), from: "#7c3aed", to: "#a855f7", accent: "#e9d5ff" },
    { emoji: "⭐", title: t('home.whyTrust.slides.verifiedReviews.title'), desc: t('home.whyTrust.slides.verifiedReviews.desc'), from: "#d97706", to: "#f59e0b", accent: "#fef3c7" },
    { emoji: "🚫", title: t('home.whyTrust.slides.zeroTolerance.title'), desc: t('home.whyTrust.slides.zeroTolerance.desc'), from: "#dc2626", to: "#ef4444", accent: "#fee2e2" },
    { emoji: "🔒", title: t('home.whyTrust.slides.noCommitment.title'), desc: t('home.whyTrust.slides.noCommitment.desc'), from: "#065f46", to: "#059669", accent: "#d1fae5" },
    { emoji: "📋", title: t('home.whyTrust.slides.completeProfiles.title'), desc: t('home.whyTrust.slides.completeProfiles.desc'), from: "#0e7490", to: "#06b6d4", accent: "#cffafe" },
  ];
  const slideCount = slides.length;

  const next = useCallback(() => {
    setCurrent((c) => (c + 1) % slideCount);
  }, [slideCount]);

  const prev = useCallback(() => {
    setCurrent((c) => (c - 1 + slideCount) % slideCount);
  }, [slideCount]);

  useEffect(() => {
    if (isPaused) return;
    const id = setInterval(next, 4000);
    return () => clearInterval(id);
  }, [next, isPaused]);

  const slide = slides[current];

  return (
    <section className="py-14 md:py-20 bg-white" style={{ overflow: "hidden" }}>
      <div className="max-w-4xl mx-auto px-4">
        {/* Título */}
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-4xl font-extrabold text-gray-900 tracking-tight">
            {t('home.whyTrust.title')}
          </h2>
          <p className="text-gray-500 mt-2 text-base">{t('home.whyTrust.subtitle')}</p>
        </div>

        {/* Slider */}
        <div
          className="relative rounded-3xl overflow-hidden shadow-2xl select-none"
          style={{
            background: `linear-gradient(135deg, ${slide.from} 0%, ${slide.to} 100%)`,
            transition: "background 0.5s ease",
            minHeight: "260px",
          }}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onTouchStart={() => setIsPaused(true)}
          onTouchEnd={() => setIsPaused(false)}
        >
          {/* Content */}
          <div className="relative z-10 flex flex-col items-center justify-center text-center px-8 md:px-16 py-12 md:py-14 min-h-[260px]">
            <div
              key={current}
              style={{ animation: "trustFadeIn 0.45s ease forwards" }}
            >
              <div className="text-6xl md:text-7xl mb-5 leading-none">{slide.emoji}</div>
              <h3 className="text-xl md:text-3xl font-extrabold text-white mb-4 leading-tight">
                {slide.title}
              </h3>
              <p className="text-white/85 text-base md:text-lg leading-relaxed max-w-xl mx-auto">
                {slide.desc}
              </p>
            </div>
          </div>

          {/* Flechas */}
          <button
            onClick={prev}
            aria-label={t('home.whyTrust.previous')}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/20 hover:bg-white/35 flex items-center justify-center transition-all backdrop-blur-sm"
            style={{ touchAction: "manipulation" }}
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <button
            onClick={next}
            aria-label={t('common.next')}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/20 hover:bg-white/35 flex items-center justify-center transition-all backdrop-blur-sm"
            style={{ touchAction: "manipulation" }}
          >
            <ChevronRight className="w-5 h-5 text-white" />
          </button>

          {/* Decoración de fondo */}
          <div
            style={{
              position: "absolute",
              top: "-60px",
              right: "-60px",
              width: "220px",
              height: "220px",
              borderRadius: "50%",
              background: "rgba(255,255,255,0.07)",
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: "-50px",
              left: "-50px",
              width: "180px",
              height: "180px",
              borderRadius: "50%",
              background: "rgba(255,255,255,0.07)",
              pointerEvents: "none",
            }}
          />
        </div>

        {/* Dots */}
        <div className="flex items-center justify-center gap-2 mt-6">
          {slides.map((s, i) => (
            <button
              key={i}
              onClick={() => { setCurrent(i); setIsPaused(true); setTimeout(() => setIsPaused(false), 6000); }}
              aria-label={t('home.whyTrust.goToSlide', { number: i + 1 })}
              className="transition-all duration-300 rounded-full"
              style={{
                width: i === current ? "28px" : "10px",
                height: "10px",
                background: i === current ? slide.to : "#d1d5db",
              }}
            />
          ))}
        </div>

        {/* Slide counter */}
        <p className="text-center text-gray-400 text-xs mt-3">
          {current + 1} / {slides.length}
        </p>
      </div>

      <style>{FADE_IN_KEYFRAMES}</style>
    </section>
  );
}