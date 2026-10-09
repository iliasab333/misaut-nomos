// /buscar — la página de resultados, con la maqueta de khdemlidaba.
//
// Qué cambia respecto a la versión de Base44
// ──────────────────────────────────────────
// Antes: una franja de título pequeño, debajo una caja blanca con cuatro
// desplegables en fila (y un botón «Filtros avanzados» que abría otro panel
// encima), y los resultados en una rejilla de hasta cuatro columnas de
// tarjetas altas de 288 px con tres botones cada una. A 1.280 px los nombres
// se cortaban en «Rub…», «Guc…», «Zaid…»: la primera cosa que alguien mira de
// una ficha era justo la que no cabía.
//
// Ahora, como en khdemlidaba/recherche:
//   - h1 grande, y debajo la MISMA barra de búsqueda de la portada
//     (HeroSearch con `onAutoSearch`), así que la lista se refresca al elegir.
//   - columna de filtros a la izquierda en escritorio (260 px, pegajosa) y
//     hoja inferior en móvil detrás del botón «Filtros».
//   - resultados en dos columnas de tarjetas compactas: avatar, nombre,
//     oficio, ciudad·nota, y dos botones redondos de contacto a la derecha.
//
// Se retiran el mapa, las búsquedas guardadas y el autocompletar: ninguno
// existe en khdemlidaba y los tres vivían sólo aquí.

import React, { useState, useEffect, useMemo } from "react";
import { ordenarFichas } from '@/lib/ordenFichas';
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams, Link } from "react-router-dom";
import {
  IconSearch,
  IconClose,
} from "@/components/Icons";
import { toast } from "@/lib/toast";
import { EmptyState } from "@/components/ListStates";
import SEOHead from "../components/seo/SEOHead";
import { ServiceSchema, BreadcrumbSchema } from "../components/seo/StructuredData";
import { useTranslation } from "react-i18next";
import { PROVINCIAS, CIUDADES_POR_PROVINCIA } from "../components/utils/locationsData";
import { getProfileSeoUrl } from '@/lib/seoUrl';
import { trackSearchAppearance } from '@/lib/trackMetric';
import ProfessionalCard from "@/components/ProfessionalCard";
import HeroSearch, { useServiceCategories } from "@/components/home/HeroSearch";
import useBodyScrollLock from "@/hooks/useBodyScrollLock";

const EMPTY_FILTERS = { category: "all", provincia: "all", ciudad: "all", minRating: 0, availability: "all" };

export default function SearchPage() {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [displayLimit, setDisplayLimit] = useState(12);

  // Los filtros VIVEN en la URL, como en khdemlidaba: una búsqueda se puede
  // compartir, y el botón «atrás» deshace el último filtro en vez de sacarte
  // de la página.
  const filters = useMemo(() => ({
    category: params.get('categoria') || 'all',
    provincia: params.get('provincia') || 'all',
    ciudad: params.get('ciudad') || 'all',
    minRating: Number(params.get('nota')) || 0,
    availability: params.get('disponibilidad') || 'all',
  }), [params]);

  const setFilters = (next) => {
    const value = typeof next === 'function' ? next(filters) : next;
    const qs = new URLSearchParams();
    if (value.category && value.category !== 'all') qs.set('categoria', value.category);
    if (value.provincia && value.provincia !== 'all') qs.set('provincia', value.provincia);
    if (value.ciudad && value.ciudad !== 'all') qs.set('ciudad', value.ciudad);
    if (value.minRating) qs.set('nota', String(value.minRating));
    if (value.availability && value.availability !== 'all') qs.set('disponibilidad', value.availability);
    setParams(qs, { replace: true });
  };

  useBodyScrollLock(filtersOpen);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const isAuth = await base44.auth.isAuthenticated();
        if (!isAuth) { if (alive) setUser(null); return; }
        const currentUser = await base44.auth.me();
        if (alive) setUser(currentUser);
      } catch {
        if (alive) setUser(null);
      } finally {
        if (alive) setLoadingUser(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  // La barra de arriba habla en slugs (es lo que viaja en las URL SEO de
  // /categoria); los filtros de la lista, en nombres (es lo que guarda
  // `professional_profiles.categories`). La traducción entre los dos vive
  // aquí, en un sitio, y no repartida por cada handler.
  const { categories: dbCategories } = useServiceCategories();
  const slugOfCategory = useMemo(() => {
    if (filters.category === 'all') return '';
    return dbCategories.find((c) => c.name === filters.category)?.slug || '';
  }, [dbCategories, filters.category]);

  const { data: profiles = [], isLoading: loadingProfiles } = useQuery({
    queryKey: ['professionalProfiles'],
    queryFn: async () => {
      const allProfiles = await base44.entities.ProfessionalProfile.list();
      return allProfiles.filter(p => p.visible_en_busqueda === true && p.onboarding_completed === true);
    },
    staleTime: 1000 * 60 * 5, gcTime: 1000 * 60 * 15, refetchOnWindowFocus: false,
  });

  const { data: professionalUsers = [] } = useQuery({
    queryKey: ['professionalUsers', profiles.map(p => p.user_id).join(',')],
    queryFn: async () => {
      if (profiles.length === 0) return [];
      const userIds = profiles.map(p => p.user_id);
      return await base44.entities.User.filter({ id: { $in: userIds } });
    },
    enabled: profiles.length > 0,
    staleTime: 1000 * 60 * 10, gcTime: 1000 * 60 * 30, refetchOnWindowFocus: false,
  });

  const { data: favorites = [] } = useQuery({
    queryKey: ['favorites', user?.id],
    queryFn: async () => {
      if (!user) return [];
      return await base44.entities.Favorite.filter({ client_id: user.id });
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 10, gcTime: 1000 * 60 * 30, refetchOnWindowFocus: false,
  });

  // Orden aleatorio para TODAS: ni destacados delante, ni prioridad por nota.
  // La lógica está en `@/lib/ordenFichas` porque `Categoria.jsx` enseña el
  // mismo catálogo y tenía otro orden distinto; con una pieza compartida no
  // pueden volver a separarse.
  const shuffledProfiles = useMemo(() => ordenarFichas(profiles), [profiles]);

  const filteredProfiles = useMemo(() => shuffledProfiles.filter((profile) => {
    const matchesCategory = filters.category === "all" || profile.categories?.includes(filters.category);
    const matchesProvincia = filters.provincia === "all" || profile.provincia === filters.provincia;
    const matchesCiudad = filters.ciudad === "all" || profile.ciudad === filters.ciudad;
    const matchesRating = !filters.minRating || profile.average_rating >= filters.minRating;
    const matchesAvailability = filters.availability === "all" || profile.disponibilidad_tipo === filters.availability;
    return matchesCategory && matchesProvincia && matchesCiudad && matchesRating && matchesAvailability;
  }), [shuffledProfiles, filters]);

  // `search_appearance` cuando la lista visible se asienta. El dedupe interno
  // de trackMetric evita inflar contadores.
  useEffect(() => {
    if (!filteredProfiles.length) return undefined;
    const id = setTimeout(() => {
      trackSearchAppearance(filteredProfiles.slice(0, displayLimit).map((p) => p.id).filter(Boolean));
    }, 600);
    return () => clearTimeout(id);
  }, [filteredProfiles, displayLimit]);

  const availableCities = useMemo(() => {
    if (filters.provincia === "all") return [];
    return CIUDADES_POR_PROVINCIA[filters.provincia] || [];
  }, [filters.provincia]);

  const handleToggleFavorite = async (profile) => {
    if (!user) { base44.auth.redirectToLogin(); return; }
    try {
      const existing = favorites.filter(fav => fav.professional_id === profile.user_id);
      if (existing.length > 0) {
        await base44.entities.Favorite.delete(existing[0].id);
        toast.success(t('favorites.toast.removed'));
      } else {
        await base44.entities.Favorite.create({ client_id: user.id, professional_id: profile.user_id, business_name: profile.business_name });
        toast.success(t('favorites.toast.added'));
      }
    } catch { toast.error(t('search.favoritesError')); }
  };

  const hasActiveFilters = filters.category !== "all" || filters.provincia !== "all"
    || filters.ciudad !== "all" || filters.minRating > 0 || filters.availability !== "all";
  const activeCount = [
    filters.category !== "all", filters.provincia !== "all", filters.ciudad !== "all",
    filters.minRating > 0, filters.availability !== "all",
  ].filter(Boolean).length;

  const heading = filters.category !== "all" && filters.provincia !== "all"
    ? t('search.heading.categoryProvince', { category: filters.category, province: filters.provincia })
    : filters.category !== "all"
      ? filters.category
      : filters.provincia !== "all"
        ? t('search.heading.province', { province: filters.provincia })
        : t('search.title');

  const filtersPanel = (
    <>
      <div>
        <label htmlFor="flt-ciudad" className="text-sm font-semibold text-ink block mb-2">{t('cityField')}</label>
        <select
          id="flt-ciudad"
          className="select"
          value={filters.ciudad}
          onChange={(e) => setFilters({ ...filters, ciudad: e.target.value })}
          disabled={filters.provincia === 'all'}
        >
          <option value="all">
            {filters.provincia === 'all' ? t('search.filterPanel.selectProvinceFirst') : t('allCities')}
          </option>
          {availableCities.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div>
        <label htmlFor="flt-nota" className="text-sm font-semibold text-ink block mb-2">{t('search.filterPanel.minRating')}</label>
        <select
          id="flt-nota"
          className="select"
          value={filters.minRating || ''}
          onChange={(e) => setFilters({ ...filters, minRating: Number(e.target.value) || 0 })}
        >
          <option value="">{t('search.filterPanel.anyRating')}</option>
          <option value="3">{t('search.filterPanel.ratingPlus', { rating: 3 })}</option>
          <option value="4">{t('search.filterPanel.ratingPlus', { rating: 4 })}</option>
          <option value="4.5">{t('search.filterPanel.ratingPlus', { rating: 4.5 })}</option>
        </select>
      </div>

      <div>
        <span className="text-sm font-semibold text-ink block mb-2">{t('availability')}</span>
        <div className="flex flex-wrap gap-2">
          {[
            ['all', t('search.filterPanel.anyAvailability')],
            ['laborables', t('search.filterPanel.weekdaysOnly')],
            ['completa', t('search.filterPanel.allWeek')],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilters({ ...filters, availability: value })}
              className={filters.availability === value ? 'chip-active' : 'chip'}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <button type="button" className="btn-secondary w-full" onClick={() => setFilters(EMPTY_FILTERS)}>
        {t('search.resetFilters')}
      </button>
    </>
  );

  const resultsLine = loadingProfiles
    ? t('search.results.loading')
    : t('search.heading.resultsCount', { count: filteredProfiles.length });

  return (
    <>
      <SEOHead
        title={
          filters.category !== "all" && filters.provincia !== "all"
            ? t('search.seo.titleCategoryProvince', { category: filters.category, province: filters.provincia })
            : filters.category !== "all"
              ? t('search.seo.titleCategory', { category: filters.category })
              : filters.provincia !== "all"
                ? t('search.seo.titleProvince', { province: filters.provincia })
                : t('search.seo.titleDefault')
        }
        description={t('search.seo.description', { count: filteredProfiles.length })}
        keywords="autónomos, profesionales verificados, servicios a domicilio, contactar gratis"
      />
      <ServiceSchema
        categories={dbCategories.map((c) => c.name)}
        location={filters.provincia !== "all" ? filters.provincia : "España"}
      />
      <BreadcrumbSchema items={[
        { name: "Inicio", url: "https://misautonomos.es" },
        { name: "Buscar Profesionales", url: "https://misautonomos.es/buscar" },
      ]} />

      <section className="section-tight">
        <div className="container-page">
          <h1>{heading}</h1>

          <div className="mt-8">
            <HeroSearch
              initialCategory={slugOfCategory}
              initialProvincia={filters.provincia === 'all' ? '' : filters.provincia}
              initialCiudad={filters.ciudad === 'all' ? '' : filters.ciudad}
              hideSubmitButton
              categoryPlaceholder={t('allCategories')}
              provincePlaceholder={t('allProvinces')}
              onAutoSearch={({ category, provincia, ciudad }) => setFilters({
                ...filters,
                category: category ? (dbCategories.find((c) => c.slug === category)?.name || 'all') : 'all',
                provincia: provincia || 'all',
                ciudad: ciudad || 'all',
              })}
            />
          </div>

          {/* Móvil: el recuento a la izquierda, la puerta a los filtros a la
              derecha. En escritorio el recuento vive sobre la lista y los
              filtros están siempre a la vista. */}
          <div className="mt-8 lg:hidden flex items-center justify-between gap-3">
            <p className="text-sm text-c-muted min-w-0 truncate">{resultsLine}</p>
            <button type="button" className="btn-secondary btn-sm flex-shrink-0" onClick={() => setFiltersOpen(true)}>
              {t('search.filters')}{activeCount > 0 && ` · ${activeCount}`}
            </button>
          </div>

          <div className="mt-8 grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-8 lg:gap-10">
            <aside className="hidden lg:block sticky top-24 h-fit">
              <h2 className="text-lg font-semibold text-ink mb-5">{t('search.filters')}</h2>
              <div className="space-y-6">{filtersPanel}</div>
            </aside>

            <div>
              <p className="hidden lg:block text-sm text-c-muted mb-6">{resultsLine}</p>

              {loadingProfiles ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  {[...Array(6)].map((_, idx) => (
                    <div key={idx} className="card p-4 flex items-center gap-3" style={{ minHeight: 128 }}>
                      <div className="rounded-xl bg-soft" style={{ width: 56, height: 56 }} />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-3/5 rounded bg-soft" />
                        <div className="h-3 w-2/5 rounded bg-soft" />
                        <div className="h-3 w-1/2 rounded bg-soft" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredProfiles.length === 0 ? (
                <div className="space-y-6">
                  <EmptyState
                    icon={<IconSearch size={28} />}
                    title={t('search.empty.title')}
                    body={t('search.empty.hint')}
                    ctaLabel={hasActiveFilters ? t('search.resetFilters') : undefined}
                    onCta={() => setFilters(EMPTY_FILTERS)}
                  />
                  {profiles.length > 0 && (
                    <div>
                      <p className="text-sm text-c-muted mb-3 font-medium">{t('search.empty.suggestions')}</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                        {profiles.slice(0, 4).map((profile) => (
                          <ProfessionalCard
                            key={profile.id}
                            profile={profile}
                            href={getProfileSeoUrl(profile)}
                            onToggleFavorite={user ? () => handleToggleFavorite(profile) : undefined}
                            isFavorite={favorites.some(fav => fav.professional_id === profile.user_id)}
                            professionalUser={professionalUsers.find(u => u.id === profile.user_id)}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    {filteredProfiles.slice(0, displayLimit).map((profile, idx) => (
                      <ProfessionalCard
                        key={profile.id}
                        profile={profile}
                        href={getProfileSeoUrl(profile)}
                        onToggleFavorite={user ? () => handleToggleFavorite(profile) : undefined}
                        isFavorite={favorites.some(fav => fav.professional_id === profile.user_id)}
                        professionalUser={professionalUsers.find(u => u.id === profile.user_id)}
                        priority={idx < 4}
                      />
                    ))}
                  </div>

                  {filteredProfiles.length > displayLimit && (
                    <div className="text-center mt-8">
                      <button
                        type="button"
                        onClick={() => setDisplayLimit(prev => prev + 12)}
                        className="btn-secondary"
                      >
                        {t('search.load_more', { count: filteredProfiles.length - displayLimit })}
                      </button>
                    </div>
                  )}
                </>
              )}

              {/* Cierre de página: la invitación a darse de alta. Sólo para
                  quien no es ya profesional. */}
              {!loadingUser && (!user || user.user_type === "client") && (
                <div className="mt-10 rounded-xl bg-brand-navy text-white p-8 sm:p-10 text-center">
                  <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
                    {t('landing.cta_pro_title')}{' '}
                    <span className="text-brand-gold">{t('search.finalCta.titleHighlight')}</span>
                  </h2>
                  <p className="text-white/80 mt-3 mb-6 max-w-lg mx-auto leading-relaxed">
                    {t('search.finalCta.body')}
                  </p>
                  <Link to="/registro?tipo=autonomo" className="btn bg-brand-gold text-brand-navy font-semibold hover:bg-brand-gold-deep">
                    {t('nav.becomeProFree')}
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Hoja de filtros en móvil. El botón de cerrar va PEGADO ABAJO: en una
          lista larga se iba bajo la línea de flotación y había que desplazarse
          para encontrarlo. */}
      {filtersOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t('search.filters')}
          className="lg:hidden fixed inset-0 z-50 bg-ink/40"
          onClick={() => setFiltersOpen(false)}
        >
          <div
            className="absolute inset-x-0 bottom-0 bg-surface rounded-t-xl p-6 max-h-[85vh] overflow-y-auto"
            style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1.5 rounded-full bg-c-border mx-auto mb-6" />
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">{t('search.filters')}</h2>
              <button
                type="button"
                aria-label={t('common.close')}
                className="w-11 h-11 rounded-lg flex items-center justify-center hover:bg-soft"
                onClick={() => setFiltersOpen(false)}
              >
                <IconClose />
              </button>
            </div>
            <div className="space-y-6">{filtersPanel}</div>
            <div
              className="sticky bottom-0 pt-4 -mx-6 px-6 pb-1"
              style={{ background: 'linear-gradient(to bottom, rgb(var(--c-surface) / 0) 0%, rgb(var(--c-surface)) 28%)' }}
            >
              <button
                type="button"
                className="btn w-full bg-brand-navy text-white hover:bg-brand-navy-deep"
                onClick={() => setFiltersOpen(false)}
              >
                {t('search.showResults', { count: filteredProfiles.length })}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
