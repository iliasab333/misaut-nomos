// pages.config.js - Code-split por ruta con React.lazy()
// CAMBIO: todas las páginas excepto Search (main page) son lazy-loaded
// Esto reduce el bundle inicial de ~600KB a ~150KB gzip
import { lazy } from 'react';
import __Layout from './Layout.jsx';

// Search es lazy: el bundle inicial se reduce ~250 KB gzip (antes era único).
// El componente se monta dentro del <Suspense> de AuthenticatedApp en App.jsx.
const Search = lazy(() => import('./pages/Search'));

// 🔴 PÁGINAS ADMIN — muy pesadas, solo las usa el admin
const AdminDashboard     = lazy(() => import('./pages/AdminDashboard'));
const AdminFAQ           = lazy(() => import('./pages/AdminFAQ'));
const AdminMessagesStats = lazy(() => import('./pages/AdminMessagesStats'));
const AdminPayments      = lazy(() => import('./pages/AdminPayments'));
const AdminTickets       = lazy(() => import('./pages/AdminTickets'));

// 🟠 PÁGINAS PRO — pesadas, solo usuarios profesionales
const Calendar           = lazy(() => import('./pages/Calendar'));
const CRM                = lazy(() => import('./pages/CRM'));
const CRMAutomations     = lazy(() => import('./pages/CRMAutomations'));
const Invoices           = lazy(() => import('./pages/Invoices'));
const Jobs               = lazy(() => import('./pages/Jobs'));
const MisClientes        = lazy(() => import('./pages/MisClientes'));
const MiVisibilidad      = lazy(() => import('./pages/MiVisibilidad'));
const Presupuestos       = lazy(() => import('./pages/Presupuestos'));
const ProfessionalDashboard = lazy(() => import('./pages/ProfessionalDashboard'));
const Projects           = lazy(() => import('./pages/Projects'));
const ProjectDetail      = lazy(() => import('./pages/ProjectDetail'));
const QuoteRequests      = lazy(() => import('./pages/QuoteRequests'));

// 🟡 PÁGINAS DE USUARIO — carga on-demand
const Autonomo           = lazy(() => import('./pages/Autonomo'));
const Categoria          = lazy(() => import('./pages/Categoria'));
const ClientDetail       = lazy(() => import('./pages/ClientDetail'));
const ClientOnboarding   = lazy(() => import('./pages/ClientOnboarding'));
const DashboardProInfo   = lazy(() => import('./pages/DashboardProInfo'));
const Favorites          = lazy(() => import('./pages/Favorites'));
const Messages           = lazy(() => import('./pages/Messages'));
const MyProfile          = lazy(() => import('./pages/MyProfile'));
const Notifications      = lazy(() => import('./pages/Notifications'));
const Onboarding         = lazy(() => import('./pages/Onboarding'));
const PayInvoice         = lazy(() => import('./pages/PayInvoice'));
const PaymentSuccess     = lazy(() => import('./pages/PaymentSuccess'));
const PricingPlans       = lazy(() => import('./pages/PricingPlans'));
const ProfessionalProfile = lazy(() => import('./pages/ProfessionalProfile'));
const ProfileOnboarding  = lazy(() => import('./pages/ProfileOnboarding'));
const RequestQuote       = lazy(() => import('./pages/RequestQuote'));
const SubscriptionManagement = lazy(() => import('./pages/SubscriptionManagement'));
const TicketDetail       = lazy(() => import('./pages/TicketDetail'));
const Tickets            = lazy(() => import('./pages/Tickets'));
const UserTypeSelection  = lazy(() => import('./pages/UserTypeSelection'));

// 🟢 PÁGINAS ESTÁTICAS — ligeras, pero no críticas
const CookiePolicy       = lazy(() => import('./pages/CookiePolicy'));
const CookiePreferences  = lazy(() => import('./pages/CookiePreferences'));
const FAQ                = lazy(() => import('./pages/FAQ'));
const FAQDetail          = lazy(() => import('./pages/FAQDetail'));
const HelpCenter         = lazy(() => import('./pages/HelpCenter'));
const Home               = lazy(() => import('./pages/Home'));
const LegalNotice        = lazy(() => import('./pages/LegalNotice'));
const PrivacyPolicy      = lazy(() => import('./pages/PrivacyPolicy'));
const TermsConditions    = lazy(() => import('./pages/TermsConditions'));
const Referrals          = lazy(() => import('./pages/Referrals'));
const ReferralRedirect   = lazy(() => import('./pages/ReferralRedirect'));

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