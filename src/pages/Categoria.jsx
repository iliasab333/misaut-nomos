import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  IconMapPin,
  IconStar,
  IconHeart,
  IconHeartFilled,
  IconBriefcase,
  IconArrowLeft
} from "@/components/Icons";
import { optimizeSupabaseImage } from "@/lib/supabaseImage";
import InitialsAvatar from "@/components/InitialsAvatar";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "@/lib/toast";
import SEOHead from "../components/seo/SEOHead";
import { useTranslation } from "react-i18next";
import { slugify } from "@/lib/seoUrl";

const CIUDADES_PRINCIPALES = [
  "Madrid", "Barcelona", "Valencia", "Sevilla", "Málaga", "Zaragoza", "Bilbao",
  "Murcia", "Palma de Mallorca", "Alicante", "Córdoba", "Valladolid", "Vigo",
  "Gijón", "Granada", "A Coruña", "Vitoria-Gasteiz", "Santa Cruz de Tenerife",
  "Getafe", "Alcalá de Henares", "Fuenlabrada", "Leganés", "Móstoles", "Torrejón de Ardoz"
];

// Normaliza texto para comparación: quita tildes y pone minúsculas
function normalize(text) {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ñ/g, 'n');
}

// Dada una lista de ServiceCategory y un slug de URL, devuelve la categoría que coincide
function resolveCategoryBySlug(categories, slug) {
  if (!slug || !categories?.length) return null;
  // 1. Match exacto por slug guardado
  let found = categories.find(c => c.slug === slug);
  if (found) return found;
  // 2. Match por slug generado del name (fallback para categorías sin slug explícito)
  found = categories.find(c => slugify(c.name) === slug);
  if (found) return found;
  // 3. Match normalizado (tolera pequeñas diferencias)
  found = categories.find(c => normalize(c.slug) === normalize(slug) || normalize(slugify(c.name)) === normalize(slug));
  return found || null;
}

export default function CategoriaPage() {
  const navigate = useNavigate();
  const params = useParams();
  const { t } = useTranslation();
  const [user, setUser] = useState(null);

  const urlParams = new URLSearchParams(window.location.search);

  // Detectar si el segmento dinámico es "categoria-en-ciudad" o solo "categoria"
  const cityCategorySlug = params.slug || params.cityCategory;

  let categorySlug = null;
  let ciudadSlug = null;
  let legacyRedirectPath = null;

  if (cityCategorySlug && cityCategorySlug.includes('-en-')) {
    const enIdx = cityCategorySlug.indexOf('-en-');
    categorySlug = cityCategorySlug.slice(0, enIdx);
    ciudadSlug = cityCategorySlug.slice(enIdx + 4);
  } else if (cityCategorySlug) {
    categorySlug = cityCategorySlug;
  } else {
    // Legacy: ?name=X&ciudad=Y → calcular redirect path
    const legacyName = urlParams.get("name");
    const legacyCiudad = urlParams.get("ciudad");
    if (legacyName) {
      categorySlug = slugify(legacyName);
      ciudadSlug = legacyCiudad ? slugify(legacyCiudad) : null;
      legacyRedirectPath = ciudadSlug
        ? `/categoria/${categorySlug}-en-${ciudadSlug}`
        : `/categoria/${categorySlug}`;
    }
  }

  // Redirect legacy ?name=X&ciudad=Y — siempre al nivel superior (no condicional)
  useEffect(() => {
    if (legacyRedirectPath) navigate(legacyRedirectPath, { replace: true });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Ciudad legible: capitalizar cada palabra del slug
  const ciudadName = ciudadSlug
    ? ciudadSlug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    : null;

  useEffect(() => {
    base44.auth.me().then(u => setUser(u)).catch(() => setUser(null));
  }, []);

  // Cargar ServiceCategories para resolver slug → name
  const { data: serviceCategories = [] } = useQuery({
    queryKey: ['serviceCategories'],
    queryFn: () => base44.entities.ServiceCategory.list(),
    staleTime: 1000 * 60 * 30,
  });

  // Resolver la categoría real desde las ServiceCategory
  const resolvedCategory = resolveCategoryBySlug(serviceCategories, categorySlug);
  const categoryName = resolvedCategory?.name || null;

  // Redirect legacy: si tenemos categorías cargadas y el slug NO coincide exactamente,
  // pedir al backend que resuelva el canonical y redirigir con replace.
  useEffect(() => {
    if (!categorySlug || !serviceCategories.length) return;
    // Si ya hay match exacto, no necesitamos redirect
    if (resolvedCategory && (resolvedCategory.slug === categorySlug || slugify(resolvedCategory.name) === categorySlug)) return;
    // Si hay un match aproximado (no exacto), construir el redirect
    if (resolvedCategory) {
      const correctSlug = resolvedCategory.slug || slugify(resolvedCategory.name);
      if (correctSlug && correctSlug !== categorySlug) {
        const canonical = ciudadSlug
          ? `/categoria/${correctSlug}-en-${ciudadSlug}`
          : `/categoria/${correctSlug}`;
        // Log fire-and-forget
        base44.functions.invoke('resolveLegacySlug', { path: window.location.pathname }).catch(() => {});
        navigate(canonical, { replace: true });
      }
    }
  }, [serviceCategories, categorySlug, resolvedCategory]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cargar perfiles solo cuando tenemos el nombre de categoría
  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ['categoryProfiles', categorySlug, ciudadSlug],
    queryFn: async () => {
      const allProfiles = await base44.entities.ProfessionalProfile.list();

      return allProfiles.filter(p => {
        // Solo perfiles activos y visibles
        if (!p.visible_en_busqueda || !p.onboarding_completed) return false;
        if (p.estado_perfil && p.estado_perfil !== 'activo') return false;

        // Filtro de categoría: comparar por nombre (case-insensitive + sin tildes)
        // Si tenemos categoryName del ServiceCategory, comparar con él;
        // si no, comparar por slug generado del nombre de categoría del perfil
        const matchesCategory = p.categories?.some(c => {
          if (categoryName) {
            return normalize(c) === normalize(categoryName);
          }
          // fallback: comparar slug generado
          return slugify(c) === categorySlug || normalize(slugify(c)) === normalize(categorySlug);
        });

        if (!matchesCategory) return false;

        // Filtro de ciudad (case-insensitive + sin tildes)
        if (ciudadSlug) {
          const profCiudadSlug = slugify(p.ciudad || '');
          const profProvSlug = slugify(p.provincia || '');
          if (normalize(profCiudadSlug) !== normalize(ciudadSlug) && normalize(profProvSlug) !== normalize(ciudadSlug)) {
            return false;
          }
        }

        return true;
      }).sort((a, b) => {
        // Ads+ primero, luego por rating
        if (a.is_ads_plus && !b.is_ads_plus) return -1;
        if (!a.is_ads_plus && b.is_ads_plus) return 1;
        return (b.average_rating || 0) - (a.average_rating || 0);
      });
    },
    // Ejecutar siempre que tengamos categorySlug, incluso antes de resolver categoryName
    // (la query se refinará cuando categoryName esté disponible por el re-render)
    enabled: !!categorySlug,
    staleTime: 1000 * 60 * 5,
  });

  const { data: favorites = [] } = useQuery({
    queryKey: ['favorites', user?.id],
    queryFn: () => base44.entities.Favorite.filter({ client_id: user.id }),
    enabled: !!user,
  });

  const handleCiudadChange = (ciudad) => {
    if (ciudad === "all") {
      navigate(`/categoria/${categorySlug}`);
    } else {
      navigate(`/categoria/${categorySlug}-en-${slugify(ciudad)}`);
    }
  };

  const handleViewProfile = (profile) => {
    const slug = profile.slug_publico || slugify(profile.business_name);
    navigate(`${createPageUrl("Autonomo")}/${slug}`);
  };

  const handleToggleFavorite = async (profile) => {
    if (!user) { base44.auth.redirectToLogin(); return; }
    try {
      const existing = favorites.filter(f => f.professional_id === profile.user_id);
      if (existing.length > 0) {
        await base44.entities.Favorite.delete(existing[0].id);
        toast.success(t('favorites.toast.removed'));
      } else {
        await base44.entities.Favorite.create({
          client_id: user.id,
          professional_id: profile.user_id,
          business_name: profile.business_name
        });
        toast.success(t('favorites.toast.added'));
      }
    } catch {
      toast.error(t('search.favoritesError'));
    }
  };

  // Nombre visible: categoryName resuelto o placeholder mientras carga
  const displayName = categoryName || (serviceCategories.length === 0 ? '…' : categorySlug);

  // SEO
  const canonicalUrl = ciudadSlug
    ? `https://misautonomos.es/categoria/${categorySlug}-en-${ciudadSlug}`
    : `https://misautonomos.es/categoria/${categorySlug}`;

  const seoTitle = ciudadName
    ? t('category.seo.titleCity', { category: displayName, city: ciudadName })
    : t('category.seo.title', { category: displayName });

  const seoDescription = ciudadName
    ? t('category.seo.descriptionCity', { category: displayName?.toLowerCase(), city: ciudadName })
    : t('category.seo.description', { category: displayName?.toLowerCase() });

  return (
    <>
      <SEOHead
        title={seoTitle}
        description={seoDescription}
        keywords={`${displayName?.toLowerCase()}, ${ciudadName?.toLowerCase() || 'españa'}, autónomo, profesional, presupuesto`}
      />
      <link rel="canonical" href={canonicalUrl} />

      {profiles.length > 0 && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ItemList",
            "name": ciudadName ? `${displayName} en ${ciudadName}` : displayName,
            "numberOfItems": profiles.length,
            "itemListElement": profiles.slice(0, 20).map((profile, idx) => ({
              "@type": "ListItem",
              "position": idx + 1,
              "item": {
                "@type": "LocalBusiness",
                "name": profile.business_name,
                "url": `https://misautonomos.es/autonomo/${profile.slug_publico || slugify(profile.business_name)}`,
                "address": {
                  "@type": "PostalAddress",
                  "addressLocality": profile.ciudad,
                  "addressRegion": profile.provincia,
                  "addressCountry": "ES"
                },
                ...(profile.average_rating > 0 ? {
                  "aggregateRating": {
                    "@type": "AggregateRating",
                    "ratingValue": profile.average_rating,
                    "reviewCount": profile.total_reviews || 0
                  }
                } : {})
              }
            }))
          })
        }} />
      )}

      <div className="min-h-screen bg-soft">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white py-8 md:py-12">
          <div className="max-w-6xl mx-auto px-4">
            <button
              type="button"
              onClick={() => navigate(createPageUrl("Search"))}
              className="btn-ghost text-white hover:bg-white/10 mb-4 font-medium"
            >
              <IconArrowLeft size={16} />
              {t('backToSearch')}
            </button>

            <h1 className="text-2xl md:text-4xl font-bold mb-2">
              {ciudadName
                ? t('category.heading.inCity', { category: displayName, city: ciudadName })
                : t('category.heading.inSpain', { category: displayName })}
            </h1>
            <p className="text-blue-100 text-lg">
              {isLoading ? t('category.loading') : t('category.available', { count: profiles.length })}
            </p>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-6">
          {/* Filtro de ciudad */}
          <div className="card mb-6 shadow-sm border-0 rounded-xl">
            <div className="p-4">
              <div className="flex flex-wrap gap-3 items-center">
                <IconMapPin size={20} className="text-c-muted" />
                <label htmlFor="categoria-ciudad" className="sr-only">{t('category.filter.selectCity')}</label>
                <select
                  id="categoria-ciudad"
                  className="select w-48"
                  value={ciudadName || "all"}
                  onChange={(e) => handleCiudadChange(e.target.value)}
                >
                  <option value="all">{t('category.filter.allSpain')}</option>
                  {CIUDADES_PRINCIPALES.map(ciudad => (
                    <option key={ciudad} value={ciudad}>{ciudad}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Loading */}
          {isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="card rounded-xl" aria-hidden="true">
                  <div className="p-4">
                    <div className="flex gap-3 mb-3">
                      <div className="skeleton" style={{ width: 48, height: 48, borderRadius: '50%' }} />
                      <div className="flex-1 space-y-2">
                        <div className="skeleton" style={{ height: 16, width: '75%' }} />
                        <div className="skeleton" style={{ height: 12, width: '50%' }} />
                      </div>
                    </div>
                    <div className="skeleton mb-3" style={{ height: 64, width: '100%' }} />
                    <div className="skeleton" style={{ height: 36, width: '100%' }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Sin resultados — banda navy con CTA dorado para que sea un punto de conversión, no un hueco */}
          {!isLoading && profiles.length === 0 && (
            <div
              className="rounded-2xl overflow-hidden border"
              style={{ borderColor: 'rgba(0,37,92,0.12)' }}
            >
              <div className="p-8 md:p-10 text-center" style={{ background: '#00255C', color: 'white' }}>
                <div className="w-12 h-12 mx-auto mb-4 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(245,193,61,0.16)' }}>
                  <IconBriefcase size={24} style={{ color: '#F5C13D' }} />
                </div>
                <h2 className="text-2xl md:text-3xl font-semibold tracking-tight" style={{ letterSpacing: '-0.02em' }}>
                  {ciudadName
                    ? t('category.empty.titleCity', { category: displayName, city: ciudadName })
                    : t('category.empty.title', { category: displayName })}
                </h2>
                <p className="mt-3 text-white/80 max-w-xl mx-auto">
                  {t('category.empty.body')}
                </p>
                <div className="mt-7 flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    type="button"
                    onClick={() => navigate('/registro?tipo=autonomo')}
                    className="btn px-6 rounded-xl font-semibold"
                    style={{ backgroundColor: '#F5C13D', color: '#00255C' }}
                  >
                    {t('nav.becomeProFree')}
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/buscar')}
                    className="btn px-6 rounded-xl font-semibold bg-transparent border border-white/30 text-white hover:bg-white/10"
                  >
                    {t('category.empty.allTrades')}
                  </button>
                </div>
              </div>
              {ciudadName && (
                <div className="bg-surface p-4 text-center text-sm">
                  {t('category.empty.otherCity', { category: displayName })}{' '}
                  <button
                    onClick={() => navigate(`/categoria/${categorySlug}`)}
                    className="font-medium underline underline-offset-2"
                    style={{ color: '#00255C' }}
                  >
                    {t('category.empty.viewAllSpain', { category: displayName })}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Resultados */}
          {!isLoading && profiles.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence>
                {profiles.map(profile => (
                  <motion.div
                    key={profile.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <div className={`card hover:shadow-lg transition-all rounded-xl h-full ${profile.is_ads_plus ? 'ring-1 ring-amber-300' : ''}`}>
                      <div className="p-4 flex flex-col h-full">
                        <div className="flex items-start gap-3 mb-3">
                          {(() => {
                            const rawPhoto =
                              profile.imagen_principal ||
                              (Array.isArray(profile.photos) && profile.photos[0]) ||
                              null;
                            const optimized = optimizeSupabaseImage(rawPhoto, { width: 128, quality: 70 });
                            return (
                              <div
                                role="button"
                                tabIndex={0}
                                onClick={() => handleViewProfile(profile)}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleViewProfile(profile); }}
                                className="cursor-pointer"
                              >
                                <InitialsAvatar
                                  name={profile.business_name || ""}
                                  src={optimized || undefined}
                                  size={48}
                                />
                              </div>
                            );
                          })()}

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                              <h3
                                className="font-semibold text-ink cursor-pointer truncate hover:underline underline-offset-2"
                                style={{ textDecorationColor: '#00255C' }}
                                onClick={() => handleViewProfile(profile)}
                              >
                                {profile.business_name}
                              </h3>
                              {profile.is_ads_plus && (
                                <span
                                  className="text-[10px] font-semibold uppercase tracking-[0.06em] border px-1.5 py-0.5 rounded-full whitespace-nowrap flex-shrink-0"
                                  style={{ color: '#7B5400', backgroundColor: '#FBF4DA', borderColor: '#EFD68A' }}
                                >
                                  {t('search.card.featured')}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1 text-sm text-c-muted">
                              <IconMapPin size={12} />
                              <span className="truncate">{profile.ciudad || profile.provincia}</span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleToggleFavorite(profile)}
                            aria-label={favorites.some(f => f.professional_id === profile.user_id)
                              ? t('favorites.page.remove') : t('search.card.addFavorite')}
                            className={`btn-icon ${favorites.some(f => f.professional_id === profile.user_id)
                              ? 'text-error' : 'text-c-muted'}`}
                          >
                            {favorites.some(f => f.professional_id === profile.user_id)
                              ? <IconHeartFilled size={16} />
                              : <IconHeart size={16} />}
                          </button>
                        </div>

                        {profile.descripcion_corta && (
                          <p className="text-sm text-c-muted line-clamp-2 mb-3 flex-1">
                            {profile.descripcion_corta}
                          </p>
                        )}

                        {profile.average_rating > 0 && (
                          <div className="flex items-center gap-1 mb-3">
                            <IconStar className="text-star" />
                            <span className="font-semibold">{profile.average_rating.toFixed(1)}</span>
                            <span className="text-c-muted text-sm">({profile.total_reviews})</span>
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => handleViewProfile(profile)}
                          className="btn w-full text-white font-semibold"
                          style={{ backgroundColor: '#00255C' }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#001A45')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#00255C')}
                        >
                          {t('profile_card.view_profile')}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}

          {/* CTA */}
          {!isLoading && profiles.length > 0 && (
            <div className="mt-12 bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-8 text-center text-white">
              <h3 className="text-2xl font-bold mb-2">{t('category.cta.title', { category: displayName })}</h3>
              <p className="text-blue-100 mb-5">{t('category.cta.body')}</p>
              <button
                type="button"
                onClick={() => navigate(createPageUrl("PricingPlans"))}
                className="btn bg-surface hover:bg-soft text-c-accent px-8 font-semibold"
              >
                <IconBriefcase size={20} />
                {t('category.cta.button')}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}