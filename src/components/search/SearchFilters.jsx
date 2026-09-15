import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Filter, Star, Clock, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export default function SearchFilters({
  filters,
  onFilterChange,
  availableCities,
  categories,
  provinces,
  isMobile = false
}) {
  const { t } = useTranslation();
  const [showAdvanced, setShowAdvanced] = useState(false);

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
        {/* Desktop: Radix Select */}
        <div className="hidden md:block w-full md:w-[220px]">
          <Select value={filters.category} onValueChange={(val) => onFilterChange({ ...filters, category: val })}>
            <SelectTrigger className="h-11 border-2 border-gray-200 text-sm rounded-lg font-medium hover:border-blue-300 transition-colors">
              <SelectValue placeholder={t('allCategories')}>
                {filters.category === "all" ? t('allCategories') : (t(filters.category) || filters.category)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              <SelectItem value="all">{t('allCategories')}</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.name}>{t(cat.name) || cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {/* Mobile: native <select> — iOS system picker, zero animation */}
        <div className="md:hidden w-full relative">
          <label htmlFor="select-categoria-mobile" className="sr-only">{t('search.filterPanel.category')}</label>
          <select
            id="select-categoria-mobile"
            value={filters.category}
            onChange={(e) => onFilterChange({ ...filters, category: e.target.value })}
            className="w-full appearance-none bg-white border-2 border-gray-200 rounded-lg px-4 py-3 pr-10 text-slate-900 text-base font-normal focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">{t('allCategories')}</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.name}>{cat.name}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
        </div>

        {/* ── PROVINCIA ── */}
        {/* Desktop: Radix Select */}
        <div className="hidden md:block w-full md:w-[200px]">
          <Select value={filters.provincia} onValueChange={(val) => {
            onFilterChange({ ...filters, provincia: val, ciudad: "all" });
          }}>
            <SelectTrigger className="h-11 border-2 border-gray-200 text-sm rounded-lg font-medium hover:border-blue-300 transition-colors">
              <SelectValue placeholder={t('allProvinces')} />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              <SelectItem value="all">{t('allProvinces')}</SelectItem>
              {provinces.map((prov) => (
                <SelectItem key={prov} value={prov}>{prov}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {/* Mobile: native <select> */}
        <div className="md:hidden w-full relative">
          <label htmlFor="select-provincia-mobile" className="sr-only">{t('provinceField')}</label>
          <select
            id="select-provincia-mobile"
            value={filters.provincia}
            onChange={(e) => onFilterChange({ ...filters, provincia: e.target.value, ciudad: "all" })}
            className="w-full appearance-none bg-white border-2 border-gray-200 rounded-lg px-4 py-3 pr-10 text-slate-900 text-base font-normal focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">{t('allProvinces')}</option>
            {provinces.map((prov) => (
              <option key={prov} value={prov}>{prov}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
        </div>

        {/* ── CIUDAD ── */}
        {/* Desktop: Radix Select */}
        <div className="hidden md:block w-full md:w-[200px]">
          <Select value={filters.ciudad} onValueChange={(val) => onFilterChange({ ...filters, ciudad: val })} disabled={filters.provincia === "all"}>
            <SelectTrigger className="h-11 border-2 border-gray-200 text-sm rounded-lg font-medium hover:border-blue-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              <SelectValue placeholder={filters.provincia === "all" ? t('search.filterPanel.selectProvinceFirst') : t('allCities')} />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              <SelectItem value="all">{t('allCities')}</SelectItem>
              {availableCities.map((ciudad) => (
                <SelectItem key={ciudad} value={ciudad}>{ciudad}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {/* Mobile: native <select> */}
        <div className="md:hidden w-full relative">
          <label htmlFor="select-ciudad-mobile" className="sr-only">{t('cityField')}</label>
          <select
            id="select-ciudad-mobile"
            value={filters.ciudad}
            onChange={(e) => onFilterChange({ ...filters, ciudad: e.target.value })}
            disabled={filters.provincia === "all"}
            className="w-full appearance-none bg-white border-2 border-gray-200 rounded-lg px-4 py-3 pr-10 text-slate-900 text-base font-normal focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="all">{filters.provincia === "all" ? t('search.filterPanel.selectProvinceFirst') : t('allCities')}</option>
            {availableCities.map((ciudad) => (
              <option key={ciudad} value={ciudad}>{ciudad}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
        </div>

        {/* "Filtros avanzados" popover — hidden on mobile (always-visible layout handles it) */}
        {!isMobile && <Popover open={showAdvanced} onOpenChange={setShowAdvanced}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="h-11 px-4 border-2 border-gray-200 hover:border-blue-300 relative"
            >
              <Filter className="w-4 h-4 mr-2" />
              {t('search.filters_advanced')}
              {activeFiltersCount > 3 && (
                <Badge className="ml-2 bg-blue-600 text-white h-5 min-w-5 rounded-full px-1.5">
                  {activeFiltersCount - 3}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium flex items-center gap-2 mb-2">
                  <Star className="w-4 h-4 text-yellow-500" />
                  {t('search.filterPanel.minRating')}
                </label>
                <div className="space-y-2">
                  <Slider
                    value={[filters.minRating]}
                    onValueChange={(val) => onFilterChange({ ...filters, minRating: val[0] })}
                    max={5}
                    step={0.5}
                    className="w-full"
                  />
                  <div className="flex items-center justify-between text-xs text-gray-600">
                    <span>{t('search.filterPanel.anyRating')}</span>
                    <Badge variant="outline" className="bg-yellow-50">
                      {filters.minRating > 0 ? t('search.filterPanel.ratingPlus', { rating: filters.minRating }) : t('search.filterPanel.noFilter')}
                    </Badge>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-blue-500" />
                  {t('availability')}
                </label>
                <Select value={filters.availability} onValueChange={(val) => onFilterChange({ ...filters, availability: val })}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('search.filterPanel.anyAvailability')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('search.filterPanel.anyAvailability')}</SelectItem>
                    <SelectItem value="laborables">{t('search.filterPanel.weekdaysOnly')}</SelectItem>
                    <SelectItem value="festivos">{t('proProfile.availability.weekends')}</SelectItem>
                    <SelectItem value="ambos">{t('search.filterPanel.allWeek')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={() => {
                  onFilterChange({
                    ...filters,
                    minRating: 0,
                    availability: "all"
                  });
                }}
                variant="outline"
                className="w-full"
                size="sm"
              >
                {t('search.filterPanel.clearAdvanced')}
              </Button>
            </div>
          </PopoverContent>
        </Popover>}

        {activeFiltersCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onFilterChange({
              category: "all",
              provincia: "all",
              ciudad: "all",
              minRating: 0,
              availability: "all"
            })}
            className="text-xs text-gray-500 hover:text-gray-700 h-11 md:ml-auto whitespace-nowrap"
          >
            {t('search.filterPanel.clearAll', { count: activeFiltersCount })}
          </Button>
        )}
      </div>
    </div>
  );
}
