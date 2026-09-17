import React, { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation, Trans } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import {
  IconSearch,
  IconChevronDown,
  IconShield,
  IconVerified,
  IconBuilding,
  IconArrowRight,
  IconHelp,
} from "@/components/Icons";
import { base44 } from "@/api/base44Client";
import { PROVINCIAS, CIUDADES_POR_PROVINCIA } from "@/components/utils/locationsData";
import { slugify } from "@/lib/seoUrl";

// ── Tokens de marca ──────────────────────────────────────────────────────
// Una sola paleta, disciplinada: navy primario, dorado de acento, neutros.
const NAVY = "#00255C";
const NAVY_INK = "#001A45";       // hover / pressed
const NAVY_SOFT = "rgba(0, 37, 92, 0.06)";
const NAVY_BORDER = "rgba(0, 37, 92, 0.14)";
const GOLD = "#F5C13D";
const GOLD_HOVER = "#E2A91F";

const RADIUS = { sm: 8, md: 12, lg: 16, xl: 20, xxl: 24 };

// ── Helpers ──────────────────────────────────────────────────────────────
const sortCategoriesByName = (list) =>
  [...list].sort((a, b) => (a?.name || '').localeCompare(b?.name || '', 'es'));

function buildCategorySlug(cat) {
  if (cat?.slug) return cat.slug;
  if (cat?.name) return slugify(cat.name);
  return '';
}

// ── Select nativo accesible ──────────────────────────────────────────────
function NativeSelect({ id, label, value, onChange, placeholder, options, disabled }) {
  return (
    <label htmlFor={id} className="block">
      <span className="block text-[11px] font-semibold text-c-muted mb-1.5 uppercase tracking-[0.06em]">
        {label}
      </span>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="w-full h-12 appearance-none rounded-xl bg-surface border border-c-border pl-3.5 pr-9 text-[15px] text-ink hover:border-slate-300 focus:outline-none focus-visible:border-[#00255C] focus-visible:ring-2 focus-visible:ring-[#00255C]/20 transition disabled:bg-soft disabled:text-slate-400 disabled:cursor-not-allowed"
        >
          <option value="">{placeholder}</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <IconChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
      </div>
    </label>
  );
}

// ── Skeleton para la rejilla de categorías ───────────────────────────────
function CategoryChipSkeleton() {
  return (
    <div className="flex flex-col items-start gap-3 rounded-2xl border border-c-border bg-surface p-4 animate-pulse" aria-hidden="true">
      <div className="w-10 h-10 rounded-xl bg-soft" />
      <div className="h-3.5 w-20 rounded bg-soft" />
    </div>
  );
}

// ── Hero ─────────────────────────────────────────────────────────────────
export default function LandingHero() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [category, setCategory] = useState("");
  const [provincia, setProvincia] = useState("");
  const [ciudad, setCiudad] = useState("");
  const [showFreeText, setShowFreeText] = useState(false);
  const [freeText, setFreeText] = useState("");
  const freeTextRef = useRef(null);

  useEffect(() => {
    if (showFreeText) freeTextRef.current?.focus();
  }, [showFreeText]);

  // Categorías dinámicas desde service_categories.
  const { data: rawCategories, isLoading: loadingCategories } = useQuery({
    queryKey: ['serviceCategories'],
    queryFn: () => base44.entities.ServiceCategory.list(),
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 60,
    refetchOnWindowFocus: false,
  });

  const categories = useMemo(() => {
    if (!Array.isArray(rawCategories)) return [];
    // Normaliza, filtra los que no tienen nombre y ordena alfabéticamente.
    return sortCategoriesByName(
      rawCategories
        .filter((c) => c && c.name)
        .map((c) => ({
          id: c.id,
          name: c.name,
          slug: buildCategorySlug(c),
          icon: typeof c.icon === 'string' ? c.icon.trim() : '',
          description: c.description || '',
        }))
        .filter((c) => c.slug)
    );
  }, [rawCategories]);

  const categoryOptions = useMemo(
    () => categories.map((c) => ({ value: c.slug, label: c.name })),
    [categories]
  );

  const provinciaOptions = useMemo(
    () => PROVINCIAS.map((p) => ({ value: p, label: p })),
    []
  );

  const ciudadOptions = useMemo(() => {
    if (!provincia) return [];
    return (CIUDADES_POR_PROVINCIA[provincia] || []).map((c) => ({ value: c, label: c }));
  }, [provincia]);

  const buildSearchUrl = () => {
    if (category) {
      const catSlug = category; // ya es slug en categoryOptions
      if (ciudad) return `/categoria/${catSlug}-en-${slugify(ciudad)}`;
      return `/categoria/${catSlug}${provincia ? `?provincia=${encodeURIComponent(provincia)}` : ""}`;
    }
    const params = new URLSearchParams();
    if (provincia) params.set("provincia", provincia);
    if (ciudad) params.set("ciudad", ciudad);
    const qs = params.toString();
    return qs ? `/buscar?${qs}` : "/buscar";
  };

  const handleSearch = () => navigate(buildSearchUrl());

  const handleFreeTextSubmit = (e) => {
    e.preventDefault();
    const q = freeText.trim();
    if (!q) {
      navigate("/buscar");
      return;
    }
    navigate(`/buscar?q=${encodeURIComponent(q)}`);
  };

  const handleCategoryClick = (cat) => navigate(`/categoria/${cat.slug}`);

  return (
    <section
      className="relative w-full"
      style={{ background: "#FBFCFE" }}
    >
      <div className="max-w-6xl mx-auto px-4 pt-6 pb-10 md:pt-20 md:pb-20">
        {/* Eyebrow */}
        <div className="flex justify-center mb-3 md:mb-6">
          <div
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] md:text-xs font-medium"
            style={{ backgroundColor: NAVY_SOFT, color: NAVY }}
          >
            <IconShield className="w-3.5 h-3.5" />
            {t('landing.hero.eyebrow')}
          </div>
        </div>

        {/* Headline — tipografía con jerarquía, un solo acento dorado */}
        <h1
          className="text-center font-semibold tracking-tight"
          style={{
            color: NAVY,
            lineHeight: 1.05,
            letterSpacing: "-0.025em",
            fontSize: "clamp(1.6rem, 5.6vw, 3.5rem)",
          }}
        >
          <Trans
            i18nKey="landing.hero.title"
            components={{ 1: <br className="hidden sm:block" />, 3: <span style={{ color: GOLD }} /> }}
          />
        </h1>

        <p className="text-center text-c-muted mt-2 md:mt-5 max-w-xl mx-auto text-[14px] md:text-lg leading-snug md:leading-relaxed">
          {t('landing.hero.subtitle')}
        </p>

        {/* Panel de búsqueda guiada */}
        <div
          className="mt-4 md:mt-12 mx-auto bg-surface border border-slate-100"
          style={{
            maxWidth: 920,
            borderRadius: RADIUS.xxl,
            boxShadow: "0 1px 2px rgba(0,0,0,0.04), 0 16px 48px -20px rgba(0, 37, 92, 0.20)",
          }}
        >
          <div className="p-4 md:p-5">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3 md:items-end">
              <NativeSelect
                id="hero-category"
                label={t('landing.hero.whatLabel')}
                value={category}
                onChange={setCategory}
                placeholder={loadingCategories ? t('landing.hero.loadingCategories') : t('landing.hero.chooseService')}
                options={categoryOptions}
                disabled={loadingCategories || categoryOptions.length === 0}
              />
              <NativeSelect
                id="hero-provincia"
                label={t('landing.hero.whereLabel')}
                value={provincia}
                onChange={(v) => { setProvincia(v); setCiudad(""); }}
                placeholder={t('provinceField')}
                options={provinciaOptions}
              />
              <button
                type="button"
                onClick={handleSearch}
                className="h-12 md:w-auto w-full rounded-xl px-6 font-semibold text-[15px] inline-flex items-center justify-center gap-2 text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00255C]/30 focus-visible:ring-offset-2"
                style={{ backgroundColor: NAVY }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = NAVY_INK)}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = NAVY)}
              >
                <IconSearch className="w-4 h-4" />
                {t('common.search')}
              </button>
            </div>

            {/* Ciudad opcional cuando hay provincia */}
            {provincia && ciudadOptions.length > 0 && (
              <div className="mt-3">
                <NativeSelect
                  id="hero-ciudad"
                  label={t('landing.hero.cityLabel', { province: provincia })}
                  value={ciudad}
                  onChange={setCiudad}
                  placeholder={t('landing.hero.wholeProvince')}
                  options={ciudadOptions}
                />
              </div>
            )}
          </div>

          {/* Búsqueda libre — secundaria, oculta hasta hacer clic */}
          <div className="border-t border-slate-100 px-4 md:px-5 py-3">
            {!showFreeText ? (
              <button
                type="button"
                onClick={() => setShowFreeText(true)}
                className="inline-flex items-center gap-1.5 text-xs text-c-muted hover:text-slate-700 underline underline-offset-2 focus:outline-none focus-visible:text-ink"
              >
                <IconHelp className="w-3.5 h-3.5" />
                {t('landing.hero.keywordSearch')}
              </button>
            ) : (
              <form onSubmit={handleFreeTextSubmit} className="flex gap-2 w-full">
                <input
                  ref={freeTextRef}
                  type="text"
                  value={freeText}
                  onChange={(e) => setFreeText(e.target.value)}
                  placeholder={t('landing.hero.keywordPlaceholder')}
                  className="flex-1 h-10 rounded-lg border border-c-border px-3 text-sm text-ink placeholder:text-slate-400 focus:outline-none focus-visible:border-[#00255C] focus-visible:ring-2 focus-visible:ring-[#00255C]/15"
                />
                <button
                  type="submit"
                  className="h-10 rounded-lg border border-c-border text-ink font-medium px-4 text-sm hover:bg-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00255C]/20"
                >
                  {t('common.search')}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Rejilla de servicios — dinámica desde service_categories ─────── */}
        <div className="mt-12 md:mt-16">
          <div className="flex items-end justify-between mb-4">
            <h2 className="text-[12px] font-semibold uppercase tracking-[0.08em] text-c-muted">
              {t('landing.hero.servicesTitle')}
            </h2>
            <button
              type="button"
              onClick={() => navigate("/buscar")}
              className="hidden sm:inline-flex items-center gap-1 text-sm font-medium hover:underline focus:outline-none focus-visible:underline"
              style={{ color: NAVY }}
            >
              {t('landing.hero.viewAll')}
              <IconArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div
            className="grid gap-3 md:gap-3.5 hero-cats-grid"
            style={{ gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))" }}
          >
            {loadingCategories
              ? /* Skeleton count = nº esperado de categorías reales.
                   La BD tiene ~24 categorías activas; renderizamos 24
                   skeletons para que el grid no crezca al swap (anti-CLS). */
                Array.from({ length: 24 }).map((_, i) => <CategoryChipSkeleton key={i} />)
              : categories.map((cat) => (
                  <button
                    key={cat.id || cat.slug}
                    type="button"
                    onClick={() => handleCategoryClick(cat)}
                    title={cat.description || cat.name}
                    className="group flex flex-col items-start gap-3 rounded-2xl border border-c-border bg-surface p-4 text-left transition focus:outline-none hover:-translate-y-[1px]"
                    style={{
                      transition: "border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease",
                    }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = NAVY; e.currentTarget.style.boxShadow = `0 0 0 3px ${NAVY_SOFT}`; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = "rgb(226 232 240)"; e.currentTarget.style.boxShadow = "none"; }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = NAVY_BORDER; e.currentTarget.style.boxShadow = "0 6px 20px -10px rgba(0,37,92,0.18)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgb(226 232 240)"; e.currentTarget.style.boxShadow = "none"; }}
                  >
                    <span
                      className="inline-flex items-center justify-center w-10 h-10 rounded-xl text-base"
                      style={{ backgroundColor: NAVY_SOFT, color: NAVY }}
                      aria-hidden="true"
                    >
                      {cat.icon || cat.name.charAt(0)}
                    </span>
                    <span className="font-semibold text-ink text-[14px] leading-snug">
                      {cat.name}
                    </span>
                  </button>
                ))}
          </div>

          <button
            type="button"
            onClick={() => navigate("/buscar")}
            className="sm:hidden mt-4 inline-flex items-center gap-1 text-sm font-medium"
            style={{ color: NAVY }}
          >
            {t('landing.hero.viewAll')}
            <IconArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Banner "soy autónomo" — secundario, navy/dorado contenidos ───── */}
        <div
          className="mt-14 md:mt-16 rounded-2xl border bg-surface"
          style={{ borderColor: NAVY_BORDER }}
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-5 md:p-6">
            <div className="flex items-start md:items-center gap-3">
              <span
                className="inline-flex items-center justify-center w-10 h-10 rounded-xl flex-shrink-0"
                style={{ backgroundColor: NAVY, color: "white" }}
                aria-hidden="true"
              >
                <IconBuilding className="w-5 h-5" />
              </span>
              <div>
                <p className="font-semibold text-ink">{t('landing.cta_pro_title')}</p>
                <p className="text-sm text-c-muted">
                  {t('landing.hero.proBannerText')}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate("/registro?tipo=autonomo")}
              className="rounded-xl font-semibold h-11 px-5 md:px-6 inline-flex items-center justify-center gap-2 flex-shrink-0 w-full md:w-auto focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
              style={{ backgroundColor: GOLD, color: NAVY }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = GOLD_HOVER)}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = GOLD)}
            >
              {t('nav.becomeProFree')}
              <IconArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Señales de confianza honestas (sin números inventados) */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-c-muted">
          <span className="inline-flex items-center gap-1.5">
            <IconVerified className="w-3.5 h-3.5" style={{ color: NAVY }} />
            {t('landing.hero.trustVerified')}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <IconShield className="w-3.5 h-3.5" style={{ color: NAVY }} />
            {t('landing.feature_no_fees')}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <IconSearch className="w-3.5 h-3.5" style={{ color: NAVY }} />
            {t('landing.feature_direct_contact')}
          </span>
        </div>
      </div>
    </section>
  );
}
