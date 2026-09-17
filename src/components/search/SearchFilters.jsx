import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useCategoryName } from '@/hooks/useCategoryName';
import { IconFilter, IconStarOutline, IconClock } from "@/components/Icons";

export default function SearchFilters({
  filters,
  onFilterChange,
  availableCities,
  categories,
  provinces,
  isMobile = false
}) {
  const { t } = useTranslation();
  const categoryName = useCategoryName();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const advancedRef = useRef(null);

  // El Popover de Radix cerraba con click fuera y con Escape; aquí lo hace
  // este efecto. `mousedown` y no `click`: si el usuario empieza a arrastrar
  // dentro del panel y suelta fuera, no debe cerrarse.
  useEffect(() => {
    if (!showAdvanced) return undefined;
    const onDown = (e) => {
      if (advancedRef.current && !advancedRef.current.contains(e.target)) setShowAdvanced(false);
    };
    const onKey = (e) => { if (e.key === 'Escape') setShowAdvanced(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [showAdvanced]);

  const activeFiltersCount = [
    filters.category !== "all",
    filters.provincia !== "all",
    filters.ciudad !== "all",
    filters.minRating > 0,
    filters.availability !== "all"
  ].filter(Boolean).length;

  return (
    <div className="space-y-3" data-slot="search-filters">
      <div className="flex flex-col md:flex-row gap-2.5 items-center">

        {/* ── CATEGORÍA ── */}
        {/* Desktop: <select> nativo (antes Radix Select) */}
        <div className="hidden md:block w-full md:w-[220px]">
          <label htmlFor="select-categoria-desktop" className="sr-only">{t('search.filterPanel.category')}</label>
          <select
            id="select-categoria-desktop"
            value={filters.category}
            onChange={(e) => onFilterChange({ ...filters, category: e.target.value })}
            className="select"
          >
            <option value="all">{t('allCategories')}</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.name}>{categoryName(cat.slug, cat.name)}</option>
            ))}
          </select>
        </div>
        {/* Mobile: native <select> — iOS system picker, zero animation */}
        <div className="md:hidden w-full">
          <label htmlFor="select-categoria-mobile" className="sr-only">{t('search.filterPanel.category')}</label>
          <select
            id="select-categoria-mobile"
            value={filters.category}
            onChange={(e) => onFilterChange({ ...filters, category: e.target.value })}
            className="select"
          >
            <option value="all">{t('allCategories')}</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.name}>{categoryName(cat.slug, cat.name)}</option>
            ))}
          </select>
        </div>

        {/* ── PROVINCIA ── */}
        {/* Desktop: <select> nativo */}
        <div className="hidden md:block w-full md:w-[200px]">
          <label htmlFor="select-provincia-desktop" className="sr-only">{t('provinceField')}</label>
          <select
            id="select-provincia-desktop"
            value={filters.provincia}
            onChange={(e) => onFilterChange({ ...filters, provincia: e.target.value, ciudad: "all" })}
            className="select"
          >
            <option value="all">{t('allProvinces')}</option>
            {provinces.map((prov) => (
              <option key={prov} value={prov}>{prov}</option>
            ))}
          </select>
        </div>
        {/* Mobile: native <select> */}
        <div className="md:hidden w-full">
          <label htmlFor="select-provincia-mobile" className="sr-only">{t('provinceField')}</label>
          <select
            id="select-provincia-mobile"
            value={filters.provincia}
            onChange={(e) => onFilterChange({ ...filters, provincia: e.target.value, ciudad: "all" })}
            className="select"
          >
            <option value="all">{t('allProvinces')}</option>
            {provinces.map((prov) => (
              <option key={prov} value={prov}>{prov}</option>
            ))}
          </select>
        </div>

        {/* ── CIUDAD ── */}
        {/* Desktop: <select> nativo */}
        <div className="hidden md:block w-full md:w-[200px]">
          <label htmlFor="select-ciudad-desktop" className="sr-only">{t('cityField')}</label>
          <select
            id="select-ciudad-desktop"
            value={filters.ciudad}
            onChange={(e) => onFilterChange({ ...filters, ciudad: e.target.value })}
            disabled={filters.provincia === "all"}
            className="select disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="all">{filters.provincia === "all" ? t('search.filterPanel.selectProvinceFirst') : t('allCities')}</option>
            {availableCities.map((ciudad) => (
              <option key={ciudad} value={ciudad}>{ciudad}</option>
            ))}
          </select>
        </div>
        {/* Mobile: native <select> */}
        <div className="md:hidden w-full">
          <label htmlFor="select-ciudad-mobile" className="sr-only">{t('cityField')}</label>
          <select
            id="select-ciudad-mobile"
            value={filters.ciudad}
            onChange={(e) => onFilterChange({ ...filters, ciudad: e.target.value })}
            disabled={filters.provincia === "all"}
            className="select disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="all">{filters.provincia === "all" ? t('search.filterPanel.selectProvinceFirst') : t('allCities')}</option>
            {availableCities.map((ciudad) => (
              <option key={ciudad} value={ciudad}>{ciudad}</option>
            ))}
          </select>
        </div>

        {/* "Filtros avanzados" — hidden on mobile (always-visible layout handles it) */}
        {!isMobile && (
          <div className="relative" ref={advancedRef}>
            <button
              type="button"
              onClick={() => setShowAdvanced((v) => !v)}
              aria-expanded={showAdvanced}
              aria-label={t('search.filters_advanced')}
              className="btn-secondary btn-sm relative"
            >
              <IconFilter size={16} />
              {t('search.filters_advanced')}
              {activeFiltersCount > 3 && (
                <span className="badge-accent ml-2">
                  {activeFiltersCount - 3}
                </span>
              )}
            </button>

            {showAdvanced && (
              <div className="card p-4 absolute end-0 top-full mt-2 w-80 z-20">
                <div className="space-y-4">
                  <div>
                    <label htmlFor="filter-min-rating" className="text-sm font-medium flex items-center gap-2 mb-2">
                      <IconStarOutline className="text-star" />
                      {t('search.filterPanel.minRating')}
                    </label>
                    <div className="space-y-2">
                      <input
                        id="filter-min-rating"
                        type="range"
                        value={filters.minRating}
                        onChange={(e) => onFilterChange({ ...filters, minRating: Number(e.target.value) })}
                        min={0}
                        max={5}
                        step={0.5}
                        className="w-full"
                        style={{ accentColor: 'rgb(var(--c-accent))' }}
                      />
                      <div className="flex items-center justify-between text-xs text-c-muted">
                        <span>{t('search.filterPanel.anyRating')}</span>
                        <span className="badge-warning">
                          {filters.minRating > 0 ? t('search.filterPanel.ratingPlus', { rating: filters.minRating }) : t('search.filterPanel.noFilter')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="filter-availability" className="text-sm font-medium flex items-center gap-2 mb-2">
                      <IconClock size={16} className="text-c-accent" />
                      {t('availability')}
                    </label>
                    <select
                      id="filter-availability"
                      value={filters.availability}
                      onChange={(e) => onFilterChange({ ...filters, availability: e.target.value })}
                      className="select"
                    >
                      <option value="all">{t('search.filterPanel.anyAvailability')}</option>
                      <option value="laborables">{t('search.filterPanel.weekdaysOnly')}</option>
                      <option value="festivos">{t('proProfile.availability.weekends')}</option>
                      <option value="ambos">{t('search.filterPanel.allWeek')}</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      onFilterChange({
                        ...filters,
                        minRating: 0,
                        availability: "all"
                      });
                    }}
                    className="btn-secondary btn-sm w-full"
                  >
                    {t('search.filterPanel.clearAdvanced')}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeFiltersCount > 0 && (
          <button
            type="button"
            onClick={() => onFilterChange({
              category: "all",
              provincia: "all",
              ciudad: "all",
              minRating: 0,
              availability: "all"
            })}
            className="btn-ghost btn-sm text-xs text-c-muted md:ml-auto whitespace-nowrap"
          >
            {t('search.filterPanel.clearAll', { count: activeFiltersCount })}
          </button>
        )}
      </div>
    </div>
  );
}
