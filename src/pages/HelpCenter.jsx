import React, { useState } from "react";
import { uiLang } from '@/i18n';
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { createPageUrl } from "@/utils";
import {
  IconSearch,
  IconBook,
  IconUsers,
  IconBriefcase,
  IconShieldPlain,
  IconCard,
  IconUser,
  IconAlert,
  IconChevronRight,
  IconTrending,
  IconHelp,
  IconArrowRight,
  IconMessageSquare,
} from "@/components/Icons";
import SEOHead from "../components/seo/SEOHead";
import { FAQPageSchema } from "../components/seo/StructuredData";
import PublicTicketForm from "../components/support/PublicTicketForm";

const categoryConfig = {
  platform: {
    icon: IconBook,
    color: "bg-blue-500",
    label_es: "Sobre la plataforma",
    label_en: "About the platform"
  },
  clients: {
    icon: IconUsers,
    color: "bg-green-500",
    label_es: "Para clientes",
    label_en: "For clients"
  },
  professionals: {
    icon: IconBriefcase,
    color: "bg-c-accent",
    label_es: "Para autónomos",
    label_en: "For professionals"
  },
  security: {
    icon: IconShieldPlain,
    color: "bg-amber-500",
    label_es: "Seguridad",
    label_en: "Security"
  },
  payments: {
    icon: IconCard,
    color: "bg-green-600",
    label_es: "Pagos y suscripciones",
    label_en: "Payments & subscriptions"
  },
  profile: {
    icon: IconUser,
    color: "bg-blue-500",
    label_es: "Perfil profesional",
    label_en: "Professional profile"
  },
  troubleshooting: {
    icon: IconAlert,
    color: "bg-red-500",
    label_es: "Resolución de problemas",
    label_en: "Troubleshooting"
  }
};

export default function HelpCenterPage() {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const language = uiLang(i18n.language);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);

  const { data: faqs = [] } = useQuery({
    queryKey: ['faqs'],
    queryFn: async () => {
      const allFaqs = await base44.entities.FAQ.filter({ published: true });
      return allFaqs.sort((a, b) => (b.views || 0) - (a.views || 0));
    },
  });

  const { data: popularArticles = [] } = useQuery({
    queryKey: ['popularFaqs'],
    queryFn: async () => {
      const allFaqs = await base44.entities.FAQ.filter({ published: true });
      return allFaqs.sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 6);
    },
  });

  const handleSearch = (value) => {
    setSearchTerm(value);
    if (value.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const searchLower = value.toLowerCase();
    const results = faqs.filter(faq => {
      const title = language === 'es' ? faq.title_es : faq.title_en;
      const content = language === 'es' ? faq.content_es : faq.content_en;
      const summary = language === 'es' ? faq.summary_es : faq.summary_en;
      
      return title.toLowerCase().includes(searchLower) ||
             content.toLowerCase().includes(searchLower) ||
             summary.toLowerCase().includes(searchLower) ||
             faq.tags.some(tag => tag.toLowerCase().includes(searchLower));
    }).slice(0, 5);

    setSearchResults(results);
  };

  const getCategoryLabel = (category) => {
    return language === 'es' 
      ? categoryConfig[category]?.label_es 
      : categoryConfig[category]?.label_en;
  };

  const faqsByCategory = faqs.reduce((acc, faq) => {
    if (!acc[faq.category]) acc[faq.category] = [];
    acc[faq.category].push(faq);
    return acc;
  }, {});

  return (
    <>
      <SEOHead 
        title={language === 'es' ? "Centro de Ayuda - MisAutónomos" : "Help Center - MisAutónomos"}
        description={language === 'es' 
          ? "Encuentra respuestas a tus preguntas sobre MisAutónomos. Guías para clientes y profesionales."
          : "Find answers to your questions about MisAutónomos. Guides for clients and professionals."}
        keywords="ayuda, soporte, FAQ, guías, tutoriales, help center"
      />
      
      <FAQPageSchema faqs={popularArticles} language={language} />

      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-16 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <IconHelp className="w-16 h-16 mx-auto mb-4 opacity-90" />
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              {language === 'es' ? '¿En qué podemos ayudarte?' : 'How can we help you?'}
            </h1>
            <p className="text-xl text-blue-100 mb-8">
              {language === 'es' 
                ? 'Busca en nuestra base de conocimientos o explora por categorías'
                : 'Search our knowledge base or browse by categories'}
            </p>

            <div className="relative max-w-2xl mx-auto">
              <IconSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-c-muted pointer-events-none z-10" />
              <input
                type="text"
                placeholder={language === 'es' ? "Buscar en el centro de ayuda..." : "Search help center..."}
                aria-label={language === 'es' ? "Buscar en el centro de ayuda" : "Search help center"}
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="input pl-12 h-14 text-lg bg-surface text-ink border-0 shadow-lg"
              />
              
              {searchResults.length > 0 && (
                <div className="card absolute w-full mt-2 z-50 shadow-xl animate-slide-down">
                  <div className="p-2">
                    {searchResults.map((faq) => (
                      <button
                        key={faq.id}
                        type="button"
                        onClick={() => {
                          navigate(createPageUrl("FAQDetail") + `?id=${faq.id}`);
                          setSearchTerm("");
                          setSearchResults([]);
                        }}
                        className="w-full text-left p-3 hover:bg-soft rounded-lg transition-colors"
                      >
                        <p className="font-semibold text-ink">
                          {language === 'es' ? faq.title_es : faq.title_en}
                        </p>
                        <p className="text-sm text-c-muted line-clamp-1">
                          {language === 'es' ? faq.summary_es : faq.summary_en}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-center gap-4 mt-6">
              <Link
                to={createPageUrl("FAQ")}
                className="btn-secondary btn-lg bg-surface text-c-accent hover:bg-c-accent/10"
              >
                {language === 'es' ? 'Ver todas las FAQs' : 'View all FAQs'}
                <IconArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="mb-12">
            <h2 className="text-3xl font-bold text-ink mb-2 flex items-center gap-2">
              <IconTrending className="w-8 h-8 text-c-accent" />
              {language === 'es' ? 'Artículos populares' : 'Popular articles'}
            </h2>
            <p className="text-c-muted mb-6">
              {language === 'es' 
                ? 'Los artículos más consultados por nuestra comunidad'
                : 'Most viewed articles by our community'}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {popularArticles.map((faq) => (
                <div key={faq.id} className="card hover:shadow-lg transition-shadow cursor-pointer border-2 border-c-border hover:border-c-accent/40">
                  <div className="p-5">
                    <div className="flex items-start gap-3 mb-3">
                      {React.createElement(categoryConfig[faq.category]?.icon || IconBook, {
                        className: "w-5 h-5 text-c-accent flex-shrink-0 mt-0.5"
                      })}
                      <h3 
                        className="font-semibold text-ink line-clamp-2 hover:text-c-accent transition-colors"
                        onClick={() => navigate(createPageUrl("FAQDetail") + `?id=${faq.id}`)}
                      >
                        {language === 'es' ? faq.title_es : faq.title_en}
                      </h3>
                    </div>
                    <p className="text-sm text-c-muted line-clamp-2 mb-3">
                      {language === 'es' ? faq.summary_es : faq.summary_en}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="badge-outline text-xs">
                        {getCategoryLabel(faq.category)}
                      </span>
                      <button
                        type="button"
                        onClick={() => navigate(createPageUrl("FAQDetail") + `?id=${faq.id}`)}
                        className="btn-ghost btn-sm text-c-accent hover:text-accent-hover"
                      >
                        {language === 'es' ? 'Leer más' : 'Read more'}
                        <IconChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-3xl font-bold text-ink mb-6">
              {language === 'es' ? 'Explorar por categoría' : 'Browse by category'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Object.entries(categoryConfig).map(([key, config]) => {
                const count = faqsByCategory[key]?.length || 0;
                if (count === 0) return null;

                return (
                  <div
                    key={key}
                    className="card hover:shadow-lg transition-all hover:scale-105 cursor-pointer border-2 border-c-border hover:border-c-accent/60"
                    onClick={() => navigate(createPageUrl("FAQ") + `?category=${key}`)}
                  >
                    <div className="p-6">
                      <div className={`w-14 h-14 ${config.color} rounded-xl flex items-center justify-center mb-4`}>
                        {React.createElement(config.icon, {
                          className: "w-7 h-7 text-white"
                        })}
                      </div>
                      <h3 className="font-bold text-xl text-ink mb-2">
                        {language === 'es' ? config.label_es : config.label_en}
                      </h3>
                      <p className="text-c-muted mb-4">
                        {count} {language === 'es' ? 'artículos' : 'articles'}
                      </p>
                      <button type="button" className="btn-ghost p-0 text-c-accent hover:text-accent-hover">
                        {language === 'es' ? 'Ver artículos' : 'View articles'}
                        <IconChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* FORMULARIO DE CONTACTO PÚBLICO */}
          <div className="mt-12" id="contact-form">
            <h2 className="text-3xl font-bold text-ink mb-2 flex items-center gap-2">
              <IconMessageSquare className="w-8 h-8 text-c-accent" />
              {language === 'es' ? '¿No encuentras lo que buscas?' : "Can't find what you're looking for?"}
            </h2>
            <p className="text-c-muted mb-6">
              {language === 'es' 
                ? 'Envíanos tu consulta y te responderemos lo antes posible'
                : 'Send us your inquiry and we will respond as soon as possible'}
            </p>
            <div className="max-w-2xl">
              <PublicTicketForm language={language} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
