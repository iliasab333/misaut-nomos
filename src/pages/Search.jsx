import React, { useState, useEffect, useMemo, lazy, Suspense } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  IconSearch,
  IconMapPin,
  IconHeart,
  IconHeartFilled,
  IconPhone,
  IconStar,
  IconZap,
  IconDroplets,
  IconHammer,
  IconHardHat,
  IconPaintbrush,
  IconTrees,
  IconSparkles,
  IconKey,
  IconBriefcase,
  IconMessageSquare,
  IconClose,
  IconVerified,
  IconWhatsApp
} from "@/components/Icons";
import LandingHero from "@/components/home/LandingHero";
import { toast } from "@/lib/toast";
import { EmptyState } from "@/components/ListStates";
import SEOHead from "../components/seo/SEOHead";
import { ServiceSchema, BreadcrumbSchema } from "../components/seo/StructuredData";
import { Trans, useTranslation } from "react-i18next";
import { useProfileTranslation } from "../components/profile/useProfileTranslation";
import { PROVINCIAS, CIUDADES_POR_PROVINCIA } from "../components/utils/locationsData";
import SearchAutocomplete from "../components/search/SearchAutocomplete";
import SavedSearches from "../components/search/SavedSearches";
const PullToRefresh = lazy(() => import("@/components/PullToRefresh"));
const SearchFilters = lazy(() => import("../components/search/SearchFilters"));
const MapView = lazy(() => import("../components/search/MapView"));
const TrustSlider = lazy(() => import("../components/search/TrustSlider"));
import { generateSlug } from "../utils/slugUtils";
import { getProfileSeoUrl } from '@/lib/seoUrl';
import { optimizeSupabaseImage } from '@/lib/supabaseImage';
import { trackMetric, trackSearchAppearance } from '@/lib/trackMetric';
import GuestContactModal from "@/components/GuestContactModal";
import InitialsAvatar from "@/components/InitialsAvatar";

const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
};

const QUICK_CATEGORIES = [
  { name: "Electricista", icon: IconZap, color: "from-yellow-400 to-orange-400" },
  { name: "Fontanero", icon: IconDroplets, color: "from-blue-400 to-cyan-400" },
  { name: "Pintor", icon: IconPaintbrush, color: "from-pink-400 to-rose-400" },
  { name: "Albañil / Reformas", icon: IconHardHat, color: "from-orange-400 to-amber-400" },
  { name: "Jardinero", icon: IconTrees, color: "from-green-400 to-emerald-400" },
  { name: "Autónomo de limpieza", icon: IconSparkles, color: "from-purple-400 to-violet-400" },
  { name: "Cerrajero", icon: IconKey, color: "from-slate-400 to-gray-500" },
  { name: "Carpintero", icon: IconHammer, color: "from-amber-500 to-yellow-500" },
];

const ProfileCard = React.memo(({ profile, onClick, onToggleFavorite, isFavorite, professionalUser, currentUserId, currentUser, priority }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [phoneRevealed, setPhoneRevealed] = useState(false);
  const [guestModal, setGuestModal] = useState(false);

  // Botón "Contactar": abre el formulario que envía un EMAIL al profesional
  // (Edge Function `contact-professional`), tenga o no cuenta quien escribe.
  //
  // Antes esto creaba una conversación en la tabla `messages` y entraba al
  // chat interno. Ese chat se retiró —10 mensajes en toda la vida de la web,
  // el último hace un mes— y con él la asimetría que tenía: el visitante sin
  // cuenta mandaba un correo y el registrado abría un hilo que el profesional
  // sólo veía si entraba a mirar. Ahora los dos caminos son el mismo, y el
  // profesional se entera en su bandeja de correo de siempre.
  const handleContactDirect = (e) => {
    e.stopPropagation();
    trackMetric(profile.id, 'contact_click');
    setGuestModal(true);
  };

  const formatPhoneForWhatsApp = (phone) => {
    if (!phone) return null;
    let cleaned = phone.replace(/\D/g, '');
    if (!cleaned.startsWith('34') && cleaned.length === 9) cleaned = '34' + cleaned;
    return cleaned;
  };

  // Orden de fallback verificado en BD: 16/27 tienen imagen_principal, 15/27
  // photos[], y profile_picture está vacío en todos. Probamos en ese orden.
  const photoUrl =
    profile.imagen_principal ||
    (Array.isArray(profile.photos) && profile.photos[0]) ||
    professionalUser?.profile_picture ||
    null;
  const isVerified = profile.identity_verified === true;
  // Avatares de tarjeta: 56 px en pantalla → 128 px (≈2.3x retina). WebP.
  const optimizedPhotoUrl = optimizeSupabaseImage(photoUrl, { width: 128, quality: 70 });

  const hasWhatsapp = profile.metodos_contacto?.includes('whatsapp') && profile.telefono_contacto;
  const hasPhone = profile.metodos_contacto?.includes('telefono') && profile.telefono_contacto;
  const categoryLabel = profile.categories?.[0];

  return (
    <article
      onClick={onClick}
      className="card-skeleton cursor-pointer bg-surface rounded-2xl border border-c-border hover:border-[#00255C] hover:shadow-[0_10px_30px_-15px_rgba(0,37,92,0.18)] transition-all flex flex-col"
      style={{ minHeight: '288px', contain: 'layout style' }}
    >
      <div className="flex flex-col flex-1 p-4">
        {/* Cabecera: avatar + nombre + meta + badges */}
        <div className="flex items-start gap-3">
          <InitialsAvatar
            name={profile.business_name || ""}
            src={optimizedPhotoUrl || undefined}
            size={56}
            priority={priority}
            className="ring-2 ring-white shadow-sm"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="font-semibold text-ink text-[15px] leading-snug truncate">
                {profile.business_name || t('favorites.page.unnamed')}
              </h3>
              {isVerified && (
                <span title={t('proProfile.badges.identityVerified')}>
                  <IconVerified size={16} className="flex-shrink-0" style={{ color: '#00255C' }} aria-label={t('proProfile.badges.identityVerified')} />
                </span>
              )}
            </div>
            {categoryLabel && (
              <p className="text-[12px] truncate mt-0.5" style={{ color: '#00255C' }}>
                {categoryLabel}
              </p>
            )}
            <p className="text-c-muted text-[12px] mt-0.5 inline-flex items-center gap-1 truncate">
              <IconMapPin size={12} className="flex-shrink-0" aria-hidden="true" />
              {profile.ciudad}{profile.provincia && profile.ciudad !== profile.provincia ? `, ${profile.provincia}` : ''}
            </p>
          </div>
          {/* Badge Destacado sutil arriba a la derecha (icono pequeño, no banda) */}
          {profile.is_ads_plus && (
            <span
              className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.06em] border px-1.5 py-0.5 rounded-full whitespace-nowrap flex-shrink-0"
              style={{ color: '#7B5400', backgroundColor: '#FBF4DA', borderColor: '#EFD68A' }}
              title={t('search.card.featuredTitle')}
            >
              <IconStar size={10} />
              {t('search.card.featured')}
            </span>
          )}
          {/* Botón Favorito: solo para clientes logueados, esquina sup. derecha.
              Discreto pero visible, no ocupa espacio en la grilla principal. */}
          {onToggleFavorite && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
              aria-label={isFavorite ? t('favorites.page.remove') : t('search.card.addFavorite')}
              title={isFavorite ? t('favorites.page.remove') : t('search.card.saveFavorite')}
              className="flex-shrink-0 w-8 h-8 inline-flex items-center justify-center rounded-full border border-c-border bg-surface hover:bg-rose-50 transition-colors"
            >
              {isFavorite
                ? <IconHeartFilled size={16} className="text-rose-500" />
                : <IconHeart size={16} className="text-c-muted" />}
            </button>
          )}
        </div>

        {/* Descripción 2 líneas (altura reservada para uniformidad) */}
        <p className="text-c-muted text-[13px] mt-3 line-clamp-2 leading-relaxed" style={{ minHeight: '2.6em' }}>
          {profile.descripcion_corta || ''}
        </p>

        {/* Valoración + tarifa en la misma línea */}
        <div className="flex items-center justify-between mt-3" style={{ minHeight: '20px' }}>
          {profile.average_rating > 0 ? (
            <div className="flex items-center gap-1">
              <IconStar size={14} style={{ color: '#F5C13D' }} />
              <span className="text-[13px] font-semibold text-ink">
                {profile.average_rating.toFixed(1)}
              </span>
              <span className="text-[12px] text-c-muted">
                ({profile.total_reviews || 0})
              </span>
            </div>
          ) : (
            <span className="text-[12px] text-c-muted">{t('noReviewsYet')}</span>
          )}
          {profile.tarifa_base > 0 && (
            <span className="text-[13px] font-semibold text-ink">
              {profile.tarifa_base} €/h
            </span>
          )}
        </div>

        {/* Acciones: patrón fijo. Fila 1 = Contactar full-width;
            Fila 2 = WhatsApp + Llamar 50/50 (cada uno ocupa la mitad aunque
            falte el otro: usamos invisible spacer si solo hay uno). */}
        <div className="mt-auto pt-3 space-y-2" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={handleContactDirect}
            className="w-full inline-flex items-center justify-center gap-1.5 h-10 rounded-lg text-[13px] font-semibold text-white transition-colors"
            style={{ backgroundColor: '#00255C' }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#001A45')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#00255C')}
            aria-label={t('proProfile.contact.contactWith', { name: profile.business_name })}
          >
            <IconMessageSquare size={16} />
            {t('profile_card.contact')}
          </button>

          {(hasWhatsapp || hasPhone) && (
            <div className="grid grid-cols-2 gap-2">
              {hasWhatsapp ? (
                <a
                  href={`https://wa.me/${formatPhoneForWhatsApp(profile.telefono_contacto)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => { e.stopPropagation(); trackMetric(profile.id, 'contact_click'); }}
                  className="inline-flex items-center justify-center gap-1.5 h-10 rounded-lg text-[13px] font-semibold text-white transition-colors"
                  style={{ backgroundColor: '#1FAD4F' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#168D40')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#1FAD4F')}
                  aria-label={t('search.card.openWhatsAppOf', { name: profile.business_name })}
                >
                  <IconWhatsApp size={14} />
                  {t('profile_card.whatsapp')}
                </a>
              ) : (
                <span aria-hidden="true" />
              )}
              {hasPhone ? (
                phoneRevealed ? (
                  <a
                    href={`tel:${profile.telefono_contacto}`}
                    onClick={(e) => { e.stopPropagation(); trackMetric(profile.id, 'contact_click'); }}
                    className="inline-flex items-center justify-center gap-1.5 h-10 rounded-lg text-[12px] font-semibold border border-c-border bg-surface text-ink hover:bg-soft transition-colors truncate"
                    aria-label={t('search.card.callNumber', { phone: profile.telefono_contacto })}
                  >
                    <IconPhone size={14} style={{ color: '#00255C' }} />
                    {profile.telefono_contacto}
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); trackMetric(profile.id, 'contact_click'); setPhoneRevealed(true); }}
                    className="inline-flex items-center justify-center gap-1.5 h-10 rounded-lg text-[13px] font-semibold border border-c-border bg-surface text-ink hover:bg-soft transition-colors"
                    aria-label={t('search.card.showPhone')}
                  >
                    <IconPhone size={14} style={{ color: '#00255C' }} />
                    {t('profile_card.call')}
                  </button>
                )
              ) : (
                <span aria-hidden="true" />
              )}
            </div>
          )}
        </div>
      </div>
      {guestModal && (
        <GuestContactModal
          professional={profile}
          onClose={() => setGuestModal(false)}
        />
      )}
    </article>
  );
});

export default function SearchPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const [filters, setFilters] = useState(() => {
    // Leer filtros iniciales desde query params (hero → resultados)
    const params = new URLSearchParams(window.location.search);
    return {
      category: params.get("categoria") || "all",
      provincia: params.get("provincia") || "all",
      ciudad: params.get("ciudad") || "all",
      minRating: 0,
      availability: "all",
    };
  });
  // En móvil renderamos solo 6 tarjetas iniciales para reducir trabajo del main thread
  const [displayLimit, setDisplayLimit] = useState(() => window.innerWidth < 768 ? 6 : 12);
  const [viewMode, setViewMode] = useState("grid");
  // Filtros SIEMPRE desplegados por defecto. Sin "toggle" inicial.
  const [showFilters, setShowFilters] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const isAuth = await base44.auth.isAuthenticated();
      if (!isAuth) {
        setUser(null);
        setLoadingUser(false);
        return;
      }
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    } catch {
      setUser(null);
    } finally {
      setLoadingUser(false);
    }
  };

  const FALLBACK_CATEGORIES = [
    "Abogado", "Albañil / Reformas", "Asesoría o gestoría", "Autónomo de limpieza",
    "Carpintero", "Cerrajero", "Climatización / Calefacción", "Electricista",
    "Empresa multiservicios", "Fontanero", "Informático a domicilio / soporte IT",
    "Jardinero", "Marketing digital / diseño web", "Peluquería y estética a domicilio",
    "Persianas y toldos", "Pintor", "Transportista"
  ].map((name, idx) => ({ id: `fallback_${idx}`, name }));

  // NO hacer fetch de categorías — usar FALLBACK_CATEGORIES directamente
  const categories = FALLBACK_CATEGORIES;
  const loadingCategories = false;

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
      // Solo traer los usuarios necesarios con filter en lugar de list() completo
      const userIds = profiles.map(p => p.user_id);
      const allUsers = await base44.entities.User.filter({ id: { $in: userIds } });
      return allUsers;
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

  // Orden: Ads+ primero (por rating), luego resto en orden aleatorio estable
  const shuffledProfiles = useMemo(() => {
    if (!profiles.length) return profiles;
    const ads = profiles.filter(p => p.is_ads_plus);
    const rest = profiles.filter(p => !p.is_ads_plus);
    // Ads+: ordenar por rating desc, luego fecha desc
    ads.sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0) || new Date(b.created_date) - new Date(a.created_date));
    // Resto: orden aleatorio estable
    for (let i = rest.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [rest[i], rest[j]] = [rest[j], rest[i]];
    }
    return [...ads, ...rest];
  }, [profiles]);

  // Métricas: cuando React tiene la lista filtrada estable, registramos
  // search_appearance para cada profesional VISIBLE (límite display).
  // Dedupe interno de trackMetric evita inflar contadores.
  const filteredProfilesRaw = useMemo(() => {
    return shuffledProfiles.filter(profile => {
      const matchesSearch = !debouncedSearchTerm ||
        profile.business_name?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        profile.descripcion_corta?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        profile.categories?.some(cat => cat.toLowerCase().includes(debouncedSearchTerm.toLowerCase()));
      const matchesCategory = filters.category === "all" || profile.categories?.includes(filters.category);
      const matchesProvincia = filters.provincia === "all" || profile.provincia === filters.provincia;
      const matchesCiudad = filters.ciudad === "all" || profile.ciudad === filters.ciudad;
      const matchesRating = !filters.minRating || profile.average_rating >= filters.minRating;
      const matchesAvailability = filters.availability === "all" || profile.disponibilidad_tipo === filters.availability;
      return matchesSearch && matchesCategory && matchesProvincia && matchesCiudad && matchesRating && matchesAvailability;
    });
  }, [shuffledProfiles, debouncedSearchTerm, filters]);

  const filteredProfiles = filteredProfilesRaw;

  // Dispara search_appearance cuando se asienta la lista visible.
  useEffect(() => {
    if (!filteredProfiles.length) return;
    const id = setTimeout(() => {
      const ids = filteredProfiles.slice(0, displayLimit).map((p) => p.id).filter(Boolean);
      trackSearchAppearance(ids);
    }, 600);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredProfiles, displayLimit]);

  const availableCities = useMemo(() => {
    if (filters.provincia === "all") return [];
    return CIUDADES_POR_PROVINCIA[filters.provincia] || [];
  }, [filters.provincia]);

  const handleViewProfile = (profile) => {
    navigate(getProfileSeoUrl(profile));
  };

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

  const isInitialLoading = loadingProfiles || loadingCategories;
  const hasActiveFilters = filters.category !== "all" || filters.provincia !== "all" || filters.minRating > 0;
  // /buscar muestra TODOS los profesionales visibles por defecto. Al aplicar
  // filtros se reduce la lista; sin filtros, lista completa.
  const isEmptyQuery = false;

  // Diferir la hidratación de filtros móvil hasta después del primer paint
  const [filtersReady, setFiltersReady] = useState(false);
  useEffect(() => {
    const id = requestIdleCallback
      ? requestIdleCallback(() => setFiltersReady(true), { timeout: 1500 })
      : setTimeout(() => setFiltersReady(true), 300);
    return () => {
      if (requestIdleCallback) cancelIdleCallback(id);
      else clearTimeout(id);
    };
  }, []);

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
      <ServiceSchema categories={categories.map(c => c.name)} location={filters.provincia !== "all" ? filters.provincia : "España"} />
      <BreadcrumbSchema items={[
        { name: "Inicio", url: "https://misautonomos.es" },
        { name: "Buscar Profesionales", url: "https://misautonomos.es/buscar" }
      ]} />

      <div className="min-h-screen bg-surface" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>

        {/* Cabecera de página de resultados (la home / es Landing, no Search). */}
        <div className="border-b border-c-border bg-surface">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-ink">
              {filters.category !== "all" && filters.provincia !== "all"
                ? t('search.heading.categoryProvince', { category: filters.category, province: filters.provincia })
                : filters.category !== "all"
                ? filters.category
                : filters.provincia !== "all"
                ? t('search.heading.province', { province: filters.provincia })
                : t('messages.find_pros_cta')}
            </h1>
            <p className="text-sm text-c-muted mt-1">
              {hasActiveFilters
                ? t('search.heading.resultsCount', { count: filteredProfiles.length })
                : t('search.heading.hint')}
            </p>
          </div>
        </div>

        {/* ── CONTENIDO PRINCIPAL ── */}
        <div id="results-section">
        <div className="max-w-7xl mx-auto px-4 py-5 overflow-visible">

          {/* Panel de filtros — SIEMPRE desplegado. Sin botón "Filtros avanzados".
              Para usuarios logueados muestra encima el autocompletar de búsqueda libre. */}
          <div className="mb-5 bg-surface rounded-2xl p-4 shadow-sm border border-c-border" style={{ position: 'relative', zIndex: 10 }}>
            {user && (
              <div className="mb-3">
                <SearchAutocomplete
                  value={searchTerm}
                  onChange={setSearchTerm}
                  onSelect={handleViewProfile}
                />
              </div>
            )}

            {/* Chips de filtros activos (visitantes) */}
            {!user && (filters.category !== "all" || filters.provincia !== "all") && (
              <div className="hidden md:flex gap-2 items-center flex-wrap mb-3">
                {filters.category !== "all" && (
                  <span
                    className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium"
                    style={{ backgroundColor: 'rgba(0,37,92,0.08)', color: '#00255C' }}
                  >
                    {filters.category}
                    <button type="button" onClick={() => setFilters(f => ({...f, category: "all"}))} aria-label={`${t('common.delete')}: ${t('search.filterPanel.category')} ${filters.category}`}>
                      <IconClose size={12} />
                    </button>
                  </span>
                )}
                {filters.provincia !== "all" && (
                  <span
                    className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium"
                    style={{ backgroundColor: 'rgba(0,37,92,0.08)', color: '#00255C' }}
                  >
                    {filters.provincia}
                    <button type="button" onClick={() => setFilters(f => ({...f, provincia: "all", ciudad: "all"}))} aria-label={`${t('common.delete')}: ${t('province')} ${filters.provincia}`}>
                      <IconClose size={12} />
                    </button>
                  </span>
                )}
              </div>
            )}

            {/* Desktop: SearchFilters siempre visible */}
            <div className="hidden md:block">
              <Suspense fallback={null}>
                <SearchFilters
                  filters={filters}
                  onFilterChange={setFilters}
                  availableCities={availableCities}
                  categories={categories}
                  provinces={PROVINCIAS}
                />
              </Suspense>
            </div>

            {/* Mobile: deferred render until after first paint (también siempre visible) */}
            <div className="md:hidden">
              {filtersReady && (
                <Suspense fallback={null}>
                  <SearchFilters
                    filters={filters}
                    onFilterChange={setFilters}
                    availableCities={availableCities}
                    categories={categories}
                    provinces={PROVINCIAS}
                    isMobile={true}
                  />
                </Suspense>
              )}
            </div>
          </div>

          <SavedSearches
            user={user}
            currentFilters={filters}
            resultsCount={filteredProfiles.length}
            onLoadSearch={(savedFilters) => setFilters(savedFilters)}
          />

          {/* Header resultados */}
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-ink">
                {isInitialLoading ? (
                  <span className="text-c-muted">{t('search.results.loading')}</span>
                ) : (
                  <Trans
                    i18nKey="search.results.countHeading"
                    values={{ count: filteredProfiles.length }}
                    components={{ num: <span className="text-c-accent" /> }}
                  />
                )}
              </h2>
              <p className="text-xs text-c-muted">{t('search.verified_tag')}</p>
            </div>
            {!isInitialLoading && filteredProfiles.length > 0 && (
              <div className="flex gap-1.5" role="group">
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  aria-pressed={viewMode === "grid"}
                  aria-label={t('search.view.grid')}
                  className={`btn-icon border ${viewMode === "grid" ? "bg-c-accent border-c-accent text-white" : "bg-surface border-c-border text-ink hover:border-ink"}`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("map")}
                  aria-pressed={viewMode === "map"}
                  aria-label={t('search.view.map')}
                  className={`btn-icon border ${viewMode === "map" ? "bg-c-accent border-c-accent text-white" : "bg-surface border-c-border text-ink hover:border-ink"}`}
                >
                  <IconMapPin size={16} aria-hidden="true" />
                </button>
              </div>
            )}
          </div>

          {/* Skeleton loading — MISMA altura (288 px) que la tarjeta real
              para que al swap no se empuje el contenido de abajo (anti-CLS). */}
          {isInitialLoading && (
            <div className="grid gap-4 search-results-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))' }}>
              {[...Array(8)].map((_, idx) => (
                <div key={idx} className="bg-surface rounded-2xl overflow-hidden border border-c-border" style={{ minHeight: '288px', contain: 'layout style paint' }}>
                  {/* Desktop: blue header bar */}
                  <div className="hidden md:block" style={{ height: '48px', background: '#e5e7eb' }} />
                  {/* Mobile: avatar + name row (matches real card mobile layout) */}
                  <div className="md:hidden flex items-center gap-3 px-3 pt-3 pb-1">
                    <div style={{ width: '48px', height: '48px', minWidth: '48px', borderRadius: '9999px', background: '#e5e7eb' }} />
                    <div className="flex-1 space-y-2">
                      <div style={{ height: '14px', width: '60%', borderRadius: '4px', background: '#e5e7eb' }} />
                      <div style={{ height: '11px', width: '40%', borderRadius: '4px', background: '#f3f4f6' }} />
                    </div>
                  </div>
                  {/* Shared content area */}
                  <div className="px-3 pb-3 md:pt-8 pt-2 space-y-2">
                    <div className="hidden md:block h-4 w-3/4 rounded" style={{ background: '#e5e7eb' }} />
                    <div className="hidden md:block h-3 w-1/2 rounded" style={{ background: '#f3f4f6' }} />
                    <div style={{ height: '11px', width: '55%', borderRadius: '4px', background: '#f3f4f6' }} />
                    <div style={{ height: '32px', width: '100%', borderRadius: '6px', background: '#f3f4f6', marginTop: '8px' }} />
                    <div style={{ height: '32px', width: '100%', borderRadius: '8px', background: '#e5e7eb', marginTop: '8px' }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Sin resultados */}
          {!isInitialLoading && filteredProfiles.length === 0 && (
            <div className="space-y-4">
              <EmptyState
                icon={<IconSearch size={28} />}
                title={t('search.empty.title')}
                body={t('search.empty.hint')}
                ctaLabel={hasActiveFilters ? t('landing.hero.viewAll') : undefined}
                onCta={() => setFilters({ category: "all", provincia: "all", ciudad: "all", minRating: 0, availability: "all" })}
              />
              {/* Fix #11: Show related suggestions when no results */}
              {profiles.length > 0 && (
                <div>
                  <p className="text-sm text-c-muted mb-3 font-medium">{t('search.empty.suggestions')}</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                    {profiles.slice(0, 4).map((profile) => (
                      <ProfileCard
                        key={profile.id}
                        profile={profile}
                        onClick={() => handleViewProfile(profile)}
                        onToggleFavorite={() => handleToggleFavorite(profile)}
                        isFavorite={favorites.some(fav => fav.professional_id === profile.user_id)}
                        professionalUser={professionalUsers.find(u => u.id === profile.user_id)}
                        currentUserId={user?.id}
                        currentUser={user}
                      />
                    ))}
                  </div>
                </div>
              )}
              {(!user || user.user_type === "client") && (
                <div className="card p-8 text-center border rounded-2xl overflow-hidden" style={{ borderColor: 'rgba(0,37,92,0.12)', background: '#F8FAFF' }}>
                  <IconBriefcase size={40} className="mx-auto mb-3" style={{ color: '#00255C' }} />
                  <h3 className="text-xl font-bold mb-2 text-ink">{t('landing.cta_pro_title')}</h3>
                  <p className="text-c-muted mb-5 text-sm max-w-md mx-auto">
                    {t('search.proCta.body')}
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate('/registro?tipo=autonomo')}
                    className="btn px-6 font-semibold rounded-xl"
                    style={{ backgroundColor: '#F5C13D', color: '#00255C' }}
                  >
                    {t('nav.becomeProFree')}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Grid de resultados */}
          {!isInitialLoading && filteredProfiles.length > 0 && (
            <>
              {viewMode === "grid" ? (
                <>
                  <div className="grid gap-4 items-stretch" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))' }}>
                    {filteredProfiles.slice(0, displayLimit).map((profile, idx) => (
                      <ProfileCard
                        key={profile.id}
                        profile={profile}
                        onClick={() => handleViewProfile(profile)}
                        onToggleFavorite={() => handleToggleFavorite(profile)}
                        isFavorite={favorites.some(fav => fav.professional_id === profile.user_id)}
                        professionalUser={professionalUsers.find(u => u.id === profile.user_id)}
                        currentUserId={user?.id}
                        currentUser={user}
                        priority={idx < 4}
                      />
                    ))}
                  </div>
                  {filteredProfiles.length > displayLimit && (
                    <div className="text-center mt-10">
                      <button
                        type="button"
                        onClick={() => setDisplayLimit(prev => prev + 12)}
                        className="btn-secondary btn-lg px-10 rounded-2xl font-semibold"
                      >
                        {t('search.load_more', { count: filteredProfiles.length - displayLimit })}
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <Suspense fallback={<div className="h-96 bg-soft rounded-xl animate-pulse" />}>
                  <MapView profiles={filteredProfiles} onProfileClick={handleViewProfile} />
                </Suspense>
              )}
            </>
          )}

          {/* CTA final para registrarse como autónomo */}
          {!isInitialLoading && !loadingUser && (!user || user.user_type === "client") && (
            <div className="mt-14 rounded-3xl overflow-hidden" style={{ background: '#00255C' }}>
              <div className="p-8 md:p-12 text-white text-center">
                <h3 className="text-3xl md:text-4xl font-extrabold mb-3 tracking-tight">
                  {t('landing.cta_pro_title')}<br />
                  <span style={{ color: '#F5C13D' }}>{t('search.finalCta.titleHighlight')}</span>
                </h3>
                <p className="text-white/80 mb-8 text-base max-w-lg mx-auto leading-relaxed">
                  {t('search.finalCta.body')}
                </p>
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={() => navigate('/registro?tipo=autonomo')}
                    className="btn px-8 text-base font-semibold rounded-xl"
                    style={{ backgroundColor: '#F5C13D', color: '#00255C' }}
                  >
                    {t('nav.becomeProFree')}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        </div>
      </div>
    </>
  );
}