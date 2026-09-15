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
const AdminFAQ           = lazyApp(() => import('./pages/AdminFAQ'));
const AdminMessagesStats = lazyApp(() => import('./pages/AdminMessagesStats'));
const AdminPayments      = lazyApp(() => import('./pages/AdminPayments'));
const AdminTickets       = lazyApp(() => import('./pages/AdminTickets'));

// 🟠 PÁGINAS PRO — pesadas, solo usuarios profesionales
const Calendar           = lazyApp(() => import('./pages/Calendar'));
const CRM                = lazyApp(() => import('./pages/CRM'));
const CRMAutomations     = lazyApp(() => import('./pages/CRMAutomations'));
const Invoices           = lazyApp(() => import('./pages/Invoices'));
const Jobs               = lazyApp(() => import('./pages/Jobs'));
const MisClientes        = lazyApp(() => import('./pages/MisClientes'));
const MiVisibilidad      = lazyApp(() => import('./pages/MiVisibilidad'));
const Presupuestos       = lazyApp(() => import('./pages/Presupuestos'));
const ProfessionalDashboard = lazyApp(() => import('./pages/ProfessionalDashboard'));
const Projects           = lazyApp(() => import('./pages/Projects'));
const ProjectDetail      = lazyApp(() => import('./pages/ProjectDetail'));
const QuoteRequests      = lazyApp(() => import('./pages/QuoteRequests'));

// 🟡 PÁGINAS DE USUARIO — carga on-demand
const Autonomo           = lazyWithRetry(() => import('./pages/Autonomo'));
const Categoria          = lazyWithRetry(() => import('./pages/Categoria'));
const ClientDetail       = lazyApp(() => import('./pages/ClientDetail'));
const ClientOnboarding   = lazyApp(() => import('./pages/ClientOnboarding'));
const ConfirmEmail       = lazyWithRetry(() => import('./pages/ConfirmEmail'));
const DashboardProInfo   = lazyWithRetry(() => import('./pages/DashboardProInfo'));
const Favorites          = lazyWithRetry(() => import('./pages/Favorites'));
const Messages           = lazyApp(() => import('./pages/Messages'));
const MyProfile          = lazyApp(() => import('./pages/MyProfile'));
const Notifications      = lazyWithRetry(() => import('./pages/Notifications'));
const Onboarding         = lazyApp(() => import('./pages/Onboarding'));
const PayInvoice         = lazyApp(() => import('./pages/PayInvoice'));
const PaymentSuccess     = lazyApp(() => import('./pages/PaymentSuccess'));
const PricingPlans       = lazyWithRetry(() => import('./pages/PricingPlans'));
const ProfessionalProfile = lazyWithRetry(() => import('./pages/ProfessionalProfile'));
const ProfileOnboarding  = lazyApp(() => import('./pages/ProfileOnboarding'));
const RequestQuote       = lazyApp(() => import('./pages/RequestQuote'));
const SubscriptionManagement = lazyApp(() => import('./pages/SubscriptionManagement'));
const TicketDetail       = lazyApp(() => import('./pages/TicketDetail'));
const Tickets            = lazyApp(() => import('./pages/Tickets'));
const UserTypeSelection  = lazyApp(() => import('./pages/UserTypeSelection'));

// 🟢 PÁGINAS ESTÁTICAS — ligeras, pero no críticas
const CookiePolicy       = lazyWithRetry(() => import('./pages/CookiePolicy'));
const CookiePreferences  = lazyWithRetry(() => import('./pages/CookiePreferences'));
const FAQ                = lazyWithRetry(() => import('./pages/FAQ'));
const FAQDetail          = lazyWithRetry(() => import('./pages/FAQDetail'));
const HelpCenter         = lazyApp(() => import('./pages/HelpCenter'));
const Home               = lazyWithRetry(() => import('./pages/Home'));
const LegalNotice        = lazyWithRetry(() => import('./pages/LegalNotice'));
const PrivacyPolicy      = lazyWithRetry(() => import('./pages/PrivacyPolicy'));
const TermsConditions    = lazyWithRetry(() => import('./pages/TermsConditions'));
const Referrals          = lazyApp(() => import('./pages/Referrals'));
const ReferralRedirect   = lazyApp(() => import('./pages/ReferralRedirect'));

export const PAGES = {
    "AdminDashboard": AdminDashboard,
    "AdminFAQ": AdminFAQ,
    "AdminMessagesStats": AdminMessagesStats,
    "AdminPayments": AdminPayments,
    "AdminTickets": AdminTickets,
    "Autonomo": Autonomo,
    "CRM": CRM,
    "CRMAutomations": CRMAutomations,
    "Calendar": Calendar,
    "Categoria": Categoria,
    "ClientDetail": ClientDetail,
    "ClientOnboarding": ClientOnboarding,
    "ConfirmEmail": ConfirmEmail,
    "CookiePolicy": CookiePolicy,
    "CookiePreferences": CookiePreferences,
    "DashboardProInfo": DashboardProInfo,
    "FAQ": FAQ,
    "FAQDetail": FAQDetail,
    "Favorites": Favorites,
    "HelpCenter": HelpCenter,
    "Home": Home,
    "Invoices": Invoices,
    "Jobs": Jobs,
    "MisClientes": MisClientes,
    "MiVisibilidad": MiVisibilidad,
    "LegalNotice": LegalNotice,
    "Messages": Messages,
    "MyProfile": MyProfile,
    "Notifications": Notifications,
    "Onboarding": Onboarding,
    "PayInvoice": PayInvoice,
    "PaymentSuccess": PaymentSuccess,
    "Presupuestos": Presupuestos,
    "PricingPlans": PricingPlans,
    "PrivacyPolicy": PrivacyPolicy,
    "ProfessionalDashboard": ProfessionalDashboard,
    "ProfessionalProfile": ProfessionalProfile,
    "ProfileOnboarding": ProfileOnboarding,
    "ProjectDetail": ProjectDetail,
    "Projects": Projects,
    "QuoteRequests": QuoteRequests,
    "RequestQuote": RequestQuote,
    "Search": Search,
    "SubscriptionManagement": SubscriptionManagement,
    "TermsConditions": TermsConditions,
    "TicketDetail": TicketDetail,
    "Tickets": Tickets,
    "UserTypeSelection": UserTypeSelection,
    "Referrals": Referrals,
    "ReferralRedirect": ReferralRedirect,
}

export const pagesConfig = {
    mainPage: "Search",
    Pages: PAGES,
    Layout: __Layout,
};