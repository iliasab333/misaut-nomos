import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Search as SearchIcon,
  MapPin,
  Star,
  Heart,
  Briefcase,
  ArrowLeft
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { optimizeSupabaseImage } from "@/lib/supabaseImage";
import { Badge } from "@/components/ui/badge";
import InitialsAvatar from "@/components/ui/InitialsAvatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import SEOHead from "../components/seo/SEOHead";
import { useLanguage } from "../components/ui/LanguageSwitcher";
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
  const { t } = useLanguage();
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
        toast.success("Eliminado de favoritos");
      } else {
        await base44.entities.Favorite.create({
          client_id: user.id,
          professional_id: profile.user_id,
          business_name: profile.business_name
        });
        toast.success("Añadido a favoritos");
      }
    } catch {
      toast.error("Error al gestionar favoritos");
    }
  };

  // Nombre visible: categoryName resuelto o placeholder mientras carga
  const displayName = categoryName || (serviceCategories.length === 0 ? '…' : categorySlug);

  // SEO
  const canonicalUrl = ciudadSlug
    ? `https://misautonomos.es/categoria/${categorySlug}-en-${ciudadSlug}`
    : `https://misautonomos.es/categoria/${categorySlug}`;

  const seoTitle = ciudadName
    ? `${displayName} en ${ciudadName} - MisAutónomos`
    : `${displayName} - Encuentra autónomos verificados | MisAutónomos`;

  const seoDescription = ciudadName
    ? `Encuentra ${displayName?.toLowerCase()} verificados en ${ciudadName}. Contacta directamente, pide presupuesto gratis.`
    : `Directorio de ${displayName?.toLowerCase()} autónomos en España. Compara precios, lee opiniones y contacta gratis.`;

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

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white py-8 md:py-12">
          <div className="max-w-6xl mx-auto px-4">
            <Button
              onClick={() => navigate(createPageUrl("Search"))}
              variant="ghost"
              className="text-white hover:bg-white/10 mb-4 font-medium"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('backToSearch') || 'Volver a búsqueda'}
            </Button>

            <h1 className="text-2xl md:text-4xl font-bold mb-2">
              {displayName} {ciudadName ? `en ${ciudadName}` : 'en España'}
            </h1>
            <p className="text-blue-100 text-lg">
              {isLoading ? 'Buscando profesionales…' : `${profiles.length} profesional${profiles.length !== 1 ? 'es' : ''} disponible${profiles.length !== 1 ? 's' : ''}`}
            </p>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-6">
          {/* Filtro de ciudad */}
          <Card className="mb-6 shadow-sm border-0 rounded-xl">
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-3 items-center">
                <MapPin className="w-5 h-5 text-gray-500" />
                <Select value={ciudadName || "all"} onValueChange={handleCiudadChange}>
                  <SelectTrigger className="w-48 h-10 rounded-lg">
                    <SelectValue placeholder="Seleccionar ciudad" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toda España</SelectItem>
                    {CIUDADES_PRINCIPALES.map(ciudad => (
                      <SelectItem key={ciudad} value={ciudad}>{ciudad}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Loading */}
          {isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="rounded-xl">
                  <CardContent className="p-4">
                    <div className="flex gap-3 mb-3">
                      <Skeleton className="w-12 h-12 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                    <Skeleton className="h-16 w-full mb-3" />
                    <Skeleton className="h-9 w-full" />
                  </CardContent>
                </Card>
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
                  <Briefcase className="w-6 h-6" style={{ color: '#F5C13D' }} />
                </div>
                <h2 className="text-2xl md:text-3xl font-semibold tracking-tight" style={{ letterSpacing: '-0.02em' }}>
                  Sé el primer {displayName}{ciudadName ? ` en ${ciudadName}` : ''} en MisAutónomos
                </h2>
                <p className="mt-3 text-white/80 max-w-xl mx-auto">
                  Estamos creciendo. Si das de alta tu perfil ahora, sales tú primero cuando alguien busque este oficio.
                  Sin permanencia, sin comisiones.
                </p>
                <div className="mt-7 flex flex-col sm:flex-row gap-3 justify-center">
                  <Button
                    onClick={() => navigate('/para-autonomos')}
                    className="h-11 px-6 rounded-xl font-semibold"
                    style={{ backgroundColor: '#F5C13D', color: '#00255C' }}
                  >
                    Hazte autónomo · Gratis
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => navigate('/buscar')}
                    className="h-11 px-6 rounded-xl font-semibold bg-transparent border-white/30 text-white hover:bg-white/10 hover:text-white"
                  >
                    Ver todos los oficios
                  </Button>
                </div>
              </div>
              {ciudadName && (
                <div className="bg-white p-4 text-center text-sm">
                  ¿Buscas {displayName} en otra ciudad?{' '}
                  <button
                    onClick={() => navigate(`/categoria/${categorySlug}`)}
                    className="font-medium underline underline-offset-2"
                    style={{ color: '#00255C' }}
                  >
                    Ver {displayName} en toda España
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
                    <Card className={`bg-white hover:shadow-lg transition-all rounded-xl h-full ${profile.is_ads_plus ? 'ring-1 ring-amber-300' : ''}`}>
                      <CardContent className="p-4 flex flex-col h-full">
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
                                className="font-semibold text-slate-900 cursor-pointer truncate hover:underline underline-offset-2"
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
                                  Destacado
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1 text-sm text-gray-500">
                              <MapPin className="w-3 h-3" />
                              <span className="truncate">{profile.ciudad || profile.provincia}</span>
                            </div>
                          </div>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleToggleFavorite(profile)}
                            className={favorites.some(f => f.professional_id === profile.user_id)
                              ? 'text-red-500' : 'text-gray-300'}
                          >
                            <Heart className={`w-4 h-4 ${favorites.some(f => f.professional_id === profile.user_id) ? 'fill-current' : ''}`} />
                          </Button>
                        </div>

                        {profile.descripcion_corta && (
                          <p className="text-sm text-gray-600 line-clamp-2 mb-3 flex-1">
                            {profile.descripcion_corta}
                          </p>
                        )}

                        {profile.average_rating > 0 && (
                          <div className="flex items-center gap-1 mb-3">
                            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                            <span className="font-semibold">{profile.average_rating.toFixed(1)}</span>
                            <span className="text-gray-500 text-sm">({profile.total_reviews})</span>
                          </div>
                        )}

                        <Button
                          onClick={() => handleViewProfile(profile)}
                          className="w-full text-white font-semibold"
                          style={{ backgroundColor: '#00255C' }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#001A45')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#00255C')}
                        >
                          Ver perfil
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}

          {/* CTA */}
          {!isLoading && profiles.length > 0 && (
            <div className="mt-12 bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-8 text-center text-white">
              <h3 className="text-2xl font-bold mb-2">¿Eres {displayName}?</h3>
              <p className="text-blue-100 mb-5">Regístrate y consigue más clientes</p>
              <Button
                onClick={() => navigate(createPageUrl("PricingPlans"))}
                className="bg-white hover:bg-gray-50 text-blue-700 h-12 px-8 font-semibold"
              >
                <Briefcase className="w-5 h-5 mr-2" />
                Registrarme como profesional
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}