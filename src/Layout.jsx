import React, { useState, useEffect, Suspense, lazy, useCallback, useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import {
  IconSearch,
  IconMessageSquare,
  IconUser,
  IconHeart,
  IconDashboard,
  IconUsers,
  IconHome,
  IconHeadphones,
  IconBook,
  IconMail,
  IconStarOutline,
} from "@/components/Icons";

// Lazy load componentes no críticos
import Header from "@/components/Header";

const Footer = lazy(() => import("@/components/Footer").catch(() => ({ default: () => null })));
const CookieBanner = lazy(() => import("@/components/CookieBanner").catch(() => ({ default: () => null })));
const NotificationCenter = lazy(() => import("@/components/notifications/NotificationCenter").catch(() => ({ default: () => null })));
const NotificationPermissionBanner = lazy(() => import("@/components/notifications/NotificationPermissionBanner").catch(() => ({ default: () => null })));
const WebsiteSchema = lazy(() => import("@/components/seo/WebsiteSchema").catch(() => ({ default: () => null })));
import { setUserId, setUserTags, onesignalLogout } from "@/services/onesignalService";

import { LanguageProvider } from "@/components/LanguageSwitcher";


// Logo servido como asset estático de Vercel (no depende de Base44 ni de
// Image Transform). 192px sirve perfectamente para todas las cajas de hasta
// 96px en 2x.
const LOGO_URL = '/logo-192.png';


// Preload para mejorar LCP del header
if (typeof window !== 'undefined') {
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'image';
  link.href = LOGO_URL;
  link.fetchPriority = 'high';
  document.head.appendChild(link);
}


const LayoutContent = React.memo(function LayoutContent({ children, currentPageName }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [professionalProfile, setProfessionalProfile] = useState(undefined);

  // Redirect from old domain to new domain + www/http → canonical https (sin www)
  useEffect(() => {
    const { hostname, protocol, pathname, search, hash } = window.location;
    const isOldDomain = hostname === 'autonomosmil.es' || hostname === 'www.autonomosmil.es';
    const isWww = hostname === 'www.misautonomos.es';
    const isHttp = protocol === 'http:' && (hostname === 'misautonomos.es' || hostname === 'www.misautonomos.es');
    
    if (isOldDomain || isWww || isHttp) {
      window.location.replace('https://misautonomos.es' + pathname + search + hash);
    }
  }, []);


  useEffect(() => {
    if (window.gtag) return;

    let analyticsLoaded = false;

    const loadAnalytics = () => {
      if (analyticsLoaded) return;
      analyticsLoaded = true;

      // Cargar sólo cuando el visitante lo consiente — y leyendo donde el
      // consentimiento SE GUARDA de verdad.
      //
      // Aquí se miraba `sessionStorage.analytics_consent`, una clave que no
      // escribe ni una sola línea del proyecto (`grep -rn analytics_consent
      // src` devuelve únicamente esta lectura). Así que `consentGiven` era
      // siempre false y **Google Analytics y Google Ads no han cargado nunca
      // para nadie**. No es que midieran poco: no existían. Eso explica por
      // qué no hay un solo dato de procedencia del tráfico.
      //
      // El banner guarda en `localStorage.cookie_consent` un objeto con
      // `analytics`, y `AnalyticsGate.jsx` ya lo lee bien: es la misma fuente.
      let consentGiven = false;
      try {
        consentGiven = Boolean(JSON.parse(localStorage.getItem('cookie_consent') || '{}').analytics);
      } catch { consentGiven = false; }
      if (!consentGiven) return;

      const scriptGA = document.createElement('script');
      scriptGA.src = 'https://www.googletagmanager.com/gtag/js?id=G-P9DN7YN239';
      scriptGA.async = true;
      document.head.appendChild(scriptGA);

      const scriptAds = document.createElement('script');
      scriptAds.src = 'https://www.googletagmanager.com/gtag/js?id=AW-17763802205';
      scriptAds.async = true;
      document.head.appendChild(scriptAds);

      window.dataLayer = window.dataLayer || [];
      function gtag() { window.dataLayer.push(arguments); }
      window.gtag = gtag;

      gtag('consent', 'default', {
        'analytics_storage': 'granted',
        'ad_storage': 'granted',
      });

      gtag('js', new Date());
      gtag('config', 'G-P9DN7YN239', { 'send_page_view': false });
      gtag('config', 'AW-17763802205');
    };

    // Cargar solo después de interacción significativa
    const onInteraction = () => {
      loadAnalytics();
      window.removeEventListener('click', onInteraction);
      window.removeEventListener('scroll', onInteraction, { passive: true });
    };

    window.addEventListener('click', onInteraction, { once: true });
    window.addEventListener('scroll', onInteraction, { passive: true, once: true });

    // Fallback después de 10 segundos (más tiempo)
    const timer = setTimeout(loadAnalytics, 10000);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('click', onInteraction);
      window.removeEventListener('scroll', onInteraction);
    };
  }, []);

  useEffect(() => {
    if (window.gtag) {
      window.gtag('event', 'page_view', {
        page_path: location.pathname,
        page_title: currentPageName || document.title,
      });
    }
  }, [location.pathname, currentPageName]);

  // Guard de onboarding: SOLO redirige a /completar-perfil cuando un profesional
  // sin ficha entra en una ruta PRIVADA propia de pros (dashboard, mi-perfil,
  // facturas, clientes…). NUNCA desde rutas públicas, ni desde admin, ni
  // tampoco si el usuario es admin.
  //
  // Bugs anteriores que rompía esto:
  //   - admin (role==='admin') con user_type==='professionnel' sin ficha quedaba
  //     atrapado: visitaba CUALQUIER página y era expulsado a /completar-perfil
  //     en bucle.
  //   - profesional sin ficha era expulsado al ver /buscar, /contacto, /blog…
  useEffect(() => {
    if (loadingUser || !user) return;
    if (user.role === 'admin') return;                  // admin nunca al onboarding
    if (user.user_type !== 'professionnel') return;     // solo profesionales
    if (professionalProfile === undefined) return;      // aún cargando perfil

    const hasProfile = !!professionalProfile && professionalProfile.onboarding_completed;
    if (hasProfile) return;

    // Rutas que SÍ requieren ficha completa. En cualquier otra ruta, ni se toca.
    const PRO_PRIVATE_PREFIXES = [
      '/dashboard',
      '/mi-perfil',
      '/perfil',
    ];
    const needsProfile = PRO_PRIVATE_PREFIXES.some((p) => location.pathname.startsWith(p));
    if (!needsProfile) return;

    // Estamos en una zona pro privada sin ficha: una sola vez al onboarding.
    if (location.pathname !== '/completar-perfil') {
      navigate('/completar-perfil', { replace: true });
    }
  }, [user, professionalProfile, loadingUser, location.pathname, navigate]);

  const loadUser = React.useCallback(async () => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      // Saltarse el caché al volver del alta: el perfil acaba de crearse y el
      // caché de 5 minutos mostraría al usuario como si aún no fuera
      // profesional. `session_id` era el retorno del checkout de Stripe, que
      // ya no existe; se mantiene por si alguna URL antigua sigue viva.
      const skipCache = urlParams.get('onboarding') || urlParams.get('session_id') || false;

      // CAMBIO: cache extendido a 5 minutos (antes 60s) — el perfil no cambia con frecuencia
      const cached = sessionStorage.getItem('current_user');
      if (cached && !skipCache) {
        const parsed = JSON.parse(cached);
        const { user: cachedUser, profile: cachedProfile, timestamp } = parsed;
        // Los cachés escritos antes de retirar las suscripciones llevan un
        // campo `plan`. Ya no significa nada, y arrastrarlo sólo confunde: se
        // descartan para que la sesión se recargue limpia una vez.
        const isStalePlanCache = 'plan' in parsed;
        if (!isStalePlanCache && Date.now() - timestamp < 300000) {
          setUser(cachedUser);
          setProfessionalProfile(cachedProfile);
          setLoadingUser(false);
          return;
        }
      }

      // Paralelizar auth + perfil + plan en un solo round-trip
      let currentUser = null;
      try {
        currentUser = await base44.auth.me();
      } catch (e) {
        console.warn('Failed to get current user:', e);
        setUser(null);
        setProfessionalProfile(null);
        setLoadingUser(false);
        return;
      }

      if (currentUser) {
        // Usuarios sin user_type (entraron con Google sin pasar por onboarding) → asignar "client"
        if (!currentUser.user_type) {
          // No asignar "client" automáticamente si está en flujo de registro profesional
          const url = new URL(window.location.href);
          const isProSignupFlow = url.searchParams.get('intent') === 'pro'
            || url.searchParams.get('upgrade') === 'pro'
            || url.searchParams.get('plan')
            || url.pathname.includes('completar-perfil')
            || url.pathname.includes('ProfileOnboarding')
            ;

          if (!isProSignupFlow) {
            try {
              await base44.auth.updateMe({ user_type: "client" });
              currentUser.user_type = "client";
              // Auto-suscripción al newsletter (fire-and-forget, idempotente)
              import('@/lib/newsletterAutoSubscribe').then(({ autoSubscribeToNewsletter }) => {
                autoSubscribeToNewsletter({
                  email: currentUser.email,
                  name: currentUser.full_name || '',
                  userTypeInterest: 'cliente',
                  source: 'auto_signup_client',
                  extraTags: ['client']
                });
              }).catch(() => {});
              // Notificar admin nuevo cliente
              import('@/lib/notifyAdmin').then(({ notifyAdminEvent }) => {
                notifyAdminEvent({
                  event: 'new_client',
                  title: '👤 Nuevo cliente registrado',
                  body: `<strong>${currentUser.full_name || currentUser.email}</strong> se ha registrado como cliente.`,
                  data: { email: currentUser.email, name: currentUser.full_name, id: currentUser.id },
                  userEmail: currentUser.email
                });
              }).catch(() => {});
            } catch (e) {
              console.warn('Failed to set user_type:', e);
              currentUser.user_type = "client";
            }
          }
        }

        let profile = null;
        try {
          const profiles = await base44.entities.ProfessionalProfile.filter({ user_id: currentUser.id });
          profile = profiles[0] || null;
        } catch (e) {
          console.warn('Failed to load professional profile:', e);
        }
        setProfessionalProfile(profile);


        if (!skipCache) {
          try {
            sessionStorage.setItem('current_user', JSON.stringify({
              user: currentUser,
              profile,
              timestamp: Date.now()
            }));
          } catch (e) {
            console.warn('Failed to cache user data:', e);
          }
        }
      } else {
        setProfessionalProfile(null);
      }

      setUser(currentUser);

      // Re-asociar usuario con OneSignal si ya tenía notificaciones activadas
      if (currentUser) {
        try {
          window.OneSignalDeferred = window.OneSignalDeferred || [];
          window.OneSignalDeferred.push(async function(OneSignal) {
            const externalId = OneSignal.User.externalId;
            if (!externalId || externalId !== currentUser.id) {
              await OneSignal.login(currentUser.id);
            }
          });
        } catch (e) {
          console.warn('Failed to setup OneSignal:', e);
        }
      }
    } catch (error) {
      console.error('Critical loadUser error:', error);
      setUser(null);
      setProfessionalProfile(null);
      sessionStorage.removeItem('current_user');
    } finally {
      setLoadingUser(false);
    }
  }, [location.pathname]);

  // Cargar usuario solo una vez al montar
  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const isAdmin = user?.role === "admin";
  const isProfessional = React.useMemo(() => {
    if (!user) return false;
    return user.user_type === "professionnel" && !isAdmin;
  }, [user, isAdmin]);
  const isClient = React.useMemo(() => {
    if (!user) return false;
    return user.user_type === "client" && !isAdmin;
  }, [user, isAdmin]);

  const handleLogout = () => {
    sessionStorage.removeItem('current_user');
    setUser(null);
    setProfessionalProfile(null);
    onesignalLogout();
    base44.auth.logout(createPageUrl("Search"));
  };


  const getDisplayName = () => {
    if (!user) return "";
    
    if (user.user_type === "professionnel" && professionalProfile?.business_name && !isAdmin) {
      return professionalProfile.business_name;
    }
    
    if (user.full_name && user.full_name.trim() !== "") {
      return user.full_name;
    }
    
    if (user.email) {
      const username = user.email.split('@')[0];
      const cleaned = username.replace(/\d+$/g, '');
      
      if (cleaned.includes('-') || cleaned.includes('.') || cleaned.includes('_')) {
        return cleaned
          .split(/[-._]/)
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ');
      }
      
      return cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase();
    }
    
    return t('layout.sidebar.defaultUserName');
  };

  const getProfilePicture = () => {
    return user?.profile_picture || null;
  };

  const navigationItems = useMemo(() => {
    if (isAdmin) {
      // Menú admin acotado a las secciones útiles ahora. Pagos y Referidos
      // existen como página pero quedan fuera del menú hasta tener KPIs y
      // operativa propios. Soporte permanece.
      return [
        { title: t('nav.adminMetrics'), url: "/admin", icon: IconDashboard },
        { title: t('nav.adminUsers'), url: "/admin/usuarios", icon: IconUsers },
        { title: t('nav.blog'), url: "/admin/blog", icon: IconBook },
        { title: t('nav.newsletter'), url: "/admin/newsletter", icon: IconMail },
        { title: t('nav.support'), url: "/admin/soporte", icon: IconHeadphones },
      ];
    }
    
    if (isProfessional) {
      // Menú del profesional. Es el alcance de khdemlidaba: su ficha, sus
      // mensajes, sus valoraciones y soporte. La suite de gestión (CRM,
      // facturación, proyectos, campañas, estadísticas) se retiró: 47
      // ficheros y 19.616 líneas con cero filas en la base de datos — nadie
      // creó nunca una factura, un cliente ni un presupuesto.
      return [
        { title: t('nav.home'), url: createPageUrl("ProfessionalDashboard"), icon: IconHome },
        { title: t('nav.myProfile'), url: createPageUrl("MyProfile"), icon: IconUser },
        { title: t('nav.reviews'), url: '/mis-valoraciones', icon: IconStarOutline, prefetch: () => import('./pages/MisValoraciones') },
        { title: t('nav.support'), url: "/soporte", icon: IconHeadphones, prefetch: () => import('./pages/Soporte') },
      ];
    }
    
    if (isClient) {
      return [
        { title: t('nav.search_professionals'), url: createPageUrl("Search"), icon: IconSearch },
        { title: t('nav.favorites'), url: createPageUrl("Favorites"), icon: IconHeart },
        { title: t('nav.my_profile'), url: createPageUrl("MyProfile"), icon: IconUser },
        { title: t('nav.faq'), url: createPageUrl("FAQ"), icon: IconMessageSquare },
        { title: t('nav.support'), url: "/soporte", icon: IconHeadphones, prefetch: () => import('./pages/Soporte') }
      ];
    }
    
    return [];
  }, [isProfessional, isClient, isAdmin, t]);

  // CAMBIO: bloque <style> eliminado — todas estas reglas ya existen en globals.css.
  // Eliminar el inline style evita: CSS duplicado, conflictos de especificidad y ~20KB extra en el bundle.
  return (
    <div className="min-h-screen flex flex-col bg-canvas">
      <Header
        user={user}
        isAdmin={isAdmin}
        isProfessional={isProfessional}
        navigationItems={navigationItems}
        displayName={getDisplayName()}
        avatarUrl={getProfilePicture()}
        notificationsSlot={user ? (
          <Suspense fallback={<div className="w-9 h-9" />}>
            <NotificationCenter user={user} />
          </Suspense>
        ) : null}
        onLogout={handleLogout}
      />

      {/* El <Suspense> reserva 100svh para que el pie NUNCA nazca pegado a la
          cabecera mientras el chunk de la página viaja. Sin esto la portada
          aportaba un CLS de ~0,92: el pie se desplazaba hacia abajo al llegar
          el contenido. */}
      <main className="flex-1 flex flex-col min-w-0">
        <Suspense fallback={<div className="min-h-[100svh]" aria-hidden="true" />}>
          {children}
        </Suspense>
      </main>

      {!location.pathname.startsWith("/soporte") && !location.pathname.startsWith("/admin") && (
        <Suspense fallback={null}>
          <Footer />
        </Suspense>
      )}

      {user && typeof window !== 'undefined' && 'Notification' in window && (
        <Suspense fallback={null}>
          <NotificationPermissionBanner user={user} />
        </Suspense>
      )}
      <Suspense fallback={null}>
        <CookieBanner />
      </Suspense>
      <Suspense fallback={null}>
        <WebsiteSchema />
      </Suspense>
    </div>
  );
});

export default function Layout({ children, currentPageName }) {
  return (
    <LanguageProvider>
      <LayoutContent children={children} currentPageName={currentPageName} />
    </LanguageProvider>
  );
}