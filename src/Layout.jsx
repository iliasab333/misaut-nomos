import React, { useState, useEffect, Suspense, lazy, useCallback, useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation, Trans } from "react-i18next";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import {
  Search,
  MessageSquare,
  User,
  Heart,
  Menu,
  ArrowLeft,
  LogOut,
  Briefcase,
  LayoutDashboard,
  CreditCard,
  X,
  Search as SearchIcon,
  FileText,
  Users,
  Eye,
  Home,
  HelpCircle,
  Ticket,
  TrendingUp,
  Headphones,
  Shield,
  Gift,
  BookOpen,
  Mail,
  Megaphone,
  BarChart3,
  Star
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// Link reutilizable para los logos de la cabecera/sidebars. Apunta SIEMPRE a /,
// y si ya estás en /, hace scroll arriba en vez de no hacer nada.
function HomeLogoLink({ children, className, ariaLabel }) {
  const location = useLocation();
  const handleClick = (e) => {
    if (location.pathname === '/') {
      e.preventDefault();
      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    }
  };
  return (
    <Link to="/" className={className} aria-label={ariaLabel} onClick={handleClick}>
      {children}
    </Link>
  );
}

// Lazy load componentes no críticos
const Footer = lazy(() => import("@/components/ui/Footer").catch(() => ({ default: () => null })));
const CookieBanner = lazy(() => import("@/components/ui/CookieBanner").catch(() => ({ default: () => null })));
const ScrollToTop = lazy(() => import("@/components/ui/ScrollToTop").catch(() => ({ default: () => null })));
const NotificationCenter = lazy(() => import("@/components/notifications/NotificationCenter").catch(() => ({ default: () => null })));
const NotificationPermissionBanner = lazy(() => import("@/components/notifications/NotificationPermissionBanner").catch(() => ({ default: () => null })));
const WebsiteSchema = lazy(() => import("@/components/seo/WebsiteSchema").catch(() => ({ default: () => null })));
import PageTransitions from "@/components/ui/PageTransitions";
import { setUserId, setUserTags, onesignalLogout } from "@/services/onesignalService";

import LanguageSwitcher, { LanguageProvider } from "@/components/ui/LanguageSwitcher";
import { getEffectivePlan, isAdsPlus } from "@/utils/subscription";


// Logo servido como asset estático de Vercel (no depende de Base44 ni de
// Image Transform). 192px sirve perfectamente para todas las cajas de hasta
// 96px en 2x.
const LOGO_URL = '/logo-192.png';
const LOGO_48 = '/logo-192.png';
const LOGO_96 = '/logo-192.png';
const LOGO_32 = '/logo-192.png';
const LOGO_64 = '/logo-192.png';

// La marca va literal: no pasa por t().
const BRAND = 'MisAutónomos';

// Preload para mejorar LCP del header
if (typeof window !== 'undefined') {
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'image';
  link.href = LOGO_URL;
  link.fetchPriority = 'high';
  document.head.appendChild(link);
}

// Sidebar optimizado con memo
const SidebarContentComponent = React.memo(function SidebarContentComponent({ navigationItems, location, user, isProfessional, isAdmin, isClient, language, onChangeLanguage, onLogout }) {
  const { t } = useTranslation();
  return (
    <Sidebar className="border-r border-gray-200 bg-white shadow-sm hidden lg:flex">
      <SidebarHeader className="border-b border-gray-100 p-6">
        <HomeLogoLink className="flex items-center gap-3" ariaLabel={t('nav.home')}>
          <img
            src={LOGO_48}
            srcSet={`${LOGO_48} 1x, ${LOGO_96} 2x`}
            alt={t('layout.header.logoAlt')}
            className="w-12 h-12 rounded-lg"
            width="48"
            height="48"
            loading="eager"
            fetchPriority="high"
            decoding="async"
            style={{ width: '48px', height: '48px' }}
          />
          <div>
            <h2 className="font-bold text-xl text-gray-900 notranslate" translate="no">{BRAND}</h2>
            <p className="text-xs text-gray-500">{t('layout.sidebar.tagline')}</p>
          </div>
        </HomeLogoLink>
      </SidebarHeader>
      
      <SidebarContent className="p-3">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild={!item.action}
                    className={`hover:bg-blue-50 hover:text-blue-900 transition-all duration-150 rounded-xl mb-1 relative ${
                      location.pathname === item.url ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md' : ''
                    }`}
                  >
                    {item.action ? (
                      <button onClick={item.action} aria-label={item.title} className="flex items-center gap-3 px-4 py-3 w-full text-left cursor-pointer">
                        <item.icon className="w-5 h-5" aria-hidden="true" />
                        <span className="font-medium">{item.title}</span>
                        {item.badge && (
                          <span className="ml-auto bg-red-500 text-white text-xs rounded-full px-2 py-0.5 font-bold" aria-label={t('layout.sidebar.unreadMessages', { count: item.badge })}>
                            {item.badge}
                          </span>
                        )}
                      </button>
                    ) : (
                      <Link to={item.url} className="flex items-center gap-3 px-4 py-3" aria-label={item.title}
                        onMouseEnter={item.prefetch ? () => item.prefetch() : undefined}
                      >
                        <item.icon className="w-5 h-5" aria-hidden="true" />
                        <span className="font-medium">{item.title}</span>
                        {item.badge && (
                          <span className="ml-auto bg-red-500 text-white text-xs rounded-full px-2 py-0.5 font-bold" aria-label={t('layout.sidebar.unreadMessages', { count: item.badge })}>
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-gray-100 p-4">
        <div className="space-y-3">
          <div className="flex items-center gap-3 px-2">
            <Avatar className="w-10 h-10 border-2 border-blue-600 overflow-hidden">
              {user?.profile_picture ? (
                <AvatarImage src={user.profile_picture} alt={t('layout.sidebar.avatarAlt')} className="object-cover object-center w-full h-full" />
              ) : (
                <AvatarFallback className={`font-semibold text-white ${isAdmin ? 'bg-gradient-to-br from-purple-600 to-purple-800' : 'bg-gradient-to-br from-blue-600 to-blue-800'}`}>
                  {user?.full_name?.charAt(0) || 'U'}
                </AvatarFallback>
              )}
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 text-sm truncate">
                {user?.full_name || t('layout.sidebar.defaultUserName')}
              </p>
              {isAdmin && (
                <span className="inline-flex items-center gap-1 text-[10px] text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded font-medium mt-0.5">
                  <Shield className="w-2.5 h-2.5" />
                  {t('layout.sidebar.adminBadge')}
                </span>
              )}
              {isProfessional && <p className="text-xs text-gray-500">{t('professionalLabel')}</p>}
              {isClient && <p className="text-xs text-gray-500">{t('clientLabel')}</p>}
            </div>
          </div>

          <div className="flex items-center gap-2 px-2">
            <div className="flex-1">
              <LanguageSwitcher />
            </div>
            <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-red-50 hover:text-red-600 transition-colors flex-shrink-0"
            onClick={onLogout}
            aria-label={t('nav.logout')}
            >
              <LogOut className="w-4 h-4 text-gray-600" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
});

const LayoutContent = React.memo(function LayoutContent({ children, currentPageName }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const language = i18n.language.split('-')[0];
  const changeLanguage = (code) => i18n.changeLanguage(code);
  const [user, setUser] = useState(null);
  const [userPlan, setUserPlan] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [professionalProfile, setProfessionalProfile] = useState(undefined);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [joinModalOpen, setJoinModalOpen] = useState(false);

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

      // Cargar solo cuando el usuario lo consiente
      const consentGiven = sessionStorage.getItem('analytics_consent') === 'true';
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

  const hideBottomBarRoutes = [
    createPageUrl("UserTypeSelection"),    // /registro
    createPageUrl("ProfileOnboarding"),   // /completar-perfil
    createPageUrl("ClientOnboarding"),    // /registro-cliente
    createPageUrl("Onboarding"),          // /bienvenida
  ];

  const shouldShowSidebar = () => {
    if (!user || loadingUser) return false;
    if (hideBottomBarRoutes.includes(location.pathname)) return false;
    
    // 🔥 CLIENTES: SIEMPRE mostrar sidebar
    if (user.user_type === "client") return true;
    
    // PROFESIONALES: verificar onboarding
    if (user.user_type === "professionnel") {
      if (professionalProfile === undefined) return false;
      if (professionalProfile && (!professionalProfile.onboarding_completed)) {
        return false;
      }
    }
    
    return true;
  };

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
      const isPostPayment = urlParams.get('session_id') || 
                            urlParams.get('onboarding') || 
                            location.pathname.includes('PaymentSuccess') ||
                            location.pathname.includes('SubscriptionManagement');

      // CAMBIO: cache extendido a 5 minutos (antes 60s) — el perfil no cambia con frecuencia
      const cached = sessionStorage.getItem('current_user');
      if (cached && !isPostPayment) {
        const parsed = JSON.parse(cached);
        const { user: cachedUser, profile: cachedProfile, plan: cachedPlan, timestamp } = parsed;
        // Solo usar cache si tiene el campo "plan" (caches viejos sin plan deben recargarse)
        const hasPlanField = 'plan' in parsed;
        if (hasPlanField && Date.now() - timestamp < 300000) {
          setUser(cachedUser);
          setProfessionalProfile(cachedProfile);
          setUserPlan(cachedPlan || null);
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
        setUserPlan(null);
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
            || sessionStorage.getItem('pendingPlanId');

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

        // Cargar plan efectivo del usuario (incluye regalos) - con try/catch para no romper login
        let effective = null;
        try {
          effective = await getEffectivePlan(currentUser.id);
        } catch (e) {
          console.warn('Failed to load effective plan:', e);
        }
        setUserPlan(effective?.planId || null);

        if (!isPostPayment) {
          try {
            sessionStorage.setItem('current_user', JSON.stringify({
              user: currentUser,
              profile,
              plan: effective?.planId || null,
              timestamp: Date.now()
            }));
          } catch (e) {
            console.warn('Failed to cache user data:', e);
          }
        }
      } else {
        setProfessionalProfile(null);
        setUserPlan(null);
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
      setUserPlan(null);
      sessionStorage.removeItem('current_user');
    } finally {
      setLoadingUser(false);
    }
  }, [location.pathname]);

  // Cargar usuario solo una vez al montar
  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

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
    setUserPlan(null);
    setProfessionalProfile(null);
    onesignalLogout();
    base44.auth.logout(createPageUrl("Search"));
  };

  const handleLogin = () => {
    base44.auth.redirectToLogin();
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
        { title: t('nav.adminMetrics'), url: "/admin", icon: LayoutDashboard },
        { title: t('nav.adminUsers'), url: "/admin/usuarios", icon: Users },
        { title: t('nav.blog'), url: "/admin/blog", icon: BookOpen },
        { title: t('nav.newsletter'), url: "/admin/newsletter", icon: Mail },
        { title: t('nav.support'), url: "/admin/soporte", icon: Headphones },
      ];
    }
    
    if (isProfessional) {
      // Menú del profesional. Es el alcance de khdemlidaba: su ficha, sus
      // mensajes, sus valoraciones y soporte. La suite de gestión (CRM,
      // facturación, proyectos, campañas, estadísticas) se retiró: 47
      // ficheros y 19.616 líneas con cero filas en la base de datos — nadie
      // creó nunca una factura, un cliente ni un presupuesto.
      return [
        { title: t('nav.home'), url: createPageUrl("ProfessionalDashboard"), icon: Home },
        { title: t('nav.myProfile'), url: createPageUrl("MyProfile"), icon: User },
        { title: t('nav.reviews'), url: '/mis-valoraciones', icon: Star, prefetch: () => import('./pages/MisValoraciones') },
        { title: t('nav.support'), url: "/soporte", icon: Headphones, prefetch: () => import('./pages/Soporte') },
      ];
    }
    
    if (isClient) {
      return [
        { title: t('nav.search_professionals'), url: createPageUrl("Search"), icon: Search },
        { title: t('nav.favorites'), url: createPageUrl("Favorites"), icon: Heart },
        { title: t('nav.my_profile'), url: createPageUrl("MyProfile"), icon: User },
        { title: t('nav.view_plans'), url: createPageUrl("PricingPlans"), icon: CreditCard },
        { title: t('nav.faq'), url: createPageUrl("FAQ"), icon: MessageSquare },
        { title: t('nav.support'), url: "/soporte", icon: Headphones, prefetch: () => import('./pages/Soporte') }
      ];
    }
    
    return [];
  }, [isProfessional, isClient, isAdmin, userPlan, t]);

  // CAMBIO: bloque <style> eliminado — todas estas reglas ya existen en globals.css.
  // Eliminar el inline style evita: CSS duplicado, conflictos de especificidad y ~20KB extra en el bundle.
  return (
    <SidebarProvider style={{ '--sidebar-width': '16rem', '--sidebar-width-mobile': '0px' }}>
        <div className="min-h-screen flex flex-col w-full bg-gradient-to-br from-slate-50 to-blue-50" style={{ marginLeft: 0, width: '100%', maxWidth: '100vw', overflow: 'visible' }}>
          <div className="flex flex-1" style={{ minWidth: 0, overflow: 'visible' }}>
            {user && shouldShowSidebar() && (
              <SidebarContentComponent 
                navigationItems={navigationItems}
                location={location}
                user={user}
                isProfessional={isProfessional}
                isAdmin={isAdmin}
                isClient={isClient}
                language={language}
                onChangeLanguage={changeLanguage}
                onLogout={handleLogout}
              />
            )}

            {/* ── MENÚ HAMBURGUESA MÓVIL ── */}
            {mobileMenuOpen && (
              <>
                <div
                  onClick={() => setMobileMenuOpen(false)}
                  style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)', zIndex: 9998 }}
                  aria-hidden="true"
                />
                <nav
                  style={{ position: 'fixed', left: 0, top: 0, bottom: 0, width: '280px', background: '#fff', zIndex: 9999, overflowY: 'auto', boxShadow: '4px 0 24px rgba(0,0,0,0.18)' }}
                  role="dialog"
                  aria-modal="true"
                  aria-label={t('layout.mobileMenu.ariaLabel')}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <img src={LOGO_32} srcSet={`${LOGO_32} 1x, ${LOGO_64} 2x`} alt="" className="w-8 h-8 rounded" width="32" height="32" />
                      <span className="font-bold text-gray-900 notranslate" translate="no">{BRAND}</span>
                    </div>
                    <button
                      onClick={() => setMobileMenuOpen(false)}
                      style={{ width: '44px', height: '44px', touchAction: 'manipulation' }}
                      className="flex items-center justify-center rounded-lg hover:bg-gray-100"
                      aria-label={t('layout.mobileMenu.close')}
                    >
                      <X className="w-5 h-5 text-gray-500" />
                    </button>
                  </div>

                  <div className="py-2">
                    {/* Usuario logueado: avatar + nombre */}
                    {user && (
                      <div className="flex items-center gap-3 mx-3 mb-2 p-3 bg-blue-50 rounded-xl">
                        <Avatar className="w-10 h-10 border-2 border-blue-600 overflow-hidden flex-shrink-0">
                          {getProfilePicture() ? (
                            <AvatarImage src={getProfilePicture()} alt={getDisplayName()} className="object-cover w-full h-full" />
                          ) : (
                            <AvatarFallback className="bg-gradient-to-br from-blue-600 to-blue-800 text-white font-semibold">
                              {getDisplayName().charAt(0).toUpperCase()}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 text-sm truncate">{getDisplayName()}</p>
                          <p className="text-xs text-gray-500">{isProfessional ? t('professionalLabel') : t('clientLabel')}</p>
                        </div>
                      </div>
                    )}

                    {/* Nav items (logueado) */}
                    {user && navigationItems.map((item) => (
                      <Link
                        key={item.title}
                        to={item.url}
                        onClick={() => setMobileMenuOpen(false)}
                        onMouseEnter={item.prefetch ? () => item.prefetch() : undefined}
                        className={`flex items-center gap-3 mx-2 rounded-xl ${
                          location.pathname === item.url
                            ? 'bg-blue-50 text-blue-700'
                            : 'text-gray-700 hover:bg-gray-50 active:bg-gray-100'
                        }`}
                        style={{ padding: '14px 16px', fontSize: '15px', touchAction: 'manipulation' }}
                      >
                        <item.icon className={`w-5 h-5 flex-shrink-0 ${location.pathname === item.url ? 'text-blue-600' : 'text-gray-400'}`} />
                        <span className="font-medium flex-1">{item.title}</span>
                        {item.badge && (
                          <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5 font-bold min-w-[20px] text-center">{item.badge}</span>
                        )}
                      </Link>
                    ))}

                    {/* Sin sesión: opciones */}
                    {!user && (
                      <div className="px-3 space-y-1">
                        <Link
                          to="/buscar"
                          onClick={() => setMobileMenuOpen(false)}
                          className="flex items-center gap-3 rounded-xl text-gray-700 hover:bg-gray-50"
                          style={{ padding: '14px 16px', fontSize: '15px', touchAction: 'manipulation' }}
                        >
                          <SearchIcon className="w-5 h-5 text-blue-500 flex-shrink-0" />
                          <span className="font-medium">{t('nav.search_professionals')}</span>
                        </Link>
                        <Link
                          to="/blog"
                          onClick={() => setMobileMenuOpen(false)}
                          className="flex items-center gap-3 rounded-xl text-gray-700 hover:bg-gray-50"
                          style={{ padding: '14px 16px', fontSize: '15px', touchAction: 'manipulation' }}
                        >
                          <BookOpen className="w-5 h-5 text-gray-500 flex-shrink-0" />
                          <span className="font-medium">{t('nav.blog')}</span>
                        </Link>
                        <Link
                          to="/precios"
                          onClick={() => setMobileMenuOpen(false)}
                          className="flex items-center gap-3 rounded-xl text-gray-700 hover:bg-gray-50"
                          style={{ padding: '14px 16px', fontSize: '15px', touchAction: 'manipulation' }}
                        >
                          <HelpCircle className="w-5 h-5 text-purple-500 flex-shrink-0" />
                          <span className="font-medium">{t('nav.view_plans')}</span>
                        </Link>

                        <div className="pt-2 border-t border-gray-100 space-y-2 mt-2">
                          <Link
                            to="/registro?tipo=autonomo"
                            onClick={() => setMobileMenuOpen(false)}
                            className="flex items-center justify-center gap-2 w-full rounded-xl font-semibold"
                            style={{ padding: '14px', fontSize: '15px', touchAction: 'manipulation', background: '#F5C13D', color: '#00255C' }}
                          >
                            <Briefcase className="w-5 h-5" />
                            {t('nav.becomeProFree')}
                          </Link>
                          <button
                            onClick={() => { handleLogin(); setMobileMenuOpen(false); }}
                            aria-label={t('nav.loginAria')}
                            className="flex items-center justify-center gap-2 w-full rounded-xl font-semibold text-gray-700 border-2 border-gray-200 hover:bg-gray-50"
                            style={{ padding: '14px', fontSize: '15px', touchAction: 'manipulation' }}
                          >
                            <User className="w-5 h-5" />
                            {t('nav.login')}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Cerrar sesión */}
                    {user && (
                      <>
                        <div className="mx-3 mt-2 border-t border-gray-100 pt-2">
                          <button
                          onClick={handleLogout}
                          aria-label={t('nav.logout')}
                          className="flex items-center gap-3 w-full rounded-xl text-red-600 hover:bg-red-50 active:bg-red-100"
                          style={{ padding: '14px 16px', fontSize: '15px', touchAction: 'manipulation' }}
                          >
                            <LogOut className="w-5 h-5 flex-shrink-0" />
                            <span className="font-medium">{t('nav.logout')}</span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </nav>
              </>
            )}

            {/* ── MODAL "UNIRSE" (bottom sheet) ── */}
            {joinModalOpen && (
              <>
                <div
                  onClick={() => setJoinModalOpen(false)}
                  style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9998 }}
                  aria-hidden="true"
                />
                <div
                  style={{
                    position: 'fixed', bottom: 0, left: 0, right: 0,
                    background: '#fff', zIndex: 9999, borderRadius: '20px 20px 0 0',
                    padding: '24px 20px', paddingBottom: 'max(24px, env(safe-area-inset-bottom, 24px))',
                    boxShadow: '0 -8px 32px rgba(0,0,0,0.18)'
                  }}
                  role="dialog"
                  aria-modal="true"
                  aria-label={t('layout.joinModal.ariaLabel')}
                >
                  <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
                  <h2 className="text-xl font-bold text-gray-900 text-center mb-2">{t('layout.joinModal.title')}</h2>
                  <p className="text-sm text-gray-500 text-center mb-6">{t('layout.joinModal.subtitle')}</p>
                  <div className="space-y-3">
                    <Link
                      to="/buscar"
                      onClick={() => setJoinModalOpen(false)}
                      className="flex items-center gap-4 w-full rounded-2xl p-4 font-semibold border"
                      style={{ background: '#F8FAFF', borderColor: 'rgba(0,37,92,0.15)', color: '#0f172a', touchAction: 'manipulation' }}
                    >
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(0,37,92,0.08)', color: '#00255C' }}>
                        <SearchIcon className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <div className="font-bold">{t('nav.sign_up_client')}</div>
                        <div className="text-xs text-slate-500">{t('layout.joinModal.clientHint')}</div>
                      </div>
                    </Link>
                    <Link
                      to="/registro?tipo=autonomo"
                      onClick={() => setJoinModalOpen(false)}
                      className="flex items-center gap-4 w-full rounded-2xl p-4 font-semibold"
                      style={{ background: '#F5C13D', color: '#00255C', touchAction: 'manipulation' }}
                    >
                      <div className="w-10 h-10 bg-white/40 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Briefcase className="w-5 h-5" style={{ color: '#00255C' }} />
                      </div>
                      <div className="text-left">
                        <div className="font-bold">{t('nav.iAmPro')}</div>
                        <div className="text-xs" style={{ color: 'rgba(0,37,92,0.7)' }}>{t('layout.joinModal.proHint')}</div>
                      </div>
                    </Link>
                    <button
                      onClick={() => { handleLogin(); setJoinModalOpen(false); }}
                      aria-label={t('layout.joinModal.haveAccountAria')}
                      className="w-full text-center text-sm text-gray-500 py-3 font-medium"
                      style={{ touchAction: 'manipulation' }}
                    >
                      <Trans i18nKey="layout.joinModal.haveAccount" components={{ 1: <span className="text-blue-600 font-semibold" /> }} />
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* ── HEADER MÓVIL — SIEMPRE VISIBLE, fuera del main para evitar margin-left del sidebar ── */}
            <header
              className="lg:hidden bg-white border-b border-gray-100 flex items-center justify-between px-4"
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                height: '56px',
                zIndex: 45,
                paddingTop: 'env(safe-area-inset-top, 0px)',
              }}
            >
              {/* Show back button on child screens, hamburger on root nav tabs */}
              {(() => {
                const rootPaths = [
                  '/buscar', '/favoritos', '/mi-perfil',
                  '/dashboard', '/',
                ];
                const isChildScreen = user && !rootPaths.some(p => location.pathname === p || location.pathname === p + '/');
                return isChildScreen ? (
                  <button
                    type="button"
                    onPointerDown={() => navigate(-1)}
                    style={{ width: '56px', height: '56px', minWidth: '56px', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent', cursor: 'pointer', background: 'none', border: 'none', padding: 0, margin: '-4px' }}
                    className="inline-flex items-center justify-center rounded-lg flex-shrink-0 active:bg-gray-200"
                    aria-label={t('common.back')}
                  >
                    <ArrowLeft className="w-6 h-6 text-gray-700 pointer-events-none" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onPointerDown={() => setMobileMenuOpen(true)}
                    style={{ width: '56px', height: '56px', minWidth: '56px', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent', cursor: 'pointer', background: 'none', border: 'none', padding: 0, margin: '-4px' }}
                    className="inline-flex items-center justify-center rounded-lg flex-shrink-0 active:bg-gray-200"
                    aria-label={t('layout.mobileMenu.open')}
                  >
                    <Menu className="w-6 h-6 text-gray-700 pointer-events-none" />
                  </button>
                );
              })()}

              <HomeLogoLink className="flex items-center gap-2" ariaLabel={t('nav.home')}>
                <img src={LOGO_32} srcSet={`${LOGO_32} 1x, ${LOGO_64} 2x`} alt={t('layout.header.logoAlt')} className="w-8 h-8 rounded" width="32" height="32" loading="eager" fetchPriority="high" decoding="async" />
                <span className="font-bold text-lg text-gray-900 notranslate" translate="no">{BRAND}</span>
              </HomeLogoLink>

              <div style={{ width: '56px', height: '56px', margin: '-4px' }} className="flex items-center justify-end flex-shrink-0">
                {user ? (
                  <Suspense fallback={<div className="w-9 h-9" />}>
                    <NotificationCenter user={user} />
                  </Suspense>
                ) : (
                  <button
                    type="button"
                    onPointerDown={() => setJoinModalOpen(true)}
                    style={{ width: '56px', height: '56px', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent', background: 'none', border: 'none', padding: 0 }}
                    className="flex items-center justify-center rounded-lg text-blue-600"
                    aria-label={t('layout.header.joinAria')}
                  >
                    <User className="w-5 h-5" />
                  </button>
                )}
              </div>
            </header>

            <main className="flex-1 flex flex-col min-h-0 min-w-0" style={{ width: '100%', maxWidth: '100vw', overflow: 'visible' }}>
              {!user && (
                  <header className="bg-white border-b border-gray-200 px-6 py-4 hidden lg:block sticky top-0 z-20 shadow-sm will-change-transform">
                  <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <HomeLogoLink className="flex items-center gap-3" ariaLabel={t('nav.home')}>
                      <img
                        src={LOGO_48}
                        srcSet={`${LOGO_48} 1x, ${LOGO_96} 2x`}
                        alt={t('layout.header.logoAlt')}
                        className="w-12 h-12 rounded-lg"
                        width="48"
                        height="48"
                        loading="eager"
                        fetchPriority="high"
                        decoding="async"
                      />
                      <div style={{ minWidth: '150px' }}>
                        <h1 className="font-bold text-xl text-gray-900 notranslate" translate="no">{BRAND}</h1>
                        <p className="text-xs text-gray-500">{t('footer.tagline')}</p>
                      </div>
                      </HomeLogoLink>
                    
                    <div className="flex items-center gap-3">
                      {!user && (
                        <Button
                          variant="ghost"
                          className="text-gray-700 hover:text-blue-700 hover:bg-blue-50"
                          onClick={handleLogin}
                          aria-label={t('nav.loginAria')}
                        >
                          <User className="w-4 h-4 mr-2" aria-hidden="true" />
                          {t('nav.login')}
                        </Button>
                      )}
                      {!user && (
                        <Link to="/buscar">
                          <Button variant="outline" className="border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900">
                            <SearchIcon className="w-4 h-4 mr-2" aria-hidden="true" />
                            {t('nav.sign_up_client')}
                          </Button>
                        </Link>
                      )}
                      {(!user || user.user_type !== 'professionnel') ? (
                        <Link to="/registro?tipo=autonomo">
                          <Button
                            className="font-semibold shadow-sm"
                            style={{ backgroundColor: '#F5C13D', color: '#00255C' }}
                          >
                            <Briefcase className="w-4 h-4 mr-2" aria-hidden="true" />
                            {t('nav.becomeProFree')}
                          </Button>
                        </Link>
                      ) : null}
                      <LanguageSwitcher />
                      {user && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="hover:bg-red-50 hover:text-red-600 transition-colors"
                          onClick={handleLogout}
                          aria-label={t('nav.logout')}
                        >
                          <LogOut className="w-5 h-5" aria-hidden="true" />
                        </Button>
                      )}
                    </div>
                  </div>
                </header>
              )}

              <div className="flex-1 pb-16 md:pb-0 transition-opacity duration-150 ease-in-out mobile-main-content">
                {/* Suspense reserva 100svh para que el footer NUNCA nazca pegado
                    al header mientras la página lazy carga. Sin esto, la home
                    aporta un CLS de ~0.92 porque el footer se desplaza hacia
                    abajo cuando llega el contenido. */}
                <Suspense fallback={<div className="min-h-[100svh]" aria-hidden="true" />}>
                  <PageTransitions>
                    {children}
                  </PageTransitions>
                </Suspense>

                {!location.pathname.startsWith("/soporte") && !location.pathname.startsWith("/admin") && (
                  <Suspense fallback={null}>
                    <Footer />
                  </Suspense>
                )}
              </div>

              {/* Bottom nav móvil — solo visible en móvil (< 768px) */}
              <nav
                className="mobile-bottom-nav"
                data-role="bottom-nav"
                role="navigation"
                aria-label={t('layout.bottomNav.ariaLabel')}
                style={{
                  gridTemplateColumns: (user && isProfessional) ? 'repeat(5, 1fr)' : user ? 'repeat(4, 1fr)' : 'repeat(2, 1fr)',
                  paddingBottom: 'env(safe-area-inset-bottom, 8px)',
                  height: 'calc(56px + env(safe-area-inset-bottom, 8px))',
                }}
              >
                {user ? (
                  <>
                    {(isProfessional ? [
                      { title: t('nav.home'), url: createPageUrl("ProfessionalDashboard"), root: createPageUrl("ProfessionalDashboard"), icon: Home },
                      { title: t('nav.reviews'), url: '/mis-valoraciones', root: '/mis-valoraciones', icon: Star },
                      { title: t('nav.profile'), url: createPageUrl("MyProfile"), root: createPageUrl("MyProfile"), icon: User },
                    ] : [
                      { title: t('common.search'), url: createPageUrl("Search"), root: '/buscar', icon: SearchIcon },
                      { title: t('nav.saved'), url: createPageUrl("Favorites"), root: createPageUrl("Favorites"), icon: Heart },
                      { title: t('nav.profile'), url: createPageUrl("MyProfile"), root: createPageUrl("MyProfile"), icon: User },
                    ]).map((item) => (
                      <Link
                        key={item.title}
                        to={location.pathname === item.url || location.pathname.startsWith(item.url + '?') ? item.root : item.url}
                        className={`mobile-bottom-nav-item ${location.pathname === item.url || location.pathname.startsWith(item.root) ? 'active' : ''}`}
                        aria-label={t('layout.bottomNav.goTo', { title: item.title })}
                        aria-current={location.pathname === item.url ? 'page' : undefined}
                        style={{ touchAction: 'manipulation', flex: 1, minWidth: 0 }}
                      >
                        <div className="relative">
                          <item.icon className="w-5 h-5" />
                          {item.badge && (
                            <span className="absolute -top-1 -right-2 bg-red-500 text-white font-bold rounded-full flex items-center justify-center px-1" style={{ fontSize: '10px', minWidth: '16px', height: '16px' }}>
                              {item.badge > 9 ? '9+' : item.badge}
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: '10px', fontWeight: 500, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>{item.title}</span>
                      </Link>
                    ))}
                  </>
                ) : (
                  <>
                    <Link
                      to={createPageUrl("Search")}
                        className={`mobile-bottom-nav-item ${location.pathname === createPageUrl("Search") ? 'active' : ''}`}
                        aria-label={t('layout.bottomNav.searchAria')}
                      style={{ touchAction: 'manipulation', flex: 1, minWidth: 0 }}
                    >
                      <SearchIcon className="w-5 h-5" />
                      <span style={{ fontSize: '10px', fontWeight: 500 }}>{t('common.search')}</span>
                    </Link>
                    <button
                      onClick={() => setJoinModalOpen(true)}
                      className="mobile-bottom-nav-item"
                      aria-label={t('layout.header.joinAria')}
                      style={{ touchAction: 'manipulation', border: 'none', background: 'none', cursor: 'pointer', flex: 1, minWidth: 0 }}
                    >
                      <Briefcase className="w-5 h-5" />
                      <span style={{ fontSize: '10px', fontWeight: 500 }}>{t('layout.bottomNav.join')}</span>
                    </button>
                  </>
                )}
              </nav>
            </main>
          </div>

          {user && 'Notification' in window && (
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
          <Suspense fallback={null}>
            <ScrollToTop />
          </Suspense>
        </div>
    </SidebarProvider>
  );
});

export default function Layout({ children, currentPageName }) {
  return (
    <LanguageProvider>
      <LayoutContent children={children} currentPageName={currentPageName} />
    </LanguageProvider>
  );
}