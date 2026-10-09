import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  IconGlobe,
  IconHeart,
  IconPhone,
  IconMessageCircle,
  IconFacebook,
  IconInstagram,
  IconLinkedin,
  IconStarOutline,
  IconAward,
  IconAlert,
  IconClose,
  IconMusic,
  IconCopy,
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconVerified,
  IconClock,
  IconShare,
  IconWhatsApp,
} from "@/components/Icons";
import { shareUrl, haptic } from "@/lib/native";
import InitialsAvatar from "@/components/InitialsAvatar";
import { optimizeSupabaseImage } from "@/lib/supabaseImage";
import Modal from "@/components/Modal";
import ReviewSection from "../components/profile/ReviewSection";
import SEOHead from "../components/seo/SEOHead";
import { LocalBusinessSchema, FAQPageSchema, ProfessionalPersonSchema, BreadcrumbSchema, MerchantListingSchema } from "../components/seo/StructuredData";
import { toast } from "@/lib/toast";
import { useTranslation } from "react-i18next";
import { useProfileTranslation } from "../components/profile/useProfileTranslation";
import { generateSlug, isSlugDirty } from "../utils/slugUtils";
import { getProfileSeoUrl } from '@/lib/seoUrl';
import { slugify } from '@/lib/slugify';
import ProfileBreadcrumb from "../components/profile/ProfileBreadcrumb";
import GuestContactModal from "@/components/GuestContactModal";

// Un contacto se registra en dos sitios, y por dos motivos distintos: la
// métrica alimenta los contadores del panel y los resúmenes por correo; el
// aviso llega al buzón del admin en el momento, que es cuando todavía se
// puede hacer algo.
//
// Hasta hoy sólo se registraba el formulario, así que los 30 contactos que
// hay medidos en cinco meses son 30 formularios abiertos y nada más: el botón
// de WhatsApp (en 53 de las 56 fichas, contadas hoy) y el de Llamar (43) no
// escribían en ningún contador. La única cifra que gobierna este negocio
// venía midiendo un canal e ignorando los dos más usados.
//
// Nada de esto se espera con `await` ni bloquea nada: se llama DESPUÉS de
// abrir el marcador o el WhatsApp. Un aviso que retrasa una llamada es peor
// que no tener aviso.
function registrarContacto(profileId, canal) {
  if (!profileId) return;

  // trackMetric deduplica por (ficha + tipo) durante 5 minutos, así que un
  // visitante que pruebe WhatsApp y luego el teléfono cuenta como un contacto.
  // Es lo que queremos en el contador: contactos, no clics.
  import('@/lib/trackMetric')
    .then(({ trackMetric }) => trackMetric(profileId, 'contact_click'))
    .catch(() => null);

  try {
    fetch('/api/aviso-contacto', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // Sólo el id y el canal. El nombre, el oficio y la ciudad los lee el
      // servidor de la base: lo que mande el navegador no acaba en el correo.
      body: JSON.stringify({ profileId, canal }),
      // keepalive: el clic de teléfono navega a `tel:` y el de WhatsApp abre
      // otra pestaña. Sin esto el navegador cancela la petición a medias.
      keepalive: true,
    }).catch(() => null);
  } catch (err) {
    // El visitante no puede enterarse de que el aviso ha fallado.
    console.warn('aviso-contacto no enviado:', err);
  }
}

// Limpiar slug antiguo que puede tener IDs hex al final (ej: -5e8405).
function cleanOldSlug(slug) {
  if (!slug) return '';
  const cleaned = slug.replace(/-[a-f0-9]{6,}$/i, '');
  return slugify(cleaned);
}

export default function AutonomoPage() {
  const navigate = useNavigate();
  const params = useParams();
  const { t } = useTranslation();
  const [user, setUser] = useState(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showPhoneModal, setShowPhoneModal] = useState(false);

  // La barra de acciones de móvil mide su propio alto y lo publica en
  // `--barra-accion-alto`, que lee `CookieBanner` para colocarse ENCIMA de
  // ella en vez de taparla. Se mide en lugar de escribir «73px» porque el alto
  // depende del `safe-area-inset` del aparato: un iPhone con isla no da los
  // mismos píxeles que un Android.
  const barraAccionRef = useRef(null);
  useEffect(() => {
    const raiz = document.documentElement;
    const medir = () => {
      const el = barraAccionRef.current;
      // El alto del rectángulo, a secas. NO `offsetParent === null` para saber
      // si está oculta: `offsetParent` es **siempre null** en un elemento
      // `position: fixed`, por especificación, así que esa comprobación daba 0
      // también en móvil — donde la barra sí está — y el aviso de cookies
      // seguía colocándose encima. Con `lg:hidden` en escritorio el display es
      // `none` y el rectángulo mide 0 solo, que es justo lo que hace falta.
      const alto = el ? el.getBoundingClientRect().height : 0;
      raiz.style.setProperty('--barra-accion-alto', `${Math.round(alto)}px`);
    };
    medir();
    const el = barraAccionRef.current;
    const ro = el && typeof ResizeObserver !== 'undefined' ? new ResizeObserver(medir) : null;
    if (ro && el) ro.observe(el);
    window.addEventListener('resize', medir);
    return () => {
      if (ro) ro.disconnect();
      window.removeEventListener('resize', medir);
      raiz.style.removeProperty('--barra-accion-alto');
    };
  });
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
      // `?? null`: React Query v5 lanza si una consulta devuelve undefined, y
      // `users[0]` lo es cuando la fila del usuario ya no está (perfil creado
      // antes de borrar la cuenta). La ficha ya sabe vivir sin ella —cae a
      // `profile.imagen_principal`—, pero la consola se llenaba de errores.
      return users[0] ?? null;
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
        toast.success(t('favorites.toast.removed'));
      } else {
        await base44.entities.Favorite.create({
          client_id: user.id,
          professional_id: profile.user_id,
          business_name: profile.business_name
        });
        setIsFavorite(true);
        toast.success(t('favorites.toast.added'));
      }
    } catch (error) {
      toast.error(t('search.favoritesError'));
    }
  };

  // El mensaje va por EMAIL, no por una bandeja interna. Ver la nota en
  // ProfessionalProfile.jsx: el chat interno se retiró y este botón pasa a
  // abrir el formulario que ya usaban los visitantes sin cuenta.
  const handleStartChat = () => {
    setGuestModal(true);
    registrarContacto(profile?.id, 'formulario');
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
    // Primero el marcador, luego el registro.
    registrarContacto(profile?.id, 'telefono');
  };

  const handleWhatsAppClick = () => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) {
      window.open(`https://wa.me/${formatPhoneForWhatsApp(profile.telefono_contacto)}`, '_blank');
    } else {
      setShowWhatsAppModal(true);
    }
    // Primero el WhatsApp, luego el registro.
    registrarContacto(profile?.id, 'whatsapp');
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedPhone(true);
    toast.success(t('proProfile.phoneModal.copied'));
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
      <div className="min-h-screen bg-soft p-4 md:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="skeleton h-64 w-full rounded-2xl" aria-hidden="true" />
          <div className="skeleton h-96 w-full rounded-2xl" aria-hidden="true" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-soft flex items-center justify-center p-4">
        <div className="card max-w-md w-full shadow-lg rounded-2xl">
          <div className="p-8 text-center">
            <IconAlert className="w-16 h-16 text-c-muted mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-ink mb-2">
              {t('profileNotFound')}
            </h2>
            <p className="text-c-muted mb-6">
              {t('profileNotFoundDesc')}
            </p>
            <button
              type="button"
              onClick={() => navigate('/buscar')}
              className="btn-primary text-white"
              style={{ background: '#00255C' }}
            >
              {t('backToSearch')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Usar perfil traducido para SEO y display
  const displayProfile = translatedProfile || profile;
  
  // SEO optimizado — usar slug limpio
  const canonicalSlug = profile.slug_publico || generateSlug(profile.business_name);
  const canonicalUrl = `https://misautonomos.es/autonomo/${canonicalSlug}`;

  // Título SEO optimizado (máx 60 caracteres ideal)
  const categoryName = profile.categories?.[0] || t('search.profile.seo.defaultCategory');
  const locationName = profile.ciudad || profile.provincia || t('search.profile.seo.defaultLocation');
  const seoTitle = t('search.profile.seo.title', { name: profile.business_name, category: categoryName, location: locationName });

  // Descripción SEO optimizada (máx 160 caracteres ideal)
  const ratingText = profile.average_rating > 0 ? t('search.profile.seo.rating', { rating: profile.average_rating.toFixed(1), count: profile.total_reviews }) : '';
  const experienceText = profile.years_experience > 0 ? t('search.profile.seo.experience', { years: profile.years_experience }) : '';
  const baseDescription = profile.descripcion_corta || t('search.profile.seo.services', { category: categoryName.toLowerCase(), location: locationName });
  const seoDescription = t('search.profile.seo.description', { rating: ratingText, experience: experienceText, base: baseDescription, name: profile.business_name }).slice(0, 160);

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
      
      {/* La ficha, con la maqueta de khdemlidaba/professionnel:
          migas de pan, dos columnas y la tarjeta de contacto pegada a la
          derecha. Antes eran diez cartas blancas apiladas a lo ancho sobre
          gris: el teléfono quedaba arriba del todo y, en cuanto se leía la
          descripción, dejaba de estar en pantalla. */}
      {/* `pb-28` en móvil: la barra fija de abajo mide ~76 px y taparía el
          final de las opiniones y el arranque del pie. */}
      <section className="section-tight pb-28 lg:pb-16">
        <div className="container-page">

          <ProfileBreadcrumb
            categoryName={profile.categories?.[0]}
            ciudad={profile.ciudad}
            provincia={profile.provincia}
          />

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8 lg:gap-12">

            {/* ── COLUMNA PRINCIPAL ─────────────────────────────────── */}
            <div className="min-w-0">

              {/* Cabecera: foto, nombre, oficio·ciudad, nota y distintivos */}
              <div className="flex items-start gap-4">
                {(() => {
                  // Mismo orden que en la tarjeta del buscador:
                  // imagen_principal → photos[0] → profile_picture. El clic
                  // abre la ORIGINAL en el visor, no la transformada.
                  const rawPhoto =
                    profile.imagen_principal ||
                    (Array.isArray(profile.photos) && profile.photos[0]) ||
                    professionalUser?.profile_picture ||
                    null;
                  const optimized = optimizeSupabaseImage(rawPhoto, { width: 200, height: 200, quality: 75 });
                  return (
                    <button
                      type="button"
                      onClick={() => { if (rawPhoto) { setSelectedImage(rawPhoto); setSelectedImageIndex(-1); } }}
                      className="flex-shrink-0 focus:outline-none"
                      aria-label={t('search.profile.photoOf', { name: profile.business_name || t('search.profile.professionalFallback') })}
                    >
                      <InitialsAvatar
                        name={profile.business_name || ""}
                        src={optimized || undefined}
                        size={72}
                        square
                        priority
                      />
                    </button>
                  );
                })()}

                <div className="flex-1 min-w-0">
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink m-0 leading-tight">
                    {profile.business_name}
                  </h1>
                  {(profile.categories?.[0] || profile.ciudad) && (
                    <p className="text-c-muted mt-1">
                      {profile.categories?.[0]}
                      {profile.categories?.[0] && profile.ciudad && <span className="mx-1.5" aria-hidden="true">·</span>}
                      {profile.ciudad}
                    </p>
                  )}

                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                    {profile.total_reviews > 0 && (
                      <span className="inline-flex items-center gap-1.5">
                        <IconStarOutline className="w-4 h-4 fill-star text-star" />
                        <span className="font-semibold text-ink">{profile.average_rating?.toFixed(1)}</span>
                        <span className="text-c-muted text-sm">
                          {t('search.profile.reviewsCount', { count: profile.total_reviews })}
                        </span>
                      </span>
                    )}
                    {isVerified && (
                      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-success">
                        <IconVerified className="w-4 h-4" />
                        {t('proProfile.badges.identityVerified')}
                      </span>
                    )}
                    {/* El sello de «destacado» sale también de la ficha:
                        ya no hay posición privilegiada que anunciar. */}
                  </div>
                </div>
              </div>

              {/* Compartir y guardar — acciones sobre la ficha, no sobre el
                  profesional: van aparte de los botones de contacto. */}
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    haptic('light');
                    await shareUrl({
                      title: profile?.business_name || t('search.profile.share.defaultTitle'),
                      text: t('search.profile.share.text', { name: profile?.business_name || t('search.profile.share.thisProfessional') }) + (profile?.ciudad ? ' · ' + profile.ciudad : ''),
                      url: typeof window !== 'undefined' ? window.location.href : 'https://misautonomos.es',
                      dialogTitle: t('profile_page.share_profile'),
                    });
                  }}
                  className="btn-secondary btn-sm"
                >
                  <IconShare className="w-4 h-4" />
                  {t('search.profile.share.button')}
                </button>
                <button
                  type="button"
                  onClick={() => { haptic('light'); handleToggleFavorite(); }}
                  className={`btn-secondary btn-sm ${isFavorite ? 'text-rose-600 border-rose-200' : ''}`}
                >
                  <IconHeart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
                  {isFavorite ? t('profile_page.saved_favorite') : t('profile_page.save_favorite')}
                </button>
              </div>

              {/* Descripción */}
              {(displayProfile.descripcion_corta || displayProfile.description) && (
                <div className="mt-6 space-y-3">
                  {displayProfile.descripcion_corta && (
                    <p className="text-ink leading-relaxed whitespace-pre-line">{displayProfile.descripcion_corta}</p>
                  )}
                  {displayProfile.description && displayProfile.description !== displayProfile.descripcion_corta && (
                    <p className="text-c-muted leading-relaxed whitespace-pre-line">{displayProfile.description}</p>
                  )}
                </div>
              )}

              {/* Datos sueltos en chips: experiencia, tarifa, habilidades y
                  certificaciones. Eran cuatro cartas con su título cada una
                  para, entre todas, cuatro palabras. */}
              {(profile.years_experience > 0 || profile.tarifa_base > 0
                || displayProfile.skills?.length > 0 || displayProfile.certifications?.length > 0) && (
                <div className="mt-5 flex flex-wrap gap-2">
                  {profile.years_experience > 0 && (
                    <span className="chip">{t('profile_page.years_of_experience', { count: profile.years_experience })}</span>
                  )}
                  {profile.tarifa_base > 0 && (
                    <span className="chip">{t('profile_page.from_price', { price: profile.tarifa_base })}</span>
                  )}
                  {displayProfile.skills?.map((skill, idx) => (
                    <span key={`s-${idx}`} className="chip">{skill}</span>
                  ))}
                  {displayProfile.certifications?.map((cert, idx) => (
                    <span key={`c-${idx}`} className="chip inline-flex items-center gap-1.5">
                      <IconAward className="w-3.5 h-3.5" />
                      {cert}
                    </span>
                  ))}
                </div>
              )}

              {/* Disponibilidad */}
              {(displayProfile.horario_apertura || displayProfile.horario_cierre) && (
                <div className="mt-8">
                  <h2 className="text-lg font-semibold text-ink mb-3">{t('profile_page.availability')}</h2>
                  <p className="text-ink">
                    {displayProfile.disponibilidad_tipo === "ambos" && t('profile_page.available_every_day')}
                    {displayProfile.disponibilidad_tipo === "laborables" && t('proProfile.availability.summaryWeekdays')}
                    {displayProfile.disponibilidad_tipo === "festivos" && t('proProfile.availability.summaryWeekends')}
                  </p>
                  <p className="text-sm text-c-muted mt-1 inline-flex items-center gap-2">
                    <IconClock className="w-4 h-4" />
                    {t('proProfile.availability.scheduleRange', { from: displayProfile.horario_apertura, to: displayProfile.horario_cierre })}
                  </p>
                </div>
              )}

              {/* Servicios */}
              {displayProfile.services_offered?.length > 0 && (
                <div className="mt-8">
                  <h2 className="text-lg font-semibold text-ink mb-4">{t('profile_page.services')}</h2>
                  <div className="space-y-3">
                    {displayProfile.services_offered.map((service) => (
                      <div key={service.id} className="card p-4">
                        <h3 className="font-semibold text-ink text-base m-0">{service.name}</h3>
                        {service.description && (
                          <p className="text-sm text-c-muted mt-1">{service.description}</p>
                        )}
                        {(service.price || service.duration) && (
                          <div className="flex flex-wrap gap-2 mt-3">
                            {service.price && (
                              <span className="chip">{service.price}€/{service.unit}</span>
                            )}
                            {service.duration && <span className="chip">{service.duration}</span>}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Trabajos realizados — galería y portfolio en la MISMA
                  sección. Eran dos cartas separadas («Portfolio de trabajos»
                  y «Galería») que enseñaban lo mismo: fotos del trabajo. */}
              {(profile.photos?.length > 0 || displayProfile.portfolio_items?.length > 0) && (
                <div className="mt-8">
                  <h2 className="text-lg font-semibold text-ink mb-4">{t('search.profile.portfolioTitle')}</h2>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 sm:gap-3">
                    {(profile.photos || []).map((photo, idx) => (
                      <button
                        key={`p-${idx}`}
                        type="button"
                        onClick={() => { setSelectedImage(photo); setSelectedImageIndex(idx); }}
                        className="relative aspect-square rounded-lg overflow-hidden bg-soft border border-c-border focus:outline-none"
                        aria-label={t('proProfile.gallery.workAlt', { number: idx + 1 })}
                      >
                        {/* Miniatura, no el original: estos cuadrados miden
                            ~110 px y la foto de obra que hay detrás pesa de
                            media medio mega. El visor de abajo sí abre el
                            original — ahí la foto grande es lo que se busca. */}
                        <img src={optimizeSupabaseImage(photo, { width: 320, height: 320, quality: 70 })} alt={t('proProfile.gallery.workAlt', { number: idx + 1 })} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                      </button>
                    ))}
                    {(displayProfile.portfolio_items || []).map((item) => item.images?.[0] && (
                      <button
                        key={`pf-${item.id}`}
                        type="button"
                        onClick={() => { setSelectedImage(item.images[0]); setSelectedImageIndex(-2); }}
                        title={item.title}
                        className="relative aspect-square rounded-lg overflow-hidden bg-soft border border-c-border focus:outline-none"
                      >
                        <img src={optimizeSupabaseImage(item.images[0], { width: 320, height: 320, quality: 70 })} alt={item.title || ''} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                        {item.images.length > 1 && (
                          <span className="absolute bottom-1.5 right-1.5 bg-black/70 text-white text-[11px] px-1.5 py-0.5 rounded">
                            +{item.images.length - 1}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Redes */}
              {(profile.website || profile.social_links?.facebook || profile.social_links?.instagram
                || profile.social_links?.linkedin || profile.social_links?.tiktok) && (
                <div className="mt-8">
                  <h2 className="text-lg font-semibold text-ink mb-4">{t('proProfile.findMeOn')}</h2>
                  <div className="flex flex-wrap gap-2">
                    {profile.website && (
                      <a href={formatSocialLink(profile.website, 'website')} target="_blank" rel="noopener noreferrer" className="btn-secondary btn-sm">
                        <IconGlobe className="w-4 h-4" />{t('proProfile.social.web')}
                      </a>
                    )}
                    {profile.social_links?.instagram && (
                      <a href={formatSocialLink(profile.social_links.instagram, 'instagram')} target="_blank" rel="noopener noreferrer" className="btn-secondary btn-sm">
                        <IconInstagram className="w-4 h-4" />{t('proProfile.social.instagram')}
                      </a>
                    )}
                    {profile.social_links?.facebook && (
                      <a href={formatSocialLink(profile.social_links.facebook, 'facebook')} target="_blank" rel="noopener noreferrer" className="btn-secondary btn-sm">
                        <IconFacebook className="w-4 h-4" />{t('proProfile.social.facebook')}
                      </a>
                    )}
                    {profile.social_links?.linkedin && (
                      <a href={formatSocialLink(profile.social_links.linkedin, 'linkedin')} target="_blank" rel="noopener noreferrer" className="btn-secondary btn-sm">
                        <IconLinkedin className="w-4 h-4" />{t('proProfile.social.linkedin')}
                      </a>
                    )}
                    {profile.social_links?.tiktok && (
                      <a href={formatSocialLink(profile.social_links.tiktok, 'tiktok')} target="_blank" rel="noopener noreferrer" className="btn-secondary btn-sm">
                        <IconMusic className="w-4 h-4" />{t('proProfile.social.tiktok')}
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Reseñas */}
              <div className="mt-8">
                <h2 className="text-lg font-semibold text-ink mb-4">{t('clientReviews')}</h2>
                {profile.average_rating > 0 && profile.total_reviews > 0 && (
                  <div className="flex items-center gap-3 mb-5">
                    <div className="text-4xl font-extrabold text-ink leading-none">{profile.average_rating?.toFixed(1)}</div>
                    <div>
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <IconStarOutline key={s} className={`w-5 h-5 ${s <= Math.round(profile.average_rating) ? "fill-star text-star" : "text-c-border"}`} />
                        ))}
                      </div>
                      <p className="text-sm text-c-muted mt-0.5">
                        {t('search.profile.reviewsCount', { count: profile.total_reviews })}
                      </p>
                    </div>
                  </div>
                )}
                {reviews.length === 0 && (
                  <p className="text-sm text-c-muted mb-4">{t('search.profile.noReviews')}</p>
                )}
                <ReviewSection professionalId={profile.user_id} reviews={reviews} currentUser={user} />
              </div>
            </div>

            {/* ── TARJETA DE CONTACTO ───────────────────────────────────
                Pegajosa en escritorio: acompaña la lectura en vez de quedarse
                arriba. En móvil no cabe una columna, así que los dos botones
                viven en la barra inferior fija (más abajo). */}
            <aside className="hidden lg:block">
              <div className="sticky top-24 card p-5">
                <h2 className="text-base font-semibold text-ink m-0">{t('proProfile.contactCard.title')}</h2>
                <p className="text-sm text-c-muted mt-2 leading-relaxed">{t('proProfile.contactCard.body')}</p>

                {(showPhone || showWhatsApp) && (
                  <div className="mt-5 rounded-lg border border-c-border p-3 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-c-muted m-0">{t('proProfile.phoneModal.title')}</p>
                      <p className="text-ink font-semibold truncate m-0" dir="ltr">{profile.telefono_contacto}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(profile.telefono_contacto)}
                      aria-label={t('proProfile.phoneModal.copyButton')}
                      className="w-10 h-10 flex-shrink-0 rounded-lg border border-c-border hover:bg-soft inline-flex items-center justify-center"
                    >
                      {copiedPhone ? <IconCheck className="w-4 h-4 text-success" /> : <IconCopy className="w-4 h-4 text-c-muted" />}
                    </button>
                  </div>
                )}

                <div className="mt-3 space-y-2">
                  {showWhatsApp && (
                    <button type="button" onClick={handleWhatsAppClick} className="btn w-full bg-whatsapp text-white hover:bg-whatsapp-hover">
                      <IconWhatsApp className="w-4 h-4" />
                      {t('profile_page.whatsapp')}
                    </button>
                  )}
                  {showPhone && (
                    <button type="button" onClick={handlePhoneClick} className="btn-secondary w-full">
                      <IconPhone className="w-4 h-4" />
                      {t('profile_page.call')}
                    </button>
                  )}
                  <button type="button" onClick={handleStartChat} className="btn w-full bg-brand-navy text-white hover:bg-brand-navy-deep">
                    <IconMessageCircle className="w-4 h-4" />
                    {t('proProfile.contact.sendMessage')}
                  </button>
                </div>

                <p className="text-xs text-c-muted mt-4 leading-relaxed">{t('proProfile.contactCard.noFees')}</p>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* Barra inferior fija en móvil: los dos botones que importan, siempre
          a la vista. z-30 la deja por debajo del cajón de la cabecera (z-50),
          que debe poder taparla. */}
      <div
        ref={barraAccionRef}
        className="lg:hidden fixed inset-x-0 bottom-0 z-30 bg-surface border-t border-c-border px-4 py-3 flex gap-2"
        style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
      >
        {showWhatsApp && (
          <button type="button" onClick={handleWhatsAppClick} className="btn flex-1 bg-whatsapp text-white hover:bg-whatsapp-hover">
            <IconWhatsApp className="w-4 h-4" />
            {t('profile_page.whatsapp')}
          </button>
        )}
        {showPhone ? (
          <button type="button" onClick={handlePhoneClick} className="btn-secondary flex-1">
            <IconPhone className="w-4 h-4" />
            {t('profile_page.call')}
          </button>
        ) : (
          <button type="button" onClick={handleStartChat} className="btn flex-1 bg-brand-navy text-white hover:bg-brand-navy-deep">
            <IconMessageCircle className="w-4 h-4" />
            {t('proProfile.contact.sendMessage')}
          </button>
        )}
      </div>

      {/* MODALES */}
      <Modal
        open={showPhoneModal}
        onClose={() => setShowPhoneModal(false)}
        title={t('proProfile.phoneModal.title')}
        description={profile.business_name}
      >
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="p-4 bg-c-accent/10 rounded-xl border border-c-accent/20 w-full text-center">
            <p className="text-3xl font-bold text-c-accent">{profile.telefono_contacto}</p>
          </div>
          <button
            type="button"
            onClick={() => copyToClipboard(profile.telefono_contacto)}
            className="btn-secondary w-full"
          >
            {copiedPhone ? <><IconCheck className="w-4 h-4 mr-2 text-success" />{t('reviews.request.copied')}</> : <><IconCopy className="w-4 h-4 mr-2" />{t('proProfile.phoneModal.copyButton')}</>}
          </button>
        </div>
      </Modal>

      <Modal
        open={showWhatsAppModal}
        onClose={() => setShowWhatsAppModal(false)}
        title={
          <span className="flex items-center gap-2">
            <IconMessageCircle className="w-6 h-6 text-success" />{t('profile_page.whatsapp')}
          </span>
        }
      >
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="p-4 bg-success/10 rounded-xl border border-success/20 w-full text-center">
            <p className="text-3xl font-bold text-success">{profile.telefono_contacto}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              window.open(`https://wa.me/${formatPhoneForWhatsApp(profile.telefono_contacto)}`, '_blank');
              setShowWhatsAppModal(false);
            }}
            className="btn-primary w-full bg-success hover:bg-green-700 h-12"
          >
            <IconMessageCircle className="w-5 h-5 mr-2" />{t('search.card.openWhatsApp')}
          </button>
        </div>
      </Modal>

      {/* GALERÍA MODAL */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4" onClick={() => setSelectedImage(null)}>
          <button
            type="button"
            onClick={() => setSelectedImage(null)}
            aria-label={t('common.close')}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full"
          >
            <IconClose className="w-6 h-6 text-white" />
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
                aria-label={t('home.whyTrust.previous')}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 rounded-full"
              >
                <IconChevronLeft className="w-6 h-6 text-white" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const newIndex = selectedImageIndex === profile.photos.length - 1 ? 0 : selectedImageIndex + 1;
                  setSelectedImageIndex(newIndex);
                  setSelectedImage(profile.photos[newIndex]);
                }}
                aria-label={t('common.next')}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 rounded-full"
              >
                <IconChevronRight className="w-6 h-6 text-white" />
              </button>
            </>
          )}
          
          <img src={selectedImage} alt={t('proProfile.gallery.enlargedAlt')} className="max-w-full max-h-full object-contain rounded-xl" onClick={(e) => e.stopPropagation()} />
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