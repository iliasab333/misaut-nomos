import './App.css'
import { lazyWithRetry, lazyApp } from '@/lib/lazyWithRetry';
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { AppProvider } from '@/lib/AppContext';
import { routerBasename } from '@/i18n';
import ScrollToTop from '@/lib/ScrollToTop';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import AnalyticsGate from '@/components/AnalyticsGate';
import { Suspense, React, Component, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

// Reload SEGURO ante fallos de import dinámico:
//  - Solo se recarga UNA vez por sesión, usando un flag en sessionStorage que
//    sobrevive al reload. Si tras recargar el problema persiste, NO se vuelve
//    a recargar (rompe el bucle).
//  - El flag se limpia cuando la app monta correctamente (ver useEffect en App).
const CHUNK_RELOAD_FLAG = 'chunk-reloaded';

function isChunkLoadError(error) {
  const msg = error?.message || '';
  return (
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('Importing a module script failed') ||
    msg.includes('error loading dynamically imported module')
  );
}

// La pantalla de error vive en un componente de función: ErrorBoundary tiene
// que ser una clase (getDerivedStateFromError) y una clase no puede llamar
// hooks. `useTranslation` funciona aquí sin provider porque `@/i18n`
// (importado arriba) registra la instancia global al cargarse.
function ErrorFallback({ error, onLogout }) {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-soft">
      <div className="max-w-lg w-full bg-surface rounded-2xl border border-red-100 p-6 shadow-lg">
        <h2 className="font-semibold text-ink text-lg">{t('errors.boundary.title')}</h2>
        <p className="text-sm text-c-muted mt-2">{t('errors.boundary.subtitle')}</p>

        {/* MOSTRAR ERROR REAL - TEMPORAL PARA DEBUGGING */}
        {error && (
          <details className="mt-4 bg-red-50 rounded-lg p-3 text-xs">
            <summary className="font-medium text-red-900 cursor-pointer">{t('errors.boundary.details')}</summary>
            <pre className="mt-2 overflow-auto text-red-800 whitespace-pre-wrap max-h-64">
              {error.message || t('errors.boundary.unknown')}
              {'\n\n'}
              {error.stack?.split('\n').slice(0, 8).join('\n')}
            </pre>
          </details>
        )}

        <div className="flex gap-2 mt-4">
          <button
            onClick={() => window.location.reload()}
            className="flex-1 bg-gray-900 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-gray-800 transition"
          >
            {t('errors.boundary.reload')}
          </button>
          <button
            onClick={() => { window.location.href = '/'; }}
            className="flex-1 bg-soft text-ink text-sm font-medium py-2.5 rounded-lg hover:bg-gray-200 transition"
          >
            {t('errors.boundary.goHome')}
          </button>
          <button
            onClick={onLogout}
            className="flex-1 bg-red-50 text-red-700 text-sm font-medium py-2.5 rounded-lg hover:bg-red-100 transition"
          >
            {t('nav.logout')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ErrorBoundary para capturar errores en producción
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
    if (!isChunkLoadError(error)) return;

    // Reload de recuperación: solo si NO recargamos ya en esta sesión.
    let alreadyReloaded = false;
    try { alreadyReloaded = !!sessionStorage.getItem(CHUNK_RELOAD_FLAG); } catch (_e) { /* noop */ }
    if (alreadyReloaded) {
      // Ya intentamos recargar una vez y el chunk sigue fallando — no entramos
      // en bucle. Mostramos la UI de error para que el usuario decida.
      return;
    }
    try { sessionStorage.setItem(CHUNK_RELOAD_FLAG, String(Date.now())); } catch (_e) { /* noop */ }
    window.location.reload();
  }

  handleLogout = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {
      console.warn('Failed to clear storage:', e);
    }
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} onLogout={this.handleLogout} />;
    }

    return this.props.children;
  }
}

// Lazy load de páginas pesadas (admin, invoicing, CRM)
const AdminDashboard = lazyApp(() => import('./pages/AdminDashboard'));
const AdminTickets = lazyApp(() => import('./pages/AdminTickets'));
const AdminNewsletter = lazyApp(() => import('./pages/AdminNewsletter'));
const AdminEmails = lazyApp(() => import('./pages/AdminEmails'));
const AdminUsuarios = lazyApp(() => import('./pages/AdminUsuarios'));
const AdminOutreachWhatsApp = lazyApp(() => import('./pages/AdminOutreachWhatsApp'));
const AdminSoporte = lazyApp(() => import('./pages/AdminSoporte'));
const AdminVerificar = lazyApp(() => import('./pages/AdminVerificar'));
const BajaNewsletter = lazyWithRetry(() => import('./pages/BajaNewsletter'));
const EmailUnsubscribe = lazyWithRetry(() => import('./pages/EmailUnsubscribe'));
const BlogList = lazyWithRetry(() => import('./pages/BlogList'));
const BlogPost = lazyWithRetry(() => import('./pages/BlogPost'));
const AdminBlog = lazyApp(() => import('./pages/AdminBlog'));
const Soporte = lazyApp(() => import('./pages/Soporte'));
const SoporteTicket = lazyApp(() => import('./pages/SoporteTicket'));
const LeaveReview = lazyWithRetry(() => import('./pages/LeaveReview'));
const MisValoraciones = lazyWithRetry(() => import('./pages/MisValoraciones'));
const Login = lazyWithRetry(() => import('./pages/Login'));
const ParaAutonomos = lazyWithRetry(() => import('./pages/ParaAutonomos'));
const Landing = lazyWithRetry(() => import('./pages/Landing'));
const Contacto = lazyWithRetry(() => import('./pages/Contacto'));

// Sin spinner de carga — renderizar directamente
const PageLoader = () => null;

const { Pages, Layout } = pagesConfig;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

// ===== MAPA DE RUTAS ANTIGUAS → NUEVAS (redirect 301-style) =====
// Toda URL antigua tipo /Search, /Favorites, etc. redirige a la versión ES.
const LEGACY_REDIRECTS = {
  '/search': '/buscar',
  '/autonomo': '/autonomo',
  '/categoria': '/categoria',
  '/faq': '/preguntas-frecuentes',
  // /faqdetail era el detalle de artículo, retirado con el sistema de
  // artículos de ayuda (tabla vacía). La dirección vieja lleva al índice.
  '/faqdetail': '/preguntas-frecuentes',
  '/helpcenter': '/ayuda',
  '/home': '/inicio',
  '/clientonboarding': '/registro-cliente',
  '/usertypeselection': '/registro',
  '/privacypolicy': '/privacidad',
  '/termsconditions': '/terminos',
  '/cookiepolicy': '/cookies',
  '/legalnotice': '/aviso-legal',
  '/favorites': '/favoritos',
  '/myprofile': '/mi-perfil',
  '/tickets': '/soporte',
  '/ticketdetail': '/soporte',
  '/presupuestos': '/presupuestos',
  '/requestquote': '/pedir-presupuesto',
  '/quoterequests': '/solicitudes',
  '/notifications': '/notificaciones',
  '/professionaldashboard': '/dashboard',
  '/professionalprofile': '/perfil',
  '/profileonboarding': '/completar-perfil',
  '/projects': '/proyectos',
  '/projectdetail': '/proyectos',
  '/calendar': '/calendario',
  '/invoices': '/facturas',
  '/payinvoice': '/pagar',
  '/crm': '/mis-clientes',
  '/crmautomations': '/automatizaciones',
  '/clientdetail': '/clientes',
  '/jobs': '/trabajos',
  '/onboarding': '/completar-perfil',
  '/admindashboard': '/admin',
  '/adminpayments': '/admin/pagos',
  '/admintickets': '/admin/soporte',
  '/adminfaq': '/admin',
  '/adminmessagesstats': '/admin/mensajes',
};

// Rutas legacy en inglés con 301 explícito (para que React Router las capture antes del fallback)
// /Autonomo → /buscar (Google tiene esta URL indexada con tráfico)
const EXPLICIT_301s = {
  // Rutas en inglés → español (301 permanente)
  '/Autonomo': '/buscar',
  '/autonomo': '/buscar',
  '/Search': '/buscar',
  '/Favorites': '/favoritos',
  '/Notifications': '/notificaciones',
  '/MyProfile': '/mi-perfil',
  '/Tickets': '/soporte',
  '/TicketDetail': '/soporte',
  '/FAQ': '/preguntas-frecuentes',
  '/LegalNotice': '/aviso-legal',
  '/UserTypeSelection': '/registro',
  '/ProfileOnboarding': '/completar-perfil',
  '/ClientOnboarding': '/registro-cliente',
  '/AdminDashboard': '/admin',
  '/AdminFAQ': '/admin',
  '/HelpCenter': '/ayuda',
};

// Componente que comprueba si la ruta actual es una URL antigua y redirige.
const LegacyRedirect = () => {
  const location = useLocation();
  
  // Primero: chequear exact-case 301s explícitos
  const explicit = EXPLICIT_301s[location.pathname];
  if (explicit) {
    return <Navigate to={explicit + location.search + location.hash} replace />;
  }

  // Segundo: lowercase legacy map
  const lower = location.pathname.toLowerCase();
  const target = LEGACY_REDIRECTS[lower];
  if (target && target !== location.pathname) {
    return <Navigate to={target + location.search + location.hash} replace />;
  }
  return <PageNotFound />;
};

const AuthenticatedApp = () => {
  const location = useLocation();
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // /login se renderiza fullscreen, sin Layout, y sin esperar a que termine
  // la carga de auth (la pantalla de login NO debe depender de auth).
  if (location.pathname === '/login') {
    return (
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/login" element={<Login />} />
        </Routes>
      </Suspense>
    );
  }

  if (isLoadingPublicSettings || isLoadingAuth) {
    return null;
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Suspense fallback={<PageLoader />}>
      <LayoutWrapper currentPageName="Search">
        <Routes>
          {/* Raíz → página principal (búsqueda) */}
          <Route path="/" element={<Landing />} />

          {/* ===== RUTAS PÚBLICAS (ES) ===== */}
          <Route path="/buscar" element={<Pages.Search />} />
          <Route path="/autonomo" element={<Pages.Autonomo />} />
          <Route path="/autonomo/:slug" element={<Pages.Autonomo />} />                {/* legacy: /autonomo/ruben-cardenas-torres */}
          <Route path="/autonomo/:cityCategory/:slug" element={<Pages.Autonomo />} />  {/* SEO: /autonomo/electricista-en-antequera/ruben-cardenas-torres */}
          <Route path="/categoria" element={<Pages.Categoria />} />
          <Route path="/categoria/:slug" element={<Pages.Categoria />} />            {/* legacy: ?name=X&ciudad=Y */}
          <Route path="/categoria/:cityCategory" element={<Pages.Categoria />} />     {/* SEO antiguo: /categoria/electricista-en-antequera */}
          {/* SEO ACTUAL: /categoria/electricista/antequera — DOS segmentos.
              Esta ruta FALTABA, y es la que emiten el sitemap (8 guías con
              prioridad 0.8), el prerenderizador (`api/prerender.js`, que les
              escribe 2.400 caracteres de guía local con precios y FAQ) y las
              301 de `vercel.json`. El servidor devolvía 200 con la guía
              entera, React hidrataba, no encontraba ruta y pintaba encima
              «404 Page Not Found» — en inglés, en una web en español.
              Google veía una página buena; la persona, un 404. Justo en las
              consultas de más intención que tiene el sitio («fontanero en
              Sabadell» lo busca alguien con una fuga en casa). */}
          <Route path="/categoria/:cat/:ciudad" element={<Pages.Categoria />} />
          <Route path="/para-autonomos" element={<ParaAutonomos />} />
          <Route path="/contacto" element={<Contacto />} />
          <Route path="/preguntas-frecuentes" element={<Pages.FAQ />} />
          <Route path="/ayuda" element={<Pages.HelpCenter />} />
          {/* /inicio retirada: 301 → / via vercel.json. */}
          <Route path="/registro-cliente" element={<Pages.ClientOnboarding />} />
          <Route path="/registro" element={<Pages.UserTypeSelection />} />
          <Route path="/confirma-email" element={<Pages.ConfirmEmail />} />
          <Route path="/privacidad" element={<Pages.PrivacyPolicy />} />
          <Route path="/terminos" element={<Pages.TermsConditions />} />
          <Route path="/cookies" element={<Pages.CookiePolicy />} />
          <Route path="/configuracion-cookies" element={<Pages.CookiePreferences />} />
          <Route path="/aviso-legal" element={<Pages.LegalNotice />} />

          {/* ===== RUTAS DE CLIENTE ===== */}
          <Route path="/favoritos" element={<Pages.Favorites />} />
          <Route path="/mi-perfil" element={<Pages.MyProfile />} />
          <Route path="/soporte" element={<Suspense fallback={<PageLoader />}><Soporte /></Suspense>} />
          <Route path="/soporte/:id" element={<Suspense fallback={<PageLoader />}><SoporteTicket /></Suspense>} />
          <Route path="/valorar/:token" element={<Suspense fallback={<PageLoader />}><LeaveReview /></Suspense>} />
          <Route path="/notificaciones" element={<Pages.Notifications />} />

          {/* ===== RUTAS DE AUTÓNOMO ===== */}
          <Route path="/dashboard" element={<Pages.ProfessionalDashboard />} />
          <Route path="/mis-valoraciones" element={<Suspense fallback={<PageLoader />}><MisValoraciones /></Suspense>} />
          <Route path="/perfil" element={<Pages.ProfessionalProfile />} />
          <Route path="/perfil/:slug" element={<Pages.ProfessionalProfile />} />
          <Route path="/completar-perfil" element={<Pages.ProfileOnboarding />} />
          {/* /clientes/:id ANTES que /clientes para que matchee primero */}
          
          {/* ===== RUTAS PLAN ADS+ ===== */}

          {/* ===== RUTAS ADMIN ===== */}
          {/* Subrutas admin ANTES que /admin para matchear primero */}
          <Route path="/admin/tickets" element={<Suspense fallback={<PageLoader />}><AdminTickets /></Suspense>} />
          <Route path="/admin/soporte" element={<Suspense fallback={<PageLoader />}><AdminSoporte /></Suspense>} />
          <Route path="/admin/verificar" element={<Suspense fallback={<PageLoader />}><AdminVerificar /></Suspense>} />
          <Route path="/admin" element={<Suspense fallback={<PageLoader />}><AdminDashboard /></Suspense>} />
          <Route path="/admin/usuarios" element={<Suspense fallback={<PageLoader />}><AdminUsuarios /></Suspense>} />
          <Route path="/admin/blog" element={<Suspense fallback={<PageLoader />}><AdminBlog /></Suspense>} />
          <Route path="/admin/newsletter" element={<Suspense fallback={<PageLoader />}><AdminNewsletter /></Suspense>} />
          <Route path="/admin/emails" element={<Suspense fallback={<PageLoader />}><AdminEmails /></Suspense>} />
          <Route path="/admin/outreach-whatsapp" element={<Suspense fallback={<PageLoader />}><AdminOutreachWhatsApp /></Suspense>} />
          <Route path="/newsletter/unsubscribe" element={<Suspense fallback={<PageLoader />}><EmailUnsubscribe /></Suspense>} />
          <Route path="/baja-newsletter" element={<Suspense fallback={<PageLoader />}><BajaNewsletter /></Suspense>} />
          <Route path="/NewsletterUnsubscribe" element={<Suspense fallback={<PageLoader />}><EmailUnsubscribe /></Suspense>} />

          {/* ===== BLOG PÚBLICO ===== */}
          <Route path="/blog" element={<Suspense fallback={<PageLoader />}><BlogList /></Suspense>} />
          <Route path="/blog/:slug" element={<Suspense fallback={<PageLoader />}><BlogPost /></Suspense>} />

          {/* ===== REFERIDOS ===== */}

          {/* ===== REDIRECTS desde URLs ANTIGUAS (PascalCase → español) ===== */}
          {/* El componente LegacyRedirect detecta la URL vieja y redirige con <Navigate replace>. */}
          <Route path="*" element={<LegacyRedirect />} />
        </Routes>
      </LayoutWrapper>
    </Suspense>
  );
};


function App() {
  // Si la app montó correctamente, asumimos que los chunks cargaron bien.
  // Limpiamos el flag tras un pequeño margen para que un fallo posterior
  // (p.ej. al navegar a otra ruta lazy) pueda volver a recargar UNA vez.
  useEffect(() => {
    const t = setTimeout(() => {
      try { sessionStorage.removeItem(CHUNK_RELOAD_FLAG); } catch (_e) { /* noop */ }
    }, 4000);
    return () => clearTimeout(t);
  }, []);

  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppProvider>
          <QueryClientProvider client={queryClientInstance}>
            {/* basename: si la URL lleva prefijo de idioma (/ar/…), React
                Router lo quita de useLocation() y lo pone en cada <Link>.
                Ninguna página tiene que saber que existe. */}
            <Router basename={routerBasename()}>
              <ScrollToTop />
              <NavigationTracker />
              <AuthenticatedApp />
            </Router>
            {/* Vercel RUM: Core Web Vitals reales (LCP/CLS/INP) por ruta.
                El componente carga el script de forma diferida, no afecta al
                LCP, y solo envía métricas en producción (en dev es no-op). */}
            <AnalyticsGate />
          </QueryClientProvider>
        </AppProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App