import React, { useState, useEffect, useMemo, lazy, Suspense } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Search as SearchIcon,
  MapPin,
  Heart,
  MessageCircle,
  Phone,
  Star,
  Zap,
  Droplets,
  Hammer,
  HardHat,
  Paintbrush,
  Trees,
  Truck,
  Sparkles,
  Key,
  Wind,
  Wrench,
  MoreHorizontal,
  Waves,
  Copy,
  Check,
  Briefcase,
  MessageSquare,
  Users,
  Shield,
  ChevronRight,
  SlidersHorizontal,
  X,
  Palette,
  Sprout,
  Lightbulb,
  BadgeCheck
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import LandingHero from "@/components/home/LandingHero";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import SEOHead from "../components/seo/SEOHead";
import { ServiceSchema, BreadcrumbSchema } from "../components/seo/StructuredData";
import { Trans, useTranslation } from "react-i18next";
import { useProfileTranslation } from "../components/profile/useProfileTranslation";
import { PROVINCIAS, CIUDADES_POR_PROVINCIA } from "../components/utils/locationsData";
import SearchAutocomplete from "../components/search/SearchAutocomplete";
import SavedSearches from "../components/search/SavedSearches";
const PullToRefresh = lazy(() => import("../components/ui/PullToRefresh"));
const SearchFilters = lazy(() => import("../components/search/SearchFilters"));
const MapView = lazy(() => import("../components/search/MapView"));
const TrustSlider = lazy(() => import("../components/search/TrustSlider"));
import { generateSlug } from "../utils/slugUtils";
import { getProfileSeoUrl } from '@/lib/seoUrl';
import { optimizeSupabaseImage } from '@/lib/supabaseImage';
import { trackMetric, trackSearchAppearance } from '@/lib/trackMetric';
import GuestContactModal from "@/components/messages/GuestContactModal";
import InitialsAvatar from "@/components/ui/InitialsAvatar";

const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
};

const QUICK_CATEGORIES = [
  { name: "Electricista", icon: Zap, color: "from-yellow-400 to-orange-400" },
  { name: "Fontanero", icon: Droplets, color: "from-blue-400 to-cyan-400" },
  { name: "Pintor", icon: Paintbrush, color: "from-pink-400 to-rose-400" },
  { name: "Albañil / Reformas", icon: HardHat, color: "from-orange-400 to-amber-400" },
  { name: "Jardinero", icon: Trees, color: "from-green-400 to-emerald-400" },
  { name: "Autónomo de limpieza", icon: Sparkles, color: "from-purple-400 to-violet-400" },
  { name: "Cerrajero", icon: Key, color: "from-slate-400 to-gray-500" },
  { name: "Carpintero", icon: Hammer, color: "from-amber-500 to-yellow-500" },
];

const ProfileCard = React.memo(({ profile, onClick, onToggleFavorite, isFavorite, professionalUser, currentUserId, currentUser, priority }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [phoneRevealed, setPhoneRevealed] = useState(false);
  const [guestModal, setGuestModal] = useState(false);

  // Botón "Contactar":
  //   - Si hay sesión Supabase activa → abre/crea conversación y entra al chat.
  //     NUNCA redirige a /login con sesión activa.
  //   - Si no hay sesión → abre modal invitado que llama a contact-professional.
  const handleContactDirect = async (e) => {
    e.stopPropagation();
    trackMetric(profile.id, 'contact_click');

    // 1) ¿Sesión Supabase activa?
    const { resolveSelfUserRow } = await import('@/lib/contactProfessional');
    const { session, userRow } = await resolveSelfUserRow();

    // 2) Sin sesión → invitado.
    if (!session) {
      setGuestModal(true);
      return;
    }

    // 3) Con sesión: resolvemos mi id de tabla `users` por auth_user_id.
    //    Si por alguna razón no aparece todavía, dejamos que createMessage
    //    use el id del callback de auth como fallback (lo veremos en logs).
    const myUserRowId = userRow?.id || currentUserId || null;
    if (!myUserRowId || !profile.user_id) {
      // Edge case raro: tenemos sesión pero no encontramos fila users.
      // Mejor caer en el modal de invitado (con datos prefill del session.user.email).
      setGuestModal(true);
      return;
    }

    const conversationId = [myUserRowId, profile.user_id].sort().join('_');
    try {
      const existing = await base44.entities.Message.filter({ conversation_id: conversationId }, '-created_date', 1);
      if (!existing || existing.length === 0) {
        const { createMessage } = await import('@/lib/createMessage');
        await createMessage({
          conversation_id: conversationId,
          sender_id: myUserRowId,
          recipient_id: profile.user_id,
          content: 'Hola, me interesa tu servicio. ¿Podemos hablar?',
          professional_name: profile.business_name || 'Profesional',
          client_name: currentUser?.full_name || currentUser?.email || session.user.email || '',
          is_read: false,
          attachments: [],
        });
      }
    } catch (_e) { /* no bloqueante */ }
    navigate(`/messages?conv=${conversationId}`);
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
      className="card-skeleton cursor-pointer bg-white rounded-2xl border border-slate-200 hover:border-[#00255C] hover:shadow-[0_10px_30px_-15px_rgba(0,37,92,0.18)] transition-all flex flex-col"
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
              <h3 className="font-semibold text-slate-900 text-[15px] leading-snug truncate">
                {profile.business_name || t('favorites.page.unnamed')}
              </h3>
              {isVerified && (
                <span title={t('proProfile.badges.identityVerified')}>
                  <BadgeCheck className="w-4 h-4 flex-shrink-0" style={{ color: '#00255C' }} aria-label={t('proProfile.badges.identityVerified')} />
                </span>
              )}
            </div>
            {categoryLabel && (
              <p className="text-[12px] truncate mt-0.5" style={{ color: '#00255C' }}>
                {categoryLabel}
              </p>
            )}
            <p className="text-slate-500 text-[12px] mt-0.5 inline-flex items-center gap-1 truncate">
              <MapPin className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
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
              <Star className="w-2.5 h-2.5 fill-current" />
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
              className="flex-shrink-0 w-8 h-8 inline-flex items-center justify-center rounded-full border border-slate-200 bg-white hover:bg-rose-50 transition-colors"
            >
              <Heart
                className={`w-4 h-4 ${isFavorite ? 'fill-rose-500 text-rose-500' : 'text-slate-400'}`}
              />
            </button>
          )}
        </div>

        {/* Descripción 2 líneas (altura reservada para uniformidad) */}
        <p className="text-slate-600 text-[13px] mt-3 line-clamp-2 leading-relaxed" style={{ minHeight: '2.6em' }}>
          {profile.descripcion_corta || ''}
        </p>

        {/* Valoración + tarifa en la misma línea */}
        <div className="flex items-center justify-between mt-3" style={{ minHeight: '20px' }}>
          {profile.average_rating > 0 ? (
            <div className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 fill-current" style={{ color: '#F5C13D' }} />
              <span className="text-[13px] font-semibold text-slate-800">
                {profile.average_rating.toFixed(1)}
              </span>
              <span className="text-[12px] text-slate-400">
                ({profile.total_reviews || 0})
              </span>
            </div>
          ) : (
            <span className="text-[12px] text-slate-400">{t('noReviewsYet')}</span>
          )}
          {profile.tarifa_base > 0 && (
            <span className="text-[13px] font-semibold text-slate-900">
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
            <MessageSquare className="w-4 h-4" />
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
                  <svg viewBox="0 0 24 24" fill="white" width="14" height="14" aria-hidden="true">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
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
                    className="inline-flex items-center justify-center gap-1.5 h-10 rounded-lg text-[12px] font-semibold border border-slate-200 bg-white text-slate-900 hover:bg-slate-50 transition-colors truncate"
                    aria-label={t('search.card.callNumber', { phone: profile.telefono_contacto })}
                  >
                    <Phone className="w-3.5 h-3.5" style={{ color: '#00255C' }} />
                    {profile.telefono_contacto}
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); trackMetric(profile.id, 'contact_click'); setPhoneRevealed(true); }}
                    className="inline-flex items-center justify-center gap-1.5 h-10 rounded-lg text-[13px] font-semibold border border-slate-200 bg-white text-slate-900 hover:bg-slate-50 transition-colors"
                    aria-label={t('search.card.showPhone')}
                  >
                    <Phone className="w-3.5 h-3.5" style={{ color: '#00255C' }} />
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

      <div className="min-h-screen bg-white" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>

        {/* Cabecera de página de resultados (la home / es Landing, no Search). */}
        <div className="border-b border-slate-100 bg-white">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-slate-900">
              {filters.category !== "all" && filters.provincia !== "all"
                ? t('search.heading.categoryProvince', { category: filters.category, province: filters.provincia })
                : filters.category !== "all"
                ? filters.category
                : filters.provincia !== "all"
                ? t('search.heading.province', { province: filters.provincia })
                : t('messages.find_pros_cta')}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
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
          <div className="mb-5 bg-white rounded-2xl p-4 shadow-sm border border-gray-100" style={{ position: 'relative', zIndex: 10 }}>
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
                    <button onClick={() => setFilters(f => ({...f, category: "all"}))}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {filters.provincia !== "all" && (
                  <span
                    className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium"
                    style={{ backgroundColor: 'rgba(0,37,92,0.08)', color: '#00255C' }}
                  >
                    {filters.provincia}
                    <button onClick={() => setFilters(f => ({...f, provincia: "all", ciudad: "all"}))}>
                      <X className="w-3 h-3" />
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
              <h2 className="text-lg font-bold text-gray-900">
                {isInitialLoading ? (
                  <span className="text-gray-400">{t('search.results.loading')}</span>
                ) : (
                  <Trans
                    i18nKey="search.results.countHeading"
                    values={{ count: filteredProfiles.length }}
                    components={{ num: <span className="text-blue-600" /> }}
                  />
                )}
              </h2>
              <p className="text-xs text-gray-600">{t('search.verified_tag')}</p>
            </div>
            {!isInitialLoading && filteredProfiles.length > 0 && (
              <div className="flex gap-1.5">
                <Button
                  variant={viewMode === "grid" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                  aria-label={t('search.view.grid')}
                  className={`h-8 w-8 p-0 ${viewMode === "grid" ? "bg-blue-600 border-blue-600" : "border-gray-200"}`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </Button>
                <Button
                  variant={viewMode === "map" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("map")}
                  aria-label={t('search.view.map')}
                  className={`h-8 w-8 p-0 ${viewMode === "map" ? "bg-blue-600 border-blue-600" : "border-gray-200"}`}
                >
                  <MapPin className="w-4 h-4" aria-hidden="true" />
                </Button>
              </div>
            )}
          </div>

          {/* Skeleton loading — MISMA altura (288 px) que la tarjeta real
              para que al swap no se empuje el contenido de abajo (anti-CLS). */}
          {isInitialLoading && (
            <div className="grid gap-4 search-results-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))' }}>
              {[...Array(8)].map((_, idx) => (
                <div key={idx} className="bg-white rounded-2xl overflow-hidden border border-slate-200" style={{ minHeight: '288px', contain: 'layout style paint' }}>
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
              <Card className="p-8 text-center border-0 shadow-sm rounded-2xl bg-white">
                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <SearchIcon className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{t('search.empty.title')}</h3>
                <p className="text-sm text-gray-500 mb-4">{t('search.empty.hint')}</p>
                {hasActiveFilters && (
                  <Button
                    className="text-white"
                    style={{ backgroundColor: '#00255C' }}
                    onClick={() => setFilters({ category: "all", provincia: "all", ciudad: "all", minRating: 0, availability: "all" })}
                  >
                    {t('landing.hero.viewAll')}
                  </Button>
                )}
              </Card>
              {/* Fix #11: Show related suggestions when no results */}
              {profiles.length > 0 && (
                <div>
                  <p className="text-sm text-gray-500 mb-3 font-medium">{t('search.empty.suggestions')}</p>
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
                <Card className="p-8 text-center border rounded-2xl overflow-hidden" style={{ borderColor: 'rgba(0,37,92,0.12)', background: '#F8FAFF' }}>
                  <Briefcase className="w-10 h-10 mx-auto mb-3" style={{ color: '#00255C' }} />
                  <h3 className="text-xl font-bold mb-2 text-slate-900">{t('landing.cta_pro_title')}</h3>
                  <p className="text-slate-600 mb-5 text-sm max-w-md mx-auto">
                    {t('search.proCta.body')}
                  </p>
                  <Button
                    onClick={() => navigate('/registro?tipo=autonomo')}
                    className="h-11 px-6 font-semibold rounded-xl"
                    style={{ backgroundColor: '#F5C13D', color: '#00255C' }}
                  >
                    {t('nav.becomeProFree')}
                  </Button>
                </Card>
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
                      <Button
                        onClick={() => setDisplayLimit(prev => prev + 12)}
                        variant="outline"
                        size="lg"
                        className="px-10 rounded-2xl border-gray-200 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 font-semibold"
                      >
                        {t('search.load_more', { count: filteredProfiles.length - displayLimit })}
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <Suspense fallback={<div className="h-96 bg-gray-100 rounded-xl animate-pulse" />}>
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
                  <Button
                    onClick={() => navigate('/registro?tipo=autonomo')}
                    className="h-12 px-8 text-base font-semibold rounded-xl"
                    style={{ backgroundColor: '#F5C13D', color: '#00255C' }}
                  >
                    {t('nav.becomeProFree')}
                  </Button>
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