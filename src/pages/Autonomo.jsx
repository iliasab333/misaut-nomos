import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  MapPin,
  Euro,
  Globe,
  Heart,
  MessageSquare,
  Phone,
  MessageCircle,
  Facebook,
  Instagram,
  Linkedin,
  Star,
  Award,
  AlertCircle,
  X,
  Music,
  Copy,
  Check,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  BadgeCheck,
  Briefcase,
  FileText,
  Clock,
  Share2
} from "lucide-react";
import { shareUrl, haptic } from "@/lib/native";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import InitialsAvatar from "@/components/ui/InitialsAvatar";
import { optimizeSupabaseImage } from "@/lib/supabaseImage";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import ReviewSection from "../components/profile/ReviewSection";
import SEOHead from "../components/seo/SEOHead";
import { LocalBusinessSchema, FAQPageSchema, ProfessionalPersonSchema, BreadcrumbSchema, MerchantListingSchema } from "../components/seo/StructuredData";
import { toast } from "sonner";
import { useLanguage } from "../components/ui/LanguageSwitcher";
import { useProfileTranslation } from "../components/profile/useProfileTranslation";
import { ActionButtonsProfile } from "../components/profile/ActionButtons";
import { generateSlug, isSlugDirty } from "../utils/slugUtils";
import { getProfileSeoUrl } from '@/lib/seoUrl';
import { slugify } from '@/lib/slugify';
import CategoryCityLink from "../components/profile/CategoryCityLink";
import GuestContactModal from "@/components/messages/GuestContactModal";

// Limpiar slug antiguo que puede tener IDs hex al final (ej: -5e8405).
function cleanOldSlug(slug) {
  if (!slug) return '';
  const cleaned = slug.replace(/-[a-f0-9]{6,}$/i, '');
  return slugify(cleaned);
}

export default function AutonomoPage() {
  const navigate = useNavigate();
  const params = useParams();
  const { t } = useLanguage();
  const [user, setUser] = useState(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [guestModal, setGuestModal] = useState(false);

  // Leer slug de path param (:slug) o fallback a query param (?slug=xxx)
  // cityCategory es el segmento "categoria-en-ciudad" de la ruta SEO (puede ser undefined en ruta legacy)
  const urlParams = new URLSearchParams(window.location.search);
  const slug = params.slug || urlParams.get("slug");

  // Redirigir a búsqueda si no hay slug
  useEffect(() => {
    if (!slug) {
      navigate(createPageUrl("Search"));
    }
  }, [slug, navigate]);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    } catch (error) {
      setUser(null);
    }
  };

  // Buscar perfil por slug con soporte de redirección de slugs sucios
  const { data: profileData, isLoading: loadingProfile } = useQuery({
    queryKey: ['autonomoBySlug', slug],
    queryFn: async () => {
      if (!slug) return { profile: null, redirect: null };
      
      const allProfiles = await base44.entities.ProfessionalProfile.list();
      const cleanedInputSlug = generateSlug(slug); // Limpiar el slug de entrada
      
      // 1. Buscar por slug_publico exacto
      let found = allProfiles.find(p => p.slug_publico === slug);
      if (found && !isSlugDirty(found.slug_publico)) {
        return { profile: found, redirect: null };
      }
      
      // 2. Buscar por slug limpio (sin tildes/guiones dobles/espacios)
      found = allProfiles.find(p => p.slug_publico === cleanedInputSlug);
      if (found) {
        return { profile: found, redirect: found.slug_publico };
      }
      
      // 3. Buscar por slug generado del nombre actual
      found = allProfiles.find(p => generateSlug(p.business_name) === cleanedInputSlug);
      if (found) {
        const cleanSlug = generateSlug(found.business_name);
        // Si el slug_publico está sucio, devolverlo limpio
        if (found.slug_publico && isSlugDirty(found.slug_publico)) {
          return { profile: found, redirect: cleanSlug };
        }
        return { profile: found, redirect: found.slug_publico || cleanSlug };
      }
      
      // 4. Búsqueda por slug_publico_aliases (slugs viejos guardados)
      found = allProfiles.find(p =>
        p.slug_publico_aliases?.includes(slug) ||
        p.slug_publico_aliases?.includes(cleanedInputSlug)
      );
      if (found) {
        return { profile: found, redirect: found.slug_publico || generateSlug(found.business_name) };
      }

      // 5. Búsqueda flexible por coincidencia parcial
      found = allProfiles.find(p => {
        const nameSlug = generateSlug(p.business_name);
        return nameSlug.startsWith(cleanedInputSlug) || cleanedInputSlug.startsWith(nameSlug);
      });
      if (found) {
        const cleanSlug = generateSlug(found.business_name);
        return { profile: found, redirect: found.slug_publico || cleanSlug };
      }

      // 6. Llamar backend para resolver slug legacy si nada coincide localmente
      try {
        const res = await base44.functions.invoke('resolveLegacySlug', { path: window.location.pathname });
        if (res?.data?.found && res.data.canonical) {
          // Retornar un objeto especial para que el efecto de redirect lo gestione
          return { profile: null, redirect: null, externalRedirect: res.data.canonical };
        }
      } catch { /* silent */ }

      return { profile: null, redirect: null };
    },
    enabled: !!slug,
    staleTime: 1000 * 60 * 5,
  });

  const profile = profileData?.profile;
  const redirectSlug = profileData?.redirect;
  
  // Traducción automática del perfil
  const { translatedProfile, isTranslating } = useProfileTranslation(profile);

  // Redirigir automáticamente a slug limpio si es diferente
  useEffect(() => {
    if (profileData?.externalRedirect) {
      navigate(profileData.externalRedirect, { replace: true });
      return;
    }
    if (redirectSlug && redirectSlug !== slug && profile) {
      const newUrl = createPageUrl("Autonomo") + `/${redirectSlug}`;
      window.history.replaceState({}, '', newUrl);
    }
  }, [redirectSlug, slug, profile, profileData?.externalRedirect]); // eslint-disable-line react-hooks/exhaustive-deps

  // Redirect a URL canónica SEO si la actual no lo es (categoria-en-ciudad/nombre)
  useEffect(() => {
    if (!profile || loadingProfile) return;
    const canonicalUrl = getProfileSeoUrl(profile);
    const currentPath = window.location.pathname;
    if (canonicalUrl !== currentPath && canonicalUrl !== '/autonomo') {
      navigate(canonicalUrl, { replace: true });
    }
  }, [profile, loadingProfile, navigate]);

  const { data: professionalUser } = useQuery({
    queryKey: ['professionalUser', profile?.user_id],
    queryFn: async () => {
      const users = await base44.entities.User.filter({ id: profile.user_id });
      return users[0];
    },
    enabled: !!profile?.user_id,
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ['reviews', profile?.user_id],
    queryFn: async () => {
      const allReviews = await base44.entities.Review.filter({ professional_id: profile.user_id });
      return allReviews.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    },
    enabled: !!profile?.user_id,
  });

  // Verificar favorito
  useEffect(() => {
    if (user && profile) {
      checkFavorite();
    }
  }, [user, profile]);

  const checkFavorite = async () => {
    try {
      const favs = await base44.entities.Favorite.filter({
        client_id: user.id,
        professional_id: profile.user_id
      });
      setIsFavorite(favs.length > 0);
    } catch (error) {
      console.error("Error checking favorite:", error);
    }
  };

  // Trackea profile_view vía RPC track_profile_metric.
  // Pasa profile.id (id de professional_profiles), NO profile.user_id.
  // Dedupe interno de trackMetric (5 min por pestaña) evita doble conteo.
  useEffect(() => {
    if (profile?.id) {
      import('@/lib/trackMetric').then(({ trackMetric }) => {
        trackMetric(profile.id, 'profile_view');
      });
    }
  }, [profile?.id]);

  const handleToggleFavorite = async () => {
    if (!user) {
      const currentUrl = window.location.href;
      base44.auth.redirectToLogin(currentUrl);
      return;
    }

    try {
      if (isFavorite) {
        const favs = await base44.entities.Favorite.filter({
          client_id: user.id,
          professional_id: profile.user_id
        });
        if (favs[0]) await base44.entities.Favorite.delete(favs[0].id);
        setIsFavorite(false);
        toast.success(t('removedFromFavorites') || "Eliminado de favoritos");
      } else {
        await base44.entities.Favorite.create({
          client_id: user.id,
          professional_id: profile.user_id,
          business_name: profile.business_name
        });
        setIsFavorite(true);
        toast.success(t('addedToFavorites') || "Añadido a favoritos");
      }
    } catch (error) {
      toast.error("Error al gestionar favoritos");
    }
  };

  const handleStartChat = async () => {
    if (profile?.id) {
      import('@/lib/trackMetric').then(({ trackMetric }) => {
        trackMetric(profile.id, 'contact_click');
      });
    }

    const { resolveSelfUserRow } = await import('@/lib/contactProfessional');
    const { session, userRow } = await resolveSelfUserRow();

    if (!session) {
      setGuestModal(true);
      return;
    }

    const myUserRowId = userRow?.id || user?.id || null;
    if (!myUserRowId || !profile?.user_id) {
      setGuestModal(true);
      return;
    }

    const conversationId = [myUserRowId, profile.user_id].sort().join('_');

    try {
      const existing = await base44.entities.Message.filter({ conversation_id: conversationId }, '-created_date', 1);
      if (!existing || existing.length === 0) {
        await base44.entities.Message.create({
          conversation_id: conversationId,
          sender_id: myUserRowId,
          recipient_id: profile.user_id,
          content: "Hola, me interesa tu servicio. ¿Podemos hablar?",
          professional_name: profile.business_name || "Profesional",
          client_name: user?.full_name || user?.email || session.user.email || "",
          is_read: false,
          attachments: [],
        });
      }
    } catch {}

    navigate(`/messages?conv=${conversationId}`);
  };

  const formatPhoneForWhatsApp = (phone) => {
    if (!phone) return null;
    let cleaned = phone.replace(/\D/g, '');
    if (!cleaned.startsWith('34') && cleaned.length === 9) {
      cleaned = '34' + cleaned;
    }
    return cleaned;
  };

  const handlePhoneClick = () => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) {
      let cleaned = profile.telefono_contacto.replace(/[^\d+]/g, '');
      if (!cleaned.startsWith('+')) cleaned = '+34' + cleaned;
      window.location.href = `tel:${cleaned}`;
    } else {
      setShowPhoneModal(true);
    }
  };

  const handleWhatsAppClick = () => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) {
      window.open(`https://wa.me/${formatPhoneForWhatsApp(profile.telefono_contacto)}`, '_blank');
    } else {
      setShowWhatsAppModal(true);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedPhone(true);
    toast.success("Número copiado");
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  // Formatear enlaces de redes sociales
  const formatSocialLink = (value, platform) => {
    if (!value) return null;
    
    const cleanValue = value.trim();
    
    // Si ya es una URL completa, devolverla
    if (cleanValue.startsWith('http://') || cleanValue.startsWith('https://')) {
      return cleanValue;
    }
    
    // Si es un username (sin http), generar el link según la plataforma
    const username = cleanValue.replace(/^@/, ''); // Eliminar @ si lo tiene
    
    switch (platform) {
      case 'instagram':
        return `https://instagram.com/${username}`;
      case 'facebook':
        return `https://facebook.com/${username}`;
      case 'linkedin':
        return cleanValue.includes('/') 
          ? `https://linkedin.com/${username}` 
          : `https://linkedin.com/in/${username}`;
      case 'tiktok':
        return `https://tiktok.com/@${username}`;
      case 'website':
        // Para web, añadir https:// si no lo tiene
        return `https://${cleanValue}`;
      default:
        return cleanValue;
    }
  };

  if (loadingProfile) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-64 w-full rounded-2xl" />
          <Skeleton className="h-96 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full shadow-lg border-0 rounded-2xl">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {t('profileNotFound') || 'Perfil no encontrado'}
            </h2>
            <p className="text-gray-600 mb-6">
              {t('profileNotFoundDescription') || 'El profesional que buscas no existe o ya no está disponible.'}
            </p>
            <Button onClick={() => navigate('/buscar')} className="text-white" style={{ background: '#00255C' }}>
              {t('backToSearch') || 'Volver a búsqueda'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Usar perfil traducido para SEO y display
  const displayProfile = translatedProfile || profile;
  
  // SEO optimizado — usar slug limpio
  const canonicalSlug = profile.slug_publico || generateSlug(profile.business_name);
  const canonicalUrl = `https://misautonomos.es/autonomo/${canonicalSlug}`;

  // Título SEO optimizado (máx 60 caracteres ideal)
  const categoryName = profile.categories?.[0] || 'Profesional';
  const locationName = profile.ciudad || profile.provincia || 'España';
  const seoTitle = `${profile.business_name} - ${categoryName} en ${locationName} | MisAutónomos`;

  // Descripción SEO optimizada (máx 160 caracteres ideal)
  const ratingText = profile.average_rating > 0 ? `★${profile.average_rating.toFixed(1)} (${profile.total_reviews} opiniones). ` : '';
  const experienceText = profile.years_experience > 0 ? `${profile.years_experience} años de experiencia. ` : '';
  const baseDescription = profile.descripcion_corta || `Servicios de ${categoryName.toLowerCase()} en ${locationName}`;
  const seoDescription = `${ratingText}${experienceText}${baseDescription}. Contacta gratis con ${profile.business_name}.`.slice(0, 160);

  // Keywords dinámicas
  const seoKeywords = [
    profile.business_name,
    categoryName,
    categoryName.toLowerCase(),
    locationName,
    profile.provincia,
    'autónomo',
    'profesional',
    ...(profile.skills || []),
    ...(profile.categories || [])
  ].filter(Boolean).join(', ');

  // Schema FAQ para el perfil si tiene FAQ items
  const profileFaqData = profile.faq_items?.filter(f => f.question && f.answer).map(f => ({
    question: f.question,
    answer: f.answer
  })) || [];

  // Breadcrumb items para SEO
  const breadcrumbItems = [
    { name: "Inicio", url: "https://misautonomos.es" },
    { name: "Buscar Profesionales", url: "https://misautonomos.es/buscar" },
    { name: categoryName, url: `https://misautonomos.es/categoria/${generateSlug(profile.categories?.[0] || '')}` },
    { name: profile.business_name, url: canonicalUrl }
  ];

  const showPhone = profile.metodos_contacto?.includes('telefono') && profile.telefono_contacto;
  const showWhatsApp = profile.metodos_contacto?.includes('whatsapp') && profile.telefono_contacto;
  const showChat = profile.metodos_contacto?.includes('chat_interno');
  const isVerified = profile.identity_verified === true;

  return (
    <>
      <SEOHead 
        title={seoTitle}
        description={seoDescription}
        keywords={seoKeywords}
        type="profile"
        image={professionalUser?.profile_picture || profile.imagen_principal || profile.photos?.[0]}
      />
      

      
      {/* Schema.org estructurados para SEO */}
      <MerchantListingSchema
        profile={profile}
        reviews={reviews}
        professionalUser={professionalUser}
      />
      <LocalBusinessSchema 
        profile={profile}
        reviews={reviews}
        professionalUser={professionalUser}
      />

      <ProfessionalPersonSchema 
        profile={profile}
        professionalUser={professionalUser}
      />

      <BreadcrumbSchema items={breadcrumbItems} />

      {/* FAQ Schema si el perfil tiene FAQs */}
      {profileFaqData.length > 0 && (
        <FAQPageSchema faqs={profileFaqData} />
      )}
      
      <div className="min-h-screen bg-gray-50 py-3 px-3 md:py-4 md:px-4">
        <div className="max-w-5xl mx-auto space-y-3">
          
          <Button
            onClick={() => navigate(createPageUrl("Search"))}
            variant="ghost"
            className="hover:bg-white mb-2 text-gray-700 hover:text-gray-900 font-medium"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('backToSearch') || 'Volver a búsqueda'}
          </Button>
          
          {/* CABECERA */}
          <Card className="border-0 shadow-sm rounded-xl bg-white p-4">
            <div className="flex items-center gap-4 mb-3">
              {(() => {
                // Mismo orden que en la tarjeta del buscador: imagen_principal
                // → photos[0] → profile_picture. El usuario hace clic para
                // abrir lightbox con la ORIGINAL (no la transformada).
                const rawPhoto =
                  profile.imagen_principal ||
                  (Array.isArray(profile.photos) && profile.photos[0]) ||
                  professionalUser?.profile_picture ||
                  null;
                const optimized = optimizeSupabaseImage(rawPhoto, { width: 160, quality: 75 });
                return (
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      if (rawPhoto) {
                        setSelectedImage(rawPhoto);
                        setSelectedImageIndex(-1);
                      }
                    }}
                    onKeyDown={(e) => {
                      if ((e.key === 'Enter' || e.key === ' ') && rawPhoto) {
                        setSelectedImage(rawPhoto);
                        setSelectedImageIndex(-1);
                      }
                    }}
                    className="cursor-pointer flex-shrink-0"
                    aria-label={`Foto de ${profile.business_name || 'profesional'}`}
                  >
                    <InitialsAvatar
                      name={profile.business_name || ""}
                      src={optimized || undefined}
                      size={56}
                      priority
                      className="ring-2 ring-white shadow-sm"
                    />
                  </div>
                );
              })()}
              
              <div className="flex-1">
              <h1 className="text-xl font-bold text-gray-900 mb-1">{profile.business_name}</h1>
              {(profile.categories?.[0] || profile.ciudad) && (
                <p className="text-sm text-gray-600 mb-1">
                  {profile.categories?.[0]}
                  {profile.categories?.[0] && profile.ciudad && ' en '}
                  {profile.ciudad}
                </p>
              )}

              <div className="flex items-center gap-2 mb-1 flex-wrap">
                {profile.categories?.[0] && (
                  <Badge className="text-[11px] font-semibold uppercase tracking-[0.06em]" style={{ background: 'rgba(0,37,92,0.06)', color: '#00255C' }}>
                    {profile.categories[0]}
                  </Badge>
                )}
                {profile.is_ads_plus && (
                  <Badge className="text-[11px] font-semibold uppercase tracking-[0.06em] border" style={{ background: '#FBF4DA', color: '#7B5400', borderColor: '#EFD68A' }}>
                    Destacado
                  </Badge>
                )}
                {isVerified && (
                  <Badge className="text-[11px] font-semibold uppercase tracking-[0.06em] inline-flex items-center gap-1" style={{ background: 'rgba(0,37,92,0.06)', color: '#00255C' }}>
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                    </svg>
                    Verificado
                  </Badge>
                )}
                {profile.total_reviews > 0 && (
                  <div className="flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm font-semibold">{profile.average_rating?.toFixed(1)}</span>
                    <span className="text-xs text-gray-500">({profile.total_reviews})</span>
                  </div>
                )}
              </div>

                {(profile.ciudad || profile.provincia) && (
                  <div className="flex items-center gap-1 text-xs text-gray-600">
                    <MapPin className="w-3 h-3" />
                    {profile.ciudad ? `${profile.ciudad}, ${profile.provincia}` : profile.provincia}
                  </div>
                )}

              {/* Internal link → listado categoría+ciudad */}
              {profile.categories?.[0] && profile.ciudad && (
                <CategoryCityLink categoryName={profile.categories[0]} ciudad={profile.ciudad} />
              )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    haptic('light');
                    await shareUrl({
                      title: profile?.business_name || 'Profesional verificado',
                      text: `${profile?.business_name || 'Este profesional'} en MisAutónomos${profile?.ciudad ? ' · ' + profile.ciudad : ''}`,
                      url: typeof window !== 'undefined' ? window.location.href : 'https://misautonomos.es',
                      dialogTitle: 'Compartir perfil',
                    });
                  }}
                  aria-label="Compartir perfil"
                  title="Compartir"
                  className="inline-flex items-center justify-center w-9 h-9 rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <Share2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => { haptic('light'); handleToggleFavorite(); }}
                  aria-label={isFavorite ? 'Quitar de favoritos' : 'Guardar en favoritos'}
                  title={isFavorite ? 'Quitar de favoritos' : 'Guardar en favoritos'}
                  className={`inline-flex items-center gap-1.5 px-3 h-9 rounded-full border text-sm font-medium transition-colors ${
                    isFavorite
                      ? 'bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
                  {isFavorite ? 'Guardado' : 'Guardar'}
                </button>
              </div>
            </div>

            {/* BOTONES CONTACTO */}
            <div className="flex gap-2 flex-wrap">
              {showChat && (
                <button
                  type="button"
                  onClick={handleStartChat}
                  className="flex-1 min-w-[140px] text-white text-sm font-semibold py-2.5 rounded-lg inline-flex items-center justify-center gap-2 transition-colors"
                  style={{ background: '#00255C' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#001A45')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '#00255C')}
                >
                  <MessageCircle className="w-4 h-4" /> Enviar mensaje
                </button>
              )}
              {showWhatsApp && (
                <button
                  type="button"
                  onClick={handleWhatsAppClick}
                  className="text-white text-sm font-semibold px-4 py-2.5 rounded-lg inline-flex items-center justify-center gap-2 transition-colors"
                  style={{ background: '#1FAD4F' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#168D40')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '#1FAD4F')}
                >
                  <svg viewBox="0 0 24 24" fill="white" className="w-4 h-4"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  WhatsApp
                </button>
              )}
              {showPhone && (
                <button
                  type="button"
                  onClick={handlePhoneClick}
                  className="border border-slate-200 bg-white hover:bg-slate-50 text-slate-900 text-sm font-semibold px-4 py-2.5 rounded-lg inline-flex items-center justify-center gap-2 transition-colors"
                >
                  <Phone className="w-4 h-4" style={{ color: '#00255C' }} />
                  <span className="hidden md:inline">{profile.telefono_contacto}</span>
                  <span className="md:hidden">Llamar</span>
                </button>
              )}
            </div>
          </Card>

          {/* DESCRIPCIÓN */}
          <Card className="border-0 shadow-sm rounded-xl bg-white p-4">
            {displayProfile.descripcion_corta && (
              <p className="text-sm text-gray-700 mb-3">{displayProfile.descripcion_corta}</p>
            )}
            {displayProfile.description && displayProfile.description !== displayProfile.descripcion_corta && (
              <p className="text-sm text-gray-600">{displayProfile.description}</p>
            )}

            {(profile.years_experience > 0 || profile.tarifa_base > 0) && (
              <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-100 mt-3">
                {profile.years_experience > 0 && (
                  <Badge className="bg-blue-50 text-blue-700 border-0 px-3 py-1.5 text-sm font-medium">
                    <Briefcase className="w-3.5 h-3.5 mr-1.5" />
                    {profile.years_experience} {profile.years_experience === 1 ? 'año' : 'años'} de experiencia
                  </Badge>
                )}
                {profile.tarifa_base > 0 && (
                  <Badge className="bg-blue-50 text-blue-700 border-0 px-3 py-1.5 text-sm font-medium">
                    <Euro className="w-3.5 h-3.5 mr-1.5" />
                    desde {profile.tarifa_base}€/hora
                  </Badge>
                )}
              </div>
            )}
          </Card>

          {/* SERVICIOS OFRECIDOS */}
          {displayProfile.services_offered && displayProfile.services_offered.length > 0 && (
            <Card className="border-0 shadow-sm rounded-xl bg-white p-4">
              <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-blue-600" />
                Servicios ofrecidos
              </h3>
              <div className="space-y-3">
                {displayProfile.services_offered.map((service) => (
                  <div key={service.id} className="border rounded-lg p-3 bg-gray-50">
                    <h4 className="font-semibold text-gray-900 mb-1">{service.name}</h4>
                    {service.description && (
                      <p className="text-sm text-gray-600 mb-2">{service.description}</p>
                    )}
                    <div className="flex gap-2 text-xs">
                      {service.price && (
                        <span className="bg-green-50 text-green-700 px-2 py-1 rounded flex items-center gap-1">
                          <Euro className="w-3 h-3" />
                          {service.price}€/{service.unit}
                        </span>
                      )}
                      {service.duration && (
                        <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded">
                          {service.duration}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* DISPONIBILIDAD */}
          {(displayProfile.horario_apertura || displayProfile.horario_cierre) && (
            <Card className="border-0 shadow-sm rounded-xl bg-white p-4">
              <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-green-600" />
                Disponibilidad
              </h3>
              <div className="space-y-2">
                <p className="text-sm text-gray-700">
                  {displayProfile.disponibilidad_tipo === "ambos" && "Disponible todos los días"}
                  {displayProfile.disponibilidad_tipo === "laborables" && "Disponible de lunes a viernes"}
                  {displayProfile.disponibilidad_tipo === "festivos" && "Disponible fines de semana y festivos"}
                </p>
                <p className="text-sm text-gray-600 flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5" />
                  Horario: {displayProfile.horario_apertura} - {displayProfile.horario_cierre}
                </p>
              </div>
            </Card>
          )}

          {/* PORTFOLIO DE TRABAJOS */}
          {displayProfile.portfolio_items && displayProfile.portfolio_items.length > 0 && (
            <Card className="border-0 shadow-sm rounded-xl bg-white p-4">
              <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-indigo-600" />
                Portfolio de trabajos
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {displayProfile.portfolio_items.map((item) => (
                  <div 
                    key={item.id} 
                    className="border rounded-xl overflow-hidden bg-gray-50 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => {
                      if (item.images?.[0]) {
                        setSelectedImage(item.images[0]);
                        setSelectedImageIndex(-2);
                      }
                    }}
                  >
                    {item.images?.[0] && (
                      <div className="relative h-32 bg-gray-200">
                        <img 
                          src={item.images[0]} 
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                        {item.images.length > 1 && (
                          <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                            +{item.images.length - 1} fotos
                          </div>
                        )}
                      </div>
                    )}
                    <div className="p-3">
                      <h4 className="font-semibold text-gray-900 text-sm mb-1">{item.title}</h4>
                      {item.description && (
                        <p className="text-xs text-gray-600 line-clamp-2">{item.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                        {item.date && <span>{item.date}</span>}
                        {item.category && (
                          <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                            {item.category}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* HABILIDADES */}
          {displayProfile.skills && displayProfile.skills.length > 0 && (
            <Card className="border-0 shadow-sm rounded-xl bg-white p-4">
              <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-600" />
                {t('skills')}
              </h3>
              <div className="flex flex-wrap gap-2">
                {displayProfile.skills.map((skill, idx) => (
                  <Badge 
                    key={idx} 
                    className="bg-purple-50 text-purple-700 border border-purple-200 px-3 py-1.5 text-sm"
                  >
                    <Sparkles className="w-3 h-3 mr-1.5" />
                    {skill}
                  </Badge>
                ))}
              </div>
            </Card>
          )}

          {/* CERTIFICACIONES */}
          {displayProfile.certifications && displayProfile.certifications.length > 0 && (
            <Card className="border-0 shadow-sm rounded-xl bg-white p-4">
              <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                <BadgeCheck className="w-4 h-4 text-amber-600" />
                {t('certificationsAndTitles')}
              </h3>
              <div className="flex flex-wrap gap-2">
                {displayProfile.certifications.map((cert, idx) => (
                  <Badge 
                    key={idx} 
                    className="bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1.5 text-sm"
                  >
                    <Award className="w-3 h-3 mr-1.5" />
                    {cert}
                  </Badge>
                ))}
              </div>
            </Card>
          )}

          {/* GALERÍA */}
          {profile.photos && profile.photos.length > 0 && (
            <Card className="border-0 shadow-sm rounded-xl bg-white p-4">
              <h3 className="text-sm font-bold text-gray-900 mb-3">{t('workGalleryTitle') || 'Galería de trabajos'}</h3>
              <div className="grid grid-cols-3 gap-2">
                {profile.photos.map((photo, idx) => (
                <div 
                  key={idx} 
                  className="relative aspect-square rounded-lg overflow-hidden cursor-pointer group bg-gray-100 shadow-sm hover:shadow-md transition-shadow"
                  onClick={() => {
                    setSelectedImage(photo);
                    setSelectedImageIndex(idx);
                  }}
                >
                  <img src={photo} alt={`Trabajo ${idx + 1}`} className="w-full h-full object-cover" loading="lazy" />
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* REDES SOCIALES */}
          {(profile.website || profile.social_links?.facebook || profile.social_links?.instagram || profile.social_links?.linkedin || profile.social_links?.tiktok) && (
            <Card className="border-0 shadow-sm rounded-xl bg-white p-4">
              <h3 className="text-sm font-bold text-gray-900 mb-3">{t('socialNetworks') || 'Redes sociales'}</h3>
              <div className="flex flex-wrap gap-2">
                {profile.website && (
                  <a href={formatSocialLink(profile.website, 'website')} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm"><Globe className="w-4 h-4 mr-2" />Web</Button>
                  </a>
                )}
                {profile.social_links?.instagram && (
                  <a href={formatSocialLink(profile.social_links.instagram, 'instagram')} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm"><Instagram className="w-4 h-4 mr-2 text-pink-600" />Instagram</Button>
                  </a>
                )}
                {profile.social_links?.facebook && (
                  <a href={formatSocialLink(profile.social_links.facebook, 'facebook')} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm"><Facebook className="w-4 h-4 mr-2 text-blue-600" />Facebook</Button>
                  </a>
                )}
                {profile.social_links?.linkedin && (
                  <a href={formatSocialLink(profile.social_links.linkedin, 'linkedin')} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm"><Linkedin className="w-4 h-4 mr-2 text-blue-700" />LinkedIn</Button>
                  </a>
                )}
                {profile.social_links?.tiktok && (
                  <a href={formatSocialLink(profile.social_links.tiktok, 'tiktok')} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm"><Music className="w-4 h-4 mr-2 text-black" />TikTok</Button>
                  </a>
                )}
              </div>
            </Card>
          )}

          {/* RESEÑAS — bloque prominente con rating summary */}
          <Card className="border-0 shadow-sm rounded-xl bg-white p-4">
            {/* Rating hero */}
            {profile.average_rating > 0 && profile.total_reviews > 0 ? (
              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-100">
                <div className="text-4xl font-extrabold text-gray-900">{profile.average_rating?.toFixed(1)}</div>
                <div>
                  <div className="flex gap-0.5 mb-0.5">
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} className={`w-5 h-5 ${s <= Math.round(profile.average_rating) ? "fill-amber-400 text-amber-400" : "text-gray-200"}`} />
                    ))}
                  </div>
                  <p className="text-sm text-gray-500">{profile.total_reviews} reseña{profile.total_reviews !== 1 ? 's' : ''}</p>
                </div>
              </div>
            ) : null}

            <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
              {t('clientReviews') || 'Opiniones de clientes'}
            </h3>

            {reviews.length === 0 && (
              <div className="bg-gray-50 rounded-xl p-4 mb-4 text-sm text-gray-500 text-center">
                Aún no tiene reseñas — sé el primero en dejarla tras contactar
              </div>
            )}

            <ReviewSection professionalId={profile.user_id} reviews={reviews} currentUser={user} />
          </Card>
        </div>
      </div>

      {/* MODALES */}
      <Dialog open={showPhoneModal} onOpenChange={setShowPhoneModal}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>{t('phoneNumberTitle')}</DialogTitle>
            <DialogDescription>{profile.business_name}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-200 w-full text-center">
              <p className="text-3xl font-bold text-blue-700">{profile.telefono_contacto}</p>
            </div>
            <Button onClick={() => copyToClipboard(profile.telefono_contacto)} variant="outline" className="w-full">
              {copiedPhone ? <><Check className="w-4 h-4 mr-2 text-green-600" />{t('copied')}</> : <><Copy className="w-4 h-4 mr-2" />{t('copyNumber')}</>}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showWhatsAppModal} onOpenChange={setShowWhatsAppModal}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="w-6 h-6 text-green-600" />WhatsApp
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="p-4 bg-green-50 rounded-xl border border-green-200 w-full text-center">
              <p className="text-3xl font-bold text-green-700">{profile.telefono_contacto}</p>
            </div>
            <Button
              onClick={() => {
                window.open(`https://wa.me/${formatPhoneForWhatsApp(profile.telefono_contacto)}`, '_blank');
                setShowWhatsAppModal(false);
              }}
              className="w-full bg-green-600 hover:bg-green-700 h-12"
            >
              <MessageCircle className="w-5 h-5 mr-2" />{t('openWhatsApp')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* GALERÍA MODAL */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4" onClick={() => setSelectedImage(null)}>
          <button onClick={() => setSelectedImage(null)} className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full">
            <X className="w-6 h-6 text-white" />
          </button>
          
          {selectedImageIndex >= 0 && profile.photos?.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const newIndex = selectedImageIndex === 0 ? profile.photos.length - 1 : selectedImageIndex - 1;
                  setSelectedImageIndex(newIndex);
                  setSelectedImage(profile.photos[newIndex]);
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 rounded-full"
              >
                <ChevronLeft className="w-6 h-6 text-white" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const newIndex = selectedImageIndex === profile.photos.length - 1 ? 0 : selectedImageIndex + 1;
                  setSelectedImageIndex(newIndex);
                  setSelectedImage(profile.photos[newIndex]);
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 rounded-full"
              >
                <ChevronRight className="w-6 h-6 text-white" />
              </button>
            </>
          )}
          
          <img src={selectedImage} alt={t('enlargedView')} className="max-w-full max-h-full object-contain rounded-xl" onClick={(e) => e.stopPropagation()} />
        </div>
      )}

      {guestModal && (
        <GuestContactModal
          professional={profile}
          onClose={() => setGuestModal(false)}
        />
      )}
    </>
  );
}