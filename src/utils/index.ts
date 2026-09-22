// Mapa centralizado de nombres de página → rutas en español (SEO-friendly).
// IMPORTANTE: este archivo es la ÚNICA fuente de verdad para las URLs.
// Todas las llamadas a createPageUrl("Search") devolverán "/buscar", etc.
//
// Las rutas con :id / :slug son URLs "base" — los componentes añaden
// los query params (?id=xxx) que ya usan. Mantenemos query params por
// compatibilidad con todo el código existente (window.location.search).

const PAGE_ROUTES: Record<string, string> = {
    // Públicas
    Search: "/buscar",
    Autonomo: "/autonomo",
    Categoria: "/categoria",
    FAQ: "/preguntas-frecuentes",
    HelpCenter: "/ayuda",
    ClientOnboarding: "/registro-cliente",
    UserTypeSelection: "/registro",
    PrivacyPolicy: "/privacidad",
    TermsConditions: "/terminos",
    CookiePolicy: "/cookies",
    LegalNotice: "/aviso-legal",

    // Cliente (logueado)
    Messages: "/mensajes",
    Favorites: "/favoritos",
    MyProfile: "/mi-perfil",
    Presupuestos: "/presupuestos",
    RequestQuote: "/pedir-presupuesto",
    QuoteRequests: "/solicitudes",
    Notifications: "/notificaciones",

    // Autónomo
    ProfessionalDashboard: "/dashboard",
    ProfessionalProfile: "/perfil",
    ProfileOnboarding: "/completar-perfil",
    Projects: "/proyectos",
    ProjectDetail: "/proyectos",
    Calendar: "/calendario",
    Invoices: "/facturas",
    PayInvoice: "/pagar",
    CRM: "/clientes",
    CRMAutomations: "/automatizaciones",
    ClientDetail: "/clientes",
    Jobs: "/trabajos",

    // Admin
    AdminDashboard: "/admin",
    AdminPayments: "/admin/pagos",
    AdminTickets: "/admin/soporte",
    AdminMessagesStats: "/admin/mensajes",
};

export function createPageUrl(pageName: string): string {
    // Soporte: "Autonomo?slug=xxx" → "/autonomo?slug=xxx"
    const [name, query] = pageName.split("?");
    const base = PAGE_ROUTES[name] ?? "/" + name.toLowerCase().replace(/ /g, "-");
    return query ? `${base}?${query}` : base;
}