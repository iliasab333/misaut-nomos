// pages.config.js — code-split por ruta.
//
// Dos envoltorios, y la diferencia importa:
//   lazyWithRetry — página pública. Sólo su chunk.
//   lazyApp       — página que usa textos de pantallas internas (admin, CRM,
//                   facturación…). Encadena la descarga de `<lang>.app.json`
//                   a la del chunk, así que el <Suspense> espera a las dos y
//                   la página nunca pinta claves crudas.
//
// Cuál lleva cada página NO se decide a ojo: sale de qué namespaces alcanza,
// siguiendo sus imports (ver src/i18n/namespaces.js). Una página pública que
// importa un componente con textos internos necesita lazyApp igual.
//
// Los dos hacen además el reload único ante chunk caducado tras un
// redespliegue (ver src/lib/lazyWithRetry.js).
import { lazyWithRetry, lazyApp } from '@/lib/lazyWithRetry';
import __Layout from './Layout.jsx';

// Search es lazy: el bundle inicial se reduce ~250 KB gzip (antes era único).
// El componente se monta dentro del <Suspense> de AuthenticatedApp en App.jsx.
const Search = lazyWithRetry(() => import('./pages/Search'));

// 🔴 PÁGINAS ADMIN — muy pesadas, solo las usa el admin
const AdminDashboard     = lazyApp(() => import('./pages/AdminDashboard'));
const AdminTickets       = lazyApp(() => import('./pages/AdminTickets'));

// 🟠 PÁGINAS PRO — pesadas, solo usuarios profesionales
const ProfessionalDashboard = lazyApp(() => import('./pages/ProfessionalDashboard'));

// 🟡 PÁGINAS DE USUARIO — carga on-demand
const Autonomo           = lazyWithRetry(() => import('./pages/Autonomo'));
const Categoria          = lazyWithRetry(() => import('./pages/Categoria'));
const ClientOnboarding   = lazyApp(() => import('./pages/ClientOnboarding'));
const ConfirmEmail       = lazyWithRetry(() => import('./pages/ConfirmEmail'));
const Favorites          = lazyWithRetry(() => import('./pages/Favorites'));
const MyProfile          = lazyApp(() => import('./pages/MyProfile'));
const Notifications      = lazyWithRetry(() => import('./pages/Notifications'));
const ProfessionalProfile = lazyWithRetry(() => import('./pages/ProfessionalProfile'));
const ProfileOnboarding  = lazyApp(() => import('./pages/ProfileOnboarding'));
const UserTypeSelection  = lazyApp(() => import('./pages/UserTypeSelection'));

// 🟢 PÁGINAS ESTÁTICAS — ligeras, pero no críticas
const CookiePolicy       = lazyWithRetry(() => import('./pages/CookiePolicy'));
const CookiePreferences  = lazyWithRetry(() => import('./pages/CookiePreferences'));
const FAQ                = lazyWithRetry(() => import('./pages/FAQ'));
const HelpCenter         = lazyApp(() => import('./pages/HelpCenter'));
const LegalNotice        = lazyWithRetry(() => import('./pages/LegalNotice'));
const PrivacyPolicy      = lazyWithRetry(() => import('./pages/PrivacyPolicy'));
const TermsConditions    = lazyWithRetry(() => import('./pages/TermsConditions'));

export const PAGES = {
    "AdminDashboard": AdminDashboard,
    "AdminTickets": AdminTickets,
    "Autonomo": Autonomo,
    "Categoria": Categoria,
    "ClientOnboarding": ClientOnboarding,
    "ConfirmEmail": ConfirmEmail,
    "CookiePolicy": CookiePolicy,
    "CookiePreferences": CookiePreferences,
    "FAQ": FAQ,
    "Favorites": Favorites,
    "HelpCenter": HelpCenter,
    "LegalNotice": LegalNotice,
    "MyProfile": MyProfile,
    "Notifications": Notifications,
    "PrivacyPolicy": PrivacyPolicy,
    "ProfessionalDashboard": ProfessionalDashboard,
    "ProfessionalProfile": ProfessionalProfile,
    "ProfileOnboarding": ProfileOnboarding,
    "Search": Search,
    "TermsConditions": TermsConditions,
    "UserTypeSelection": UserTypeSelection,
}

export const pagesConfig = {
    mainPage: "Search",
    Pages: PAGES,
    Layout: __Layout,
};